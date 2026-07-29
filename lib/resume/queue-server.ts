import { send } from "@vercel/queue";

export const APPLICATION_QUEUE_TOPIC = "resume-applications";

type ApplicationQueueWake = {
  userId: string;
  applicationId?: string;
};

export async function sendApplicationQueueWake(payload: ApplicationQueueWake) {
  const hasServerKey = Boolean(
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  if (process.env.VERCEL !== "1" || !hasServerKey) {
    return false;
  }

  await send(APPLICATION_QUEUE_TOPIC, payload, {
    retentionSeconds: 7 * 24 * 60 * 60,
  });
  return true;
}
