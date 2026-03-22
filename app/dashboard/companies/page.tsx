"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/utils/format";

type TargetCompany = {
  id: string;
  name: string;
  role: string | null;
  createdAt: string;
};

type InterviewQuestions = {
  prepId?: string;
  technical: string[];
  behavioral: string[];
  coding: string[];
  focusAreas: string[];
};

type MockFeedback = {
  score: number;
  strengths: string[];
  improvements: string[];
  improvedAnswer: string;
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<TargetCompany[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [mockLoading, setMockLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestions | null>(null);
  const [mockFeedback, setMockFeedback] = useState<MockFeedback | null>(null);

  const [companyForm, setCompanyForm] = useState({ name: "", role: "" });
  const [generateForm, setGenerateForm] = useState({
    companyId: "",
    company: "",
    role: "",
    userSkills: "",
  });

  const [mockForm, setMockForm] = useState({
    question: "",
    answer: "",
  });

  const selectedCompany = useMemo(
    () => companies.find((entry) => entry.id === generateForm.companyId) ?? null,
    [companies, generateForm.companyId],
  );

  const loadCompanies = useCallback(async () => {
    setLoadingCompanies(true);
    setError(null);

    try {
      const response = await fetch("/api/target-company");
      const payload = (await response.json()) as (TargetCompany[] & { error?: string });

      if (!response.ok) {
        throw new Error((payload as { error?: string }).error ?? "Failed to load target companies");
      }

      setCompanies(payload as TargetCompany[]);
      setGenerateForm((prev) => {
        if ((payload as TargetCompany[]).length === 0 || prev.companyId) {
          return prev;
        }

        const first = (payload as TargetCompany[])[0];
        return {
          ...prev,
          companyId: first.id,
          company: first.name,
          role: first.role ?? "",
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load target companies");
    } finally {
      setLoadingCompanies(false);
    }
  }, []);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  const onAddCompany = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingCompany(true);
    setError(null);

    try {
      const response = await fetch("/api/target-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: companyForm.name,
          role: companyForm.role,
        }),
      });

      const payload = (await response.json()) as TargetCompany & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to add target company");
      }

      setCompanyForm({ name: "", role: "" });
      setCompanies((prev) => [payload, ...prev]);
      setGenerateForm((prev) => ({
        ...prev,
        companyId: payload.id,
        company: payload.name,
        role: payload.role ?? "",
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add target company");
    } finally {
      setSavingCompany(false);
    }
  };

  const onGenerateQuestions = async () => {
    const companyName = selectedCompany?.name ?? generateForm.company.trim();
    if (!companyName) {
      setError("Select a company or enter company name first.");
      return;
    }

    setGenerating(true);
    setError(null);
    setQuestions(null);
    setMockFeedback(null);

    try {
      const response = await fetch("/api/interview/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: companyName,
          role: (selectedCompany?.role ?? generateForm.role).trim() || undefined,
          userSkills: generateForm.userSkills
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });

      const payload = (await response.json()) as InterviewQuestions & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to generate interview questions");
      }

      setQuestions(payload);
      setMockForm((prev) => ({
        ...prev,
        question: payload.technical[0] ?? payload.coding[0] ?? "",
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate interview questions");
    } finally {
      setGenerating(false);
    }
  };

  const onRunMockInterview = async () => {
    const companyName = selectedCompany?.name ?? generateForm.company.trim();
    if (!companyName) {
      setError("Select or enter a company before running mock interview.");
      return;
    }

    setMockLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/interview/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: companyName,
          role: (selectedCompany?.role ?? generateForm.role).trim() || undefined,
          question: mockForm.question,
          answer: mockForm.answer,
          userSkills: generateForm.userSkills
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });

      const payload = (await response.json()) as MockFeedback & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to run mock interview");
      }

      setMockFeedback(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run mock interview");
    } finally {
      setMockLoading(false);
    }
  };

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-5 px-6 py-8 lg:grid-cols-[0.95fr_1.05fr]">
      <Card>
        <CardHeader>
          <CardTitle>Target Companies</CardTitle>
          <CardDescription>Add companies and roles you are preparing for.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3" onSubmit={onAddCompany}>
            <Input
              required
              placeholder="Company name"
              value={companyForm.name}
              onChange={(event) => setCompanyForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              placeholder="Target role (optional)"
              value={companyForm.role}
              onChange={(event) => setCompanyForm((prev) => ({ ...prev, role: event.target.value }))}
            />
            <Button type="submit" disabled={savingCompany} className="w-fit">
              {savingCompany ? "Saving..." : "Add Company"}
            </Button>
          </form>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">Your saved targets</p>
            {loadingCompanies ? (
              <p className="text-sm text-slate-500">Loading companies...</p>
            ) : companies.length === 0 ? (
              <p className="text-sm text-slate-500">No target companies yet.</p>
            ) : (
              <ul className="space-y-2">
                {companies.map((company) => (
                  <li
                    key={company.id}
                    className={`rounded-lg border p-3 text-sm ${
                      generateForm.companyId === company.id
                        ? "border-cyan-400 bg-cyan-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{company.name}</p>
                        <p className="text-slate-600">{company.role || "Role not specified"}</p>
                        <p className="text-xs text-slate-500">Added {formatDate(company.createdAt)}</p>
                      </div>
                      <Button
                        variant={generateForm.companyId === company.id ? "default" : "outline"}
                        onClick={() =>
                          setGenerateForm((prev) => ({
                            ...prev,
                            companyId: company.id,
                            company: company.name,
                            role: company.role ?? "",
                          }))
                        }
                      >
                        Use
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interview Preparation</CardTitle>
          <CardDescription>Generate targeted question sets and run a mock answer review.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
          ) : null}

          <div className="grid gap-3">
            <Input
              placeholder="Company (or select from saved targets)"
              value={selectedCompany?.name ?? generateForm.company}
              onChange={(event) =>
                setGenerateForm((prev) => ({
                  ...prev,
                  companyId: "",
                  company: event.target.value,
                }))
              }
            />
            <Input
              placeholder="Role"
              value={selectedCompany?.role ?? generateForm.role}
              onChange={(event) =>
                setGenerateForm((prev) => ({
                  ...prev,
                  role: event.target.value,
                }))
              }
            />
            <Textarea
              rows={3}
              placeholder="Your skills (comma separated, e.g. React, Next.js, Node.js, SQL)"
              value={generateForm.userSkills}
              onChange={(event) =>
                setGenerateForm((prev) => ({
                  ...prev,
                  userSkills: event.target.value,
                }))
              }
            />
            <Button onClick={() => void onGenerateQuestions()} disabled={generating}>
              {generating ? "Generating..." : "Generate Interview Questions"}
            </Button>
          </div>

          {questions ? (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-900">Generated Questions</p>

              <div>
                <p className="font-medium text-slate-800">Technical</p>
                <ul className="mt-1 space-y-1 text-slate-700">
                  {questions.technical.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="font-medium text-slate-800">Behavioral</p>
                <ul className="mt-1 space-y-1 text-slate-700">
                  {questions.behavioral.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="font-medium text-slate-800">Coding / SQL</p>
                <ul className="mt-1 space-y-1 text-slate-700">
                  {questions.coding.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="font-medium text-slate-800">Focus Areas</p>
                <ul className="mt-1 space-y-1 text-cyan-900">
                  {questions.focusAreas.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          <div className="space-y-3 rounded-lg border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">Bonus: Mock Interview Feedback</p>
            <Input
              placeholder="Question"
              value={mockForm.question}
              onChange={(event) => setMockForm((prev) => ({ ...prev, question: event.target.value }))}
            />
            <Textarea
              rows={4}
              placeholder="Write your answer"
              value={mockForm.answer}
              onChange={(event) => setMockForm((prev) => ({ ...prev, answer: event.target.value }))}
            />
            <Button variant="outline" onClick={() => void onRunMockInterview()} disabled={mockLoading}>
              {mockLoading ? "Reviewing..." : "Run Mock Interview"}
            </Button>

            {mockFeedback ? (
              <div className="rounded-lg bg-cyan-50 p-3 text-sm text-cyan-900">
                <p className="font-semibold">Score: {mockFeedback.score}/10</p>
                <p className="mt-2 font-medium">Strengths</p>
                <ul className="mt-1 space-y-1">
                  {mockFeedback.strengths.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
                <p className="mt-2 font-medium">Improvements</p>
                <ul className="mt-1 space-y-1">
                  {mockFeedback.improvements.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
                <p className="mt-2 font-medium">Improved Answer</p>
                <p className="mt-1 whitespace-pre-line">{mockFeedback.improvedAnswer}</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
