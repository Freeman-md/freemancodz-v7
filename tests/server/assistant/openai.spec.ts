import { expect, test } from "@playwright/test";
import { OpenAIClient } from "@/infrastructure/openai/client";
import type { AssistantEvent } from "@/modules/assistant/types";

const input = {
  instructions: "Approved rules",
  messages: [{ role: "user" as const, text: "Hello" }],
};
const citation = {
  type: "file_citation",
  file_id: "file-project",
  filename: "project-pay4me.txt",
  index: 0,
};
function completion(annotations: unknown[] = [citation], status = "completed") {
  return {
    type: "response.completed",
    response: {
      status,
      error: null,
      incomplete_details: null,
      output: [
        {
          type: "file_search_call",
          status: "completed",
          results: [
            { file_id: "file-project", filename: "project-pay4me.txt" },
          ],
        },
        {
          type: "message",
          content: [
            { type: "output_text", text: "Hello 👋\n\nWorld", annotations },
          ],
        },
      ],
    },
  };
}
function transport(events: unknown[]): typeof fetch {
  return async () =>
    new Response(
      events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
      { headers: { "Content-Type": "text/event-stream" } },
    );
}
async function collect(client: OpenAIClient, signal?: AbortSignal) {
  const events: AssistantEvent[] = [];
  for await (const event of client.generate(input, signal)) {
    events.push(event);
  }
  return events;
}
const delta = {
  type: "response.output_text.delta",
  delta: "Hello 👋\n\nWorld",
};

test("SDK streams exact settings and emits only actual recognized retrieved citations, in order", async () => {
  const requests: unknown[] = [];
  const events = [
    delta,
    completion([
      citation,
      citation,
      { ...citation, filename: "https://evil.example" },
      { ...citation, file_id: "not-retrieved" },
      { type: "url_citation", url: "https://evil.example" },
    ]),
  ];
  const client = new OpenAIClient(
    { apiKey: "fixture-no-network" },
    async (url, options) => {
      requests.push(JSON.parse(String(options?.body)));
      return transport(events)(url, options);
    },
    "vs_fixture",
  );
  expect(await collect(client)).toEqual([
    { type: "delta", text: delta.delta },
    {
      type: "complete",
      sources: [
        {
          id: "project-pay4me",
          title: "Pay4Me",
          url: "https://withradius.com/",
        },
      ],
    },
  ]);
  expect(requests).toEqual([
    {
      model: "gpt-6-luna",
      reasoning: { effort: "none" },
      max_output_tokens: 800,
      store: false,
      stream: true,
      tools: [{ type: "file_search", vector_store_ids: ["vs_fixture"] }],
      tool_choice: "required",
      include: ["file_search_call.results"],
      instructions: input.instructions,
      input: [{ role: "user", content: "Hello" }],
    },
  ]);
});

test("incomplete, failed, empty, missing retrieval and truncated provider streams fail", async () => {
  for (const events of [
    [delta],
    [{ ...delta, delta: "Mismatch" }, completion()],
    [completion()],
    [delta, completion([], "incomplete")],
    [delta, { type: "response.failed" }],
    [delta, { type: "response.incomplete" }],
    [delta, { type: "error" }],
    [
      delta,
      {
        type: "response.completed",
        response: { status: "completed", output: [] },
      },
    ],
  ]) {
    await expect(
      collect(
        new OpenAIClient(
          { apiKey: "fixture-no-network" },
          transport(events),
          "vs_fixture",
        ),
      ),
    ).rejects.toThrow();
  }
});

test("missing store fails before provider access; SDK failures never retry", async () => {
  let calls = 0;
  const failingFetch: typeof fetch = async () => {
    calls++;
    return Response.json({ error: { message: "Failure" } }, { status: 500 });
  };
  await expect(
    collect(new OpenAIClient({ apiKey: "fixture-no-network" }, failingFetch)),
  ).rejects.toThrow("not configured");
  expect(calls).toBe(0);
  await expect(
    collect(
      new OpenAIClient(
        { apiKey: "fixture-no-network" },
        failingFetch,
        "vs_fixture",
      ),
    ),
  ).rejects.toThrow();
  expect(calls).toBe(1);
});

test("abandoning the iterator cancels provider transport", async () => {
  let cancelled = false;
  const client = new OpenAIClient(
    { apiKey: "fixture-no-network" },
    async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify(delta)}\n\n`),
            );
          },
          cancel() {
            cancelled = true;
          },
        }),
        { headers: { "Content-Type": "text/event-stream" } },
      ),
    "vs_fixture",
  );
  const iterator = client.generate(input)[Symbol.asyncIterator]();
  expect((await iterator.next()).value.type).toBe("delta");
  await iterator.return?.();
  expect(cancelled).toBe(true);
});
