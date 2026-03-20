"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface UploadResponse {
  filename: string;
  skills: string[];
  projects: string[];
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setError("Please select a PDF resume.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });

      const raw = await response.text();
      const payload = raw ? (JSON.parse(raw) as UploadResponse & { error?: string }) : null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Upload failed");
      }

      if (!payload) {
        throw new Error("Upload response was empty");
      }

      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <section className="fx-fade-up relative overflow-hidden rounded-3xl border border-sky-200/70 bg-gradient-to-br from-cyan-50 via-sky-50 to-white p-6 shadow-[0_20px_50px_-35px_rgba(14,116,144,0.7)]">
        <div className="fx-float pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-200/40 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-sky-200/40 blur-2xl" />
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Resume Intelligence</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Upload Once, Improve Continuously</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          We extract your skills and projects, update memory, and personalize your job match analysis.
        </p>
      </section>

      <Card className="surface-panel fx-fade-up fx-glow">
        <CardHeader>
          <CardTitle>Resume Upload</CardTitle>
          <CardDescription>Upload a PDF resume to update your persistent skill memory.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Input
              type="file"
              accept="application/pdf"
              className="h-11 border-sky-200 bg-white/90 file:mr-3 file:rounded-md file:border file:border-sky-200 file:bg-sky-50 file:px-3 file:py-1 file:text-sky-800 hover:border-sky-300"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <Button type="submit" disabled={loading} className="w-fit min-w-36 shadow-md">
              {loading ? "Processing..." : "Upload Resume"}
            </Button>
          </form>
          {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
        </CardContent>
      </Card>

      {result ? (
        <Card className="surface-panel fx-fade-up">
          <CardHeader>
            <CardTitle>Extraction Result</CardTitle>
            <CardDescription>{result.filename}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-cyan-100 bg-white/70 p-4 transition hover:-translate-y-0.5 hover:shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Skills</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {result.skills.length > 0 ? result.skills.map((skill) => <li key={skill}>• {skill}</li>) : <li>• None detected</li>}
              </ul>
            </div>
            <div className="rounded-xl border border-sky-100 bg-white/70 p-4 transition hover:-translate-y-0.5 hover:shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Projects</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {result.projects.length > 0 ? result.projects.map((project) => <li key={project}>• {project}</li>) : <li>• None detected</li>}
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
