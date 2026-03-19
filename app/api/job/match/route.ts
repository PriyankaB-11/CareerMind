import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { matchJobForUser } from "@/services/career-intelligence.service";

const schema = z.object({
  jdText: z.string().min(20),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid job description" }, { status: 400 });
    }

    const result = await matchJobForUser(session.user.id, parsed.data.jdText);
    return NextResponse.json(result);
  } catch (error) {
    console.error("job match failed", error);
    return NextResponse.json({ error: "Failed to run job match" }, { status: 500 });
  }
}
