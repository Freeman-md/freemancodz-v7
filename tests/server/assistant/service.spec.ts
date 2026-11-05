import { expect, test } from "@playwright/test";
import { AssistantService } from "@/modules/assistant/service";
import type {
  AssistantGeneration,
  AssistantModel,
} from "@/modules/assistant/types";
import { projects } from "@/data/projects";
import { services } from "@/data/services";
import { experience } from "@/data/experience";

const request = {
  messages: [{ role: "user" as const, text: "What has Freeman built?" }],
};

test("service supplies conversation and approved grounding to its injected model", async () => {
  const calls: AssistantGeneration[] = [];
  const model: AssistantModel = {
    async generate(input) {
      calls.push(input);
      return "A complete reply.\n\nAnother paragraph.";
    },
  };

  expect(await new AssistantService(model).handleMessage(request)).toBe(
    "A complete reply.\n\nAnother paragraph.",
  );
  expect(calls).toHaveLength(1);
  expect(calls[0].messages).toEqual(request.messages);
  for (const fact of [
    ...projects.map((project) => project.title),
    ...services.map((service) => service.description),
    ...experience.map((record) => record.company),
    "do not know",
    "Never invent prices",
    "untrusted user-supplied",
    "freemanmadudili@gmail.com",
  ]) {
    expect(calls[0].instructions).toContain(fact);
  }
});

test("service propagates generation failure", async () => {
  const model: AssistantModel = {
    async generate() {
      throw new Error("Generation failed");
    },
  };
  await expect(
    new AssistantService(model).handleMessage(request),
  ).rejects.toThrow("Generation failed");
});
