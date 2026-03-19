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

    await Promise.all([rebuildSemanticMemory(session.user.id), rebuildReflectiveMemory(session.user.id)]);
    const dashboard = await fetchDashboard(session.user.id);
    return NextResponse.json(dashboard);
  } catch (error) {
    console.error("dashboard fetch failed", error);

    const message = error instanceof Error ? error.message : "";
    if (message.includes("P1001") || message.includes("Can't reach database server")) {
      return NextResponse.json({
        ...EMPTY_DASHBOARD,
        warning: "Database is currently unreachable. Showing an empty dashboard for now.",
      });
    }

    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
