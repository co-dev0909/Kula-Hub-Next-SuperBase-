import { authenticated, failure, unauthorized } from "@/lib/api/auth";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  const { supabase, user } = await authenticated();
  if (!user) return unauthorized();
  const { error } = await supabase.from("jobs").delete().eq("id", id);
  if (error) return failure("Failed to delete job.", 400, error.message);
  return new Response(null, { status: 204 });
}
