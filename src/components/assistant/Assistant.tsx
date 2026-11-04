"use client";

import { useId } from "react";
import { requestAssistantReply } from "@/modules/assistant/client";
import { AssistantButton } from "@/components/shared/AssistantButton";
import { useAssistantConversation } from "@/hooks/shared/assistant/use-assistant-conversation";
import { useAssistantSurface } from "@/hooks/shared/assistant/use-assistant-surface";
import { useAssistantTranscript } from "@/hooks/shared/assistant/use-assistant-transcript";
import { useAssistantViewport } from "@/hooks/shared/assistant/use-assistant-viewport";
import { AssistantDialog } from "./AssistantDialog";

export function Assistant() {
  const id = useId();
  const conversation = useAssistantConversation({
    requestReply: requestAssistantReply,
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
      <AssistantButton
        ref={triggerRef}
        onClick={requestOpen}
        aria-controls={id}
        aria-expanded={phase !== "closed"}
        style={{ visibility: phase === "closed" ? "visible" : "hidden" }}
      />
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
