import { NextResponse } from "next/server";
import { authenticated, failure, unauthorized } from "@/lib/api/auth";
import { mapApplication } from "@/lib/api/mappers";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, context: Context) {
  const { id } = await context.params;
  const { supabase, user } = await authenticated();
  if (!user) return unauthorized();

  const { data: current, error: loadError } = await supabase
    .from("applications")
    .select("status,is_closed")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (loadError) return failure("Application could not be loaded.", 500, loadError.message);
  if (!current) return failure("Application not found.", 404);
  if (current.is_closed) return failure("An expired application link cannot be marked as applied.", 400);
  if (!["Generated", "Downloaded"].includes(current.status)) {
    return failure("Application must be Generated or Downloaded before applying.", 400);
  }

  const { data, error } = await supabase
    .from("applications")
    .update({ status: "Applied", date_applied: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", current.status)
    .eq("is_closed", false)
    .select("*,profiles(*)")
    .maybeSingle();

  if (error) return failure("Failed to set applied status.", 400, error.message);
  if (!data) return failure("The application changed before it could be marked as applied.", 409);

  return NextResponse.json({ success: true, data: mapApplication(data) });
}
