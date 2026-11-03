"use client";

import { useId } from "react";
import { AssistantButton } from "@/components/shared/AssistantButton";
import { useAssistantConversation } from "@/hooks/use-assistant-conversation";
import { useAssistantSurface } from "@/hooks/use-assistant-surface";
import { useAssistantTranscript } from "@/hooks/use-assistant-transcript";
import { useAssistantViewport } from "@/hooks/use-assistant-viewport";
import { AssistantDialog } from "./AssistantDialog";

export function Assistant() {
  const id = useId();
  const conversation = useAssistantConversation();
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
  const transcript = useAssistantTranscript();
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
