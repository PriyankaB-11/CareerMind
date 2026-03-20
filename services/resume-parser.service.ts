import { KNOWN_SKILLS } from "@/services/keywords";
import { uniq } from "@/services/text-utils";
import { createRequire } from "node:module";

const SKILL_ALIASES: Array<{ pattern: RegExp; canonical: string }> = [
  { pattern: /\bjs\b/i, canonical: "javascript" },
  { pattern: /\bts\b/i, canonical: "typescript" },
  { pattern: /\breactjs\b/i, canonical: "react" },
  { pattern: /\bnextjs\b/i, canonical: "next.js" },
  { pattern: /\bnodejs\b/i, canonical: "node.js" },
  { pattern: /\bpostgres\b/i, canonical: "postgresql" },
  { pattern: /\bk8s\b/i, canonical: "kubernetes" },
  { pattern: /\bci\/?cd\b/i, canonical: "cicd" },
  { pattern: /\brest api(s)?\b/i, canonical: "rest" },
  { pattern: /\bml\b/i, canonical: "machine learning" },
  { pattern: /\bgit\b/i, canonical: "git" },
  { pattern: /\bgithub\b/i, canonical: "git" },
  { pattern: /\bversion control\b/i, canonical: "git" },
  { pattern: /\brdbms\b/i, canonical: "sql" },
  { pattern: /\bdb(s)?\b/i, canonical: "database" },
  { pattern: /\bapi(s)?\b/i, canonical: "rest" },
  { pattern: /\bfront.?end\b/i, canonical: "frontend" },
  { pattern: /\bback.?end\b/i, canonical: "backend" },
  { pattern: /\bfull.?stack\b/i, canonical: "full-stack" },
];

const requireModule = createRequire(__filename);

export async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  const pdfParseModule = requireModule("pdf-parse") as {
    default?: unknown;
    PDFParse?: new (input: { data: Buffer }) => { getText: () => Promise<{ text?: string }>; destroy: () => Promise<void> };
  };

  const functionParser =
    (typeof pdfParseModule.default === "function" ? (pdfParseModule.default as (input: Buffer) => Promise<{ text?: string }>) : undefined) ??
    (typeof (pdfParseModule as unknown) === "function" ? ((pdfParseModule as unknown) as (input: Buffer) => Promise<{ text?: string }>) : undefined);

  if (functionParser) {
    const parsed = await functionParser(buffer);
    return parsed.text || "";
  }

  const PDFParseCtor =
    pdfParseModule.PDFParse ??
    ((pdfParseModule.default as { PDFParse?: new (input: { data: Buffer }) => { getText: () => Promise<{ text?: string }>; destroy: () => Promise<void> } } | undefined)
      ?.PDFParse);

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

export function extractTextFromPdfBufferFallback(buffer: Buffer): string {
  const raw = buffer.toString("latin1");
  const chunks = raw.match(/[A-Za-z][A-Za-z0-9+.#\-/ ]{2,}/g) ?? [];
  return chunks
    .map((c) => c.trim())
    .filter((c) => c.length >= 3 && c.length <= 100)
    .slice(0, 3000)
    .join("\n");
}

export function extractSkillsAndProjects(text: string): { skills: string[]; projects: string[] } {
  if (!text || text.trim().length < 2) {
    return { skills: [], projects: [] };
  }

  const lower = text.toLowerCase();
  const directSkills = KNOWN_SKILLS.filter((skill) => lower.includes(skill));
  const aliasSkills = SKILL_ALIASES.filter((entry) => entry.pattern.test(text)).map((entry) => entry.canonical);
  const skills = uniq([...directSkills, ...aliasSkills]);

  if (skills.length === 0) {
    return {
      skills: extractFallbackSkills(text).slice(0, 15),
      projects: extractFallbackProjects(text.split(/\r?\n/)).slice(0, 10),
    };
  }

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const projectSectionIndex = lines.findIndex((line) => /^(projects?|work|experience|portfolio)\b/i.test(line));
  const sectionCandidates = projectSectionIndex >= 0 ? lines.slice(projectSectionIndex + 1, Math.min(projectSectionIndex + 20, lines.length)) : [];
  const lineCandidates = lines
    .filter((line) => line.length >= 12 && line.length <= 160)
    .filter((line) => !/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(line))
    .filter((line) => /project|built|developed|implemented|designed|shipped|platform|dashboard|api|automation|system|application|tool/i.test(line));

  const projects = uniq([...sectionCandidates, ...lineCandidates]).slice(0, 15);

  return { skills: skills.slice(0, 80), projects };
}

function extractFallbackSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const skillKeywords = ["programming", "languages", "skills", "competencies", "expertise", "tools", "technologies"];
  
  for (const keyword of skillKeywords) {
    const idx = lower.indexOf(keyword);
    if (idx > -1) {
      const snippet = text.substring(Math.max(0, idx), Math.min(text.length, idx + 600));
      const words = snippet
        .split(/[\s,;:/\-•\n]+/)
        .filter((w) => w.length > 2 && w.length < 25)
        .filter((w) => !/^(and|or|the|a|an|is|in|on|at|by)$/i.test(w))
        .filter((w) => !/^[()[\]{}]$/.test(w));
      if (words.length > 0) return words.slice(0, 12);
    }
  }
  return [];
}

function extractFallbackProjects(lines: string[]): string[] {
  return lines
    .filter((line) => line.length > 8 && line.length < 150)
    .filter((line) => !/^(references|contact|education|certifications)$/i.test(line))
    .filter((line) => /project|built|developed|created|application|system|tool|feature|library|developed|designed/i.test(line))
    .slice(0, 8);
}
