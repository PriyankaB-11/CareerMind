import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createTargetCompanySchema = z.object({
  name: z.string().min(2).max(120),
  role: z.string().trim().max(120).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createTargetCompanySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const company = await prisma.targetCompany.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name.trim(),
        role: parsed.data.role?.trim() || null,
      },
    });

    return NextResponse.json(company);
  } catch (error) {
    console.error("target company create failed", error);
    return NextResponse.json({ error: "Failed to add target company" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const companies = await prisma.targetCompany.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error("target company fetch failed", error);
    return NextResponse.json({ error: "Failed to load target companies" }, { status: 500 });
  }
}
