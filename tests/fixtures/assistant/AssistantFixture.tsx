"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { AssistantDialog } from "@/components/assistant/AssistantDialog";
import { useAssistantConversation } from "@/hooks/shared/assistant/use-assistant-conversation";
import { useAssistantSurface } from "@/hooks/shared/assistant/use-assistant-surface";
import { useAssistantTranscript } from "@/hooks/shared/assistant/use-assistant-transcript";
import { useAssistantViewport } from "@/hooks/shared/assistant/use-assistant-viewport";
import { createReplyDriver } from "./reply-driver";
import { scenarios } from "./scenarios";

function FixtureSession({ scenario }: { scenario: string }) {
  const id = useId();
  const selected = scenarios[scenario];
  const requestReply = useMemo(
    () => createReplyDriver(selected.plans),
    [selected],
  );
  const conversation = useAssistantConversation({
    requestReply,
    initialMessages: selected.messages,
    initialDraft: selected.draft,
  });
  const {
    phase,
    triggerRef,
    closeRef,
    element,
    handleContentMount,
    requestOpen,
    requestClose,
    handleCloseAutoFocus,
    messageBaseline,
    animateWelcome,
  } = useAssistantSurface(conversation.messages.length);
  const transcript = useAssistantTranscript(conversation.messages.length > 0);
  const isDesktop = useAssistantViewport(element);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-controls={id}
        aria-expanded={phase !== "closed"}
        aria-haspopup="dialog"
        onClick={requestOpen}
      >
        Open fixture assistant
      </button>
      <AssistantDialog
        id={id}
        phase={phase}
        closeRef={closeRef}
        contentRef={handleContentMount}
        requestClose={requestClose}
        handleCloseAutoFocus={handleCloseAutoFocus}
        isDesktop={isDesktop}
        conversation={conversation}
        transcript={transcript}
        messageBaseline={messageBaseline}
        animateWelcome={animateWelcome}
      />
    </>
  );
}

export function AssistantFixture({
  initialScenario,
}: {
  initialScenario: string;
}) {
  const [scenario, setScenario] = useState(initialScenario);
  return (
    <main aria-label="Assistant fixture" style={{ padding: "140px 24px" }}>
      <label>
        Fixture scenario{" "}
        <select
          value={scenario}
          onChange={(event) => setScenario(event.target.value)}
        >
          {Object.keys(scenarios).map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <FixtureSession key={scenario} scenario={scenario} />
      <Link href="/work">Navigate to work</Link>
    </main>
  );
}
