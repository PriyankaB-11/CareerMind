import { KNOWN_SKILLS } from "@/services/keywords";
import { uniq } from "@/services/text-utils";

export async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  const pdfParseModule = await import("pdf-parse");
  const PDFParseCtor =
    (pdfParseModule as { PDFParse?: new (input: { data: Buffer }) => { getText: () => Promise<{ text?: string }>; destroy: () => Promise<void> } }).PDFParse ??
    (
      (pdfParseModule as { default?: { PDFParse?: new (input: { data: Buffer }) => { getText: () => Promise<{ text?: string }>; destroy: () => Promise<void> } } }).default
    )?.PDFParse;

  if (!PDFParseCtor) {
    throw new Error("PDF parser is not available in this runtime");
  }

  const parser = new PDFParseCtor({ data: buffer });

  try {
    const parsed = await parser.getText();
    return parsed.text || "";
  } finally {
    await parser.destroy();
  }
}

export function extractSkillsAndProjects(text: string): { skills: string[]; projects: string[] } {
  const lower = text.toLowerCase();
  const skills = uniq(KNOWN_SKILLS.filter((skill) => lower.includes(skill)));

  const projects = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 20)
    .filter((line) => /project|built|developed|implemented|designed|shipped|platform|dashboard/i.test(line))
    .slice(0, 8);

  return {
    skills,
    projects,
  };
}
