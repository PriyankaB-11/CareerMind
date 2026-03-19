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
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Resume Upload</CardTitle>
          <CardDescription>Upload a PDF resume to update your persistent skill memory.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Input
              type="file"
              accept="application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <Button type="submit" disabled={loading} className="w-fit">
              {loading ? "Processing..." : "Upload Resume"}
            </Button>
          </form>
          {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle>Extraction Result</CardTitle>
            <CardDescription>{result.filename}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Skills</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {result.skills.length > 0 ? result.skills.map((skill) => <li key={skill}>• {skill}</li>) : <li>• None detected</li>}
              </ul>
            </div>
            <div>
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
