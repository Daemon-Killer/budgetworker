"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { DailyCall } from "@daily-co/daily-js";

type Props = { roomUrl: string; token: string; displayName: string; onLeave?: () => void };

/** Load calling code only after an authorized participant chooses to join. */
export function CallRoom({ roomUrl, token, displayName, onLeave }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const teardown = useRef<Promise<unknown>>(Promise.resolve());
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const leave = useEffectEvent(() => onLeave?.());

  useEffect(() => {
    let disposed = false;
    let call: DailyCall | undefined;
    async function start() {
      await teardown.current;
      const { default: Daily } = await import("@daily-co/daily-js");
      if (disposed || !container.current) return;
      const parsed = new URL(roomUrl);
      if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".daily.co")) {
        throw new Error("Invalid interview room");
      }
      call = Daily.createFrame(container.current, {
        iframeStyle: { width: "100%", height: "100%", border: "0", borderRadius: "16px" },
        showLeaveButton: true,
        showFullscreenButton: true,
      });
      call.iframe()?.setAttribute("title", "Private Budget Worker interview");
      call.iframe()?.setAttribute("referrerpolicy", "no-referrer");
      call.on("loaded", () => { if (!disposed) setReady(true); });
      call.on("left-meeting", () => { if (!disposed) leave(); });
      call.on("error", () => {
        if (!disposed) setError("The call disconnected. Check your connection and microphone permissions, then leave and rejoin.");
      });
      await call.join({ url: roomUrl, token, userName: displayName, startVideoOff: true });
      if (!disposed) setReady(true);
    }
    void start().catch(() => {
      if (!disposed) setError("Unable to open the call. Allow microphone access and try again in Chrome or Safari.");
    });
    return () => {
      disposed = true;
      if (call) teardown.current = call.destroy().catch(() => undefined);
    };
  }, [roomUrl, token, displayName]);

  return <section aria-label="Private interview call">
    {!ready && !error && <p role="status">Opening your private interview…</p>}
    {error && <p role="alert" className="bw-interview-error">{error}</p>}
    <div ref={container} style={{ height: "min(72vh, 680px)", minHeight: 420, width: "100%" }} />
    <p className="bw-muted">Your camera starts off. Allow your microphone, then turn on video if you both prefer. This interview is not recorded.</p>
    {onLeave && <button className="bw-button secondary" onClick={onLeave}>Leave interview</button>}
  </section>;
}
