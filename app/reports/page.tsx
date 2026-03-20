"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface WeeklyReport {
  summary: string;
  improvements: string[];
  insights: string[];
  nextBestAction: string;
}

export default function ReportsPage() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/report");
      const payload = (await response.json()) as WeeklyReport & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to generate report");
      }

      setReport(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReport();
  }, []);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Weekly Hindsight Report</CardTitle>
          <CardDescription>Generated from your real weekly activity and outcomes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="secondary" onClick={() => void fetchReport()} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh Report"}
          </Button>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          {report ? (
            <div className="space-y-4 text-sm">
              <p className="font-semibold text-slate-900">Weekly Hindsight</p>
              <p className="text-slate-700">{report.summary}</p>

              <div>
                <p className="font-semibold text-slate-900">Progress</p>
                <ul className="mt-1 space-y-1 text-slate-700">
                  {report.improvements.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="font-semibold text-slate-900">Patterns</p>
                <ul className="mt-1 space-y-1 text-slate-700">
                  {report.insights.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg bg-cyan-50 p-4 text-cyan-900">
                <p className="font-semibold">Best Next Action</p>
                <p className="mt-1">{report.nextBestAction}</p>
              </div>
            </div>
          ) : !loading ? (
            <p className="text-sm text-slate-500">No report available yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
