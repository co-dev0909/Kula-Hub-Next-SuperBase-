import { NextResponse } from "next/server";
import { authenticated, failure, unauthorized } from "@/lib/api/auth";
import { mapApplication } from "@/lib/api/mappers";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, context: Context) {
  const { id } = await context.params;
  const { supabase, user } = await authenticated();
  if (!user) return unauthorized();

  const { data: application, error: loadError } = await supabase
    .from("applications")
    .select("status,is_closed")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (loadError) return failure("Application could not be loaded.", 500, loadError.message);
  if (!application) return failure("Application not found.", 404);
  if (application.is_closed) return failure("Application link is already marked as expired.", 409);
  if (!["Generated", "Downloaded"].includes(application.status)) {
    return failure("Application must be Generated or Downloaded before marking its link as expired.", 400);
  }

  const { data, error } = await supabase
    .from("applications")
    .update({ is_closed: true, date_applied: null })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", application.status)
    .eq("is_closed", false)
    .select("*,profiles(*)")
    .maybeSingle();

  if (error) return failure("Failed to mark the application link as expired.", 400, error.message);
  if (!data) return failure("The application changed before its link could be marked as expired.", 409);

  return NextResponse.json({ success: true, data: mapApplication(data) });
}
