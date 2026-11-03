import { connection } from "next/server";
import { notFound } from "next/navigation";

export default async function AssistantFixturePage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  await connection();
  if (process.env.ASSISTANT_UI_FIXTURES !== "1") {
    notFound();
  }

  const { scenario } = await searchParams;
  const { scenarios } =
    await import("../../../../tests/fixtures/assistant/scenarios");
  const { AssistantFixture } =
    await import("../../../../tests/fixtures/assistant/AssistantFixture");
  return (
    <AssistantFixture
      initialScenario={
        scenario && Object.hasOwn(scenarios, scenario) ? scenario : "stream"
      }
    />
  );
}
