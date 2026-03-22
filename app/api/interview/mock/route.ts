import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { generateMockInterviewFeedback } from "@/lib/interview";

const mockInterviewSchema = z.object({
  company: z.string().min(2).max(120),
  role: z.string().max(120).optional(),
  question: z.string().min(10).max(500),
  answer: z.string().min(20).max(3000),
  userSkills: z.array(z.string().min(1)).default([]),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = mockInterviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const feedback = await generateMockInterviewFeedback({
      company: parsed.data.company.trim(),
      role: parsed.data.role?.trim(),
      question: parsed.data.question.trim(),
      answer: parsed.data.answer.trim(),
      userSkills: parsed.data.userSkills.map((skill) => skill.trim()).filter(Boolean),
    });

    return NextResponse.json(feedback);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate mock interview feedback";
    console.error("mock interview generation failed", error);
    const status = message.toLowerCase().includes("json") ? 502 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
