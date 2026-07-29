import { NextResponse } from "next/server";
import { authenticated, failure, unauthorized } from "@/lib/api/auth";
import { processNextApplication } from "@/lib/resume/process-application-queue";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST() {
  const { supabase, user } = await authenticated();
  if (!user) return unauthorized();

  try {
    const outcome = await processNextApplication(supabase, user.id);
    const message = outcome.state === "processed"
      ? outcome.result?.message || "Application processing finished."
      : outcome.state === "busy"
        ? "An application is already being processed."
        : "The application queue is empty.";

    return NextResponse.json({ success: true, message, data: outcome });
  } catch (error) {
    return failure("The application queue is not ready.", 503, error);
  }
}
