import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { fetchHistory } from "@/services/career-intelligence.service";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const history = await fetchHistory(session.user.id);
    return NextResponse.json(history);
  } catch (error) {
    console.error("history fetch failed", error);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}
