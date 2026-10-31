type AnchorClickEvent = Pick<
  MouseEvent,
  "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey" | "preventDefault"
> & { currentTarget: HTMLAnchorElement };

function isSameDocument(url: URL) {
  return (
    url.origin === location.origin &&
    url.pathname === location.pathname &&
    url.search === location.search
  );
}

export function followAnchor(destination: string) {
  const url = new URL(destination, window.location.href);
  if (!isSameDocument(url)) {
    window.location.assign(url.href);
    return;
  }
  const target = document.getElementById(url.hash.slice(1));

  if (!target) {
    return;
  }

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  window.history.pushState(null, "", url.pathname + url.search + url.hash);
  target.scrollIntoView({
    behavior: reduceMotion ? "instant" : "smooth",
    block: "start",
  });
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

  const destination = new URL(event.currentTarget.href);
  if (
    !isSameDocument(destination) ||
    !destination.hash ||
    !document.getElementById(destination.hash.slice(1))
  ) {
    return;
  }

  event.preventDefault();
  followAnchor(event.currentTarget.getAttribute("href")!);
}
