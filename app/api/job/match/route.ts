import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { AdviceOutcome, EventType } from "@prisma/client";
import { analyzeJobMatch } from "@/lib/ai";
import { logEvent } from "@/lib/hindsight";
import { prisma } from "@/lib/prisma";
import { matchJobForUser } from "@/services/career-intelligence.service";

const schema = z.object({
  jdText: z.string().min(20),
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
      return NextResponse.json({ error: "Invalid job description" }, { status: 400 });
    }

    let result: {
      matchScore: number;
      missingSkills: string[];
      strengths: string[];
      recommendation: "APPLY" | "IMPROVE";
      guidance?: string;
    };

    const userSkills = await prisma.skill.findMany({ where: { userId: session.user.id }, take: 1 });
    const hasResumeData = userSkills.length > 0;

    try {
      result = await analyzeJobMatch(session.user.id, parsed.data.jdText);
    } catch (aiError) {
      console.error("job match ai failed, falling back", aiError);
      const fallback = await matchJobForUser(session.user.id, parsed.data.jdText);
      result = {
        matchScore: fallback.score,
        missingSkills: fallback.missingSkills,
        strengths: fallback.matchedSkills,
        recommendation: fallback.recommendation === "Apply" ? "APPLY" : "IMPROVE",
        guidance: !hasResumeData
          ? "Upload a resume first to get accurate skill matching. This is an initial estimate based on the job description."
          : undefined,
      };
    }

    const strategy = result.recommendation === "APPLY" ? "apply_with_current_strengths" : "improve_skill_gaps";
    const advice = await prisma.adviceLog.create({
      data: {
        userId: session.user.id,
        strategy,
        advice:
          result.recommendation === "APPLY"
            ? "Apply now and emphasize the strongest matching projects."
            : `Improve first by closing these gaps: ${result.missingSkills.slice(0, 4).join(", ") || "core role skills"}.`,
        outcome: AdviceOutcome.PENDING,
        priorityScore: result.recommendation === "APPLY" ? 1.2 : 1,
      },
    });

    await prisma.careerEvent.create({
      data: {
        userId: session.user.id,
        type: EventType.JOB_MATCH,
        title: `AI job match score ${result.matchScore}`,
        metadata: {
          recommendation: result.recommendation,
          missingSkills: result.missingSkills,
          strengths: result.strengths,
        },
      },
    });

    await logEvent(session.user.id, "advice_given", {
      adviceId: advice.id,
      strategy,
      recommendation: result.recommendation,
      score: result.matchScore,
    });

    return NextResponse.json({
      score: result.matchScore,
      matchedSkills: result.strengths,
      missingSkills: result.missingSkills,
      strengths: result.strengths,
      recommendation: result.recommendation,
      adviceId: advice.id,
      strategy,
    });
  } catch (error) {
    console.error("job match failed", error);
    return NextResponse.json({ error: "Failed to run job match" }, { status: 500 });
  }
}
