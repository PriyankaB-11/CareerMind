import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { fetchDashboard, rebuildReflectiveMemory, rebuildSemanticMemory } from "@/services/career-intelligence.service";

const EMPTY_DASHBOARD = {
  semantic: {
    skills: [],
    projects: [],
    strengths: [],
    weaknesses: [],
  },
  reflective: {
    repeatedSkillFailures: [],
    repeatedCompanyTypeFailures: [],
    successfulStrategies: [],
    failedStrategies: [],
  },
  weekly: null,
  radar: [
    { dimension: "DSA", score: 0 },
    { dimension: "System Design", score: 0 },
    { dimension: "Frontend", score: 0 },
    { dimension: "Backend", score: 0 },
    { dimension: "Open Source", score: 0 },
    { dimension: "Communication", score: 0 },
    { dimension: "Domain Knowledge", score: 0 },
    { dimension: "Strategy", score: 0 },
  ],
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const refreshResults = await Promise.allSettled([
      rebuildSemanticMemory(session.user.id),
      rebuildReflectiveMemory(session.user.id),
    ]);

    const dashboard = await fetchDashboard(session.user.id);

    const refreshWarning =
      refreshResults.some((result) => result.status === "rejected")
        ? "Live memory refresh partially failed. Showing the latest available analysis."
        : undefined;

    if (refreshWarning) {
      return NextResponse.json({
        ...dashboard,
        warning: refreshWarning,
      });
    }

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error("dashboard fetch failed", error);
    return NextResponse.json({
      ...EMPTY_DASHBOARD,
      warning: "Live intelligence is temporarily unavailable. Showing a safe fallback view.",
    });
  }
}
