import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-12 md:py-14">
      <section className="relative overflow-hidden rounded-3xl border border-cyan-100 bg-white p-8 shadow-[0_22px_70px_-30px_rgba(14,116,144,0.4)] md:p-12">
        <div className="pointer-events-none absolute right-[-70px] top-[-70px] h-56 w-56 rounded-full bg-cyan-200/45 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-80px] left-[-40px] h-56 w-56 rounded-full bg-sky-100/60 blur-3xl" />
        <div className="relative grid items-center gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <p className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
            AI Career Intelligence
          </p>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Build your career with clear, data-backed guidance.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
            CareerMind helps you track applications, improve your resume, and get practical next steps to
            land better roles faster.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/auth/signup">Start Free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/auth/signin">Login</Link>
            </Button>
          </div>
          <div className="grid max-w-xl grid-cols-3 gap-3 pt-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <p className="text-lg font-bold text-slate-900">10x</p>
              <p className="text-xs text-slate-600">Faster feedback loop</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <p className="text-lg font-bold text-slate-900">1 Hub</p>
              <p className="text-xs text-slate-600">For all job tracking</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <p className="text-lg font-bold text-slate-900">Weekly</p>
              <p className="text-xs text-slate-600">Actionable insights</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-cyan-100 via-white to-slate-100 p-6">
          <p className="text-sm font-semibold text-slate-900">What you can do with CareerMind</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-600" />Upload your resume and extract skills instantly</li>
            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-600" />Match your profile against job descriptions</li>
            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-600" />See missing skills and a focused improvement plan</li>
            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-600" />Track applications and interview outcomes in one place</li>
            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-600" />Get weekly progress summaries and next actions</li>
          </ul>
          <div className="mt-5 rounded-xl border border-cyan-200 bg-white/80 p-3 text-sm text-cyan-900">
            Designed for students and professionals actively applying for roles.
          </div>
        </div>
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Application Tracker</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Keep all applications, interview stages, and outcomes organized in one dashboard.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Resume and Skill Insights</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Discover your strongest skills, current gaps, and what to improve for your target role.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Weekly Action Plan</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Get simple weekly recommendations based on your recent activity and results.
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
