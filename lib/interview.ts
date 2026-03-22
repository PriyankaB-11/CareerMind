import Groq from "groq-sdk";
import { z } from "zod";

const INTERVIEW_MODEL = "qwen/qwen3-32b";
const GROQ_TIMEOUT_MS = 12000;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  maxRetries: 0,
});

const interviewQuestionsSchema = z.object({
  technical: z.array(z.string()).min(1).max(12),
  behavioral: z.array(z.string()).min(1).max(8),
  coding: z.array(z.string()).min(1).max(8),
  focusAreas: z.array(z.string()).min(1).max(12),
});

const mockFeedbackSchema = z.object({
  score: z.number().min(0).max(10),
  strengths: z.array(z.string()).max(8),
  improvements: z.array(z.string()).max(8),
  improvedAnswer: z.string().min(1),
});

function assertGroqConfigured() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing");
  }
}

function parseJsonObject(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Invalid JSON response from Groq");
    }

    return JSON.parse(match[0]);
  }
}

async function runPrompt<T>(schema: z.ZodType<T>, userPrompt: string): Promise<T> {
  assertGroqConfigured();

  const completion = await Promise.race([
    groq.chat.completions.create({
      model: INTERVIEW_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a precise interview preparation assistant. Return only valid JSON.",
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Groq request timeout")), GROQ_TIMEOUT_MS);
    }),
  ]);

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Groq returned empty response");
  }

  let parsed: unknown;
  try {
    parsed = parseJsonObject(content);
  } catch {
    throw new Error("Groq returned invalid JSON");
  }

  return schema.parse(parsed);
}

export async function generateInterviewQuestions(input: {
  company: string;
  role?: string;
  userSkills: string[];
}) {
  const prompt = [
    "You are an expert interview coach.",
    `Company: ${input.company}`,
    `Role: ${input.role || "General"}`,
    `User Skills: ${input.userSkills.join(", ") || "Not provided"}`,
    "",
    "Generate:",
    "1. 10 technical questions",
    "2. 5 behavioral questions",
    "3. 5 coding/SQL questions",
    "4. Key focus areas",
    "",
    "Return ONLY valid JSON in this exact shape:",
    JSON.stringify({
      technical: [""],
      behavioral: [""],
      coding: [""],
      focusAreas: [""],
    }),
  ].join("\n");

  const result = await runPrompt(interviewQuestionsSchema, prompt);

  return {
    technical: result.technical.slice(0, 10),
    behavioral: result.behavioral.slice(0, 5),
    coding: result.coding.slice(0, 5),
    focusAreas: result.focusAreas.slice(0, 10),
  };
}

export async function generateMockInterviewFeedback(input: {
  company: string;
  role?: string;
  question: string;
  answer: string;
  userSkills: string[];
}) {
  const prompt = [
    "You are an expert interview coach grading a mock interview answer.",
    `Company: ${input.company}`,
    `Role: ${input.role || "General"}`,
    `Question: ${input.question}`,
    `Candidate Answer: ${input.answer}`,
    `User Skills: ${input.userSkills.join(", ") || "Not provided"}`,
    "",
    "Return ONLY valid JSON in this exact shape:",
    JSON.stringify({
      score: 0,
      strengths: [""],
      improvements: [""],
      improvedAnswer: "",
    }),
  ].join("\n");

  return runPrompt(mockFeedbackSchema, prompt);
}
