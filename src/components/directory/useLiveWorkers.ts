"use client";

import { useEffect } from "react";

/** Revision events contain no profiles; refetch through the normal public API. */
export function useLiveWorkers(refresh: (signal: AbortSignal) => Promise<void>) {
  useEffect(() => {
    let source: EventSource | null = null;
    let disposed = false;
    let latest: string | undefined;
    let applied: string | undefined;
    let inFlight: AbortController | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let reconnect: ReturnType<typeof setTimeout> | undefined;

    async function reconcile() {
      if (disposed || !source || inFlight || latest === undefined || latest === applied) return;
      clearTimeout(retry);
      retry = undefined;
      const version = latest;
      const controller = new AbortController();
      inFlight = controller;
      try {
        await refresh(controller.signal);
        if (!controller.signal.aborted) applied = version;
      } catch {
        if (!disposed && !controller.signal.aborted) {
          retry = setTimeout(() => { retry = undefined; void reconcile(); }, 3000);
        }
      } finally {
        if (inFlight === controller) inFlight = null;
        if (!disposed && source && retry === undefined && latest !== applied) void reconcile();
      }
    }

    function close() {
      source?.close();
      source = null;
      inFlight?.abort();
      clearTimeout(retry);
      retry = undefined;
      clearTimeout(reconnect);
      reconnect = undefined;
    }
    function connect() {
      if (disposed || source || document.visibilityState === "hidden") return;
      clearTimeout(reconnect);
      reconnect = undefined;
      source = new EventSource("/api/workers/events");
      source.addEventListener("workers", (event: MessageEvent<string>) => {
        latest = event.data;
        void reconcile();
      });
      // Network interruptions reconnect natively. Some HTTP errors permanently
      // close EventSource, so reopen those connections after a short backoff.
      source.addEventListener("error", () => {
        if (source?.readyState === EventSource.CLOSED) {
          source.close();
          source = null;
          reconnect = setTimeout(connect, 3000);
        }
      });
    }
    function visibility() {
      if (document.visibilityState === "hidden") close();
      else connect();
    }
    connect();
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("online", connect);
    return () => {
      disposed = true;
      close();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("online", connect);
    };
  }, [refresh]);
}
