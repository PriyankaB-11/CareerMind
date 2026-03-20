import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { extractResumeWithAI } from "@/lib/ai";
import { logEvent, updateSemanticProfile } from "@/lib/hindsight";
import { extractSkillsAndProjects } from "@/services/resume-parser.service";
import { extractTextFromPdfBufferFallback } from "@/services/resume-parser.service";
import { parsePdfBuffer } from "@/services/resume-parser.service";
import { uploadResumeForUser } from "@/services/career-intelligence.service";

export const runtime = "nodejs";

function sanitizeResumeText(input: string): string {
  return input
    .replace(/\u0000/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .trim();
}

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
    let text = "";

    try {
      text = await parsePdfBuffer(buffer);
    } catch (parseError) {
      console.error("pdf parse failed, falling back", parseError);
      text = extractTextFromPdfBufferFallback(buffer);
    }

    if (!text || text.trim().length === 0) {
      // Some valid PDFs can be image-only or parser-resistant.
      // Keep upload successful with minimal text so downstream storage still works.
      text = `${file.name}\n`;
    }

    text = sanitizeResumeText(text).slice(0, 120000);
    if (!text) {
      text = file.name;
    }

    const heuristic = extractSkillsAndProjects(text);
    let extracted: { skills: string[]; projects: string[] } = heuristic;

    try {
      const aiExtracted = await Promise.race([
        extractResumeWithAI(session.user.id, text),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("AI extraction timeout")), 5000);
        }),
      ]);

      extracted = {
        skills: Array.from(new Set([...heuristic.skills, ...aiExtracted.skills])).slice(0, 80),
        projects: Array.from(new Set([...heuristic.projects, ...aiExtracted.projects])).slice(0, 30),
      };
    } catch (aiError) {
      console.error("resume ai extraction failed, falling back", aiError);
      extracted = heuristic;
    }

    await uploadResumeForUser({
      userId: session.user.id,
      filename: file.name,
      text,
      skills: extracted.skills,
      projects: extracted.projects,
    });

    void Promise.allSettled([
      updateSemanticProfile(session.user.id, {
        skills: extracted.skills,
        projects: extracted.projects,
        strengths: extracted.skills.slice(0, 6),
        weaknesses: [],
      }),
      logEvent(session.user.id, "resume_uploaded", {
        filename: file.name,
        extractedSkills: extracted.skills,
        extractedProjects: extracted.projects,
      }),
    ]);

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

    const normalized = message.toLowerCase();
    const isLikelyInvalidPdf =
      normalized.includes("invalidpdf") ||
      normalized.includes("invalid pdf") ||
      normalized.includes("no pdf header") ||
      normalized.includes("unexpected eof") ||
      normalized.includes("corrupt pdf") ||
      normalized.includes("malformed pdf");

    if (isLikelyInvalidPdf) {
      return NextResponse.json({ error: "Invalid PDF file. Please upload a valid resume PDF." }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to process resume" }, { status: 500 });
  }
}
