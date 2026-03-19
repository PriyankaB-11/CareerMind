import { AdviceOutcome, CompanyType, InterviewStage } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { logRejectionForUser } from "@/services/career-intelligence.service";

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

    const result = await logRejectionForUser({
      userId: session.user.id,
      company: parsed.data.company,
      role: parsed.data.role,
      companyType: parsed.data.companyType,
      stage: parsed.data.stage,
      reasonText: parsed.data.reasonText,
      missingSkills: parsed.data.missingSkills,
      adviceId: parsed.data.adviceId,
      adviceOutcome: parsed.data.adviceOutcome,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("rejection log failed", error);
    return NextResponse.json({ error: "Failed to log rejection" }, { status: 500 });
  }
}
