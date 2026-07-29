import { authenticated, failure, unauthorized } from "@/lib/api/auth";
import { resumeFilename } from "@/lib/resume/filename";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  const { supabase, user } = await authenticated();
  if (!user) return unauthorized();
  const format = new URL(request.url).searchParams.get("format") === "pdf" ? "pdf" : "docx";
  const { data: application, error } = await supabase.from("applications")
    .select("resume_word_path,resume_pdf_path,profiles(full_name)")
    .eq("id", id).single();
  if (error || !application) return failure("Application not found.", 404);
  const storagePath = format === "pdf" ? application.resume_pdf_path : application.resume_word_path;
  if (!storagePath) return failure("Resume has not been generated yet.", 404);

  const { data, error: downloadError } = await supabase.storage.from("resumes").download(storagePath);
  if (downloadError || !data) return failure("Resume file could not be downloaded.", 500, downloadError?.message);
  await supabase.from("applications").update({ status: "Downloaded" }).eq("id", id).in("status", ["Generated", "Downloaded"]);

  const bytes = await data.arrayBuffer();
  const mime = format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const profile = Array.isArray(application.profiles) ? application.profiles[0] : application.profiles;
  const filename = resumeFilename(profile?.full_name, format);
  return new Response(bytes, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
