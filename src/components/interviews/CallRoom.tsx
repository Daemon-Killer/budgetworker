"use client";

import { useEffect, useRef, useState } from "react";
import type { Room, Track } from "livekit-client";
import type { InterviewJoin } from "../../../shared/interviews";
import styles from "./CallRoom.module.css";

function Media({ track, local }: { track: Track; local: boolean }) {
  const target = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = track.attach();
    element.autoplay = true;
    if (element instanceof HTMLVideoElement) { element.playsInline = true; element.muted = local; }
    target.current?.appendChild(element);
    return () => { track.detach(element); element.remove(); };
  }, [track, local]);
  return <div ref={target} className={styles.media} />;
}

/** No device capture until the participant explicitly starts the call. */
export function CallRoom({ serverUrl, token, displayName, endsAt, onLeave }: InterviewJoin & { onLeave: () => void }) {
  const session = useRef<Room | null>(null);
  const alive = useRef(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [phase, setPhase] = useState("ready");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [, redraw] = useState(0);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; void session.current?.disconnect(true); session.current = null; };
  }, []);
  useEffect(() => {
    // The VM guardian enforces this too when the browser is suspended.
    const timer = setTimeout(() => { void session.current?.disconnect(true); setPhase("ended"); }, Math.max(0, Date.parse(endsAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [endsAt]);

  async function start() {
    if (busy || session.current) return;
    setBusy(true); setError(""); setPhase("connecting");
    let audio: Awaited<ReturnType<typeof import("livekit-client")["createLocalAudioTrack"]>> | undefined;
    try {
      const sdk = await import("livekit-client");
      audio = await sdk.createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true });
      if (!alive.current) { audio.stop(); return; }
      const call = new sdk.Room({ adaptiveStream: true, dynacast: true, videoCaptureDefaults: { resolution: sdk.VideoPresets.h360.resolution } });
      session.current = call;
      const changed = () => { if (alive.current) redraw(n => n + 1); };
      for (const event of [sdk.RoomEvent.TrackSubscribed, sdk.RoomEvent.TrackUnsubscribed, sdk.RoomEvent.TrackMuted, sdk.RoomEvent.TrackUnmuted, sdk.RoomEvent.LocalTrackPublished, sdk.RoomEvent.LocalTrackUnpublished, sdk.RoomEvent.ParticipantConnected, sdk.RoomEvent.ParticipantDisconnected, sdk.RoomEvent.AudioPlaybackStatusChanged]) call.on(event, changed);
      call.on(sdk.RoomEvent.ConnectionStateChanged, state => { if (alive.current) setPhase(state); });
      call.on(sdk.RoomEvent.Disconnected, () => { if (alive.current) setPhase("ended"); });
      await call.connect(serverUrl, token);
      if (!alive.current) { audio.stop(); await call.disconnect(true); return; }
      await call.localParticipant.publishTrack(audio);
      if (!alive.current) { audio.stop(); await call.disconnect(true); return; }
      setRoom(call); setPhase("connected");
      // Mobile autoplay denial is recoverable with the speaker button.
      await call.startAudio().catch(() => undefined);
    } catch (e) {
      audio?.stop(); await session.current?.disconnect(true); session.current = null;
      if (alive.current) {
        setRoom(null); setPhase("ended");
        setError(e instanceof Error && e.name === "NotAllowedError" ? "Microphone permission was denied. Allow it in your browser settings, then return and join again." : "Unable to connect. Check your connection, then return to the booking and join again for fresh call access.");
      }
    } finally { if (alive.current) setBusy(false); }
  }

  async function toggle(kind: "microphone" | "camera") {
    if (!room || busy) return;
    setBusy(true); setError("");
    try {
      if (kind === "camera") await room.localParticipant.setCameraEnabled(!room.localParticipant.isCameraEnabled);
      else await room.localParticipant.setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled);
      redraw(n => n + 1);
    } catch { setError("Unable to use that device. Check your browser permissions and try again."); }
    finally { setBusy(false); }
  }

  const active = phase === "connected" || phase === "reconnecting";
  const participants = room ? [room.localParticipant, ...room.remoteParticipants.values()] : [];
  return <section aria-label="Private Budget Worker interview" className={styles.call}>
    <div className={styles.bar}><strong>Budget Worker · Private interview</strong><span role="status">{phase === "ready" ? "Device check" : phase === "connected" ? "Connected" : phase === "reconnecting" ? "Reconnecting…" : phase === "connecting" ? "Connecting…" : "Call ended"}</span></div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {phase === "ready" && <div className={styles.preflight}><h2>Ready, {displayName}?</h2><p>Find a quiet place and use headphones if you have them. Starting the call asks for your microphone. You can turn your camera on during the interview.</p><button className="bw-button" onClick={() => void start()} disabled={busy}>Allow microphone & start call</button><p className="bw-muted">Camera starts off · No recording · Only two participants</p></div>}
    {active && <><div className={styles.grid}>
      {participants.map(participant => {
        const local = participant === room?.localParticipant;
        const tracks = [...participant.trackPublications.values()].flatMap(publication => publication.track && !publication.isMuted ? [publication.track] : []);
        const video = tracks.find(track => track.kind === "video");
        return <div className={styles.tile} key={participant.identity}><div className={styles.stage}>{video ? <Media track={video} local={local} /> : <div className={styles.avatar} aria-label="Camera off">{(participant.name || (local ? displayName : "Participant")).slice(0, 1).toUpperCase()}</div>}{!local && tracks.filter(track => track.kind === "audio").map(track => <Media key={track.sid} track={track} local={false} />)}</div><p>{local ? "You" : participant.name || "Participant"}{!participant.isMicrophoneEnabled && " · Mic off"}</p></div>;
      })}
      {participants.length < 2 && <div className={styles.waiting}><h2>Waiting for the other participant</h2><p>Keep this page open. They can join using their private invitation.</p></div>}
    </div><div className={styles.controls}><button className="bw-button secondary" disabled={busy} aria-pressed={!room?.localParticipant.isMicrophoneEnabled} onClick={() => void toggle("microphone")}>{room?.localParticipant.isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}</button><button className="bw-button secondary" disabled={busy} aria-pressed={room?.localParticipant.isCameraEnabled} onClick={() => void toggle("camera")}>{room?.localParticipant.isCameraEnabled ? "Turn camera off" : "Turn camera on"}</button>{room && !room.canPlaybackAudio && <button className="bw-button secondary" onClick={() => void room.startAudio().catch(() => setError("Tap again to enable audio."))}>Enable speaker audio</button>}</div></>}
    {phase === "ended" && <p role="status">The call has ended or access has closed. Return to your booking to check its status or rejoin.</p>}
    <div className={styles.footer}><p className="bw-muted">This interview is not recorded. Camera and microphone stop when you leave.</p><button className="bw-button secondary" onClick={() => { void session.current?.disconnect(true); onLeave(); }}>Leave interview</button></div>
  </section>;
}
