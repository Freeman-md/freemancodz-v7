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
  globalThis.fetch = async () => {
    throw new Error("Unexpected provider request");
  };
});
test.afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env.OPENAI_API_KEY = "";
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

test("real handler and SDK return one completed JSON response", async () => {
  process.env.OPENAI_API_KEY = "fixture-no-network";
  globalThis.fetch = async () =>
    Response.json({
      id: "fixture-response",
      object: "response",
      status: "completed",
      error: null,
      incomplete_details: null,
      output: [
        {
          type: "message",
          role: "assistant",
          content: [
            {
              type: "output_text",
              text: "Full reply 👋\n\nSecond paragraph.",
              annotations: [],
            },
          ],
        },
      ],
    });
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("application/json");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({
    text: "Full reply 👋\n\nSecond paragraph.",
  });
});

test("provider errors return a safe HTTP failure without provider diagnostics", async () => {
  process.env.OPENAI_API_KEY = "fixture-no-network";
  globalThis.fetch = async () =>
    Response.json(
      { error: { message: "Private provider diagnostics" } },
      { status: 500 },
    );
  const response = await POST(request());
  expect(response.status).toBe(502);
  const body = await response.json();
  expect(body.error.code).toBe("reply_failed");
  expect(body.error.message).not.toContain("Private");
});
