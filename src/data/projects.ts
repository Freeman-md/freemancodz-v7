export type ProjectCategory = "Real projects" | "Explorations";
export type WorkFilter = "All" | ProjectCategory;
export type Project = {
  id: string;
  title: string;
  category: ProjectCategory;
  description: string;
  tags: readonly string[];
  href: string;
  artwork:
    "image" | "payment" | "workflow" | "studies" | "sequencer" | "recovery";
  image?: {
    src: string;
    width: number;
    height: number;
    alt: string;
    position?: string;
  };
};

export const projects: readonly Project[] = [
  {
    id: "jpscents",
    title: "JPScents",
    category: "Real projects",
    description: "Fragrance storefront",
    tags: ["Web app", "E-commerce", "Novier Labs"],
    href: "https://jpscents.shop/",
    artwork: "image",
    image: {
      src: "/images/projects/jpscents/storefront.png",
      width: 1440,
      height: 1000,
      alt: "The genuine JPScents fragrance storefront, featuring Sugar Baby",
    },
  },
  {
    id: "debby",
    title: "Debby Art & Prints",
    category: "Real projects",
    description: "Art & print enquiries",
    tags: ["Web app", "Guided enquiries", "Novier Labs"],
    href: "https://debbyarts.vercel.app/",
    artwork: "image",
    image: {
      src: "/images/projects/debby/storefront.png",
      width: 1280,
      height: 720,
      alt: "The genuine Debby Art & Prints website, with original eagle artwork",
    },
  },
  {
    id: "pay4me",
    title: "Pay4Me",
    category: "Real projects",
    description: "Tuition payments",
    tags: ["Payments", "Frontend", "Team contribution"],
    href: "https://withradius.com/",
    artwork: "payment",
  },
  {
    id: "email-pa",
    title: "Email PA",
    category: "Real projects",
    description: "Application-tracker automation",
    tags: ["Automation", "Email", "Integrations"],
    href: "https://github.com/Freeman-md/email-pa",
    artwork: "workflow",
  },
  {
    id: "interface-studies",
    title: "Interface Studies",
    category: "Explorations",
    description: "Small interfaces, considered interactions",
    tags: ["Search", "Booking", "Inbox triage"],
    href: "https://github.com/Freeman-md/ui-builds",
    artwork: "studies",
  },
  {
    id: "across-the-horizon",
    title: "Across the Horizon",
    category: "Real projects",
    description: "Study-abroad experiences",
    tags: ["Web app", "Frontend", "Team contribution"],
    href: "https://acrossthehorizon.net/",
    artwork: "image",
    image: {
      src: "/images/projects/archive/across-the-horizon.jpg",
      width: 1280,
      height: 720,
      alt: "Across the Horizon study-abroad website, preserved from the V4 portfolio",
      position: "top",
    },
  },
  {
    id: "email-sequencer",
    title: "Email Sequencer",
    category: "Explorations",
    description: "Reviewed outreach and follow-ups",
    tags: ["Automation", "Gmail", "Workflow illustration"],
    href: "https://github.com/Freeman-md/email-sequencer",
    artwork: "sequencer",
  },
  {
    id: "self-healing-backend-ops",
    title: "Self-Healing Backend Ops",
    category: "Explorations",
    description: "Recovery with guardrails",
    tags: ["MSc research", "Systems", "Workflow illustration"],
    href: "https://github.com/Freeman-md/self-healing-backend-ops",
    artwork: "recovery",
  },
];

export const selectedProjects = projects.slice(0, 5);
