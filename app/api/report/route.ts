import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { AdviceOutcome, InsightType } from "@prisma/client";
import { subDays } from "date-fns";
import { buildWeeklyReportAI } from "@/lib/ai";
import { authOptions } from "@/lib/auth";
import { logEvent, storeInsight } from "@/lib/hindsight";
import { prisma } from "@/lib/prisma";
import { buildWeeklyReport } from "@/services/career-intelligence.service";

function toTitleCase(input: string) {
  return input
    .toLowerCase()
    .split(/[\s_]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function percentage(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let aiNarrative: {
      summary: string;
      improvements: string[];
      insights: string[];
      nextBestAction: string;
    };

    try {
      aiNarrative = await buildWeeklyReportAI(session.user.id);
    } catch (aiError) {
      console.error("weekly ai failed, falling back", aiError);
      try {
        const fallback = await buildWeeklyReport(session.user.id);
        aiNarrative = {
          summary: `Weekly summary for ${fallback.period}`,
          improvements: fallback.improved,
          insights: fallback.detectedPatterns,
          nextBestAction: fallback.bestNextAction,
        };
      } catch (fallbackError) {
        console.error("weekly fallback build failed", fallbackError);
        aiNarrative = {
          summary: "Weekly summary is based on available activity signals.",
          improvements: [],
          insights: [],
          nextBestAction: "Keep logging activity this week to improve report fidelity.",
        };
      }
    }

    const since = subDays(new Date(), 7);
    const [userResult, resumesResult, applicationsResult, rejectionsResult, adviceLogsResult, recentAdviceResult, recentRejectionsResult] = await Promise.allSettled([
      prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } }),
      prisma.resume.findMany({ where: { userId: session.user.id, createdAt: { gte: since } }, orderBy: { createdAt: "desc" } }),
      prisma.application.findMany({ where: { userId: session.user.id, createdAt: { gte: since } }, orderBy: { createdAt: "desc" } }),
      prisma.rejection.findMany({ where: { userId: session.user.id, createdAt: { gte: since } }, orderBy: { createdAt: "desc" } }),
      prisma.adviceLog.findMany({ where: { userId: session.user.id, createdAt: { gte: since } }, orderBy: { createdAt: "desc" } }),
      prisma.adviceLog.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, take: 30 }),
      prisma.rejection.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, take: 30 }),
    ]);

    const user = userResult.status === "fulfilled" ? userResult.value : null;
    const resumes = resumesResult.status === "fulfilled" ? resumesResult.value : [];
    const applications = applicationsResult.status === "fulfilled" ? applicationsResult.value : [];
    const rejections = rejectionsResult.status === "fulfilled" ? rejectionsResult.value : [];
    const adviceLogs = adviceLogsResult.status === "fulfilled" ? adviceLogsResult.value : [];
    const recentAdvice = recentAdviceResult.status === "fulfilled" ? recentAdviceResult.value : [];
    const recentRejections = recentRejectionsResult.status === "fulfilled" ? recentRejectionsResult.value : [];

    const degradedData =
      userResult.status === "rejected" ||
      resumesResult.status === "rejected" ||
      applicationsResult.status === "rejected" ||
      rejectionsResult.status === "rejected" ||
      adviceLogsResult.status === "rejected" ||
      recentAdviceResult.status === "rejected" ||
      recentRejectionsResult.status === "rejected";

    const successCount = adviceLogs.filter((item) => item.outcome === AdviceOutcome.SUCCESS).length;
    const failedCount = adviceLogs.filter((item) => item.outcome === AdviceOutcome.FAILURE).length;
    const decidedAdviceCount = successCount + failedCount;

    const rejectionRate = percentage(rejections.length, Math.max(1, applications.length));
    const adviceSuccessRate = percentage(successCount, Math.max(1, decidedAdviceCount));

    const missingSkillFrequency = new Map<string, number>();
    for (const rejection of recentRejections) {
      for (const skill of rejection.missingSkills) {
        const normalized = skill.trim().toLowerCase();
        if (!normalized) {
          continue;
        }

        missingSkillFrequency.set(normalized, (missingSkillFrequency.get(normalized) ?? 0) + 1);
      }
    }

    const topSkillGaps = Array.from(missingSkillFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([skill, count]) => ({ skill, count }));

    const stageFrequency = new Map<string, number>();
    for (const rejection of recentRejections) {
      const key = toTitleCase(rejection.stage);
      stageFrequency.set(key, (stageFrequency.get(key) ?? 0) + 1);
    }

    const topRejectionStage = Array.from(stageFrequency.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unknown";
    const focusSkill = topSkillGaps[0]?.skill ?? "behavioral interview depth";

    const wins = [
      ...(resumes.length > 0 ? [`You uploaded ${resumes.length} resume version(s) this week.`] : []),
      ...(applications.length > 0 ? [`You submitted ${applications.length} targeted application(s).`] : []),
      ...(successCount > 0 ? [`${successCount} advice recommendation(s) turned into successful outcomes.`] : []),
      ...(aiNarrative.improvements.slice(0, 2)),
    ];

    const risks = [
      ...(rejections.length > 0 ? [`${rejections.length} rejection(s) were logged this week.`] : []),
      ...(rejectionRate >= 50 && applications.length > 0
        ? [`Rejection rate is ${rejectionRate}%, which signals a fit or interview-prep mismatch.`]
        : []),
      ...(topSkillGaps.length > 0
        ? [`Recurring gap: ${topSkillGaps[0].skill} appeared ${topSkillGaps[0].count} time(s).`]
        : ["No stable skill-gap pattern has emerged yet."]),
    ];

    const signals = [
      ...(topSkillGaps.map((entry) => `${entry.skill} appeared in ${entry.count} historical rejection(s).`)),
      `Most frequent rejection stage: ${topRejectionStage}.`,
      ...(recentAdvice.length > 0
        ? [`Advice conversion (resolved outcomes): ${adviceSuccessRate}% success over ${decidedAdviceCount} decided item(s).`]
        : ["No advice outcomes logged yet; conversion insights will improve after outcome tracking."]),
      ...aiNarrative.insights.slice(0, 2),
    ].slice(0, 6);

    const nextBestAction = `Run a 5-day sprint focused on ${focusSkill}, then apply to 3 roles where this skill is explicitly required and schedule one mock interview before each application.`;

    const actionPlan = [
      {
        title: `Close ${focusSkill} gap with proof`,
        why: topSkillGaps.length > 0
          ? `${focusSkill} is your highest recurring rejection signal.`
          : "Building stronger evidence will improve role-match confidence.",
        steps: [
          `Build one portfolio artifact that demonstrates ${focusSkill}.`,
          "Add measurable outcomes and constraints to resume bullets.",
        ],
      },
      {
        title: "Tighten application quality gate",
        why: applications.length > 0
          ? `Current weekly rejection rate is ${rejectionRate}% across ${applications.length} application(s).`
          : "A quality gate improves fit before ramping applications.",
        steps: [
          "Apply only when match confidence is 65+ from Job Match.",
          "Track why each role is a fit in one sentence before submitting.",
        ],
      },
      {
        title: `Drill for ${topRejectionStage} stage`,
        why: `${topRejectionStage} is your most common drop-off point.`,
        steps: [
          `Run 2 mock sessions specifically for ${topRejectionStage}.`,
          "Write and rehearse stronger STAR-style examples tied to target roles.",
        ],
      },
    ];

    const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "there";

    const report = {
      period: "Last 7 days",
      generatedAt: new Date().toISOString(),
      headline: `Weekly focus for ${displayName}: raise interview conversion by strengthening ${focusSkill}.`,
      summary:
        applications.length + rejections.length + resumes.length === 0
          ? "No significant activity was captured this week. Start with one resume refresh and 2 high-fit applications to generate better signals."
          : aiNarrative.summary,
      scorecard: {
        resumesUploaded: resumes.length,
        applicationsSent: applications.length,
        rejectionsLogged: rejections.length,
        rejectionRate,
        adviceSuccessRate,
        topSkillGap: focusSkill,
      },
      wins: wins.length > 0 ? wins : ["No major progress milestone captured this week."],
      risks,
      signals,
      improvements: wins,
      insights: signals,
      nextBestAction,
      actionPlan,
      ...(degradedData
        ? {
          warning: "Some data sources were temporarily unavailable. Report is based on partial activity data.",
        }
        : {}),
    };

    void Promise.allSettled([
      prisma.insight.create({
        data: {
          userId: session.user.id,
          type: InsightType.WEEKLY,
          title: "Weekly Hindsight",
          content: {
            period: report.period,
            improved: report.wins,
            detectedPatterns: report.signals,
            bestNextAction: report.nextBestAction,
            summary: report.summary,
            scorecard: report.scorecard,
            actionPlan: report.actionPlan,
          },
        },
      }),
      storeInsight(session.user.id, {
        type: "weekly_report",
        content: {
          patterns: report.signals,
          strategicInsights: [report.summary, report.nextBestAction],
          adviceSuccesses: report.wins,
          adviceFailures: report.risks,
        },
      }),
      logEvent(session.user.id, "advice_given", {
        source: "weekly_report",
        nextBestAction: report.nextBestAction,
      }),
    ]);

    return NextResponse.json(report);
  } catch (error) {
    console.error("report generation failed", error);
    return NextResponse.json({
      period: "Last 7 days",
      generatedAt: new Date().toISOString(),
      headline: "Weekly report is running in safe mode",
      summary: "Weekly report is temporarily running in safe mode due to service unavailability.",
      wins: ["No stable activity snapshot available right now."],
      risks: ["External AI or memory service is currently unavailable."],
      signals: ["Detailed weekly trend extraction is temporarily degraded."],
      improvements: ["No stable activity snapshot available right now."],
      insights: ["External AI or memory service is currently unavailable."],
      nextBestAction: "Retry in a few minutes, or continue logging activity to improve the next report.",
      actionPlan: [
        {
          title: "Keep activity logging",
          why: "The report quality improves directly with tracked events.",
          steps: ["Log applications and outcomes", "Upload the latest resume version"],
        },
      ],
      scorecard: {
        resumesUploaded: 0,
        applicationsSent: 0,
        rejectionsLogged: 0,
        rejectionRate: 0,
        adviceSuccessRate: 0,
        topSkillGap: "unknown",
      },
      warning: "safe_fallback",
    });
  }
}
