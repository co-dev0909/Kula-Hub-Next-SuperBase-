import { NextResponse } from "next/server";
import { authenticated, failure, unauthorized } from "@/lib/api/auth";
import { mapProfile } from "@/lib/api/mappers";

export async function GET() {
  const { supabase, user } = await authenticated();
  if (!user) return unauthorized();
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) return failure("Failed to fetch profiles.", 500, error.message);
  return NextResponse.json((data || []).map(mapProfile));
}

export async function POST(request: Request) {
  const { supabase, user } = await authenticated();
  if (!user) return unauthorized();
  const body = await request.json();
  if (!body.fullName || !body.email) return failure("Full name and email are required.", 400);

  const { data, error } = await supabase.from("profiles").insert({
    user_id: user.id,
    full_name: body.fullName.trim(),
    email: body.email.trim(),
    phone: body.phone || "",
    location: body.location || "",
    linkedin: body.linkedin || "",
    educations: Array.isArray(body.educations) ? body.educations : [],
    experiences: Array.isArray(body.experiences) ? body.experiences : [],
    template: body.template || "1",
    profile_status: body.profileStatus === "active" ? "active" : "deactive",
  }).select().single();
  if (error) return failure("Failed to create profile.", 400, error.message);
  return NextResponse.json(mapProfile(data));
}
