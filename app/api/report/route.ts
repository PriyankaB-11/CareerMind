import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { InsightType } from "@prisma/client";
import { buildWeeklyReportAI } from "@/lib/ai";
import { authOptions } from "@/lib/auth";
import { logEvent, storeInsight } from "@/lib/hindsight";
import { prisma } from "@/lib/prisma";
import { buildWeeklyReport } from "@/services/career-intelligence.service";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let report: {
      summary: string;
      improvements: string[];
      insights: string[];
      nextBestAction: string;
    };

    try {
      report = await buildWeeklyReportAI(session.user.id);
    } catch (aiError) {
      console.error("weekly ai failed, falling back", aiError);
      const fallback = await buildWeeklyReport(session.user.id);
      report = {
        summary: `Weekly summary for ${fallback.period}`,
        improvements: fallback.improved,
        insights: fallback.detectedPatterns,
        nextBestAction: fallback.bestNextAction,
      };
    }

    void Promise.allSettled([
      prisma.insight.create({
        data: {
          userId: session.user.id,
          type: InsightType.WEEKLY,
          title: "Weekly Hindsight",
          content: {
            period: "Last 7 days",
            improved: report.improvements,
            detectedPatterns: report.insights,
            bestNextAction: report.nextBestAction,
            summary: report.summary,
          },
        },
      }),
      storeInsight(session.user.id, {
        type: "weekly_report",
        content: {
          patterns: report.insights,
          strategicInsights: [report.summary, report.nextBestAction],
          adviceSuccesses: [],
          adviceFailures: [],
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
      summary: "Weekly report is temporarily running in safe mode due to service unavailability.",
      improvements: ["No stable activity snapshot available right now."],
      insights: ["External AI/memory service is currently unavailable."],
      nextBestAction: "Retry in a few minutes, or continue logging activity to improve the next report.",
      warning: "safe_fallback",
    });
  }
}
