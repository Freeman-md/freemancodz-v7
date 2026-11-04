import type { AssistantEvent } from "@/modules/assistant/types";
import { createServer, type ServerResponse } from "node:http";

export function bytesStream(chunks: Uint8Array[], onCancel?: () => void) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
    cancel() {
      onCancel?.();
    },
  });
}

export function eventBytes(events: AssistantEvent[]) {
  return new TextEncoder().encode(
    events.map((event) => JSON.stringify(event) + "\n").join(""),
  );
}

export function providerResponse(
  events: unknown[],
  onCancel?: () => void,
): Response {
  const body = events
    .map((event) => `data: ${JSON.stringify(event)}\n\n`)
    .join("");
  return new Response(bytesStream([new TextEncoder().encode(body)], onCancel), {
    headers: { "Content-Type": "text/event-stream" },
  });
}

export function providerDelta(text: string) {
  return {
    type: "response.output_text.delta",
    delta: text,
    item_id: "fixture-item",
    output_index: 0,
    content_index: 0,
    sequence_number: 1,
  };
}

export function providerComplete() {
  return {
    type: "response.completed",
    sequence_number: 2,
    response: {
      id: "fixture-response",
      status: "completed",
      error: null,
      incomplete_details: null,
    },
  };
}

export async function createAssistantTransport() {
  type Exchange = {
    body: unknown;
    closed: boolean;
    response: ServerResponse;
    start: (status?: number, contentType?: string) => void;
    write: (bytes: string | Uint8Array) => void;
    send: (event: AssistantEvent) => void;
    end: () => void;
  };
  const requests: Exchange[] = [];
  const waiting = new Map<number, (exchange: Exchange) => void>();
  const server = createServer(async (request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    if (request.method === "OPTIONS") {
      response.writeHead(204).end();
      return;
    }
    if (request.method !== "POST" || request.url !== "/api/assistant") {
      response.writeHead(404).end();
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.from(chunk));
    }
    const exchange: Exchange = {
      body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
      closed: false,
      response,
      start(status = 200, contentType = "application/x-ndjson; charset=utf-8") {
        response.writeHead(status, {
          "Content-Type": contentType,
          "Cache-Control": "no-store",
        });
        response.flushHeaders();
      },
      write(bytes) {
        if (!exchange.closed) {
          response.write(bytes);
        }
      },
      send(event) {
        exchange.write(eventBytes([event]));
      },
      end() {
        if (!exchange.closed) {
          response.end();
        }
      },
    };
    response.on("close", () => {
      exchange.closed = true;
    });
    const index = requests.push(exchange) - 1;
    waiting.get(index)?.(exchange);
    waiting.delete(index);
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Fixture server has no TCP address.");
  }

  return {
    url: `http://127.0.0.1:${address.port}/api/assistant`,
    requests,
    waitForRequest(index = 0): Promise<Exchange> {
      if (requests[index]) {
        return Promise.resolve(requests[index]);
      }
      return new Promise((resolve) => waiting.set(index, resolve));
    },
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        }),
      );
    },
  };
}
