"use client";

import Image from "next/image";
import { useHeroScroll } from "@/hooks/use-hero-scroll";
import styles from "./HeroPortrait.module.css";

export function HeroPortrait({ heroId }: { heroId: string }) {
  const portraitRef = useHeroScroll(heroId);

  return (
    <div className={styles.portrait}>
      <div className={styles.entrance}>
        <div ref={portraitRef} className={styles.scroll}>
          <Image
            src="/images/hero/portrait-hero-approved-slope-v3.png"
            alt="Freeman in profile, wearing glasses and a navy shirt"
            width={1145}
            height={1374}
            sizes="(min-width: 1024px) 378px, (min-width: 390px) 315px, 81vw"
            loading="eager"
            className={styles.image}
          />
        </div>
      </div>
    </div>
  );
}
