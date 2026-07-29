import { NextResponse } from "next/server";
import { authenticated, failure, unauthorized } from "@/lib/api/auth";
import { mapApplication } from "@/lib/api/mappers";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, context: Context) {
  const { id } = await context.params;
  const { supabase, user } = await authenticated();
  if (!user) return unauthorized();
  const { data: current } = await supabase.from("applications").select("status").eq("id", id).single();
  if (!current) return failure("Application not found.", 404);
  if (!["Generated", "Downloaded"].includes(current.status)) return failure("Application must be Generated or Downloaded before applying.", 400);
  const { data, error } = await supabase.from("applications").update({ status: "Applied", date_applied: new Date().toISOString() }).eq("id", id).select("*,profiles(*)").single();
  if (error) return failure("Failed to set applied status.", 400, error.message);
  return NextResponse.json({ success: true, data: mapApplication(data) });
}
