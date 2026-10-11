import { AccessToken, RoomServiceClient, TrackSource } from "livekit-server-sdk";
import { InterviewError } from "./interview-errors";

function config() {
  const { LIVEKIT_URL: value, LIVEKIT_API_KEY: key, LIVEKIT_API_SECRET: secret, LIVEKIT_GUARD_SECRET: guard } = process.env;
  if (!value || !key || !secret || !guard || secret.length < 32 || guard.length < 32) return null;
  try {
    const url = new URL(value);
    const local = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (!(url.protocol === "wss:" || (local && url.protocol === "ws:")) || url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    const serverUrl = url.origin;
    url.protocol = url.protocol === "wss:" ? "https:" : "http:";
    return { serverUrl, httpUrl: url.origin, key, secret, guard };
  } catch { return null; }
}

export function callsConfigured() { return Boolean(config()); }
function required() {
  const value = config();
  if (!value) throw new InterviewError("Video calls are not connected yet. Your interview booking is saved; please contact Budget Worker to confirm calling availability.", 503);
  return value;
}

export async function ensureLiveKitRoom(name: string, endsAt: Date) {
  const c = required();
  try {
    const client = new RoomServiceClient(c.httpUrl, c.key, c.secret, { requestTimeout: 8 });
    // CreateRoom is idempotent. Explicit creation fixes the participant limit,
    // including after a room is cleaned up between participant reconnects.
    await client.createRoom({ name, maxParticipants: 2, emptyTimeout: 60, departureTimeout: 20, metadata: JSON.stringify({ endsAt: endsAt.toISOString() }) });
    return c.serverUrl;
  } catch { throw new InterviewError("The call service is temporarily unavailable. Please try again.", 503); }
}

export async function liveKitMeetingToken(name: string, identity: string, displayName: string, endsAt: Date) {
  const c = required();
  const ttl = Math.min(120, Math.floor((endsAt.getTime() - Date.now()) / 1000));
  if (ttl < 1) throw new InterviewError("This interview's join window has ended.", 409);
  const token = new AccessToken(c.key, c.secret, { identity, name: displayName, ttl });
  token.addGrant({ roomJoin: true, room: name, canSubscribe: true, canPublish: true, canPublishSources: [TrackSource.CAMERA, TrackSource.MICROPHONE], canPublishData: false, canUpdateOwnMetadata: false });
  return token.toJwt();
}

export async function revokeLiveKitRoom(name: string) {
  const c = required();
  try {
    // Self-hosted LiveKit does not revoke cached JWTs on DeleteRoom. The
    // admission gateway persists a tombstone before terminating the session.
    const response = await fetch(c.httpUrl + "/bw/revoke", { method: "POST", headers: { Authorization: `Bearer ${c.guard}`, "Content-Type": "application/json" }, body: JSON.stringify({ roomName: name }), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("Revocation unavailable");
  } catch { throw new InterviewError("The call service could not close this interview. Please try again or contact Budget Worker.", 503); }
}
