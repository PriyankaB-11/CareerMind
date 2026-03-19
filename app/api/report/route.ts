import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { buildWeeklyReport } from "@/services/career-intelligence.service";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await buildWeeklyReport(session.user.id);
    return NextResponse.json(report);
  } catch (error) {
    console.error("report generation failed", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
