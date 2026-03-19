# CareerMind

CareerMind is a production-ready SaaS web application for persistent AI-powered career intelligence.

It tracks user activity over time, learns from outcomes, and generates personalized, evolving insights.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- ShadCN-style UI primitives
- Recharts
- Prisma ORM
- PostgreSQL
- NextAuth (credentials auth)

## Core Capabilities

- Full authentication and protected product routes
- User-isolated data access in every API route
- Resume PDF upload and parsing (`pdf-parse`)
- Job description match scoring + top skill gaps + recommendation
- Rejection autopsy with repeated failure pattern detection
- Career DNA radar chart generated from persisted user data
- Weekly hindsight report generator
- Self-improving advice system (outcome-based priority adjustment)

## Memory Model (Persisted in DB)

CareerMind implements 3 memory layers using relational data and derived insights:

1. Episodic Memory
	- `Application`, `Rejection`, `Resume`, `CareerEvent`
2. Semantic Memory
	- Derived profile (`Skill`, `Project`, strengths, weaknesses)
	- Stored in `Insight` (`type=SEMANTIC`)
3. Reflective Memory
	- Repeated failures, strategy outcomes, advice effectiveness
	- Stored in `Insight` (`type=REFLECTIVE`, `type=AUTOPSY`, `type=WEEKLY`)

## Routes

Pages:

- `/`
- `/auth/signin`
- `/auth/signup`
- `/dashboard`
- `/upload`
- `/job-match`
- `/history`
- `/reports`

API routes:

- `POST /api/auth/signup`
- `POST|GET /api/auth/[...nextauth]`
- `POST /api/resume/upload`
- `POST /api/job/match`
- `POST /api/rejection/log`
- `GET /api/dashboard`
- `GET /api/history`
- `GET /api/report`

## Prisma Models

- `User`
- `Resume`
- `Skill`
- `Project`
- `Application`
- `Rejection`
- `AdviceLog`
- `Insight`
- `CareerEvent`
- `Account`, `Session`, `VerificationToken` (NextAuth)

All key models include relations, timestamps, and indexes.

## Environment Variables

Create `.env` from `.env.example`.

Required:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

Example:

```bash
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-1-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
```

## Quick Start (Clone + Run)

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd CareerMind
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create environment file

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Then edit `.env` and set real values for:

- `DATABASE_URL` (runtime DB connection)
- `DIRECT_URL` (direct DB connection for Prisma migrations)
- `NEXTAUTH_SECRET`

### 4. Generate Prisma client

```bash
npm run prisma:generate
```

### 5. Run database migrations

```bash
npm run prisma:migrate
```

### 6. Start the app

```bash
npm run dev
```

Open the app at `http://localhost:3000`.

### 7. First login flow

1. Open `/auth/signup`
2. Create an account
3. Login and access `/dashboard`

## Useful Commands

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

## Troubleshooting

### Build/dev cache issues (stale chunks or manifest errors)

If you see chunk load errors or missing manifest errors, clear caches and restart:

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
if (Test-Path .next) { Remove-Item -Recurse -Force .next }
if (Test-Path node_modules/.cache) { Remove-Item -Recurse -Force node_modules/.cache }
npm run dev
```

### Database connection errors

- Verify `DATABASE_URL` and `DIRECT_URL` are correct and use your real password.
- If using Supabase pooler for runtime, include:
	- `pgbouncer=true`
	- `connection_limit=1`
	- `sslmode=require`
- Re-run:

```bash
npm run prisma:generate
npm run prisma:migrate
```

### Resume upload fails

- Use a valid, unlocked PDF file (password-protected PDFs are rejected).

## Validation

```bash
npm run lint
npx tsc --noEmit
```

## Deployment Notes

- Works with Supabase PostgreSQL or any hosted PostgreSQL.
- Set env vars in deployment environment.
- Run Prisma migrations during deploy pipeline.
- App routes and APIs are authorization-protected and user-scoped.
