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
    .select(`
      id,status,updated_at,queue_previous_status,
      resume_word_path,resume_pdf_path,
      drive_file_id,drive_docx_link,drive_docx_download_link
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (loadError || !application) {
    return failure("Application could not be loaded.", loadError ? 500 : 404, loadError?.message);
  }

  if (application.drive_file_id && application.drive_docx_link) {
    return NextResponse.json({
      success: true,
      kind: "completed",
      message: "Google Docs copy is already available.",
      data: {
        driveDocxLink: application.drive_docx_link,
        driveDocxDownloadLink: application.drive_docx_download_link,
      },
    });
  }
  if (!application.resume_word_path || !application.resume_pdf_path) {
    return failure("Generate the resume before uploading it to Google Drive.", 409);
  }

  const updatedAt = Date.parse(application.updated_at);
  const staleGenerating = application.status === "Generating"
    && Number.isFinite(updatedAt)
    && Date.now() - updatedAt >= 6 * 60 * 1000;
  if (application.status === "Generating" && !staleGenerating) {
    return failure("This application is already being processed.", 409);
  }

  const previousStatus = ["Downloaded", "Applied"].includes(application.status)
    ? application.status
    : application.queue_previous_status;
  const { data: queued, error: queueError } = await supabase
    .from("applications")
    .update({
      status: "Pending",
      generation_error: null,
      drive_upload_error: null,
      queue_previous_status: previousStatus,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", application.status)
    .eq("updated_at", application.updated_at)
    .select("id")
    .maybeSingle();
  if (queueError) return failure("Google Drive upload could not be queued.", 500, queueError.message);
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
    message: "Google Drive upload added to the queue.",
    data: { _id: id, status: "Pending" },
  }, { status: 202 });
}
