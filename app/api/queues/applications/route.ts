import { handleCallback } from "@vercel/queue";
import { createAdminClient } from "@/lib/supabase/admin";
import { processNextApplication } from "@/lib/resume/process-application-queue";
import { sendApplicationQueueWake } from "@/lib/resume/queue-server";

export const runtime = "nodejs";
export const maxDuration = 300;

type QueueWake = {
  userId: string;
  applicationId?: string;
};

class ApplicationQueueBusyError extends Error {}

const applicationQueueHandler = handleCallback<QueueWake>(
  async (message) => {
    if (!message?.userId) throw new Error("Queue message does not contain a user ID.");

    const supabase = createAdminClient();
    const outcome = await processNextApplication(supabase, message.userId, true);
    if (outcome.state === "busy") {
      throw new ApplicationQueueBusyError("This user's application queue is busy.");
    }

    if (outcome.state === "processed" && outcome.hasPending) {
      const sent = await sendApplicationQueueWake({ userId: message.userId });
      if (!sent) throw new Error("The next application queue wake could not be sent.");
    }
  },
  {
    visibilityTimeoutSeconds: 360,
    retry: (error, metadata) => ({
      afterSeconds: error instanceof ApplicationQueueBusyError
        ? 10
        : Math.min(300, 2 ** metadata.deliveryCount * 5),
    }),
  },
);

// The queue SDK also accepts framework wrapper objects, while Next.js Route
// Handlers require the exported function itself to receive a standard Request.
export async function POST(request: Request) {
  return applicationQueueHandler(request);
}
