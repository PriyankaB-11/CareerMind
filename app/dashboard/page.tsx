"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CareerRadar } from "@/components/career-radar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardResponse {
  semantic: {
    skills: string[];
    projects: string[];
    strengths: string[];
    weaknesses: string[];
  };
  reflective: {
    repeatedSkillFailures: Array<{ key: string; count: number }>;
    repeatedCompanyTypeFailures: Array<{ key: string; count: number }>;
    successfulStrategies: Array<{ key: string; count: number }>;
    failedStrategies: Array<{ key: string; count: number }>;
  };
  weekly: {
    period: string;
    improved: string[];
    detectedPatterns: string[];
    bestNextAction: string;
  } | null;
  radar: Array<{ dimension: string; score: number }>;
  warning?: string;
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const dashboardRes = await fetch("/api/dashboard");
        const raw = await dashboardRes.text();
        const dashboardPayload = raw
          ? (JSON.parse(raw) as DashboardResponse & { error?: string })
          : null;

        if (!dashboardRes.ok) {
          throw new Error(dashboardPayload?.error ?? "Failed to load dashboard");
        }

        if (!dashboardPayload) {
          throw new Error("Dashboard response was empty");
        }

        setDashboard(dashboardPayload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected error");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) {
    return <div className="px-6 py-10 text-slate-600">Loading dashboard intelligence...</div>;
  }

  if (error || !dashboard) {
    return (
      <div className="px-6 py-10">
        <div className="max-w-2xl rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="font-semibold">Dashboard is temporarily unavailable</p>
          <p className="mt-1 text-sm">
            {error ?? "We could not load your dashboard right now. Please refresh in a moment."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8">
      {dashboard.warning ? (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {dashboard.warning}
        </div>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1.2fr_1.1fr]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Profile Summary</CardTitle>
            <CardDescription>A quick view of your skills and growth areas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Skills</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {dashboard.semantic.skills.length > 0 ? (
                  dashboard.semantic.skills.slice(0, 16).map((skill) => <Badge key={skill}>{skill}</Badge>)
                ) : (
                  <p className="text-slate-500">No skills yet. Upload your resume.</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Strengths</p>
              <ul className="mt-2 space-y-1 text-slate-700">
                {dashboard.semantic.strengths.length > 0 ? (
                  dashboard.semantic.strengths.map((item) => <li key={item}>• {item}</li>)
                ) : (
                  <li>• No strengths detected yet</li>
                )}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Weaknesses</p>
              <ul className="mt-2 space-y-1 text-rose-700">
                {dashboard.semantic.weaknesses.length > 0 ? (
                  dashboard.semantic.weaknesses.map((item) => <li key={item}>• {item}</li>)
                ) : (
                  <li>• No weaknesses detected yet</li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="min-w-0">
          <CareerRadar data={dashboard.radar} />
        </div>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Insights</CardTitle>
            <CardDescription>Patterns from your recent applications and outcomes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <div>
              <p className="font-semibold text-slate-900">Repeated failures</p>
              <ul className="mt-2 space-y-1">
                {dashboard.reflective.repeatedSkillFailures.length > 0 ? (
                  dashboard.reflective.repeatedSkillFailures.map((entry) => (
                    <li key={entry.key}>• {entry.key}: {entry.count} times</li>
                  ))
                ) : (
                  <li>• No repeated failure pattern detected</li>
                )}
              </ul>
            </div>

            <div>
              <p className="font-semibold text-slate-900">Best strategies</p>
              <ul className="mt-2 space-y-1">
                {dashboard.reflective.successfulStrategies.length > 0 ? (
                  dashboard.reflective.successfulStrategies.map((entry) => (
                    <li key={entry.key}>• {entry.key}: {entry.count} success events</li>
                  ))
                ) : (
                  <li>• No successful strategy signal yet</li>
                )}
              </ul>
            </div>

            {dashboard.weekly ? (
              <div className="rounded-lg bg-cyan-50 p-3 text-cyan-900">
                <p className="font-semibold">Weekly Next Action</p>
                <p className="mt-1">{dashboard.weekly.bestNextAction}</p>
              </div>
            ) : (
              <p className="text-slate-500">Weekly report unavailable. Generate it in Reports.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
