# CareerMind

CareerMind is a production-ready AI career platform built with Next.js App Router, Prisma, PostgreSQL (Supabase), NextAuth, and Groq.

It helps users improve interview outcomes through resume intelligence, job matching, rejection analysis, weekly strategy reports, and interview preparation workflows.

## What This Project Does

- Secure user authentication with credential-based login.
- Resume upload and extraction from PDF.
- Skill and project inference from resume content.
- Job description match scoring with targeted gap analysis.
- Rejection autopsy with pattern detection.
- Weekly hindsight report from user activity and outcomes.
- Target company tracker and interview prep question generation.
- Mock interview answer feedback using AI.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL (Supabase)
- NextAuth
- Groq (`qwen/qwen3-32b`)
- Hindsight memory client (`@vectorize-io/hindsight-client`)
- Recharts and jsPDF for reporting UI

## Project Structure

Top-level important folders:

- app: Pages and App Router API routes
- components: Reusable UI and layout components
- lib: Core integrations (auth, prisma, ai, hindsight, interview)
- prisma: Schema and migrations
- services: Domain/business logic
- types: App-level type extensions

## Features

### 1) Authentication

- Sign up and sign in using NextAuth credentials.
- Protected product routes through middleware.
- Session includes user id for scoped data access.

### 2) Resume Intelligence

- Upload resume PDFs.
- Parse text with fallback paths for difficult files.
- Extract skills/projects and persist them.
- Update user semantic memory profile.

### 3) Job Match

- Submit a job description.
- Receive match score, missing skills, and recommendation.
- Advice logs are persisted to improve future strategy.

### 4) Rejection Autopsy

- Log rejection details (company, role, stage, missing skills).
- AI and rule-based fallback generate critical-gap insights.
- Trend and outcome signals are persisted.

### 5) Weekly Hindsight Report

- Aggregates user activity over the last 7 days.
- Produces wins, risks, signals, scorecard, and next action.
- Supports fallback behavior when external services are degraded.

### 6) Target Companies + Interview Preparation

- Save target companies and roles.
- Generate structured interview question sets:
  - Technical
  - Behavioral
  - Coding/SQL
  - Focus Areas
- Mock interview endpoint for answer feedback.
- Generated interview prep is stored in DB.

## Pages

- /
- /auth/signin
- /auth/signup
- /dashboard
- /dashboard/companies
- /upload
- /job-match
- /history
- /reports

## API Endpoints

Auth:

- POST /api/auth/signup
- GET|POST /api/auth/[...nextauth]

Core product:

- POST /api/resume/upload
- POST /api/job/match
- POST /api/rejection/log
- GET /api/dashboard
- GET /api/history
- GET /api/report

Target company + interview prep:

- POST /api/target-company
- GET /api/target-company
- POST /api/interview/generate
- POST /api/interview/mock

## Database Models

Core:

- User
- Resume
- Skill
- Project
- Application
- Rejection
- AdviceLog
- Insight
- CareerEvent

Auth:

- Account
- Session
- VerificationToken

Interview prep:

- TargetCompany
- InterviewPrep

## Environment Variables

Create .env from .env.example and set real credentials.

Required:

- DATABASE_URL
- DIRECT_URL
- NEXTAUTH_URL
- NEXTAUTH_SECRET
- GROQ_API_KEY
- HINDSIGHT_API_KEY

Example:

```bash
DATABASE_URL="postgresql://postgres:<password>@aws-1-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-long-random-secret"
GROQ_API_KEY="your-groq-api-key"
HINDSIGHT_API_KEY="your-hindsight-api-key"
```

## Local Setup

1. Clone and install dependencies.

```bash
git clone <repository-url>
cd CareerMind
npm install
```

2. Create environment file.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

3. Generate Prisma client.

```bash
npm run prisma:generate
```

4. Apply migrations.

```bash
npm run prisma:migrate
```

5. Run dev server.

```bash
npm run dev
```

App runs on http://localhost:3000.

## NPM Scripts

- npm run dev
- npm run build
- npm run start
- npm run lint
- npm run prisma:generate
- npm run prisma:migrate
- npm run prisma:studio

## AI Integration Details

Groq model used:

- qwen/qwen3-32b

Implemented with:

- JSON-only response expectation
- structured schema validation with zod
- timeout/error handling
- invalid JSON safeguards and fallback behavior

## Security and Authorization

- All user data endpoints verify authenticated session.
- All reads/writes are user-scoped with userId checks.
- Protected routes are guarded by middleware.

## Operational Notes

- Keep only one dev server running at a time.
- If using Supabase pooler, prefer pgbouncer=true and connection_limit=1.
- If stale asset issues appear, stop all node processes and clear .next.

## Troubleshooting

### Port 3000 already in use

- Stop old node/next process, then rerun npm run dev.

### Prisma client type mismatch after schema changes

- Run npm run prisma:generate.
- Restart TypeScript server in VS Code if diagnostics are stale.

### DB connection errors

- Recheck DATABASE_URL and DIRECT_URL.
- Verify Supabase host, password, and sslmode.

### Missing chunk or layout asset 404

- Clear .next and restart dev server.

## Validation

```bash
npm run lint
npm run build
```

## Deployment Checklist

- Set all required environment variables.
- Run migrations during deploy.
- Ensure NEXTAUTH_URL points to production domain.
- Verify DB connectivity and pooler settings.
