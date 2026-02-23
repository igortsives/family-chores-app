import { requireSessionUser } from "@/lib/requireUser";
import { getUnreadNotificationCount, syncUserReminderNotificationsIfStale } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SSE_POLL_MS = 30_000;

function sseData(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function GET(req: Request) {
  const auth = await requireSessionUser({ source: "api/notifications/stream.GET" });
  if ("status" in auth) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { me } = auth;

  await syncUserReminderNotificationsIfStale({
    userId: me.id,
    familyId: me.familyId,
    role: me.role,
  });

  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let lastUnreadCount = -1;

      const safeClose = () => {
        if (closed) return;
        closed = true;
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
        try {
          controller.close();
        } catch {
          // Stream already closed.
        }
      };

      const publishUnreadCount = async () => {
        try {
          const unreadCount = await getUnreadNotificationCount(me.id);
          if (unreadCount !== lastUnreadCount) {
            lastUnreadCount = unreadCount;
            controller.enqueue(encoder.encode(sseData({ unreadCount })));
            return;
          }
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        }
      };

      void publishUnreadCount();
      timer = setInterval(() => {
        if (closed) return;
        void publishUnreadCount();
      }, SSE_POLL_MS);

      req.signal.addEventListener("abort", safeClose, { once: true });
    },
    cancel() {
      if (timer) clearInterval(timer);
      timer = null;
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
