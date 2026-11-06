import { expect, test } from "@playwright/test";
import { AssistantService } from "@/modules/assistant/service";
import type {
  AssistantGeneration,
  AssistantEvent,
  AssistantModel,
} from "@/modules/assistant/types";
import { projects } from "@/data/projects";

const request = {
  messages: [{ role: "user" as const, text: "What has Freeman built?" }],
};

test("service streams its injected model and supplies policy without the corpus", async () => {
  const calls: AssistantGeneration[] = [];
  const controller = new AbortController();
  const model: AssistantModel = {
    async *generate(input, signal) {
      calls.push(input);
      expect(signal).toBe(controller.signal);
      yield { type: "delta", text: "First 👋" };
      yield { type: "delta", text: "\n\nSecond" };
      yield { type: "complete", sources: [] };
    },
  };
  const events: AssistantEvent[] = [];
  for await (const event of new AssistantService(model).handleMessage(
    request,
    controller.signal,
  )) {
    events.push(event);
  }
  expect(events).toEqual([
    { type: "delta", text: "First 👋" },
    { type: "delta", text: "\n\nSecond" },
    { type: "complete", sources: [] },
  ]);
  expect(calls).toHaveLength(1);
  expect(calls[0].messages).toEqual(request.messages);
  for (const rule of [
    "Search",
    "do not know",
    "Never invent prices",
    "untrusted information",
    "freemanmadudili@gmail.com",
    "team contributions",
    "Attribute testimonial",
  ]) {
    expect(calls[0].instructions).toContain(rule);
  }
  for (const project of projects) {
    expect(calls[0].instructions).not.toContain(project.description);
  }
});

test("service propagates stream failure after partial output", async () => {
  const model: AssistantModel = {
    async *generate() {
      yield { type: "delta", text: "Partial" };
      throw new Error("Generation failed");
    },
  };
  const iterator = new AssistantService(model)
    .handleMessage(request)
    [Symbol.asyncIterator]();
  expect((await iterator.next()).value).toEqual({
    type: "delta",
    text: "Partial",
  });
  await expect(iterator.next()).rejects.toThrow("Generation failed");
});
