import { useEffect, useRef, useState } from "react";

export function useAssistantTranscript() {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [showLatest, setShowLatest] = useState(false);
  const following = useRef(true);
  const readingPosition = useRef(0);

  function latest() {
    following.current = true;
    setShowLatest(false);
    if (element) {
      element.scrollTo({ top: element.scrollHeight });
      readingPosition.current = element.scrollTop;
    }
  }

  useEffect(() => {
    if (!element) {
      return;
    }
    const scroller = element;
    scroller.scrollTo({
      top: following.current ? scroller.scrollHeight : readingPosition.current,
    });
    readingPosition.current = scroller.scrollTop;

    function handleScroll() {
      const nearBottom =
        scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop < 48;
      if (nearBottom) {
        following.current = true;
      } else if (scroller.scrollTop < readingPosition.current) {
        following.current = false;
      }
      readingPosition.current = scroller.scrollTop;
      setShowLatest(!following.current);
    }

    const observer = new ResizeObserver(() => {
      if (following.current) {
        scroller.scrollTo({ top: scroller.scrollHeight });
        readingPosition.current = scroller.scrollTop;
      }
    });
    observer.observe(scroller);
    if (scroller.firstElementChild) {
      observer.observe(scroller.firstElementChild);
    }
    scroller.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      observer.disconnect();
      scroller.removeEventListener("scroll", handleScroll);
    };
  }, [element]);

  return { transcriptRef: setElement, showLatest, latest };
}
