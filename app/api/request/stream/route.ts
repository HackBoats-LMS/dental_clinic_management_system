import { addClient, removeClient } from "@/lib/eventBus";

export async function GET() {
  let controllerRef: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;
      addClient(controller);
      controller.enqueue(`data: "connected"\n\n`);
    },
    cancel() {
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
