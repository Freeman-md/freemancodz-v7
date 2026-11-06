import { useEffect, useState } from "react";

export function useAssistantTranscript(
  messageCount: number,
  isReplying: boolean,
  incomingText: string,
) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (element && messageCount > 0) {
      element.scrollTo({ top: element.scrollHeight });
    }
  }, [element, messageCount, isReplying, incomingText]);

  return { transcriptRef: setElement };
}
