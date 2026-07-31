"use client";

import { useEffect } from "react";
import { toast } from "react-toastify";
import { APPLICATION_QUEUE_EVENT } from "@/lib/resume/queue-client";

// Save/retry events wake the queue immediately. This slower heartbeat is only
// a recovery path for missed events or interrupted workers.
const QUEUE_HEARTBEAT_MS = 60_000;

export default function ApplicationQueueRunner() {
  useEffect(() => {
    let mounted = true;
    let running = false;
    let rerunRequested = false;
    let lastError = "";

    const runQueue = async () => {
      if (running) {
        rerunRequested = true;
        return;
      }

      running = true;
      try {
        do {
          rerunRequested = false;
          while (mounted) {
            const apiBase = (process.env.NEXT_PUBLIC_BACKEND_URL || "/api").replace(/\/$/, "");
            const response = await fetch(`${apiBase}/applications/process`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "same-origin",
              cache: "no-store",
            });
            const payload = await response.json().catch(() => null);

            if (!response.ok || !payload?.success) {
              const message = payload?.message || payload?.error || "Application queue processing failed.";
              if (message !== lastError) {
                lastError = message;
                toast.error(message);
              }
              break;
            }

            const result = payload.data?.state === "processed" ? payload.data?.result : null;
            if (result?.success === false) {
              const message = result.error
                || result.message
                || payload.message
                || "Resume generation failed.";
              if (message !== lastError) {
                lastError = message;
                toast.error(message);
              }
            } else {
              lastError = "";
            }

            if (payload.data?.state !== "processed" || !payload.data?.hasPending) break;
          }
        } while (mounted && rerunRequested);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Application queue processing failed.";
        if (message !== lastError) {
          lastError = message;
          toast.error(message);
        }
      } finally {
        running = false;
        if (mounted && rerunRequested) void runQueue();
      }
    };

    const requestRun = () => {
      void runQueue();
    };

    requestRun();
    window.addEventListener(APPLICATION_QUEUE_EVENT, requestRun);
    const heartbeat = window.setInterval(requestRun, QUEUE_HEARTBEAT_MS);

    return () => {
      mounted = false;
      window.removeEventListener(APPLICATION_QUEUE_EVENT, requestRun);
      window.clearInterval(heartbeat);
    };
  }, []);

  return null;
}
