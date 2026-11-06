import { defineConfig } from "@playwright/test";

// Server verification never loads local secret files or uses a real provider key.
process.env.OPENAI_API_KEY = "";
process.env.OPENAI_VECTOR_STORE_ID = "";

export default defineConfig({
  testDir: "./tests/server/assistant",
  forbidOnly: !!process.env.CI,
  workers: 2,
  reporter: "list",
  outputDir: "/tmp/freemancodz-assistant-server-results",
});
