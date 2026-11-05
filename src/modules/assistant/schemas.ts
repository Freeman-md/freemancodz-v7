import { z } from "zod";

export const assistantLimits = {
  bodyBytes: 64 * 1024,
  messages: 20,
  textCharacters: 12000,
  userCharacters: 4000,
  timeoutMilliseconds: 30000,
} as const;

export const assistantMessageSchema = z
  .strictObject({
    role: z.enum(["user", "assistant"]),
    text: z.string().refine((text) => text.trim().length > 0),
  })
  .superRefine((message, context) => {
    if (
      message.role === "user" &&
      message.text.length > assistantLimits.userCharacters
    ) {
      context.addIssue({
        code: "custom",
        message: "Question exceeds the character limit.",
        path: ["text"],
      });
    }
  });

export const assistantRequestSchema = z
  .strictObject({
    messages: z
      .array(assistantMessageSchema)
      .min(1)
      .max(assistantLimits.messages),
  })
  .superRefine(({ messages }, context) => {
    if (messages.at(-1)?.role !== "user") {
      context.addIssue({
        code: "custom",
        message: "The final message must be from the user.",
        path: ["messages"],
      });
    }
    if (
      messages.reduce((total, message) => total + message.text.length, 0) >
      assistantLimits.textCharacters
    ) {
      context.addIssue({
        code: "custom",
        message: "Conversation exceeds the character limit.",
        path: ["messages"],
      });
    }
  });

export const assistantErrorSchema = z.strictObject({
  code: z.enum(["invalid_request", "unavailable", "reply_failed"]),
  message: z.string().min(1),
});

export const assistantHttpErrorSchema = z.strictObject({
  error: assistantErrorSchema,
});

export const assistantResponseSchema = z.strictObject({
  text: z.string().refine((text) => text.trim().length > 0),
});

export const assistantErrors = {
  invalid_request: {
    code: "invalid_request",
    message: "The message request is invalid.",
  },
  unavailable: {
    code: "unavailable",
    message: "The assistant is unavailable. Try again later.",
  },
  reply_failed: {
    code: "reply_failed",
    message: "The reply couldn’t be completed. Please send your message again.",
  },
} as const;
