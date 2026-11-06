import {
  OpenAIClient,
  AssistantIndexingError,
} from "../src/infrastructure/openai/client.ts";
import { getOpenAIConfiguration } from "../src/infrastructure/openai/config.ts";
import { assistantKnowledge } from "../src/modules/assistant/knowledge.ts";

let configuration: ReturnType<typeof getOpenAIConfiguration>;
try {
  configuration = getOpenAIConfiguration();
} catch {
  console.error(
    "OPENAI_API_KEY is missing from this command’s process environment. Configure it securely in your terminal; this command does not load .env.local.",
  );
  process.exit(1);
}

try {
  const client = new OpenAIClient(configuration);
  const storeId = await client.indexKnowledge(assistantKnowledge);
  console.log(
    `Ready: ${storeId} (${assistantKnowledge.length} documents). Configure OPENAI_VECTOR_STORE_ID only after this success.`,
  );
} catch (error) {
  console.error(
    "Indexing failed. No configuration was changed; do not activate a partial store.",
  );
  if (error instanceof AssistantIndexingError) {
    console.error(
      JSON.stringify({
        stage: error.stage,
        status: error.status,
        storeId: error.storeId,
        fileIds: error.fileIds,
      }),
    );
  }
  process.exitCode = 1;
}
