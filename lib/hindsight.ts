import { HindsightClient } from "@vectorize-io/hindsight-client";

export type EpisodicEventType =
  | "resume_uploaded"
  | "job_applied"
  | "rejection_logged"
  | "advice_given"
  | "outcome_recorded";

export interface SemanticProfile {
  skills: string[];
  projects: string[];
  strengths: string[];
  weaknesses: string[];
}

export interface ReflectiveInsight {
  patterns: string[];
  adviceSuccesses: string[];
  adviceFailures: string[];
  strategicInsights: string[];
  updatedAt: string;
}

interface TimelineEvent {
  userId: string;
  type: EpisodicEventType;
  timestamp: string;
  metadata: Record<string, unknown>;
}

const DEFAULT_BASE_URL = "https://api.hindsight.vectorize.io";
const ensuredBanks = new Set<string>();

function getClient() {
  const apiKey = process.env.HINDSIGHT_API_KEY;
  if (!apiKey) {
    throw new Error("HINDSIGHT_API_KEY is missing");
  }

  return new HindsightClient({
    baseUrl: process.env.HINDSIGHT_BASE_URL ?? DEFAULT_BASE_URL,
    apiKey,
  });
}

function getBankId(userId: string) {
  return `careermind-user-${userId}`;
}

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === 1) {
        throw error;
      }
    }
  }

  throw lastError;
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function toStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.filter((item): item is string => typeof item === "string");
}

async function ensureBank(userId: string) {
  const client = getClient();
  const bankId = getBankId(userId);

  if (ensuredBanks.has(bankId)) {
    return { client, bankId };
  }

  await withRetry(() =>
    client.createBank(bankId, {
      reflectMission:
        "CareerMind memory bank for persistent career intelligence. Keep track of user events, profile signals, and reflective strategy insights.",
      retainMission:
        "Extract concrete career facts, outcomes, skills, projects, and strategy signals from every memory item.",
      enableObservations: true,
      retainExtractionMode: "concise",
    }),
  );

  ensuredBanks.add(bankId);

  return { client, bankId };
}

export async function logEvent(userId: string, type: EpisodicEventType, data: Record<string, unknown>) {
  let client: HindsightClient;
  let bankId: string;

  try {
    const setup = await ensureBank(userId);
    client = setup.client;
    bankId = setup.bankId;
  } catch {
    return;
  }

  const event: TimelineEvent = {
    userId,
    type,
    timestamp: new Date().toISOString(),
    metadata: data,
  };

  await withRetry(() =>
    client.retain(bankId, JSON.stringify(event), {
      timestamp: event.timestamp,
      tags: ["episodic", "event", `event:${type}`],
      metadata: {
        userId,
        type,
        timestamp: event.timestamp,
      },
    }),
  );
}

export async function getUserTimeline(userId: string): Promise<TimelineEvent[]> {
  let client: HindsightClient;
  let bankId: string;

  try {
    const setup = await ensureBank(userId);
    client = setup.client;
    bankId = setup.bankId;
  } catch {
    return [];
  }

  try {
    const recalled = await withRetry(() =>
      client.recall(bankId, "Recent episodic timeline events for this user.", {
        tags: ["episodic"],
        tagsMatch: "any_strict",
        budget: "high",
      }),
    );

    const events = recalled.results
      .map((result) => extractJsonObject(result.text))
      .filter((item): item is Record<string, unknown> => item !== null)
      .map((item) => ({
        userId: typeof item.userId === "string" ? item.userId : userId,
        type: (typeof item.type === "string" ? item.type : "advice_given") as EpisodicEventType,
        timestamp: typeof item.timestamp === "string" ? item.timestamp : new Date().toISOString(),
        metadata:
          item.metadata && typeof item.metadata === "object"
            ? (item.metadata as Record<string, unknown>)
            : {},
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return events;
  } catch {
    return [];
  }
}

export async function getSemanticProfile(userId: string): Promise<SemanticProfile> {
  let client: HindsightClient;
  let bankId: string;

  try {
    const setup = await ensureBank(userId);
    client = setup.client;
    bankId = setup.bankId;
  } catch {
    return { skills: [], projects: [], strengths: [], weaknesses: [] };
  }

  try {
    const recalled = await withRetry(() =>
      client.recall(bankId, "Latest semantic profile as JSON.", {
        tags: ["semantic_profile"],
        tagsMatch: "any_strict",
        budget: "high",
      }),
    );

    const latest = recalled.results[0];
    const parsed = latest ? extractJsonObject(latest.text) : null;

    return {
      skills: toStringArray(parsed?.skills),
      projects: toStringArray(parsed?.projects),
      strengths: toStringArray(parsed?.strengths),
      weaknesses: toStringArray(parsed?.weaknesses),
    };
  } catch {
    return { skills: [], projects: [], strengths: [], weaknesses: [] };
  }
}

export async function updateSemanticProfile(userId: string, profile: SemanticProfile) {
  try {
    const { client, bankId } = await ensureBank(userId);

    await withRetry(() =>
      client.retain(bankId, JSON.stringify(profile), {
        timestamp: new Date().toISOString(),
        tags: ["semantic", "profile", "semantic_profile"],
        metadata: {
          userId,
          layer: "semantic",
        },
      }),
    );
  } catch {
    return;
  }
}

export async function getReflectiveInsights(userId: string): Promise<ReflectiveInsight> {
  let client: HindsightClient;
  let bankId: string;

  try {
    const setup = await ensureBank(userId);
    client = setup.client;
    bankId = setup.bankId;
  } catch {
    return {
      patterns: [],
      adviceSuccesses: [],
      adviceFailures: [],
      strategicInsights: [],
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    const recalled = await withRetry(() =>
      client.recall(bankId, "Latest reflective insights as JSON.", {
        tags: ["reflective_insight"],
        tagsMatch: "any_strict",
        budget: "high",
      }),
    );

    const latest = recalled.results[0];
    const parsed = latest ? extractJsonObject(latest.text) : null;

    return {
      patterns: toStringArray(parsed?.patterns),
      adviceSuccesses: toStringArray(parsed?.adviceSuccesses),
      adviceFailures: toStringArray(parsed?.adviceFailures),
      strategicInsights: toStringArray(parsed?.strategicInsights),
      updatedAt: typeof parsed?.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return {
      patterns: [],
      adviceSuccesses: [],
      adviceFailures: [],
      strategicInsights: [],
      updatedAt: new Date().toISOString(),
    };
  }
}

export async function storeInsight(
  userId: string,
  insight: {
    type: string;
    content: Record<string, unknown>;
  },
) {
  try {
    const { client, bankId } = await ensureBank(userId);

    await withRetry(() =>
      client.retain(
        bankId,
        JSON.stringify({
          ...insight.content,
          updatedAt: new Date().toISOString(),
        }),
        {
          timestamp: new Date().toISOString(),
          tags: ["reflective", "insight", "reflective_insight", `insight:${insight.type}`],
          metadata: {
            userId,
            type: insight.type,
            layer: "reflective",
          },
        },
      ),
    );
  } catch {
    return;
  }
}
