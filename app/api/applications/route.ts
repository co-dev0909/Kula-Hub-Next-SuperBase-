import { NextResponse } from "next/server";
import { authenticated, failure, unauthorized } from "@/lib/api/auth";
import { mapApplication } from "@/lib/api/mappers";

const APPLICATION_SELECT = `
  id,
  profile_id,
  job_title,
  company,
  job_posted_date,
  is_closed,
  job_category,
  seniority_level,
  country,
  employment_type,
  industry_domain,
  job_url,
  description,
  resume_word_path,
  cv_path,
  drive_docx_link,
  drive_docx_download_link,
  drive_upload_error,
  date_applied,
  created_at,
  updated_at,
  status,
  generation_error,
  profiles (
    id,
    full_name,
    email,
    phone,
    location,
    linkedin,
    template,
    profile_status,
    created_at,
    updated_at
  )
`;

// Keep individual database statements small while retaining the existing API
// contract: callers still receive every application in a single `data` array.
const APPLICATION_PAGE_SIZE = 200;
const MAX_APPLICATIONS_PER_REQUEST = 1_000;

export async function GET(request: Request) {
  const { supabase, user } = await authenticated();
  if (!user) return unauthorized();
  const status = new URL(request.url).searchParams.get("status");
  const applications: Record<string, unknown>[] = [];

  for (let offset = 0; offset < MAX_APPLICATIONS_PER_REQUEST; offset += APPLICATION_PAGE_SIZE) {
    let query = supabase
      .from("applications")
      .select(APPLICATION_SELECT)
      .eq("user_id", user.id);

    if (status) query = query.eq("status", status);

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + APPLICATION_PAGE_SIZE - 1);

    if (error) return failure("Failed to fetch applications.", 500, error.message);

    const page = data || [];
    applications.push(...page);

    if (page.length < APPLICATION_PAGE_SIZE) {
      return NextResponse.json({ success: true, data: applications.map(mapApplication) });
    }
  }

  // Avoid a count query on every request. This single-row probe only runs when
  // the result reaches the safety ceiling and prevents silent truncation.
  let overflowQuery = supabase
    .from("applications")
    .select("id")
    .eq("user_id", user.id);

  if (status) overflowQuery = overflowQuery.eq("status", status);

  const { data: overflow, error: overflowError } = await overflowQuery
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(MAX_APPLICATIONS_PER_REQUEST, MAX_APPLICATIONS_PER_REQUEST);

  if (overflowError) return failure("Failed to fetch applications.", 500, overflowError.message);

  if (overflow?.length) {
    return NextResponse.json(
      {
        success: false,
        code: "APPLICATION_LIMIT_EXCEEDED",
        message: `More than ${MAX_APPLICATIONS_PER_REQUEST} applications matched this request. Filter by status to load a smaller result.`,
      },
      { status: 413 },
    );
  }

  return NextResponse.json({ success: true, data: applications.map(mapApplication) });
}
