import Groq from "groq-sdk";
import { z } from "zod";
import {
  getReflectiveInsights,
  getSemanticProfile,
  getUserTimeline,
  logEvent,
  storeInsight,
  updateSemanticProfile,
} from "@/lib/hindsight";
import { KNOWN_SKILLS } from "@/services/keywords";

const MODEL = "qwen/qwen3-32b";
const GROQ_TIMEOUT_MS = 8000;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  maxRetries: 0,
});

function assertGroqConfigured() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing");
  }
}

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === 1) {
        throw error;
      }
    }
  }

  throw lastError;
}

function extractJsonObject(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Model did not return valid JSON");
    }

    return JSON.parse(match[0]);
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), timeoutMs);
    }),
  ]);
}

const SKILL_CANONICAL_MAP: Record<string, string> = {
  js: "javascript",
  javascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  reactjs: "react",
  react: "react",
  nextjs: "next.js",
  "next.js": "next.js",
  nodejs: "node.js",
  "node.js": "node.js",
  postgres: "postgresql",
  postgresql: "postgresql",
  k8s: "kubernetes",
  kubernetes: "kubernetes",
  "ci/cd": "cicd",
  cicd: "cicd",
  ml: "machine learning",
  llm: "llm",
};

function normalizeSkills(skills: string[]): string[] {
  return Array.from(
    new Set(
      skills
        .map((skill) => skill.toLowerCase().trim())
        .map((skill) => SKILL_CANONICAL_MAP[skill] ?? skill)
        .filter((skill) => skill.length >= 2)
        .filter((skill) => KNOWN_SKILLS.includes(skill as (typeof KNOWN_SKILLS)[number]) || skill.split(" ").length <= 4),
    ),
  ).slice(0, 80);
}

function normalizeProjects(projects: string[]): string[] {
  return Array.from(
    new Set(
      projects
        .map((project) => project.replace(/\s+/g, " ").trim())
        .filter((project) => project.length >= 8 && project.length <= 140),
    ),
  ).slice(0, 30);
}

async function runStructuredPrompt<T>(
  schema: z.ZodType<T>,
  systemPrompt: string,
  userPrompt: string,
): Promise<T> {
  assertGroqConfigured();

  return withRetry(async () => {
    const completion = await Promise.race([
      groq.chat.completions.create({
        model: MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Groq request timeout")), GROQ_TIMEOUT_MS);
      }),
    ]);

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Model returned empty content");
    }

    const parsed = extractJsonObject(content);
    return schema.parse(parsed);
  });
}

const jobMatchSchema = z.object({
  matchScore: z.number().min(0).max(100),
  missingSkills: z.array(z.string()).max(12),
  strengths: z.array(z.string()).max(12),
  recommendation: z.enum(["APPLY", "IMPROVE"]),
});

export async function analyzeJobMatch(userId: string, jobDescription: string) {
  const [semantic, reflective, timeline] = await Promise.all([
    getSemanticProfile(userId),
    getReflectiveInsights(userId),
    getUserTimeline(userId),
  ]);

  const result = await runStructuredPrompt(
    jobMatchSchema,
    [
      "You are a career intelligence engine.",
      "Use ONLY the provided memory context and job description.",
      "No generic advice. Reference actual history signals.",
      "Return ONLY valid JSON.",
    ].join("\n"),
    [
      "Memory context:",
      JSON.stringify({
        semantic,
        reflective,
        recentTimeline: timeline.slice(-8),
      }),
      "Job description:",
      jobDescription,
      "Return schema:",
      JSON.stringify({
        matchScore: 0,
        missingSkills: [""],
        strengths: [""],
        recommendation: "APPLY",
      }),
    ].join("\n\n"),
  );

  await logEvent(userId, "advice_given", {
    source: "job_match_ai",
    recommendation: result.recommendation,
    missingSkills: result.missingSkills,
  });

  return result;
}

const rejectionSchema = z.object({
  reason: z.string().min(1),
  patterns: z.array(z.string()).max(12),
  criticalGap: z.string().min(1),
  actionPlan: z.array(z.string()).max(8),
});

export async function analyzeRejectionAutopsy(
  userId: string,
  rejectionData: {
    company: string;
    role: string;
    stage?: string;
    companyType?: string;
    reasonText?: string;
    missingSkills: string[];
  },
) {
  const [timeline, semantic, reflective] = await Promise.all([
    getUserTimeline(userId),
    getSemanticProfile(userId),
    getReflectiveInsights(userId),
  ]);

  const result = await runStructuredPrompt(
    rejectionSchema,
    [
      "You analyze interview rejection causes from user memory.",
      "You MUST use historical patterns, not generic template advice.",
      "Return ONLY valid JSON.",
    ].join("\n"),
    [
      "Rejection event:",
      JSON.stringify(rejectionData),
      "Semantic memory:",
      JSON.stringify(semantic),
      "Reflective memory:",
      JSON.stringify(reflective),
      "Timeline memory:",
      JSON.stringify(timeline.slice(-15)),
      "Return schema:",
      JSON.stringify({
        reason: "",
        patterns: [""],
        criticalGap: "",
        actionPlan: [""],
      }),
    ].join("\n\n"),
  );

  await storeInsight(userId, {
    type: "rejection_autopsy",
    content: {
      patterns: result.patterns,
      strategicInsights: [result.reason, `Critical gap: ${result.criticalGap}`],
      adviceSuccesses: [],
      adviceFailures: result.actionPlan,
    },
  });

  return result;
}

