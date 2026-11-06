import { expect, test } from "@playwright/test";
import { POST } from "@/app/api/assistant/route";
import { assistantLimits } from "@/modules/assistant/schemas";

const input = { messages: [{ role: "user", text: "Hello" }] };
const originalFetch = globalThis.fetch;

function request(body = JSON.stringify(input), length?: string) {
  return new Request("http://localhost/api/assistant", {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/json",
      ...(length ? { "Content-Length": length } : {}),
    },
  });
}

test.beforeEach(() => {
  process.env.OPENAI_API_KEY = "";
  process.env.OPENAI_VECTOR_STORE_ID = "";
  globalThis.fetch = async () => {
    throw new Error("Unexpected provider request");
  };
});
test.afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env.OPENAI_API_KEY = "";
  process.env.OPENAI_VECTOR_STORE_ID = "";
});

test("invalid requests are rejected before configuration or provider access", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    throw new Error("Unexpected provider request");
  };
  for (const body of [
    "not JSON",
    JSON.stringify({ messages: [] }),
    JSON.stringify({ ...input, model: "other" }),
  ]) {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "invalid_request" },
    });
  }
  expect(calls).toBe(0);
  const missingKey = await POST(request());
  expect(missingKey.status).toBe(503);
  expect(await missingKey.json()).toMatchObject({
    error: { code: "unavailable" },
  });
});

test("body size uses encoded content even with an absent or inaccurate header", async () => {
  const oversized = " ".repeat(assistantLimits.bodyBytes + 1);
  for (const length of [undefined, "1"]) {
    expect((await POST(request(oversized, length))).status).toBe(413);
  }
  const json = JSON.stringify(input);
  const atLimit =
    json +
    " ".repeat(
      assistantLimits.bodyBytes - new TextEncoder().encode(json).length,
    );
  expect((await POST(request(atLimit))).status).toBe(503);
});

test("real handler streams text before completion and response cancellation aborts provider", async () => {
  process.env.OPENAI_API_KEY = "fixture-no-network";
  process.env.OPENAI_VECTOR_STORE_ID = "vs_fixture";
  let provider: ReadableStreamDefaultController<Uint8Array>;
  let cancelled = false;
  globalThis.fetch = async () =>
    new Response(
      new ReadableStream({
        start(controller) {
          provider = controller;
        },
        cancel() {
          cancelled = true;
        },
      }),
      { headers: { "Content-Type": "text/event-stream" } },
    );
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/event-stream");
  expect(response.headers.get("cache-control")).toBe("no-store");
  const reader = response.body!.getReader();
  const first = reader.read();
  await expect.poll(() => !!provider).toBe(true);
  provider!.enqueue(
    new TextEncoder().encode(
      `data: ${JSON.stringify({ type: "response.output_text.delta", delta: "First 👋\n\nSecond" })}\n\n`,
    ),
  );
  expect(new TextDecoder().decode((await first).value)).toBe(
    `data: ${JSON.stringify({ type: "delta", text: "First 👋\n\nSecond" })}\n\n`,
  );
  await reader.cancel();
  expect(cancelled).toBe(true);
});

test("provider errors emit a safe terminal error without diagnostics", async () => {
  process.env.OPENAI_API_KEY = "fixture-no-network";
  process.env.OPENAI_VECTOR_STORE_ID = "vs_fixture";
  globalThis.fetch = async () =>
    Response.json(
      { error: { message: "Private provider diagnostics" } },
      { status: 500 },
    );
  const response = await POST(request());
  const body = await response.text();
  expect(body).toContain('"type":"error"');
  expect(body).toContain('"code":"reply_failed"');
  expect(body).not.toContain("Private");
});

test("configured key without store is explicitly unavailable", async () => {
  process.env.OPENAI_API_KEY = "fixture-no-network";
  expect((await POST(request())).status).toBe(503);
});
