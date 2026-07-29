import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function authenticated() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
}

export function unauthorized() {
  return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
}

export function failure(message: string, status = 500, error?: unknown) {
  const detail = error instanceof Error ? error.message : typeof error === "string" ? error : undefined;
  const schemaMissing = Boolean(detail && (
    detail.includes("PGRST205") ||
    detail.includes("PGRST204") ||
    detail.includes("PGRST202") ||
    detail.includes("Could not find the table") ||
    (detail.includes("Could not find") && detail.includes("column")) ||
    detail.includes("schema cache")
  ));
  if (schemaMissing) {
    return NextResponse.json({
      success: false,
      code: "SCHEMA_NOT_READY",
      message: "The hosted Supabase schema is not current. Apply all project migrations before using this feature.",
    }, { status: 503 });
  }
  return NextResponse.json({ success: false, message, ...(detail ? { error: detail } : {}) }, { status });
}
