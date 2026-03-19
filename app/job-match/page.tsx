"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface MatchResponse {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  recommendation: "Apply" | "Improve";
  adviceId: string;
  strategy: string;
}

export default function JobMatchPage() {
  const [jdText, setJdText] = useState("");
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/job/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText }),
      });

      const payload = (await response.json()) as MatchResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Match failed");
      }

      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Job Match Engine</CardTitle>
          <CardDescription>Compare role requirements against your personal skill memory.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <Textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            rows={9}
            placeholder="Paste job description here..."
            className="w-full"
          />

            <Button type="submit" disabled={loading}>
              {loading ? "Analyzing..." : "Run Match"}
            </Button>
          </form>
          {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
        </CardContent>
      </Card>

      {result ? (
        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Match Score</p>
            <p className="mt-2 text-4xl font-bold text-slate-900">{result.score}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Top Skill Gaps</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {result.missingSkills.length > 0 ? (
                result.missingSkills.map((gap) => <li key={gap}>• {gap}</li>)
              ) : (
                <li>• No major gaps detected</li>
              )}
            </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Recommendation</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{result.recommendation}</p>
            <p className="mt-2 text-xs text-slate-500">Strategy: {result.strategy}</p>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </main>
  );
}
