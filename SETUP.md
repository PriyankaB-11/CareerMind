# Setup Guide for New Team Members

## Prerequisites

- Node.js 18+ (check with `node --version`)
- npm or yarn
- Git

## Installation Steps

### 1. Clone the Repository
```bash
git clone <repository-url>
cd CareerMind
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables

Copy `.env.example` to create your local `.env.local` file:

```bash
cp .env.example .env.local
```

**IMPORTANT**: Edit `.env.local` and fill in all the required values:

#### Database Setup
- **DATABASE_URL**: Your PostgreSQL connection string (runtime pooler for Supabase)
- **DIRECT_URL**: Your PostgreSQL direct connection string (for Prisma migrations)

Example for Supabase:
```
DATABASE_URL="postgresql://postgres:[password]@aws-1-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
```

#### Authentication
- **NEXTAUTH_URL**: Set to `http://localhost:3000` for development
- **NEXTAUTH_SECRET**: Generate using:
  - **Mac/Linux**: `openssl rand -base64 33`
  - **Windows**: Use any secure random generator or use an online tool for base64(33 bytes)

#### AI Services
- **GROQ_API_KEY**: Get from [Groq Console](https://console.groq.com)
- **HINDSIGHT_API_KEY**: Get from [Hindsight Cloud](https://hindsight.vectorize.io)

### 4. Generate Prisma Client
```bash
npm run prisma:generate
```

### 5. Run Database Migrations
```bash
npm run prisma:migrate
```

If you have an existing database, you can sync it:
```bash
npx prisma db push
```

### 6. Start Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Troubleshooting

### Database Connection Issues
- Check that `DATABASE_URL` and `DIRECT_URL` are correct
- Ensure your PostgreSQL database is accessible
- For Supabase, verify network access and IP allowlisting

### Prisma Client Generation Issues
```bash
npm run prisma:generate
```

### Port Already in Use (port 3000)
```bash
npm run dev -- -p 3001
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run new migrations
npm run prisma:studio    # Open Prisma Studio
```

## Important Notes

- **Never commit `.env` or `.env.local`** - use `.env.example` as a template
- Ensure all environment variables are set before starting the app
- If you encounter issues, check that your Node.js version matches the project requirements
