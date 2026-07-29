import { after, NextResponse } from "next/server";
import { authenticated, failure, unauthorized } from "@/lib/api/auth";
import { mapJob } from "@/lib/api/mappers";
import { sendApplicationQueueWake } from "@/lib/resume/queue-server";

export async function GET() {
  const { supabase, user } = await authenticated();
  if (!user) return unauthorized();
  const { data, error } = await supabase
    .from("jobs")
    .select("*,profiles(*)")
    .order("created_at", { ascending: false });
  if (error) return failure("Failed to fetch jobs.", 500, error.message);
  return NextResponse.json({ success: true, data: (data || []).map(mapJob) });
}

export async function POST(request: Request) {
  const { supabase, user } = await authenticated();
  if (!user) return unauthorized();
  const { jobLink, jobTitle, companyName, jobDescription = "", profileId } = await request.json();
  if (!jobLink || !jobTitle || !companyName || !profileId) {
    return failure("Job link, title, company, and profile are required.", 400);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .eq("user_id", user.id)
    .single();
  if (!profile) return failure("Profile not found.", 404);

  const [{ data: duplicateLink }, { data: duplicateTitle }] = await Promise.all([
    supabase.from("applications").select("id").eq("profile_id", profileId).eq("job_url", jobLink).limit(1),
    supabase
      .from("applications")
      .select("id")
      .eq("profile_id", profileId)
      .eq("job_title", jobTitle)
      .eq("company", companyName)
      .limit(1),
  ]);
  if (duplicateLink?.length || duplicateTitle?.length) {
    return failure(`A job with this ${duplicateLink?.length ? "link" : "title"} already exists for this profile.`, 400);
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      user_id: user.id,
      profile_id: profileId,
      job_link: jobLink,
      job_title: jobTitle,
      company_name: companyName,
      job_description: jobDescription,
    })
    .select()
    .single();
  if (jobError) return failure("Failed to create job.", 400, jobError.message);

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      profile_id: profileId,
      job_id: job.id,
      job_title: jobTitle,
      company: companyName,
      job_url: jobLink,
      description: jobDescription,
      status: "Pending",
    })
    .select("id,status")
    .single();
  if (applicationError || !application) {
    await supabase.from("jobs").delete().eq("id", job.id).eq("user_id", user.id);
    return failure("Failed to create application.", 400, applicationError?.message);
  }

  after(async () => {
    try {
      await sendApplicationQueueWake({
        userId: user.id,
        applicationId: application.id,
      });
    } catch {
      // The authenticated user-area runner also wakes the same Supabase queue.
    }
  });

  return NextResponse.json({
    success: true,
    message: "Application saved and added to the generation queue.",
    data: mapJob(job),
    application: {
      _id: application.id,
      status: application.status,
    },
  }, { status: 201 });
}
