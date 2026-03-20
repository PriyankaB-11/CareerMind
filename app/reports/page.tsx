"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface WeeklyReport {
  period?: string;
  generatedAt?: string;
  headline?: string;
  summary: string;
  wins?: string[];
  risks?: string[];
  signals?: string[];
  scorecard?: {
    resumesUploaded: number;
    applicationsSent: number;
    rejectionsLogged: number;
    rejectionRate: number;
    adviceSuccessRate: number;
    topSkillGap: string;
  };
  actionPlan?: Array<{
    title: string;
    why: string;
    steps: string[];
  }>;
  improvements: string[];
  insights: string[];
  nextBestAction: string;
}

function formatTimestamp(value?: string) {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return date.toLocaleString();
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

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const left = 42;
    const right = 42;
    const contentWidth = pageWidth - left - right;
    const bottomSafe = pageHeight - 44;

    let y = 36;

    const drawFooter = () => {
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i += 1) {
        doc.setPage(i);
        doc.setDrawColor(226, 232, 240);
        doc.line(left, pageHeight - 28, pageWidth - right, pageHeight - 28);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`CareerMind Weekly Hindsight`, left, pageHeight - 14);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - right, pageHeight - 14, { align: "right" });
      }
    };

    const addPage = () => {
      doc.addPage();
      y = 36;
    };

    const ensureSpace = (spaceNeeded: number) => {
      if (y + spaceNeeded <= bottomSafe) {
        return;
      }

      addPage();
    };

    const writeParagraph = (text: string, x: number, width: number, lineHeight = 14) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(30, 41, 59);
      const lines = doc.splitTextToSize(text, width);
      doc.text(lines, x, y);
      y += lines.length * lineHeight;
    };

    const writeBulletList = (items: string[], x: number, width: number) => {
      for (const item of items) {
        const lines = doc.splitTextToSize(item, width - 14);
        doc.setFillColor(8, 145, 178);
        doc.circle(x + 4, y - 3, 1.8, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        doc.setTextColor(30, 41, 59);
        doc.text(lines, x + 12, y);
        y += lines.length * 14;
      }
    };

    const drawSectionCard = (title: string, tone: "default" | "accent" | "danger", body: () => void, minHeight = 100) => {
      ensureSpace(minHeight);
      const startY = y;
      const headerHeight = 24;
      const padding = 14;

      let headerFill: [number, number, number] = [241, 245, 249];
      if (tone === "accent") {
        headerFill = [236, 254, 255];
      }
      if (tone === "danger") {
        headerFill = [255, 241, 242];
      }

      const bodyStartY = startY + headerHeight + padding;
      y = bodyStartY;
      body();
      const measuredBodyEndY = y;
      const endY = measuredBodyEndY + padding;
      const cardHeight = endY - startY;

      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(left, startY, contentWidth, cardHeight, 8, 8, "FD");
      doc.setFillColor(...headerFill);
      doc.roundedRect(left, startY, contentWidth, headerHeight, 8, 8, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(title, left + 12, startY + 16);

      y = bodyStartY;
      body();

      y = endY;
    };

    const scorecard = report.scorecard;
    const wins = report.wins ?? report.improvements;
    const risks = report.risks ?? [];
    const signals = report.signals ?? report.insights;
    const actionPlan = report.actionPlan ?? [];

    doc.setFillColor(15, 23, 42);
    doc.roundedRect(left, y, contentWidth, 88, 10, 10, "F");
    doc.setFillColor(8, 145, 178);
    doc.rect(left, y + 66, contentWidth, 22, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(248, 250, 252);
    doc.text("CareerMind Weekly Hindsight", left + 16, y + 30);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(226, 232, 240);
    doc.text(`${report.period ?? "Last 7 days"} | Generated ${formatTimestamp(report.generatedAt)}`, left + 16, y + 48);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(240, 253, 250);
    doc.text(report.headline ?? "Weekly intelligence snapshot", left + 16, y + 80);

    y += 104;

    if (scorecard) {
      ensureSpace(140);
      const cardGap = 10;
      const cardWidth = (contentWidth - cardGap) / 2;
      const cardHeight = 48;
      const metrics = [
        ["Applications", `${scorecard.applicationsSent}`],
        ["Rejection Rate", `${scorecard.rejectionRate}%`],
        ["Advice Success", `${scorecard.adviceSuccessRate}%`],
        ["Top Skill Gap", scorecard.topSkillGap],
      ];

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("Scorecard", left, y);
      y += 12;

      for (let i = 0; i < metrics.length; i += 1) {
        const [label, value] = metrics[i];
        const col = i % 2;
        const row = Math.floor(i / 2);
        const boxX = left + col * (cardWidth + cardGap);
        const boxY = y + row * (cardHeight + 8);

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(boxX, boxY, cardWidth, cardHeight, 6, 6, "FD");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(label, boxX + 10, boxY + 16);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(15, 23, 42);
        doc.text(value, boxX + 10, boxY + 34);
      }

      y += 2 * (cardHeight + 8) + 12;
    }

    drawSectionCard("Summary", "default", () => {
      writeParagraph(report.summary, left + 12, contentWidth - 24);
      y += 2;
    }, 92);

    drawSectionCard("Wins", "accent", () => {
      writeBulletList(wins, left + 12, contentWidth - 24);
      y += 2;
    }, 96);

    if (risks.length > 0) {
      drawSectionCard("Risks", "danger", () => {
        writeBulletList(risks, left + 12, contentWidth - 24);
        y += 2;
      }, 96);
    }

    drawSectionCard("Signals", "default", () => {
      writeBulletList(signals, left + 12, contentWidth - 24);
      y += 2;
    }, 96);

    drawSectionCard("Best Next Action", "accent", () => {
      writeParagraph(report.nextBestAction, left + 12, contentWidth - 24);
      y += 2;
    }, 88);

    if (actionPlan.length > 0) {
      ensureSpace(56);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("Action Plan", left, y);
      y += 8;

      for (const [index, item] of actionPlan.entries()) {
        drawSectionCard(`${index + 1}. ${item.title}`, "default", () => {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(51, 65, 85);
          doc.text("Why this matters", left + 12, y);
          y += 12;
          writeParagraph(item.why, left + 12, contentWidth - 24);
          y += 6;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(51, 65, 85);
          doc.text("Steps", left + 12, y);
          y += 12;
          writeBulletList(item.steps, left + 12, contentWidth - 24);
        }, 128);
      }
    }

    drawFooter();

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
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">{report.period ?? "Last 7 days"}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{report.headline ?? "Weekly Hindsight"}</p>
                <p className="mt-1 text-sm text-slate-600">Generated {formatTimestamp(report.generatedAt)}</p>
              </div>

              {report.scorecard ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Applications</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{report.scorecard.applicationsSent}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Rejection Rate</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{report.scorecard.rejectionRate}%</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Advice Success Rate</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{report.scorecard.adviceSuccessRate}%</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Resumes Uploaded</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{report.scorecard.resumesUploaded}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Rejections Logged</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{report.scorecard.rejectionsLogged}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Top Skill Gap</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">{report.scorecard.topSkillGap}</p>
                  </div>
                </div>
              ) : null}

              <div>
                <p className="font-semibold text-slate-900">Summary</p>
                <p className="mt-1 text-slate-700">{report.summary}</p>
              </div>

              <div>
                <p className="font-semibold text-slate-900">Wins</p>
                <ul className="mt-1 space-y-1 text-slate-700">
                  {(report.wins ?? report.improvements).map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>

              {(report.risks ?? []).length > 0 ? (
                <div>
                  <p className="font-semibold text-slate-900">Risks</p>
                  <ul className="mt-1 space-y-1 text-rose-700">
                    {(report.risks ?? []).map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div>
                <p className="font-semibold text-slate-900">Signals</p>
                <ul className="mt-1 space-y-1 text-slate-700">
                  {(report.signals ?? report.insights).map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg bg-cyan-50 p-4 text-cyan-900">
                <p className="font-semibold">Best Next Action</p>
                <p className="mt-1">{report.nextBestAction}</p>
              </div>

              {(report.actionPlan ?? []).length > 0 ? (
                <div>
                  <p className="font-semibold text-slate-900">Action Plan</p>
                  <div className="mt-2 space-y-3">
                    {(report.actionPlan ?? []).map((item) => (
                      <div key={item.title} className="rounded-lg border border-slate-200 p-3">
                        <p className="font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-slate-600">Why: {item.why}</p>
                        <ul className="mt-2 space-y-1 text-slate-700">
                          {item.steps.map((step) => (
                            <li key={step}>• {step}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : !loading ? (
            <p className="text-sm text-slate-500">No report available yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
