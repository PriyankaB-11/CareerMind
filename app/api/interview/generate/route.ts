import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { generateInterviewQuestions } from "@/lib/interview";
import { prisma } from "@/lib/prisma";

const generateInterviewSchema = z.object({
  company: z.string().min(2).max(120),
  role: z.string().max(120).optional(),
  userSkills: z.array(z.string().min(1)).default([]),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = generateInterviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const payload = {
      company: parsed.data.company.trim(),
      role: parsed.data.role?.trim() || undefined,
      userSkills: parsed.data.userSkills.map((skill) => skill.trim()).filter(Boolean),
    };

    let questions;
    try {
      questions = await generateInterviewQuestions(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown interview generation error";
      const status = message.toLowerCase().includes("json") ? 502 : 500;
      return NextResponse.json({ error: message }, { status });
    }

    const targetCompany = await prisma.targetCompany.findFirst({
      where: {
        userId: session.user.id,
        name: payload.company,
      },
      orderBy: { createdAt: "desc" },
    });

    const saved = await prisma.interviewPrep.create({
      data: {
        userId: session.user.id,
        targetCompanyId: targetCompany?.id,
        company: payload.company,
        role: payload.role,
        userSkills: payload.userSkills,
        technical: questions.technical,
        behavioral: questions.behavioral,
        coding: questions.coding,
        focusAreas: questions.focusAreas,
      },
    });

    return NextResponse.json({
      ...questions,
      prepId: saved.id,
      createdAt: saved.createdAt,
    });
  } catch (error) {
    console.error("interview generation failed", error);
    return NextResponse.json({ error: "Failed to generate interview prep" }, { status: 500 });
  }
}
