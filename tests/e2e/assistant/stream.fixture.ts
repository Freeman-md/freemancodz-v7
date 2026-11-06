import { createServer, type ServerResponse } from "node:http";
import { test as base, expect } from "@playwright/test";
import type { AssistantEvent } from "@/modules/assistant/types";

export function completedReply(
  text: string,
  sources: Extract<AssistantEvent, { type: "complete" }>["sources"] = [],
) {
  return {
    contentType: "text/event-stream",
    body: `data: ${JSON.stringify({ type: "delta", text })}\n\ndata: ${JSON.stringify({ type: "complete", sources })}\n\n`,
  };
}

type PendingRequest = {
  messages: { role: string; text: string }[];
  response: ServerResponse;
  closed: boolean;
};
export const test = base.extend<{
  stream: {
    requests: PendingRequest[];
    send: (index: number, event: AssistantEvent) => void;
    end: (index: number) => void;
  };
}>({
  stream: async ({ page }, provideStream) => {
    const requests: PendingRequest[] = [];
    const server = createServer(async (request, response) => {
      response.setHeader("Access-Control-Allow-Origin", "*");
      response.setHeader("Access-Control-Allow-Headers", "content-type");
      if (request.method === "OPTIONS") {
        response.writeHead(204).end();
        return;
      }
      let body = "";
      for await (const chunk of request) {
        body += chunk.toString();
      }
      const pending = {
        ...JSON.parse(body),
        response,
        closed: false,
      } as PendingRequest;
      requests.push(pending);
      response.on("close", () => {
        pending.closed = true;
      });
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
      });
      response.flushHeaders();
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Fixture server unavailable");
    }
    await page.route("**/api/assistant", (route) =>
      route.continue({ url: `http://127.0.0.1:${address.port}/api/assistant` }),
    );
    try {
      await provideStream({
        requests,
        send: (index, event) => {
          requests[index].response.write(`data: ${JSON.stringify(event)}\n\n`);
        },
        end: (index) => {
          requests[index].response.end();
        },
      });
    } finally {
      for (const request of requests) {
        request.response.destroy();
      }
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  },
});
export { expect };
