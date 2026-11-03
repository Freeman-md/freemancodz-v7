"use client";

import Image from "next/image";
import { useRef } from "react";
import type { ContactSocialLink } from "@/data/contact";
import { useContactReveal } from "@/hooks/use-contact-reveal";
import styles from "./ContactSocialLinks.module.css";

type ContactSocialLinksProps = {
  links: readonly ContactSocialLink[];
};

export function ContactSocialLinks({ links }: ContactSocialLinksProps) {
  const groupRef = useRef<HTMLDivElement>(null);
  useContactReveal(groupRef);

  return (
    <div ref={groupRef} className={styles.group} data-contact-socials>
      {[links.slice(0, 2), links.slice(2)].map((row, rowIndex) => (
        <div key={rowIndex} className={styles.row}>
          {row.map((link, index) => {
            const isPersonalProfile = link.id === "contra";
            const imageSize = isPersonalProfile ? 36 : 16;

            return (
              <a
                key={link.id}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.accessibleName}
                className={`${styles.link} ${isPersonalProfile ? styles.profile : ""}`}
                data-contact-part="social"
                data-contact-order={rowIndex * 2 + index}
              >
                <Image
                  src={link.image}
                  alt=""
                  width={imageSize}
                  height={imageSize}
                  className={isPersonalProfile ? styles.avatar : styles.mark}
                />
                {link.label}
              </a>
            );
          })}
        </div>
      ))}
    </div>
  );
}
