import { AdviceOutcome, ApplicationStatus, CompanyType, EventType, InsightType, InterviewStage } from "@prisma/client";
import { subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { KNOWN_SKILLS, STOP_WORDS } from "@/services/keywords";
import { tokenize, topK, uniq } from "@/services/text-utils";

export async function rebuildSemanticMemory(userId: string) {
  const [skills, projects, rejections] = await Promise.all([
    prisma.skill.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.project.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.rejection.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);

  const weaknessCounts = topK(rejections.flatMap((r) => r.missingSkills.map((s) => s.toLowerCase())), 5);
  const weaknesses = weaknessCounts.map((entry) => entry.key);

  const strengths = skills
    .map((s) => s.name.toLowerCase())
    .filter((s) => !weaknesses.includes(s))
    .slice(0, 8);

  const content = {
    skills: skills.map((s) => s.name),
    projects: projects.map((p) => p.title),
    strengths,
    weaknesses,
  };

  await upsertInsight(userId, InsightType.SEMANTIC, "Semantic Profile", content);
  return content;
}

export async function rebuildReflectiveMemory(userId: string) {
  const [rejections, adviceLogs] = await Promise.all([
    prisma.rejection.findMany({ where: { userId } }),
    prisma.adviceLog.findMany({ where: { userId } }),
  ]);

  const repeatedSkillFailures = topK(
    rejections.flatMap((r) => r.missingSkills.map((s) => s.toLowerCase())),
    6,
  ).filter((entry) => entry.count >= 2);

  const repeatedCompanyTypeFailures = topK(rejections.map((r) => r.companyType), 4).filter((entry) => entry.count >= 2);

  const successfulStrategies = topK(
    adviceLogs.filter((a) => a.outcome === AdviceOutcome.SUCCESS).map((a) => a.strategy),
    6,
  );

  const failedStrategies = topK(
    adviceLogs.filter((a) => a.outcome === AdviceOutcome.FAILURE).map((a) => a.strategy),
    6,
  );

  const content = {
    repeatedSkillFailures,
    repeatedCompanyTypeFailures,
    successfulStrategies,
    failedStrategies,
  };

  await upsertInsight(userId, InsightType.REFLECTIVE, "Reflective Patterns", content);
  return content;
}

export async function buildWeeklyReport(userId: string) {
  const since = subDays(new Date(), 7);

  const [resumes, applications, rejections, adviceLogs, semantic, reflective] = await Promise.all([
    prisma.resume.findMany({ where: { userId, createdAt: { gte: since } } }),
    prisma.application.findMany({ where: { userId, createdAt: { gte: since } } }),
    prisma.rejection.findMany({ where: { userId, createdAt: { gte: since } } }),
    prisma.adviceLog.findMany({ where: { userId, createdAt: { gte: since } } }),
    prisma.insight.findFirst({ where: { userId, type: InsightType.SEMANTIC }, orderBy: { updatedAt: "desc" } }),
    prisma.insight.findFirst({ where: { userId, type: InsightType.REFLECTIVE }, orderBy: { updatedAt: "desc" } }),
  ]);

  const improved: string[] = [];
  if (resumes.length > 0) {
    improved.push(`Uploaded ${resumes.length} resume version(s).`);
  }
  if (applications.length > 0) {
    improved.push(`Submitted ${applications.length} application(s).`);
  }
  const successCount = adviceLogs.filter((a) => a.outcome === AdviceOutcome.SUCCESS).length;
  if (successCount > 0) {
    improved.push(`Converted ${successCount} advice recommendation(s) into successful outcomes.`);
  }

  const semanticContent = semantic?.content as { weaknesses?: string[] } | null;
  const reflectiveContent =
    (reflective?.content as { repeatedSkillFailures?: Array<{ key: string; count: number }> } | null) ?? null;

  const detectedPatterns = [
    ...(reflectiveContent?.repeatedSkillFailures ?? []).map(
      (p) => `${p.key} appeared in ${p.count} rejections.`,
    ),
    ...(semanticContent?.weaknesses ?? []).slice(0, 2).map((w) => `Weakness trend: ${w}`),
  ].slice(0, 5);

  const topWeakness = semanticContent?.weaknesses?.[0];
  const bestNextAction = topWeakness
    ? `Prioritize a focused skill sprint on ${topWeakness} and apply only to matching roles after re-evaluating job match.`
    : rejections.length > 0
      ? "Run targeted interview drills and rewrite project bullets with measurable impact metrics."
      : "Increase qualified applications and track outcomes weekly to grow signal quality.";

  const content = {
    period: "Last 7 days",
    improved: improved.length > 0 ? improved : ["No measurable progress event captured this week."],
    detectedPatterns:
      detectedPatterns.length > 0 ? detectedPatterns : ["Not enough data to detect stable patterns."],
    bestNextAction,
  };

  await upsertInsight(userId, InsightType.WEEKLY, "Weekly Hindsight", content);
  return content;
}

export function computeRadarFromData(input: {
  skills: string[];
  projectsCount: number;
  successfulAdvice: number;
  rejectionsCount: number;
}) {
  const skillSet = new Set(input.skills.map((s) => s.toLowerCase()));
  const has = (...candidates: string[]) => candidates.some((s) => skillSet.has(s));

  return [
    { dimension: "DSA", score: has("dsa", "algorithms", "data structures") ? 74 : 45 },
    { dimension: "System Design", score: has("system design", "microservices") ? 77 : 48 },
    { dimension: "Frontend", score: has("react", "next.js", "tailwind", "css", "html") ? 80 : 52 },
    { dimension: "Backend", score: has("node.js", "express", "sql", "postgresql") ? 78 : 50 },
    {
      dimension: "Open Source",
      score: has("open source") ? 72 : Math.min(50 + input.projectsCount * 3, 78),
    },
    {
      dimension: "Communication",
      score: has("communication", "leadership") ? 76 : 55,
    },
    {
      dimension: "Domain Knowledge",
      score: Math.min(42 + input.projectsCount * 5, 86),
    },
    {
      dimension: "Strategy",
      score: Math.min(46 + input.successfulAdvice * 8 + Math.max(0, 15 - input.rejectionsCount), 90),
    },
  ];
}

export async function matchJobForUser(userId: string, jdText: string) {
  const userSkills = await prisma.skill.findMany({ where: { userId } });
  const skillSet = new Set(userSkills.map((s) => s.name.toLowerCase()));

  const tokens = uniq(
    tokenize(jdText).filter((token) => token.length > 2 && !STOP_WORDS.has(token)),
  );

  const matchedSkills = tokens.filter((token) => skillSet.has(token));
  const missingSkills = tokens.filter(
    (token) => !skillSet.has(token) && KNOWN_SKILLS.some((skill) => skill.includes(token) || token.includes(skill)),
  );

  let score: number;
  let recommendation: string;

  if (userSkills.length === 0) {
    score = 50;
    recommendation = "Improve";
  } else {
    score = tokens.length === 0 ? 0 : Math.round((matchedSkills.length / tokens.length) * 100);
    recommendation = score >= 65 ? "Apply" : "Improve";
  }
  const strategy = recommendation === "Apply" ? "apply_with_current_strengths" : "close_skill_gaps_before_applying";

  const advice = await prisma.adviceLog.create({
    data: {
      userId,
      strategy,
      advice:
        recommendation === "Apply"
          ? "Apply now and lead with projects most aligned to required skills."
          : `Improve first by building evidence in: ${missingSkills.slice(0, 3).join(", ") || "core gap skills"
            }`,
      outcome: AdviceOutcome.PENDING,
      priorityScore: 1,
    },
  });

  await prisma.careerEvent.create({
    data: {
      userId,
      type: EventType.JOB_MATCH,
      title: `Job match evaluated with score ${score}`,
      metadata: {
        score,
        missingSkills: missingSkills.slice(0, 3),
        recommendation,
      },
    },
  });

  return {
    score,
    matchedSkills,
    missingSkills: missingSkills.slice(0, 3),
    recommendation,
    adviceId: advice.id,
    strategy,
  };
}

export async function logRejectionForUser(input: {
  userId: string;
  company: string;
  role: string;
  companyType?: CompanyType;
  stage?: InterviewStage;
  reasonText?: string;
  missingSkills: string[];
  adviceId?: string;
  adviceOutcome?: AdviceOutcome;
}) {
  const rejection = await prisma.rejection.create({
    data: {
      userId: input.userId,
      company: input.company,
      role: input.role,
      companyType: input.companyType ?? CompanyType.UNKNOWN,
      stage: input.stage ?? InterviewStage.UNKNOWN,
      reasonText: input.reasonText,
      missingSkills: uniq(input.missingSkills),
    },
  });

  await prisma.application.create({
    data: {
      userId: input.userId,
      company: input.company,
      role: input.role,
      status: ApplicationStatus.REJECTED,
      notes: input.reasonText,
      appliedAt: rejection.createdAt,
    },
  });

  if (input.adviceId && input.adviceOutcome) {
    await prisma.adviceLog.update({
      where: { id: input.adviceId },
      data: {
        outcome: input.adviceOutcome,
        priorityScore:
          input.adviceOutcome === AdviceOutcome.SUCCESS
            ? { increment: 0.2 }
            : input.adviceOutcome === AdviceOutcome.FAILURE
              ? { decrement: 0.2 }
              : undefined,
      },
    });

    await prisma.careerEvent.create({
      data: {
        userId: input.userId,
        type: EventType.ADVICE_OUTCOME,
        title: `Advice outcome logged as ${input.adviceOutcome.toLowerCase()}`,
        metadata: {
          adviceId: input.adviceId,
          outcome: input.adviceOutcome,
        },
      },
    });
  }

  const priorRejections = await prisma.rejection.findMany({ where: { userId: input.userId } });
  const missingSkillFrequency = topK(
    priorRejections.flatMap((r) => r.missingSkills.map((s) => s.toLowerCase())),
    5,
  );

  const repeated = missingSkillFrequency.find((entry) => entry.count >= 2);
  const reason = repeated
    ? `Recurring rejection root cause: ${repeated.key} gap appears ${repeated.count} times.`
    : "No repeated rejection root cause yet. This appears to be an isolated event.";

  await upsertInsight(input.userId, InsightType.AUTOPSY, "Rejection Autopsy", {
    reason,
    topPatterns: missingSkillFrequency,
  });

  await prisma.careerEvent.create({
    data: {
      userId: input.userId,
      type: EventType.REJECTION,
      title: `Rejection logged at ${input.company}`,
      metadata: {
        role: input.role,
        reason,
      },
    },
  });

  await Promise.all([rebuildSemanticMemory(input.userId), rebuildReflectiveMemory(input.userId)]);

  return {
    reason,
    topPatterns: missingSkillFrequency,
  };
}

export async function uploadResumeForUser(input: {
  userId: string;
  filename: string;
  text: string;
  skills: string[];
  projects: string[];
}) {
  await prisma.resume.create({
    data: {
      userId: input.userId,
      filename: input.filename,
      text: input.text,
    },
  });

  for (const skill of uniq(input.skills)) {
    await prisma.skill.upsert({
      where: {
        userId_name: {
          userId: input.userId,
          name: skill,
        },
      },
      update: {
        source: "resume",
      },
      create: {
        userId: input.userId,
        name: skill,
        source: "resume",
      },
    });
  }

  const uniqueProjects = uniq(input.projects)
    .map((projectTitle) => projectTitle.trim())
    .filter((projectTitle) => projectTitle.length > 1)
    .slice(0, 30);

  if (uniqueProjects.length > 0) {
    await prisma.project.createMany({
      data: uniqueProjects.map((title) => ({
        userId: input.userId,
        title,
        source: "resume",
      })),
    });
  }

  await prisma.careerEvent.create({
    data: {
      userId: input.userId,
      type: EventType.RESUME_UPLOAD,
      title: `Uploaded resume ${input.filename}`,
      metadata: {
        extractedSkills: input.skills,
        extractedProjects: input.projects,
      },
    },
  });

  void Promise.allSettled([rebuildSemanticMemory(input.userId), rebuildReflectiveMemory(input.userId)]);
}

export async function fetchDashboard(userId: string) {
  const [semantic, reflective, weekly, skills, projects, successfulAdvice, rejectionsCount, rejections, adviceLogs] = await Promise.all([
    prisma.insight.findFirst({ where: { userId, type: InsightType.SEMANTIC }, orderBy: { updatedAt: "desc" } }),
    prisma.insight.findFirst({ where: { userId, type: InsightType.REFLECTIVE }, orderBy: { updatedAt: "desc" } }),
    prisma.insight.findFirst({ where: { userId, type: InsightType.WEEKLY }, orderBy: { updatedAt: "desc" } }),
    prisma.skill.findMany({ where: { userId } }),
    prisma.project.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 30, select: { title: true } }),
    prisma.adviceLog.count({ where: { userId, outcome: AdviceOutcome.SUCCESS } }),
    prisma.rejection.count({ where: { userId } }),
    prisma.rejection.findMany({ where: { userId }, select: { missingSkills: true, companyType: true } }),
    prisma.adviceLog.findMany({ where: { userId }, select: { strategy: true, outcome: true } }),
  ]);

  const fallbackWeaknesses = topK(rejections.flatMap((entry) => entry.missingSkills.map((skill) => skill.toLowerCase())), 5)
    .map((entry) => entry.key);
  const fallbackStrengths = skills
    .map((entry) => entry.name.toLowerCase())
    .filter((entry) => !fallbackWeaknesses.includes(entry))
    .slice(0, 8);

  const semanticContent = (semantic?.content as {
    skills?: string[];
    projects?: string[];
    strengths?: string[];
    weaknesses?: string[];
  } | null) ?? null;

  const reflectiveContent = (reflective?.content as {
    repeatedSkillFailures?: Array<{ key: string; count: number }>;
    repeatedCompanyTypeFailures?: Array<{ key: string; count: number }>;
    successfulStrategies?: Array<{ key: string; count: number }>;
    failedStrategies?: Array<{ key: string; count: number }>;
  } | null) ?? null;

  const reflectiveFallback = {
    repeatedSkillFailures: topK(
      rejections.flatMap((entry) => entry.missingSkills.map((skill) => skill.toLowerCase())),
      6,
    ).filter((entry) => entry.count >= 2),
    repeatedCompanyTypeFailures: topK(rejections.map((entry) => entry.companyType), 4).filter((entry) => entry.count >= 2),
    successfulStrategies: topK(
      adviceLogs.filter((entry) => entry.outcome === AdviceOutcome.SUCCESS).map((entry) => entry.strategy),
      6,
    ),
    failedStrategies: topK(
      adviceLogs.filter((entry) => entry.outcome === AdviceOutcome.FAILURE).map((entry) => entry.strategy),
      6,
    ),
  };

  const radar = computeRadarFromData({
    skills: skills.map((s) => s.name),
    projectsCount: projects.length,
    successfulAdvice,
    rejectionsCount,
  });

  return {
    semantic: {
      skills: semanticContent?.skills?.length ? semanticContent.skills : skills.map((entry) => entry.name),
      projects: semanticContent?.projects?.length ? semanticContent.projects : projects.map((entry) => entry.title),
      strengths: semanticContent?.strengths?.length ? semanticContent.strengths : fallbackStrengths,
      weaknesses: semanticContent?.weaknesses?.length ? semanticContent.weaknesses : fallbackWeaknesses,
    },
    reflective: {
      repeatedSkillFailures:
        reflectiveContent?.repeatedSkillFailures?.length
          ? reflectiveContent.repeatedSkillFailures
          : reflectiveFallback.repeatedSkillFailures,
      repeatedCompanyTypeFailures:
        reflectiveContent?.repeatedCompanyTypeFailures?.length
          ? reflectiveContent.repeatedCompanyTypeFailures
          : reflectiveFallback.repeatedCompanyTypeFailures,
      successfulStrategies:
        reflectiveContent?.successfulStrategies?.length
          ? reflectiveContent.successfulStrategies
          : reflectiveFallback.successfulStrategies,
      failedStrategies:
        reflectiveContent?.failedStrategies?.length
          ? reflectiveContent.failedStrategies
          : reflectiveFallback.failedStrategies,
    },
    weekly: (weekly?.content as Record<string, unknown>) ?? null,
    radar,
  };
}

export async function fetchHistory(userId: string) {
  const [applicationsResult, rejectionsResult, eventsResult] = await Promise.allSettled([
    prisma.application.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.rejection.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.careerEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  const applications = applicationsResult.status === "fulfilled" ? applicationsResult.value : [];
  const rejections = rejectionsResult.status === "fulfilled" ? rejectionsResult.value : [];
  const events = eventsResult.status === "fulfilled" ? eventsResult.value : [];

  const warning =
    applicationsResult.status === "rejected" || rejectionsResult.status === "rejected" || eventsResult.status === "rejected"
      ? "Some timeline sources were unavailable, so a partial history is shown."
      : undefined;

  return {
    applications,
    rejections,
    events,
    ...(warning ? { warning } : {}),
  };
}

async function upsertInsight(userId: string, type: InsightType, title: string, content: unknown) {
  const existing = await prisma.insight.findFirst({
    where: { userId, type },
    orderBy: { updatedAt: "desc" },
  });

  if (existing) {
    return prisma.insight.update({
      where: { id: existing.id },
      data: {
        title,
        content: content as never,
      },
    });
  }

  return prisma.insight.create({
    data: {
      userId,
      type,
      title,
      content: content as never,
    },
  });
}
