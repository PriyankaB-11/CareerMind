"use client";

import { useEffect } from "react";

const RELOAD_KEY = "careermind_chunk_reload_once";

function isChunkLoadError(input: unknown): boolean {
  const message =
    input instanceof Error
      ? input.message
      : typeof input === "string"
        ? input
        : "";

  return /ChunkLoadError|Loading chunk [^\s]+ failed|Failed to fetch dynamically imported module/i.test(message);
}

function reloadOnce() {
  if (typeof window === "undefined") {
    return;
  }

  if (sessionStorage.getItem(RELOAD_KEY) === "1") {
    return;
  }

  sessionStorage.setItem(RELOAD_KEY, "1");
  window.location.reload();
}

export function ChunkErrorReloader() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (isChunkLoadError(event.error ?? event.message)) {
        reloadOnce();
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadError(event.reason)) {
        reloadOnce();
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
