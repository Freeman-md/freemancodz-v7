"use client";

import { ArrowDown, MoveUpRight } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { handleAnchorClick } from "@/lib/navigation/anchor-navigation";
import styles from "./ActionLink.module.css";

type ActionLinkProps = {
  href: string;
  children: ReactNode;
  arrow?: "down" | "up-right";
  className?: string;
};

export function ActionLink({
  href,
  children,
  arrow = "down",
  className,
}: ActionLinkProps) {
  const Arrow = arrow === "down" ? ArrowDown : MoveUpRight;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const destination = new URL(event.currentTarget.href);
    const isSamePage =
      destination.origin === location.origin &&
      destination.pathname === location.pathname &&
      destination.search === location.search;

    if (
      isSamePage &&
      destination.hash &&
      document.getElementById(destination.hash.slice(1))
    ) {
      handleAnchorClick(event);
    }
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className={`${styles.link} ${className ?? ""}`}
    >
      {children}
      <Arrow
        size={16}
        strokeWidth={arrow === "up-right" ? 2 : 1.75}
        aria-hidden="true"
      />
    </a>
  );
}
