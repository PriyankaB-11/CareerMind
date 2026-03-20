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

  const downloadPdf = async () => {
    if (!report) return;

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    let y = 54;
    const left = 48;
    const maxWidth = 500;

    const writeHeading = (text: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(text, left, y);
      y += 22;
    };

    const writeSubHeading = (text: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(text, left, y);
      y += 16;
    };

    const writeParagraph = (text: string) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, left, y);
      y += lines.length * 14 + 8;
    };

    const writeList = (items: string[]) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      for (const item of items) {
        const lines = doc.splitTextToSize(`- ${item}`, maxWidth);
        doc.text(lines, left, y);
        y += lines.length * 14;
      }
      y += 8;
    };

    writeHeading("CareerMind - Weekly Hindsight Report");
    writeSubHeading("Summary");
    writeParagraph(report.summary);

    writeSubHeading("Progress");
    writeList(report.improvements);

    writeSubHeading("Patterns");
    writeList(report.insights);

    writeSubHeading("Best Next Action");
    writeParagraph(report.nextBestAction);

    doc.save(`weekly-hindsight-${new Date().toISOString().slice(0, 10)}.pdf`);
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
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void fetchReport()} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh Report"}
            </Button>
            <Button onClick={() => void downloadPdf()} disabled={!report || loading}>
              Download PDF
            </Button>
          </div>

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
