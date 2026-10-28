type AnchorClickEvent = Pick<
  MouseEvent,
  "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey" | "preventDefault"
> & { currentTarget: HTMLAnchorElement };

export function followAnchor(destination: string) {
  const url = new URL(destination, window.location.href);
  const target = document.getElementById(url.hash.slice(1));

  if (!target) {
    return;
  }

  window.history.pushState(null, "", url.pathname + url.hash);
  target.scrollIntoView({ behavior: "instant", block: "start" });
  target.focus({ preventScroll: true });
}

export function handleAnchorClick(event: AnchorClickEvent) {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  event.preventDefault();
  followAnchor(event.currentTarget.getAttribute("href")!);
}
