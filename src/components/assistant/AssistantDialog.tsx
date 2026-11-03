import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { Ref, RefObject } from "react";
import type { useAssistantConversation } from "@/hooks/use-assistant-conversation";
import type { useAssistantTranscript } from "@/hooks/use-assistant-transcript";
import type { AssistantPhase } from "@/types/assistant";
import { AssistantComposer } from "./AssistantComposer";
import { AssistantMessages } from "./AssistantMessages";
import styles from "./AssistantDialog.module.css";

type Props = {
  id: string;
  phase: AssistantPhase;
  closeRef: RefObject<HTMLButtonElement | null>;
  contentRef: Ref<HTMLDivElement>;
  requestClose: () => void;
  handleCloseAutoFocus: (event: Event) => void;
  isDesktop: boolean;
  conversation: ReturnType<typeof useAssistantConversation>;
  transcript: ReturnType<typeof useAssistantTranscript>;
  messageBaseline: number;
  animateWelcome: boolean;
};

export function AssistantDialog({
  id,
  phase,
  closeRef,
  contentRef,
  requestClose,
  handleCloseAutoFocus,
  isDesktop,
  conversation,
  transcript,
  messageBaseline,
  animateWelcome,
}: Props) {
  return (
    <Dialog.Root
      open={phase !== "closed"}
      onOpenChange={(open) => {
        if (!open) {
          requestClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          id={id}
          ref={contentRef}
          className={styles.dialog}
          data-phase={phase}
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            closeRef.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={handleCloseAutoFocus}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            requestClose();
          }}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <header className={styles.header}>
            <div>
              <Dialog.Title className={styles.title}>
                Freeman’s assistant
              </Dialog.Title>
              <p className={styles.identity}>AI assistant</p>
            </div>
            <button
              ref={closeRef}
              type="button"
              aria-label="Close assistant"
              onClick={requestClose}
            >
              <X size={20} strokeWidth={2} aria-hidden="true" />
            </button>
          </header>
          <AssistantMessages
            messages={conversation.messages}
            submit={conversation.submit}
            retry={conversation.retry}
            isReplying={conversation.isReplying}
            {...transcript}
            messageBaseline={messageBaseline}
            animateWelcome={animateWelcome}
          />
          <AssistantComposer
            draft={conversation.draft}
            setDraft={conversation.setDraft}
            isReplying={conversation.isReplying}
            isDesktop={isDesktop}
            submit={conversation.submit}
            stop={conversation.stop}
          />
          <div
            className={styles.announcement}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span key={conversation.announcement.sequence}>
              {conversation.announcement.text}
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
