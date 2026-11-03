import type { RequestReply } from "@/types/assistant";
import type { ReplyPlan } from "./scenarios";

export function createReplyDriver(plans: ReplyPlan[]): RequestReply {
  let attempt = 0;
  return async (_messages, { signal, onChunk }) => {
    const plan = plans[Math.min(attempt++, plans.length - 1)];
    async function step() {
      await new Promise<void>((resolve, reject) => {
        if (signal.aborted && !plan.ignoreAbort) {
          reject(new Error("Cancelled"));
          return;
        }
        const timeout = setTimeout(() => {
          signal.removeEventListener("abort", cancel);
          resolve();
        }, 1000);
        function cancel() {
          clearTimeout(timeout);
          signal.removeEventListener("abort", cancel);
          reject(new Error("Cancelled"));
        }
        if (!plan.ignoreAbort) {
          signal.addEventListener("abort", cancel, { once: true });
        }
      });
    }
    for (const chunk of plan.chunks) {
      await step();
      onChunk(chunk);
    }
    await step();
    if (plan.fail) {
      throw new Error("Fixture reply failed");
    }
  };
}
