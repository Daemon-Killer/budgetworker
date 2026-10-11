import { InterviewError } from "./interview-errors";

export function callsConfigured() { return Boolean(process.env.DAILY_API_KEY?.trim()); }

function dailyBaseUrl() {
  const override = process.env.DAILY_API_BASE_URL;
  if (override && process.env.NODE_ENV !== "production") {
    const parsed = new URL(override);
    if (["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) && ["http:", "https:"].includes(parsed.protocol)) return parsed.href.replace(/\/$/, "");
  }
  return "https://api.daily.co/v1";
}

async function dailyRequest(path: string, method: string, body?: unknown, allowMissing = false) {
  const key = process.env.DAILY_API_KEY?.trim();
  if (!key) throw new InterviewError("Video calls are not connected yet. Your interview booking is saved; please contact Budget Worker to confirm calling availability.", 503);
  let response: Response;
  try {
    response = await fetch(dailyBaseUrl() + path, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new InterviewError("The call service is temporarily unavailable. Please try again.", 503);
  }
  if (allowMissing && response.status === 404) return null;
  if (!response.ok) throw new InterviewError("The call service could not complete this action. Please try again or contact Budget Worker.", 503);
  if (response.status === 204) return {};
  try { return await response.json() as Record<string, unknown>; }
  catch { throw new InterviewError("The call service returned an invalid response. Please try again.", 503); }
}

function roomUrl(value: unknown) {
  if (typeof value !== "string") throw new InterviewError("The call service returned an invalid room.", 503);
  const url = new URL(value);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".daily.co") || url.username || url.password || url.search || url.hash) throw new InterviewError("The call service returned an invalid room.", 503);
  return url.href;
}

export async function ensureDailyRoom(name: string, startsAt: Date, endsAt: Date) {
  const existing = await dailyRequest(`/rooms/${encodeURIComponent(name)}`, "GET", undefined, true);
  if (existing) return roomUrl(existing.url);
  const room = await dailyRequest("/rooms", "POST", {
    name,
    privacy: "private",
    properties: {
      nbf: Math.floor(startsAt.getTime() / 1000),
      exp: Math.floor(endsAt.getTime() / 1000),
      eject_at_room_exp: true,
      max_participants: 2,
      enforce_unique_user_ids: true,
      enable_chat: false,
      enable_advanced_chat: false,
      enable_screenshare: false,
      enable_prejoin_ui: true,
      start_video_off: true,
      enable_live_captions_ui: false,
      enable_transcription_storage: false,
      enable_dialout: false,
      permissions: { canAdmin: false },
    },
  });
  return roomUrl(room?.url);
}

export async function dailyMeetingToken(name: string, userId: string, displayName: string, endsAt: Date) {
  const result = await dailyRequest("/meeting-tokens", "POST", {
    properties: {
      room_name: name,
      user_id: userId,
      user_name: displayName.slice(0, 60),
      nbf: Math.floor(Date.now() / 1000) - 5,
      exp: Math.floor(endsAt.getTime() / 1000),
      eject_at_token_exp: true,
      is_owner: false,
      enable_screenshare: false,
      enable_recording_ui: false,
      start_cloud_recording: false,
      auto_start_transcription: false,
      enable_live_captions_ui: false,
      start_video_off: true,
      enable_prejoin_ui: true,
      permissions: { canAdmin: false },
    },
  });
  if (typeof result?.token !== "string" || result.token.length > 12000) throw new InterviewError("The call service returned an invalid access token.", 503);
  return result.token;
}

// Deletion alone does not guarantee an active session ends. Ban both scoped
// participant identities first, expire the room, then delete it.
export async function revokeDailyRoom(name: string, userIds: string[]) {
  const existing = await dailyRequest(`/rooms/${encodeURIComponent(name)}`, "GET", undefined, true);
  if (!existing) return;
  await dailyRequest(`/rooms/${encodeURIComponent(name)}/eject`, "POST", { user_ids: userIds, ban: true }, true);
  await dailyRequest(`/rooms/${encodeURIComponent(name)}`, "POST", { properties: { exp: Math.floor(Date.now() / 1000) - 1, eject_at_room_exp: true } }, true);
  await dailyRequest(`/rooms/${encodeURIComponent(name)}`, "DELETE", undefined, true);
}
