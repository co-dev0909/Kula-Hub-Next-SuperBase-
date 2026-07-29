import { NextResponse } from "next/server";
import { authenticated, failure, unauthorized } from "@/lib/api/auth";
import { mapApplication } from "@/lib/api/mappers";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, context: Context) {
  const { id } = await context.params;
  const { supabase, user } = await authenticated();
  if (!user) return unauthorized();
  const { data, error } = await supabase.from("applications").update({ status: "Generated", date_applied: null }).eq("id", id).select("*,profiles(*)").single();
  if (error) return failure("Failed to restore application.", 400, error.message);
  return NextResponse.json({ success: true, data: mapApplication(data) });
}
