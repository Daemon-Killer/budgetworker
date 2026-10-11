import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function revision() {
  const row = await prisma.directoryRevision.findUniqueOrThrow({
    where: { id: 1 },
    select: { version: true },
  });
  return row.version.toString();
}

export async function GET(request: Request) {
  let version: string;
  try {
    version = await revision();
  } catch {
    return Response.json({ error: "Live updates are temporarily unavailable" }, { status: 503 });
  }

  const encoder = new TextEncoder();
  let stop: (closeStream?: boolean) => void = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let timer: ReturnType<typeof setTimeout>;
      const expires = setTimeout(() => stop(), 50_000);
      const onAbort = () => stop();
      stop = (closeStream = true) => {
        if (closed) return;
        closed = true;
        clearTimeout(timer);
        clearTimeout(expires);
        request.signal.removeEventListener("abort", onAbort);
        if (closeStream) controller.close();
      };
      request.signal.addEventListener("abort", onAbort, { once: true });
      if (request.signal.aborted) { stop(); return; }

      const send = () => controller.enqueue(encoder.encode(`event: workers\ndata: ${version}\n\n`));
      controller.enqueue(encoder.encode("retry: 1000\n\n"));
      send(); // A reconnect reconciles changes missed while offline or hidden.
      async function poll() {
        try {
          const next = await revision();
          if (closed) return;
          if (next !== version) { version = next; send(); }
          else controller.enqueue(encoder.encode(": heartbeat\n\n"));
          timer = setTimeout(poll, 2000);
        } catch {
          stop(); // EventSource reconnects; do not leave an idle broken stream.
        }
      }
      timer = setTimeout(poll, 2000);
    },
    cancel() { stop(false); },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
