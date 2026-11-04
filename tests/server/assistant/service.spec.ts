import { expect, test } from "@playwright/test";
import { AssistantService } from "@/modules/assistant/service";
import { assistantErrors } from "@/modules/assistant/schemas";
import { projects } from "@/data/projects";
import { services } from "@/data/services";
import { experience } from "@/data/experience";
import { testimonials } from "@/data/testimonials";
import { FakeAssistantModel } from "../../fixtures/assistant/model";

const input = { messages: [{ role: "user", text: "What has Freeman built?" }] };

test("validation is eager and invalid input never reaches the model", () => {
  const model = new FakeAssistantModel([]);
  expect(() =>
    new AssistantService(model).handleMessage(
      { messages: [] },
      new AbortController().signal,
    ),
  ).toThrow();
  expect(model.calls).toHaveLength(0);
});

test("approved records and unknown-fact instructions are separate from untrusted history", async () => {
  const model = new FakeAssistantModel([
    { type: "delta", text: "A grounded reply." },
    { type: "complete" },
  ]);
  const events = await Array.fromAsync(
    new AssistantService(model).handleMessage(
      input,
      new AbortController().signal,
    ),
  );
  expect(events).toEqual([
    { type: "delta", text: "A grounded reply." },
    { type: "complete" },
  ]);
  const generation = model.calls[0].input;
  expect(generation.messages).toEqual(input.messages);
  for (const project of projects) {
    expect(generation.instructions).toContain(project.title);
  }
  for (const service of services) {
    expect(generation.instructions).toContain(service.description);
  }
  for (const record of experience) {
    expect(generation.instructions).toContain(record.company);
  }
  for (const testimonial of testimonials) {
    expect(generation.instructions).toContain(testimonial.author);
  }
  for (const phrase of [
    "Explorations",
    "Team contribution",
    "do not know",
    "Never invent prices",
    "untrusted user-supplied",
    "freemanmadudili@gmail.com",
  ]) {
    expect(generation.instructions).toContain(phrase);
  }
});

test("partial failure, unexpected end and safe error normalization cannot become success", async () => {
  for (const model of [
    new FakeAssistantModel([{ type: "delta", text: "partial" }], true),
    new FakeAssistantModel([{ type: "delta", text: "partial" }]),
  ]) {
    expect(
      await Array.fromAsync(
        new AssistantService(model).handleMessage(
          input,
          new AbortController().signal,
        ),
      ),
    ).toEqual([
      { type: "delta", text: "partial" },
      { type: "error", error: assistantErrors.reply_failed },
    ]);
  }
  const model = new FakeAssistantModel([
    {
      type: "error",
      error: { code: "unavailable", message: "Private provider details" },
    },
  ]);
  expect(
    await Array.fromAsync(
      new AssistantService(model).handleMessage(
        input,
        new AbortController().signal,
      ),
    ),
  ).toEqual([{ type: "error", error: assistantErrors.unavailable }]);
});

test("abort prevents later text and completion", async () => {
  const model = new FakeAssistantModel([
    { type: "delta", text: "first" },
    { type: "complete" },
  ]);
  const controller = new AbortController();
  const iterator = new AssistantService(model)
    .handleMessage(input, controller.signal)
    [Symbol.asyncIterator]();
  expect((await iterator.next()).value).toEqual({
    type: "delta",
    text: "first",
  });
  controller.abort();
  await expect(iterator.next()).rejects.toThrow();
});
