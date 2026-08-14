import { addClient, removeClient } from "@/lib/eventBus";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  let controllerRef: ReadableStreamDefaultController | null = null;
  let intervalId: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;
      addClient(controller);
      controller.enqueue(`data: "connected"\n\n`);

      // Heartbeat to keep connection alive
      intervalId = setInterval(() => {
        try {
          controller.enqueue(`data: "ping"\n\n`);
        } catch (err) {
          if (intervalId) clearInterval(intervalId);
        }
      }, 30000);
    },
    cancel() {
      if (intervalId) clearInterval(intervalId);
      if (controllerRef) {
        removeClient(controllerRef);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
