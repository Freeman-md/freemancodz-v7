import { expect, test } from "@playwright/test";
import { OpenAIClient } from "@/infrastructure/openai/client";

const input = {
  instructions: "Approved facts",
  messages: [{ role: "user" as const, text: "Hello" }],
};

function responseBody(text: string, status = "completed") {
  return {
    id: "fixture-response",
    object: "response",
    status,
    error: null,
    incomplete_details: null,
    output: [
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text, annotations: [] }],
      },
    ],
  };
}

test("SDK sends one non-streaming request with approved settings and returns complete text", async () => {
  const requests: unknown[] = [];
  const reply = "Hello 👋\n\nA complete answer.";
  const client = new OpenAIClient(
    { apiKey: "fixture-no-network" },
    async (_url, options) => {
      requests.push(JSON.parse(String(options?.body)));
      return Response.json(responseBody(reply));
    },
  );

  expect(await client.generate(input)).toBe(reply);
  expect(requests).toEqual([
    {
      model: "gpt-6-luna",
      reasoning: { effort: "none" },
      max_output_tokens: 800,
      store: false,
      instructions: input.instructions,
      input: [{ role: "user", content: "Hello" }],
    },
  ]);
});

test("incomplete and empty provider replies cannot become success", async () => {
  for (const [text, status] of [
    ["partial", "incomplete"],
    [" ", "completed"],
    ["failed", "failed"],
  ]) {
    const client = new OpenAIClient(
      { apiKey: "fixture-no-network" },
      async () => Response.json(responseBody(text, status)),
    );
    await expect(client.generate(input)).rejects.toThrow("complete text reply");
  }
});

test("SDK failure is propagated without automatic retries", async () => {
  let calls = 0;
  const client = new OpenAIClient(
    { apiKey: "fixture-no-network" },
    async () => {
      calls += 1;
      return Response.json(
        { error: { message: "Provider failure" } },
        { status: 500 },
      );
    },
  );
  await expect(client.generate(input)).rejects.toThrow();
  expect(calls).toBe(1);
});