const weeklyReportSchema = z.object({
  summary: z.string().min(1),
  improvements: z.array(z.string()).max(12),
  insights: z.array(z.string()).max(12),
  nextBestAction: z.string().min(1),
});

export async function buildWeeklyReportAI(userId: string) {
  const [timeline, semantic, reflective] = await Promise.all([
    getUserTimeline(userId),
    getSemanticProfile(userId),
    getReflectiveInsights(userId),
  ]);

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentTimeline = timeline.filter((item) => new Date(item.timestamp).getTime() >= sevenDaysAgo);

  const result = await runStructuredPrompt(
    weeklyReportSchema,
    [
      "You generate weekly hindsight reports for career progress.",
      "Use memory context and reference concrete behavior patterns.",
      "Return ONLY valid JSON.",
    ].join("\n"),
    [
      "Recent episodic events (last 7 days):",
      JSON.stringify(recentTimeline),
      "Semantic profile:",
      JSON.stringify(semantic),
      "Reflective insights:",
      JSON.stringify(reflective),
      "Return schema:",
      JSON.stringify({
        summary: "",
        improvements: [""],
        insights: [""],
        nextBestAction: "",
      }),
    ].join("\n\n"),
  );

  await storeInsight(userId, {
    type: "weekly_report",
    content: {
      patterns: result.insights,
      strategicInsights: [result.summary, result.nextBestAction],
      adviceSuccesses: [],
      adviceFailures: [],
    },
  });

  return result;
}

const resumeExtractionSchema = z.object({
  skills: z.array(z.string()).max(80),
  projects: z.array(z.string()).max(30),
});

export async function extractResumeWithAI(userId: string, resumeText: string) {
  const [semantic, reflective] = await Promise.all([
    withTimeout(getSemanticProfile(userId), 1500, {
      skills: [],
      projects: [],
      strengths: [],
      weaknesses: [],
    }),
    withTimeout(getReflectiveInsights(userId), 1500, {
      patterns: [],
      adviceSuccesses: [],
      adviceFailures: [],
      strategicInsights: [],
      updatedAt: new Date().toISOString(),
    }),
  ]);

  const result = await runStructuredPrompt(
    resumeExtractionSchema,
    [
      "Extract resume intelligence for a career memory system.",
      "Return canonical skill names and concise project titles.",
      "Use existing memory context to avoid duplicates.",
      "Normalize aliases like js->javascript, ts->typescript, nextjs->next.js.",
      "Return ONLY valid JSON.",
    ].join("\n"),
    [
      "Existing semantic profile:",
      JSON.stringify(semantic),
      "Reflective memory:",
      JSON.stringify(reflective),
      "Resume text:",
      resumeText.slice(0, 12000),
      "Allowed/common skills vocabulary:",
      JSON.stringify(KNOWN_SKILLS),
      "Return schema:",
      JSON.stringify({
        skills: [""],
        projects: [""],
      }),
    ].join("\n\n"),
  );

  const normalizedSkills = normalizeSkills(result.skills);
  const normalizedProjects = normalizeProjects(result.projects);

  const mergedProfile = {
    skills: Array.from(new Set([...semantic.skills, ...normalizedSkills])).slice(0, 120),
    projects: Array.from(new Set([...semantic.projects, ...normalizedProjects])).slice(0, 60),
    strengths: semantic.strengths,
    weaknesses: semantic.weaknesses,
  };

  await updateSemanticProfile(userId, mergedProfile);

  return {
    skills: normalizedSkills,
    projects: normalizedProjects,
  };
}

export async function recordAdviceOutcome(
  userId: string,
  payload: { adviceId?: string; strategy?: string; outcome: "SUCCESS" | "FAILURE" },
) {
  const reflective = await getReflectiveInsights(userId);

  const next = {
    patterns: reflective.patterns,
    strategicInsights: reflective.strategicInsights,
    adviceSuccesses:
      payload.outcome === "SUCCESS"
        ? Array.from(new Set([...(reflective.adviceSuccesses ?? []), payload.strategy ?? payload.adviceId ?? "unknown"])).slice(0, 20)
        : reflective.adviceSuccesses,
    adviceFailures:
      payload.outcome === "FAILURE"
        ? Array.from(new Set([...(reflective.adviceFailures ?? []), payload.strategy ?? payload.adviceId ?? "unknown"])).slice(0, 20)
        : reflective.adviceFailures,
  };

  await storeInsight(userId, {
    type: "advice_outcome",
    content: next,
  });

  await logEvent(userId, "outcome_recorded", {
    adviceId: payload.adviceId,
    strategy: payload.strategy,
    outcome: payload.outcome,
  });
}
