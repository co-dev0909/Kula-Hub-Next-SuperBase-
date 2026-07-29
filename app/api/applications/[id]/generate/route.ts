import { after, NextResponse } from "next/server";
import { authenticated, failure, unauthorized } from "@/lib/api/auth";
import { sendApplicationQueueWake } from "@/lib/resume/queue-server";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  const { id } = await context.params;
  const { supabase, user } = await authenticated();
  if (!user) return unauthorized();

  const { data: application, error: loadError } = await supabase
    .from("applications")
    .select("id,status,updated_at,queue_previous_status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (loadError || !application) {
    return failure("Application could not be loaded.", loadError ? 500 : 404, loadError?.message);
  }

  const updatedAt = Date.parse(application.updated_at);
  const staleGenerating = application.status === "Generating"
    && Number.isFinite(updatedAt)
    && Date.now() - updatedAt >= 6 * 60 * 1000;
  if (application.status !== "Failed" && application.status !== "Pending" && !staleGenerating) {
    return failure("Only a failed or interrupted generation can be queued again.", 409);
  }

  const changes: Record<string, unknown> = {
    status: "Pending",
    generation_error: null,
    drive_upload_error: null,
  };
  if (application.status === "Failed") changes.queue_previous_status = null;

  const { data: queued, error: queueError } = await supabase
    .from("applications")
    .update(changes)
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", application.status)
    .eq("updated_at", application.updated_at)
    .select("id")
    .maybeSingle();
  if (queueError) return failure("Resume generation could not be queued.", 500, queueError.message);
  if (!queued) return failure("The application status changed before it could be queued.", 409);

  after(async () => {
    try {
      await sendApplicationQueueWake({ userId: user.id, applicationId: id });
    } catch {
      // The authenticated user-area runner also wakes the same Supabase queue.
    }
  });

  return NextResponse.json({
    success: true,
    kind: "queued",
    message: "Resume generation added to the queue.",
    data: { _id: id, status: "Pending" },
  }, { status: 202 });
}
