import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { extractSkillsAndProjects, parsePdfBuffer } from "@/services/resume-parser.service";
import { uploadResumeForUser } from "@/services/career-intelligence.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("resume");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing resume file" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await parsePdfBuffer(buffer);
    const extracted = extractSkillsAndProjects(text);

    await uploadResumeForUser({
      userId: session.user.id,
      filename: file.name,
      text,
      skills: extracted.skills,
      projects: extracted.projects,
    });

    return NextResponse.json({
      filename: file.name,
      skills: extracted.skills,
      projects: extracted.projects,
    });
  } catch (error) {
    console.error("resume upload failed", error);

    const message = error instanceof Error ? error.message : "";
    if (message.toLowerCase().includes("password") || message.toLowerCase().includes("encrypted")) {
      return NextResponse.json(
        { error: "Password-protected PDFs are not supported. Please upload an unlocked PDF." },
        { status: 400 }
      );
    }

    if (message.toLowerCase().includes("invalid") || message.toLowerCase().includes("pdf")) {
      return NextResponse.json({ error: "Invalid PDF file. Please upload a valid resume PDF." }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to process resume" }, { status: 500 });
  }
}
