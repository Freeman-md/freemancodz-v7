import OpenAI from "openai";
import { assistantLimits } from "../../modules/assistant/schemas.ts";
import {
  resolveAssistantSource,
  type AssistantDocument,
} from "../../modules/assistant/knowledge.ts";
import type {
  AssistantEvent,
  AssistantGeneration,
  AssistantModel,
  AssistantSource,
} from "../../modules/assistant/types.ts";
import {
  assistantGenerationSettings,
  type OpenAIConfiguration,
} from "./config.ts";

export class AssistantIndexingError extends Error {
  readonly storeId: string | undefined;
  readonly fileIds: string[];
  readonly stage: string;
  readonly status: number | undefined;

  constructor(
    storeId: string | undefined,
    fileIds: string[],
    stage: string,
    status?: number,
  ) {
    super("Knowledge indexing failed; the new store must not be activated.");
    this.storeId = storeId;
    this.fileIds = fileIds;
    this.stage = stage;
    this.status = status;
  }
}

export class OpenAIClient implements AssistantModel {
  private readonly client: OpenAI;
  private readonly storeId: string | undefined;

  constructor(
    configuration: OpenAIConfiguration,
    transport?: typeof fetch,
    storeId?: string,
  ) {
    this.storeId = storeId;
    this.client = new OpenAI({
      apiKey: configuration.apiKey,
      baseURL: "https://api.openai.com/v1",
      maxRetries: 0,
      logLevel: "off",
      timeout: assistantLimits.timeoutMilliseconds,
      fetch: transport,
    });
  }

  async *generate(
    input: AssistantGeneration,
    signal?: AbortSignal,
  ): AsyncIterable<AssistantEvent> {
    if (!this.storeId) {
      throw new Error("Assistant retrieval is not configured.");
    }
    const stream = await this.client.responses.create(
      {
        ...assistantGenerationSettings,
        stream: true,
        tools: [{ type: "file_search", vector_store_ids: [this.storeId] }],
        tool_choice: "required",
        include: ["file_search_call.results"],
        instructions: input.instructions,
        input: input.messages.map(({ role, text }) => ({
          role,
          content: text,
        })),
      },
      { signal },
    );
    let text = "";

    try {
      for await (const event of stream) {
        signal?.throwIfAborted();
        if (event.type === "response.output_text.delta" && event.delta) {
          text += event.delta;
          yield { type: "delta", text: event.delta };
        } else if (event.type === "response.completed") {
          const sources = this.completedSources(event.response, text);
          yield { type: "complete", sources };
          return;
        } else if (
          event.type === "response.failed" ||
          event.type === "response.incomplete" ||
          event.type === "error"
        ) {
          throw new Error("Provider failed to complete the reply.");
        }
      }
      throw new Error("Provider stream ended without completion.");
    } finally {
      stream.controller.abort();
    }
  }

  private completedSources(
    response: OpenAI.Responses.Response,
    text: string,
  ): AssistantSource[] {
    const confirmedText = response.output
      .flatMap((item) =>
        item.type === "message"
          ? item.content
              .filter((content) => content.type === "output_text")
              .map((content) => content.text)
          : [],
      )
      .join("");
    const searches = response.output.filter(
      (item) => item.type === "file_search_call",
    );
    if (
      response.status !== "completed" ||
      response.error ||
      response.incomplete_details ||
      !text.trim() ||
      confirmedText !== text ||
      !searches.length ||
      searches.some((search) => search.status !== "completed")
    ) {
      throw new Error("Provider did not complete the retrieved reply.");
    }
    const retrievedFiles = new Map(
      searches.flatMap((search) =>
        (search.results ?? []).map(
          (result) => [result.file_id, result.filename] as const,
        ),
      ),
    );
    const sources: AssistantSource[] = [];
    const seen = new Set<string>();
    for (const item of response.output) {
      if (item.type !== "message") {
        continue;
      }
      for (const content of item.content) {
        if (content.type !== "output_text") {
          continue;
        }
        for (const citation of content.annotations) {
          if (citation.type !== "file_citation") {
            continue;
          }
          const source = resolveAssistantSource(citation.filename);
          if (
            !source ||
            retrievedFiles.get(citation.file_id) !== citation.filename
          ) {
            console.warn("Assistant omitted an unrecognized file citation.");
            continue;
          }
          if (!seen.has(source.id)) {
            sources.push(source);
            seen.add(source.id);
          }
        }
      }
    }
    return sources;
  }

  async indexKnowledge(
    documents: readonly AssistantDocument[],
  ): Promise<string> {
    let storeId: string | undefined;
    const fileIds: string[] = [];
    let stage = "create store";
    try {
      if (!documents.length) {
        throw new Error("No knowledge documents supplied.");
      }
      const store = await this.client.vectorStores.create({
        name: `freemancodz-${new Date().toISOString()}`,
      });
      storeId = store.id;
      for (const document of documents) {
        stage = "upload document";
        const file = await this.client.files.create({
          file: new File([document.text], document.filename, {
            type: "text/plain",
          }),
          purpose: "assistants",
        });
        fileIds.push(file.id);
        stage = "index document";
        const indexed = await this.client.vectorStores.files.createAndPoll(
          store.id,
          { file_id: file.id },
        );
        if (indexed.status !== "completed" || indexed.last_error) {
          throw new Error("Document indexing did not complete.");
        }
      }
      return store.id;
    } catch (error) {
      const status =
        error instanceof OpenAI.APIError ? error.status : undefined;
      throw new AssistantIndexingError(storeId, fileIds, stage, status);
    }
  }
}
