import { projects } from "../../data/projects.ts";
import { services } from "../../data/services.ts";
import { experience } from "../../data/experience.ts";
import { testimonials } from "../../data/testimonials.ts";
import { contactEmailHref, contactSocialLinks } from "../../data/contact.ts";
import type { AssistantSource } from "./types.ts";

export type AssistantDocument = AssistantSource & {
  filename: string;
  text: string;
};

function document(
  id: string,
  title: string,
  url: string,
  text: string,
): AssistantDocument {
  return {
    id,
    title,
    url,
    filename: `${id}.txt`,
    text: `${title}\nSource: ${url}\n\n${text}`,
  };
}

const siteUrl = "https://freemancodz-v7.vercel.app";

export const assistantKnowledge: readonly AssistantDocument[] = [
  ...projects.map(({ id, title, category, description, tags, href }) =>
    document(
      `project-${id}`,
      title,
      href,
      `${category}\n${description}\n${tags.join(" · ")}`,
    ),
  ),
  document(
    "services",
    "Services",
    `${siteUrl}/#services`,
    services
      .map(
        ({ title, description, caption }) =>
          `${title}\n${description}\n${caption}`,
      )
      .join("\n\n"),
  ),
  document(
    "experience",
    "Experience",
    `${siteUrl}/#experience`,
    experience
      .map(({ company, role, dates }) => `${company}\n${role}\n${dates}`)
      .join("\n\n"),
  ),
  document(
    "testimonials",
    "Testimonials",
    `${siteUrl}/#testimonials`,
    testimonials
      .map(
        ({ author, role, quotation, source }) =>
          `${author} — ${role}\n${quotation}\nRecommendation author: ${source}`,
      )
      .join("\n\n"),
  ),
  document(
    "contact",
    "Contact",
    `${siteUrl}/#contact`,
    `${contactEmailHref}\n${contactSocialLinks.map(({ label, href }) => `${label}: ${href}`).join("\n")}`,
  ),
];

export function resolveAssistantSource(
  filename: string,
): AssistantSource | undefined {
  const match = assistantKnowledge.find((entry) => entry.filename === filename);
  if (match) {
    const { id, title, url } = match;
    return { id, title, url };
  }
}
