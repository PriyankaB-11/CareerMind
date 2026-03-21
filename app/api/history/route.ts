import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { fetchHistory } from "@/services/career-intelligence.service";

const EMPTY_HISTORY = {
  applications: [],
  rejections: [],
  events: [],
  warning: "History data is temporarily unavailable. Showing an empty timeline.",
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({
        ...EMPTY_HISTORY,
        warning: "Sign in to view your timeline history.",
      });
    }

    const history = await fetchHistory(session.user.id);
    return NextResponse.json(history);
  } catch (error) {
    console.error("history fetch failed", error);
    return NextResponse.json(EMPTY_HISTORY);
  }
}
