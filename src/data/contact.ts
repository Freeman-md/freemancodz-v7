export type ContactSocialLink = {
  readonly id: "contra" | "linkedin" | "x" | "github";
  readonly label: string;
  readonly href: string;
  readonly image: string;
  readonly accessibleName?: string;
};

export const contactEmailHref = "mailto:freemanmadudili@gmail.com";

export const contactSocialLinks: readonly ContactSocialLink[] = [
  {
    id: "contra",
    label: "Freemancodz",
    accessibleName: "Freemancodz on Contra",
    href: "https://contra.com/freeman_madudili_xs81lv56?referralExperimentNid=DEFAULT_REFERRAL_PROGRAM&referrerUsername=freeman_madudili_xs81lv56",
    image: "/images/contact/portrait.webp",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/freeman-madudili-9864101a2/",
    image: "/images/contact/linkedin.png",
  },
  {
    id: "x",
    label: "X",
    href: "https://x.com/freemancodz",
    image: "/images/contact/x.svg",
  },
  {
    id: "github",
    label: "GitHub",
    href: "https://github.com/Freeman-md",
    image: "/images/contact/github.svg",
  },
];
