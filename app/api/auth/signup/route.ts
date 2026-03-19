import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const signupSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid signup input" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await hash(parsed.data.password, 10);

    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("signup failed", error);

    const message = error instanceof Error ? error.message : "";

    if (message.includes("P1001") || message.includes("Can't reach database server")) {
      return NextResponse.json(
        {
          error:
            "Database is unreachable. Check DATABASE_URL/network and try again.",
        },
        { status: 503 }
      );
    }

    if (message.includes("P1000") || message.includes("Authentication failed")) {
      return NextResponse.json(
        {
          error:
            "Database authentication failed. Verify DB username/password in DATABASE_URL.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
