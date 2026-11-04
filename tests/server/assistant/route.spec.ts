import { expect, test } from "@playwright/test";
import { POST } from "@/app/api/assistant/route";
import { assistantLimits } from "@/modules/assistant/schemas";
import { decodeAssistantStream } from "@/modules/assistant/helpers/stream";
import {
  providerComplete,
  providerDelta,
  providerResponse,
} from "../../fixtures/assistant/transport";

const valid = { messages: [{ role: "user", text: "What has Freeman built?" }] };
const originalFetch = globalThis.fetch;
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
let deadlineClock: ReturnType<typeof controlDeadline> | undefined;

// Control only the known request/SDK deadline; keep the test runner's clock real.
function controlDeadline() {
  let elapsed = 0;
  const timers = new Map<
    ReturnType<typeof setTimeout>,
    { at: number; fire: () => void }
  >();
  globalThis.setTimeout = ((
    callback: (...args: unknown[]) => void,
    delay?: number,
    ...args: unknown[]
  ) => {
    if (delay !== assistantLimits.timeoutMilliseconds) {
      return originalSetTimeout(callback, delay, ...args);
    }
    const token = originalSetTimeout(() => {}, 1_000_000_000);
    token.unref();
    timers.set(token, { at: elapsed + delay, fire: () => callback(...args) });
    return token;
  }) as typeof setTimeout;
  globalThis.clearTimeout = ((token: ReturnType<typeof setTimeout>) => {
    timers.delete(token);
    originalClearTimeout(token);
  }) as typeof clearTimeout;
  return {
    tick(milliseconds: number) {
      elapsed += milliseconds;
      for (const [token, timer] of timers) {
        if (timer.at <= elapsed) {
          timers.delete(token);
          originalClearTimeout(token);
          timer.fire();
        }
      }
    },
    restore() {
      for (const token of timers.keys()) {
        originalClearTimeout(token);
      }
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
    },
  };
}

function request(
  body: string | ReadableStream<Uint8Array> = JSON.stringify(valid),
  options: { signal?: AbortSignal; length?: string } = {},
) {
  return new Request("http://localhost/api/assistant", {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/json",
      ...(options.length ? { "Content-Length": options.length } : {}),
    },
    signal: options.signal,
    duplex: "half",
  } as RequestInit);
}

test.beforeEach(() => {
  process.env.OPENAI_API_KEY = "";
  globalThis.fetch = async () => {
    throw new Error("Unexpected provider network request.");
  };
});

test.afterEach(() => {
  deadlineClock?.restore();
  deadlineClock = undefined;
  globalThis.fetch = originalFetch;
  process.env.OPENAI_API_KEY = "";
});

test("missing configuration returns safe 503, while invalid input is 400 before provider construction", async () => {
  const unavailable = await POST(request());
  expect(unavailable.status).toBe(503);
  expect(await unavailable.json()).toEqual({
    error: {
      code: "unavailable",
      message: "The assistant is unavailable. Try again later.",
    },
  });
  for (const body of [
    "not json",
    JSON.stringify({ messages: [] }),
    JSON.stringify({ ...valid, model: "override" }),
  ]) {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "invalid_request" },
    });
  }
});

for (const length of [undefined, "1"]) {
  test(`body byte limit applies during reading with content length ${length ?? "missing"}`, async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(assistantLimits.bodyBytes));
        controller.enqueue(new Uint8Array(1));
      },
      cancel() {
        cancelled = true;
      },
    });
    const response = await POST(request(body, { length }));
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({
      error: { code: "invalid_request" },
    });
    expect(cancelled).toBe(true);
  });
}

test("the exact byte boundary is accepted and a declared oversized body is rejected", async () => {
  const json = JSON.stringify(valid);
  expect(
    (
      await POST(
        request(
          json +
            " ".repeat(
              assistantLimits.bodyBytes -
                new TextEncoder().encode(json).byteLength,
            ),
        ),
      )
    ).status,
  ).toBe(503);
  expect(
    (
      await POST(
        request(json, { length: String(assistantLimits.bodyBytes + 1) }),
      )
    ).status,
  ).toBe(413);
});

