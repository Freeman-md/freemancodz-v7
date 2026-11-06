import { expect, test } from "@playwright/test";
import {
  assistantKnowledge,
  resolveAssistantSource,
} from "@/modules/assistant/knowledge";
import {
  OpenAIClient,
  AssistantIndexingError,
} from "@/infrastructure/openai/client";
import { projects } from "@/data/projects";
import { testimonials } from "@/data/testimonials";
import { services } from "@/data/services";
import { experience } from "@/data/experience";

test("knowledge preserves approved records, classification, attribution, paragraphs and stable sources", () => {
  expect(assistantKnowledge).toHaveLength(projects.length + 4);
  for (const project of projects) {
    const document = assistantKnowledge.find(
      (entry) => entry.id === `project-${project.id}`,
    )!;
    expect(document.filename).toBe(`${document.id}.txt`);
    expect(document.url).toBe(project.href);
    for (const fact of [
      project.title,
      project.description,
      project.category,
      ...project.tags,
    ]) {
      expect(document.text).toContain(fact);
    }
    expect(resolveAssistantSource(document.filename)).toEqual({
      id: document.id,
      title: document.title,
      url: document.url,
    });
  }
  const quotes = assistantKnowledge.find(
    (entry) => entry.id === "testimonials",
  )!.text;
  for (const testimonial of testimonials) {
    for (const fact of [
      testimonial.quotation,
      testimonial.author,
      testimonial.role,
      testimonial.source,
    ]) {
      expect(quotes).toContain(fact);
    }
  }
  for (const service of services) {
    expect(
      assistantKnowledge.find((entry) => entry.id === "services")!.text,
    ).toContain(service.description);
  }
  for (const record of experience) {
    expect(
      assistantKnowledge.find((entry) => entry.id === "experience")!.text,
    ).toContain(record.dates);
  }
  expect(resolveAssistantSource("https://evil.example")).toBeUndefined();
  expect(resolveAssistantSource("../project-pay4me.txt")).toBeUndefined();
});

for (const status of ["completed", "failed", "cancelled"]) {
  test(`indexing ${status} reports readiness only on full success and preserves created IDs for cleanup`, async () => {
    const calls: string[] = [];
    let uploads = 0;
    const client = new OpenAIClient(
      { apiKey: "fixture-no-network" },
      async (url, options) => {
        const path = new URL(String(url)).pathname;
        calls.push(`${options?.method} ${path}`);
        if (path === "/v1/vector_stores") {
          return Response.json({ id: "vs_new" });
        }
        if (path === "/v1/files") {
          uploads++;
          const form = options?.body as FormData;
          const file = form.get("file") as File;
          expect(file.name).toBe(assistantKnowledge[uploads - 1].filename);
          expect(await file.text()).toBe(assistantKnowledge[uploads - 1].text);
          return Response.json({ id: `file-${uploads}` });
        }
        if (options?.method === "POST") {
          return Response.json({
            id: `file-${uploads}`,
            status: "in_progress",
          });
        }
        return Response.json({
          id: `file-${uploads}`,
          status,
          last_error:
            status === "failed" ? { message: "Private diagnostic" } : null,
        });
      },
    );
    if (status === "completed") {
      expect(await client.indexKnowledge(assistantKnowledge.slice(0, 2))).toBe(
        "vs_new",
      );
      expect(uploads).toBe(2);
    } else {
      try {
        await client.indexKnowledge(assistantKnowledge.slice(0, 2));
        throw new Error("Expected failure");
      } catch (error) {
        expect(error).toBeInstanceOf(AssistantIndexingError);
        expect(error).toMatchObject({ storeId: "vs_new", fileIds: ["file-1"] });
        expect(String(error)).not.toContain("Private");
      }
    }
    expect(
      calls.every(
        (call) => !call.startsWith("DELETE") && !call.startsWith("PATCH"),
      ),
    ).toBe(true);
  });
}
