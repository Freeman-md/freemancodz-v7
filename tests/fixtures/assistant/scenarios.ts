import type { AssistantMessage } from "@/types/assistant";

export const portfolioAnswer =
  "Freeman’s portfolio includes JPScents, Debby Art & Prints, Pay4Me, Email PA and Interface Studies.\n\nJPScents is a fragrance storefront. Debby Art & Prints supports art and print enquiries.\n\nEmail PA covers application-tracker automation.";
export const servicesAnswer =
  "Freeman builds websites and web apps that make it easier to discover, order, book or enquire.\n\nHe also works on automation, including an Email PA application tracker.";

export type ReplyPlan = {
  chunks: string[];
  fail?: boolean;
  ignoreAbort?: boolean;
};
export type Scenario = {
  messages?: AssistantMessage[];
  draft?: string;
  plans: ReplyPlan[];
};

const completed: AssistantMessage[] = [
  { id: "seed-user", role: "user", text: "What has Freeman built?" },
  {
    id: "seed-assistant",
    role: "assistant",
    text: portfolioAnswer,
    status: "complete",
  },
];

export const scenarios: Record<string, Scenario> = {
  stream: {
    plans: [
      {
        chunks: [
          "Freeman’s portfolio includes JPScents, ",
          "Debby Art & Prints, Pay4Me, Email PA and Interface Studies.",
          "\n\nEmail PA covers application-tracker automation.",
        ],
      },
    ],
  },
  waiting: { plans: [{ chunks: [portfolioAnswer] }] },
  failure: {
    plans: [
      { chunks: ["Freeman’s portfolio includes JPScents."], fail: true },
      { chunks: [portfolioAnswer] },
    ],
  },
  late: {
    plans: [
      { chunks: ["Late cancelled text"], ignoreAbort: true },
      { chunks: [servicesAnswer] },
    ],
  },
  completed: {
    messages: completed,
    draft: "How can Freeman help my business?",
    plans: [{ chunks: [servicesAnswer] }],
  },
  long: {
    messages: Array.from({ length: 8 }, (_, index) =>
      completed.map((message) => ({
        ...message,
        id: `${message.id}-${index}`,
      })),
    ).flat(),
    plans: [
      {
        chunks: [
          servicesAnswer,
          "\n\n" + portfolioAnswer,
          "\n\n" + servicesAnswer,
        ],
      },
    ],
  },
  "long-draft": {
    messages: completed,
    draft: Array(12)
      .fill("A detailed question about Freeman’s work and experience.")
      .join("\n"),
    plans: [{ chunks: [servicesAnswer] }],
  },
};
