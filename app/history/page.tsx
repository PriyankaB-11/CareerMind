"use client";

import { FormEvent, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/format";

interface AutopsyResponse {
  reason: string;
  patterns: string[];
  criticalGap: string;
  actionPlan: string[];
}

interface HistoryResponse {
  applications: Array<{ id: string; company: string; role: string; status: string; createdAt: string }>;
  rejections: Array<{ id: string; company: string; role: string; missingSkills: string[]; createdAt: string }>;
  events: Array<{ id: string; title: string; type: string; createdAt: string }>;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [autopsy, setAutopsy] = useState<AutopsyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    company: "",
    role: "",
    companyType: "STARTUP",
    stage: "TECHNICAL",
    missingSkills: "",
    reasonText: "",
  });

  const loadDashboard = async () => {
    const historyRes = await fetch("/api/history");
    const raw = await historyRes.text();
    const historyPayload = raw ? (JSON.parse(raw) as HistoryResponse & { error?: string }) : null;
    if (!historyRes.ok) {
      throw new Error(historyPayload?.error ?? "Failed to load timeline");
    }

    if (!historyPayload) {
      throw new Error("History response was empty");
    }

    setHistory(historyPayload);
    setLoading(false);
  };

  useEffect(() => {
    void loadDashboard().catch((err: Error) => {
      setError(err.message);
      setLoading(false);
    });
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/rejection/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          missingSkills: form.missingSkills
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });

      const raw = await response.text();
      const payload = raw ? (JSON.parse(raw) as AutopsyResponse & { error?: string }) : null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to log rejection");
      }

      if (!payload) {
        throw new Error("Autopsy response was empty");
      }

      setAutopsy(payload);
      try {
        await loadDashboard();
      } catch (refreshErr) {
        setError(refreshErr instanceof Error ? refreshErr.message : "Failed to refresh timeline");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log rejection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5 px-6 py-8 lg:grid-cols-[1.1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Rejection Autopsy</CardTitle>
          <CardDescription>Log rejection events and detect repeated failure causes.</CardDescription>
        </CardHeader>
        <CardContent>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <Input
            required
            value={form.company}
            onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
            placeholder="Company"
          />
          <Input
            required
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            placeholder="Role"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={form.companyType}
              onChange={(e) => setForm((prev) => ({ ...prev, companyType: e.target.value }))}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="STARTUP">Startup</option>
              <option value="MID_SIZE">Mid-size</option>
              <option value="ENTERPRISE">Enterprise</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
            <select
              value={form.stage}
              onChange={(e) => setForm((prev) => ({ ...prev, stage: e.target.value }))}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="RESUME">Resume</option>
              <option value="ONLINE_ASSESSMENT">Online Assessment</option>
              <option value="TECHNICAL">Technical</option>
              <option value="HR">HR</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </div>
          <Input
            value={form.missingSkills}
            onChange={(e) => setForm((prev) => ({ ...prev, missingSkills: e.target.value }))}
            placeholder="Missing skills (comma separated)"
          />
          <Textarea
            value={form.reasonText}
            onChange={(e) => setForm((prev) => ({ ...prev, reasonText: e.target.value }))}
            rows={3}
            placeholder="Any exact feedback"
          />
          <Button className="w-fit" type="submit">
            Log Rejection + Analyze
          </Button>
        </form>

        {autopsy ? (
          <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Exact reason</p>
            <p className="mt-1">{autopsy.reason}</p>
            <p className="mt-3 font-semibold">Critical gap</p>
            <p className="mt-1">{autopsy.criticalGap}</p>
            <p className="mt-3 font-semibold">Patterns</p>
            <ul className="mt-1 space-y-1">
              {autopsy.patterns.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
            <p className="mt-3 font-semibold">Action plan</p>
            <ul className="mt-1 space-y-1">
              {autopsy.actionPlan.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>Applications, rejections, and events from your account only.</CardDescription>
        </CardHeader>
        <CardContent>
        {loading ? (
          <p className="text-sm text-slate-500">Loading history...</p>
        ) : error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : !history ? (
          <p className="text-sm text-slate-500">No data available.</p>
        ) : (
          <div className="space-y-5 text-sm">
            <div>
              <p className="font-semibold text-slate-800">Applications</p>
              <ul className="mt-1 space-y-1 text-slate-700">
                {history.applications.length > 0 ? (
                  history.applications.slice(0, 8).map((item) => (
                    <li key={item.id}>• {item.company} - {item.role} ({item.status}) on {formatDate(item.createdAt)}</li>
                  ))
                ) : (
                  <li>• No applications logged</li>
                )}
              </ul>
            </div>

            <div>
              <p className="font-semibold text-slate-800">Rejections</p>
              <ul className="mt-1 space-y-1 text-slate-700">
                {history.rejections.length > 0 ? (
                  history.rejections.slice(0, 8).map((item) => (
                    <li key={item.id}>• {item.company} - {item.role} on {formatDate(item.createdAt)}</li>
                  ))
                ) : (
                  <li>• No rejections logged</li>
                )}
              </ul>
            </div>

            <div>
              <p className="font-semibold text-slate-800">Recent Events</p>
              <ul className="mt-1 space-y-1 text-slate-700">
                {history.events.slice(0, 10).map((item) => (
                  <li key={item.id}>• {item.title} on {formatDate(item.createdAt)}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        </CardContent>
      </Card>
    </main>
  );
}
