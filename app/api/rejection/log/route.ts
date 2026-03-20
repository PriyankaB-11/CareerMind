import { AdviceOutcome, CompanyType, InterviewStage } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeRejectionAutopsy, recordAdviceOutcome } from "@/lib/ai";
import { authOptions } from "@/lib/auth";
import { logEvent, storeInsight } from "@/lib/hindsight";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  company: z.string().min(2),
  role: z.string().min(2),
  companyType: z.nativeEnum(CompanyType).optional(),
  stage: z.nativeEnum(InterviewStage).optional(),
  reasonText: z.string().max(500).optional(),
  missingSkills: z.array(z.string().min(1)).default([]),
  adviceId: z.string().optional(),
  adviceOutcome: z.nativeEnum(AdviceOutcome).optional(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid rejection payload" }, { status: 400 });
    }

    const rejection = await prisma.rejection.create({
      data: {
        userId: session.user.id,
        company: parsed.data.company,
        role: parsed.data.role,
        companyType: parsed.data.companyType ?? CompanyType.UNKNOWN,
        stage: parsed.data.stage ?? InterviewStage.UNKNOWN,
        reasonText: parsed.data.reasonText,
        missingSkills: parsed.data.missingSkills,
      },
    });

    await prisma.application.create({
      data: {
        userId: session.user.id,
        company: parsed.data.company,
        role: parsed.data.role,
        status: "REJECTED",
        notes: parsed.data.reasonText,
        appliedAt: rejection.createdAt,
      },
    });

    let autopsy: {
      reason: string;
      patterns: string[];
      criticalGap: string;
      actionPlan: string[];
    };

    try {
      autopsy = await analyzeRejectionAutopsy(session.user.id, {
        company: parsed.data.company,
        role: parsed.data.role,
        companyType: parsed.data.companyType,
        stage: parsed.data.stage,
        reasonText: parsed.data.reasonText,
        missingSkills: parsed.data.missingSkills,
      });
    } catch (aiError) {
      console.error("rejection ai failed, falling back", aiError);
      const primaryGap = parsed.data.missingSkills[0] ?? "interview depth";
      autopsy = {
        reason: parsed.data.reasonText || "Rejection logged. AI autopsy unavailable for this request.",
        patterns: parsed.data.missingSkills.length > 0 ? parsed.data.missingSkills : ["insufficient signal"],
        criticalGap: primaryGap,
        actionPlan: [
          `Build one focused project around ${primaryGap}.`,
          "Practice one mock interview and record weak answers.",
          "Re-apply only after measurable improvement evidence is ready.",
        ],
      };
    }

    await prisma.insight.upsert({
      where: { id: `${session.user.id}-autopsy` },
      update: {
        title: "Rejection Autopsy",
        content: {
          reason: autopsy.reason,
          patterns: autopsy.patterns,
          criticalGap: autopsy.criticalGap,
          actionPlan: autopsy.actionPlan,
        },
      },
      create: {
        id: `${session.user.id}-autopsy`,
        userId: session.user.id,
        type: "AUTOPSY",
        title: "Rejection Autopsy",
        content: {
          reason: autopsy.reason,
          patterns: autopsy.patterns,
          criticalGap: autopsy.criticalGap,
          actionPlan: autopsy.actionPlan,
        },
      },
    });

    await prisma.careerEvent.create({
      data: {
        userId: session.user.id,
        type: "REJECTION",
        title: `Rejection logged at ${parsed.data.company}`,
        metadata: {
          role: parsed.data.role,
          reason: autopsy.reason,
          criticalGap: autopsy.criticalGap,
        },
      },
    });

    await logEvent(session.user.id, "rejection_logged", {
      company: parsed.data.company,
      role: parsed.data.role,
      stage: parsed.data.stage,
      reason: autopsy.reason,
      criticalGap: autopsy.criticalGap,
      patterns: autopsy.patterns,
    });

    await storeInsight(session.user.id, {
      type: "rejection_patterns",
      content: {
        patterns: autopsy.patterns,
        strategicInsights: [autopsy.reason, `Critical gap: ${autopsy.criticalGap}`],
        adviceSuccesses: [],
        adviceFailures: autopsy.actionPlan,
      },
    });

    if (parsed.data.adviceId && parsed.data.adviceOutcome) {
      await prisma.adviceLog.update({
        where: { id: parsed.data.adviceId },
        data: {
          outcome: parsed.data.adviceOutcome,
          priorityScore:
            parsed.data.adviceOutcome === AdviceOutcome.SUCCESS
              ? { increment: 0.2 }
              : parsed.data.adviceOutcome === AdviceOutcome.FAILURE
                ? { decrement: 0.2 }
                : undefined,
        },
      });

        if (parsed.data.adviceOutcome === AdviceOutcome.SUCCESS || parsed.data.adviceOutcome === AdviceOutcome.FAILURE) {
          await recordAdviceOutcome(session.user.id, {
            adviceId: parsed.data.adviceId,
            outcome: parsed.data.adviceOutcome,
          });
        }
    }

    return NextResponse.json(autopsy);
  } catch (error) {
    console.error("rejection log failed", error);
    return NextResponse.json({ error: "Failed to log rejection" }, { status: 500 });
  }
}
