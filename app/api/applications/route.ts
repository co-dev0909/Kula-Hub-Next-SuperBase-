import { NextResponse } from "next/server";
import { authenticated, failure, unauthorized } from "@/lib/api/auth";
import { mapApplication } from "@/lib/api/mappers";

export async function GET(request: Request) {
  const { supabase, user } = await authenticated();
  if (!user) return unauthorized();
  const status = new URL(request.url).searchParams.get("status");
  let query = supabase.from("applications").select("*,profiles(*)").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return failure("Failed to fetch applications.", 500, error.message);
  return NextResponse.json({ success: true, data: (data || []).map(mapApplication) });
}
