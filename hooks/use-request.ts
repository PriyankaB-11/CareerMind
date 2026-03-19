"use client";

import { useCallback, useState } from "react";

export function useRequest<TResponse>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (url: string, init?: RequestInit): Promise<TResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, init);
      const payload = (await response.json()) as TResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Request failed");
      }

      return payload;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, run, setError };
}
