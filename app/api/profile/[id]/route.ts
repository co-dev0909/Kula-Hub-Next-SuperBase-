import { NextResponse } from "next/server";
import { authenticated, failure, unauthorized } from "@/lib/api/auth";
import { mapProfile } from "@/lib/api/mappers";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const { supabase, user } = await authenticated();
  if (!user) return unauthorized();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (error) return failure("Profile not found.", 404);
  return NextResponse.json(mapProfile(data));
}

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  const { supabase, user } = await authenticated();
  if (!user) return unauthorized();
  const body = await request.json();
  const changes: Record<string, unknown> = {};
  if (body.fullName !== undefined) changes.full_name = body.fullName;
  if (body.email !== undefined) changes.email = body.email;
  if (body.phone !== undefined) changes.phone = body.phone;
  if (body.location !== undefined) changes.location = body.location;
  if (body.linkedin !== undefined) changes.linkedin = body.linkedin;
  if (Array.isArray(body.educations)) changes.educations = body.educations;
  if (Array.isArray(body.experiences)) changes.experiences = body.experiences;
  if (body.template !== undefined) changes.template = body.template;
  if (["active", "deactive"].includes(body.profileStatus)) changes.profile_status = body.profileStatus;

  const { data, error } = await supabase.from("profiles").update(changes).eq("id", id).select().single();
  if (error) return failure("Failed to update profile.", 400, error.message);
  return NextResponse.json(mapProfile(data));
}

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  const { supabase, user } = await authenticated();
  if (!user) return unauthorized();
  const { data: applications } = await supabase.from("applications").select("resume_word_path,resume_pdf_path").eq("profile_id", id);
  const paths = (applications || []).flatMap((application) => [application.resume_word_path, application.resume_pdf_path])
    .filter((value): value is string => Boolean(value));
  if (paths.length) await supabase.storage.from("resumes").remove(paths);
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) return failure("Failed to delete profile.", 400, error.message);
  return new NextResponse(null, { status: 204 });
}
