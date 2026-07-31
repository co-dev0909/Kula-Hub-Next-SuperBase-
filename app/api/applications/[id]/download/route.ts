import { authenticated, failure, unauthorized } from "@/lib/api/auth";
import { resumeFilename } from "@/lib/resume/filename";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  const { supabase, user } = await authenticated();
  if (!user) return unauthorized();
  const requestedFormat = new URL(request.url).searchParams.get("format");
  if (requestedFormat && requestedFormat !== "docx") {
    return failure("Only DOCX resumes are available.", 400);
  }
  const { data: application, error } = await supabase.from("applications")
    .select("resume_word_path,profiles(full_name)")
    .eq("id", id).single();
  if (error || !application) return failure("Application not found.", 404);
  const storagePath = application.resume_word_path;
  if (!storagePath) return failure("Resume has not been generated yet.", 404);

  const { data, error: downloadError } = await supabase.storage.from("resumes").download(storagePath);
  if (downloadError || !data) return failure("Resume file could not be downloaded.", 500, downloadError?.message);
  await supabase.from("applications").update({ status: "Downloaded" }).eq("id", id).in("status", ["Generated", "Downloaded"]);

  const bytes = await data.arrayBuffer();
  const profile = Array.isArray(application.profiles) ? application.profiles[0] : application.profiles;
  const filename = resumeFilename(profile?.full_name);
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
