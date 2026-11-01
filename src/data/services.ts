export type ServiceId = "web-development" | "automation";
export type Service = {
  id: ServiceId;
  title: string;
  description: string;
  caption: string;
  preview: "selection" | "workflow";
};

export const services: readonly Service[] = [
  {
    id: "web-development",
    title: "WEB DEVELOPMENT",
    description:
      "Websites and web apps that make it easier to discover, order, book or enquire.",
    caption: "JPScents · a real fragrance storefront",
    preview: "selection",
  },
  {
    id: "automation",
    title: "AUTOMATION",
    description:
      "Connected tools and reliable handoffs that take repetitive administration out of your day.",
    caption: "Email PA · illustrated workflow with example data",
    preview: "workflow",
  },
];
