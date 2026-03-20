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
- Groq API (`qwen/qwen3-32b`)
- Hindsight Cloud via `@vectorize-io/hindsight-client`

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
- `GROQ_API_KEY`
- `HINDSIGHT_API_KEY`

Example:

```bash
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-1-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
GROQ_API_KEY="your-groq-api-key"
HINDSIGHT_API_KEY="your-hindsight-api-key"
```

Note: the published Hindsight npm package is `@vectorize-io/hindsight-client`.

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

## AI + Memory Architecture

CareerMind now uses real LLM reasoning + real persistent memory:

- `lib/hindsight.ts`
	- `logEvent(userId, type, data)`
	- `getUserTimeline(userId)`
	- `getSemanticProfile(userId)`
	- `updateSemanticProfile(userId, profile)`
	- `getReflectiveInsights(userId)`
	- `storeInsight(userId, insight)`
- `lib/ai.ts`
	- `analyzeJobMatch(userId, jobDescription)`
	- `analyzeRejectionAutopsy(userId, rejectionData)`
	- `buildWeeklyReportAI(userId)`
	- `extractResumeWithAI(userId, resumeText)`
	- `recordAdviceOutcome(userId, payload)`

All AI calls include memory context and enforce JSON-only output.

## Example API Calls

Run these after logging in (or from browser UI):

### Job Match

```bash
curl -X POST http://localhost:3000/api/job/match \
	-H "Content-Type: application/json" \
	-d '{"jdText":"Looking for a React + Node.js engineer with system design and AWS experience"}'
```

### Rejection Log + AI Autopsy

```bash
curl -X POST http://localhost:3000/api/rejection/log \
	-H "Content-Type: application/json" \
	-d '{
		"company":"Acme",
		"role":"Software Engineer",
		"companyType":"STARTUP",
		"stage":"TECHNICAL",
		"reasonText":"Need stronger system design depth",
		"missingSkills":["system design","aws"]
	}'
```

### Weekly Report

```bash
curl http://localhost:3000/api/report
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