test("real handler/SDK stream uses NDJSON headers and completes explicitly", async () => {
  process.env.OPENAI_API_KEY = "fixture-no-network";
  globalThis.fetch = async (url) => {
    expect(String(url)).toBe("https://api.openai.com/v1/responses");
    return providerResponse([
      providerDelta("Hello 👋\n\nParagraph"),
      providerComplete(),
    ]);
  };
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toBe(
    "application/x-ndjson; charset=utf-8",
  );
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await Array.fromAsync(decodeAssistantStream(response.body!))).toEqual([
    { type: "delta", text: "Hello 👋\n\nParagraph" },
    { type: "complete" },
  ]);
});

test("failure before headers is HTTP JSON, after a delta it is a streamed safe error", async () => {
  process.env.OPENAI_API_KEY = "fixture-no-network";
  globalThis.fetch = async () =>
    Response.json(
      { error: { message: "Never expose this body" } },
      { status: 503 },
    );
  const unavailable = await POST(request());
  expect(unavailable.status).toBe(503);
  expect(JSON.stringify(await unavailable.json())).not.toContain(
    "Never expose",
  );
  globalThis.fetch = async () =>
    providerResponse([providerDelta("Partial"), { type: "response.failed" }]);
  const response = await POST(request());
  expect(response.status).toBe(200);
  const events = await Array.fromAsync(decodeAssistantStream(response.body!));
  expect(events.map((event) => event.type)).toEqual(["delta", "error"]);
});

test("the one request deadline includes body reading and aborts pending provider work", async () => {
  process.env.OPENAI_API_KEY = "fixture-no-network";
  deadlineClock = controlDeadline();
  let bodyController: ReadableStreamDefaultController<Uint8Array>;
  let providerStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    providerStarted = resolve;
  });
  let providerSignal: AbortSignal | null | undefined;
  globalThis.fetch = async (_url, options) => {
    providerSignal = options?.signal;
    providerStarted();
    return new Promise((_resolve, reject) =>
      providerSignal?.addEventListener(
        "abort",
        () => reject(new DOMException("Cancelled", "AbortError")),
        { once: true },
      ),
    );
  };
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      bodyController = controller;
    },
  });
  const pending = POST(request(body));
  deadlineClock.tick(29000);
  bodyController!.enqueue(new TextEncoder().encode(JSON.stringify(valid)));
  bodyController!.close();
  await started;
  deadlineClock.tick(1000);
  const response = await pending;
  expect(response.status).toBe(504);
  expect(providerSignal?.aborted).toBe(true);
});

test("timeout after headers closes even while the consumer is not pulling", async () => {
  process.env.OPENAI_API_KEY = "fixture-no-network";
  deadlineClock = controlDeadline();
  let providerSignal: AbortSignal | null | undefined;
  globalThis.fetch = async (_url, options) => {
    providerSignal = options?.signal;
    return new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify(providerDelta("Partial"))}\n\n`,
            ),
          );
          providerSignal?.addEventListener(
            "abort",
            () => controller.error(new DOMException("Cancelled", "AbortError")),
            { once: true },
          );
        },
      }),
      { headers: { "Content-Type": "text/event-stream" } },
    );
  };
  const response = await POST(request());
  deadlineClock.tick(30000);
  expect(providerSignal?.aborted).toBe(true);
  const events = await Array.fromAsync(decodeAssistantStream(response.body!));
  expect(events.map((event) => event.type)).toEqual(["delta", "error"]);
});

test("HTTP disconnect and response cancellation abort the actual SDK transport", async () => {
  process.env.OPENAI_API_KEY = "fixture-no-network";
  let providerSignal: AbortSignal | null | undefined;
  globalThis.fetch = async (_url, options) => {
    providerSignal = options?.signal;
    return new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify(providerDelta("Partial"))}\n\n`,
            ),
          );
          providerSignal?.addEventListener(
            "abort",
            () => controller.error(new DOMException("Cancelled", "AbortError")),
            { once: true },
          );
        },
      }),
      { headers: { "Content-Type": "text/event-stream" } },
    );
  };
  const controller = new AbortController();
  const response = await POST(
    request(undefined, { signal: controller.signal }),
  );
  controller.abort();
  expect(providerSignal?.aborted).toBe(true);
  expect(
    (await Array.fromAsync(decodeAssistantStream(response.body!))).at(-1)?.type,
  ).toBe("error");
  const next = await POST(request());
  await next.body!.cancel();
  expect(providerSignal?.aborted).toBe(true);
});
