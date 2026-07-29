import { authenticated, failure, unauthorized } from "@/lib/api/auth";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  const { supabase, user } = await authenticated();
  if (!user) return unauthorized();
  const { data: app } = await supabase.from("applications").select("resume_word_path,resume_pdf_path").eq("id", id).single();
  const paths = [app?.resume_word_path, app?.resume_pdf_path].filter((value): value is string => Boolean(value));
  if (paths.length) await supabase.storage.from("resumes").remove(paths);
  const { error } = await supabase.from("applications").delete().eq("id", id);
  if (error) return failure("Failed to delete application.", 400, error.message);
  return Response.json({ success: true, message: "Application deleted successfully." });
}
