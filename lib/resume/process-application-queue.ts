import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateApplicationResume,
  type ApplicationResumeGenerationResult,
} from "@/lib/resume/generate-application";

export type ApplicationQueueOutcome = {
  state: "processed" | "busy" | "empty";
  hasPending: boolean;
  applicationId?: string;
  result?: ApplicationResumeGenerationResult;
};

async function queueState(supabase: SupabaseClient, userId: string) {
  const [pending, generating] = await Promise.all([
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "Pending"),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "Generating"),
  ]);

  const stateError = pending.error || generating.error;
  if (stateError) throw stateError;
  return {
    hasPending: (pending.count || 0) > 0,
    hasActive: (generating.count || 0) > 0,
  };
}

async function markClaimedApplicationFailed(
  supabase: SupabaseClient,
  userId: string,
  applicationId: string,
  diagnostic: string,
) {
  const { data: application, error: loadError } = await supabase
    .from("applications")
    .select("status,resume_word_path,resume_pdf_path,queue_previous_status")
    .eq("id", applicationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (loadError) throw loadError;
  if (!application) return;

  const hasGeneratedFiles = Boolean(
    application.resume_word_path && application.resume_pdf_path,
  );
  const previousStatus = ["Downloaded", "Applied"].includes(application.queue_previous_status)
    ? application.queue_previous_status
    : "Generated";
  const changes = hasGeneratedFiles
    ? {
        status: previousStatus,
        generation_error: null,
        drive_upload_error: diagnostic,
        queue_previous_status: null,
      }
    : {
        status: "Failed",
        generation_error: diagnostic,
        drive_upload_error: null,
        queue_previous_status: null,
      };

  const { error } = await supabase
    .from("applications")
    .update(changes)
    .eq("id", applicationId)
    .eq("user_id", userId)
    .eq("status", "Generating");
  if (error) throw error;
}

function startProcessingLeaseHeartbeat(
  supabase: SupabaseClient,
  userId: string,
  applicationId: string,
) {
  return setInterval(() => {
    void (async () => {
      await supabase
        .from("applications")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", applicationId)
        .eq("user_id", userId)
        .eq("status", "Generating");
    })();
  }, 60_000);
}

export async function processNextApplication(
  supabase: SupabaseClient,
  userId: string,
  claimForUser = false,
): Promise<ApplicationQueueOutcome> {
  const claim = claimForUser
    ? await supabase.rpc("claim_next_pending_application_for_user", { queue_user_id: userId })
    : await supabase.rpc("claim_next_pending_application");
  if (claim.error) throw claim.error;

  const applicationId = claim.data as string | null;
  if (!applicationId) {
    const state = await queueState(supabase, userId);
    return {
      state: state.hasActive || state.hasPending ? "busy" : "empty",
      hasPending: state.hasPending,
    };
  }

  const leaseHeartbeat = startProcessingLeaseHeartbeat(supabase, userId, applicationId);
  let result: ApplicationResumeGenerationResult;
  try {
    try {
      result = await generateApplicationResume({
        supabase,
        userId,
        applicationId,
        queueClaimed: true,
      });
      if (!result.success && result.kind === "load_failed") {
        const diagnostic = result.error || result.message;
        await markClaimedApplicationFailed(supabase, userId, applicationId, diagnostic);
        result = {
          ...result,
          kind: "generation_failed",
          message: "Queued resume processing could not be started.",
        };
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unexpected queue processing failure.";
      const diagnostic = `processing the queued application: ${detail}`;
      await markClaimedApplicationFailed(supabase, userId, applicationId, diagnostic);
      result = {
        success: false,
        kind: "generation_failed",
        status: 500,
        message: "Queued resume processing failed.",
        error: diagnostic,
      };
    }
  } finally {
    clearInterval(leaseHeartbeat);
  }

  let hasPending = false;
  try {
    hasPending = (await queueState(supabase, userId)).hasPending;
  } catch {
    // A later queue heartbeat/message will retry the state check.
  }

  return {
    state: "processed",
    applicationId,
    hasPending,
    result,
  };
}
