import { Prisma, PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient(buildPrismaOptions());

function buildPrismaOptions(): Prisma.PrismaClientOptions {
  const options: Prisma.PrismaClientOptions = {
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  };

  const normalizedUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (normalizedUrl) {
    options.datasources = {
      db: {
        url: normalizedUrl,
      },
    };
  }

  return options;
}

function normalizeDatabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) {
    return undefined;
  }

  try {
    const parsed = new URL(rawUrl);
    const isSupabasePooler = parsed.host.includes("pooler.supabase.com");

    if (!isSupabasePooler) {
      return rawUrl;
    }

    if (!parsed.searchParams.has("pgbouncer")) {
      parsed.searchParams.set("pgbouncer", "true");
    }

    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", "1");
    }

    if (!parsed.searchParams.has("sslmode")) {
      parsed.searchParams.set("sslmode", "require");
    }

    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
