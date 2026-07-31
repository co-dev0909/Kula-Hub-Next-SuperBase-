import type { SupabaseClient } from "@supabase/supabase-js";
import { messageFromUnknown } from "@/lib/errors";
import { googleDriveUploadsEnabled, uploadDocxAsGoogleDoc } from "@/lib/google/drive";
import { generateResumeJson } from "@/lib/resume/ai";
import { createDocx } from "@/lib/resume/documents";
import { resumeBaseName } from "@/lib/resume/filename";
import { DRIVE_UPLOAD_IN_PROGRESS } from "@/lib/resume/generation-state";
import type { ResumeProfile } from "@/lib/resume/types";

type ServerSupabaseClient = SupabaseClient;

type ApplicationStatus = "Pending" | "Generating" | "Generated" | "Downloaded" | "Applied" | "Failed";

type ProfileRecord = {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  template: string;
  experiences: unknown;
  educations: unknown;
};

type ApplicationRecord = {
  id: string;
  status: ApplicationStatus;
  description: string;
  updated_at: string;
  resume_word_path: string | null;
  drive_file_id: string | null;
  drive_docx_link: string | null;
  drive_docx_download_link: string | null;
  drive_upload_error: string | null;
  queue_previous_status: ApplicationStatus | null;
  profiles: ProfileRecord | ProfileRecord[] | null;
};

type GoogleDriveUpload = {
  fileId: string;
  viewLink: string;
  downloadLink: string;
};

type GenerationData = {
  _id: string;
  status: ApplicationStatus;
  resumeWordPath?: string;
  driveDocxLink?: string | null;
  driveDocxDownloadLink?: string | null;
};

export type ApplicationResumeGenerationResult = {
  success: boolean;
  kind: "completed" | "in_progress" | "load_failed" | "generation_failed" | "drive_failed";
  status: number;
  message: string;
  error?: string;
  data?: GenerationData;
};

type GenerateApplicationResumeOptions = {
  supabase: ServerSupabaseClient;
  userId: string;
  applicationId: string;
  driveOnly?: boolean;
  queueClaimed?: boolean;
};

const DRIVE_UPLOAD_STAGE = "uploading the resume to Google Drive";
const GENERATING_STALE_AFTER_MS = 6 * 60 * 1000;

function profileFrom(source: ProfileRecord): ResumeProfile {
  return {
    fullName: source.full_name,
    email: source.email,
    phone: source.phone,
    location: source.location,
    linkedin: source.linkedin,
    template: source.template,
    experiences: Array.isArray(source.experiences)
      ? source.experiences as Array<Record<string, string>>
      : [],
    educations: Array.isArray(source.educations)
      ? source.educations as Array<Record<string, string>>
      : [],
  };
}

function finishedStatus(
  status: ApplicationStatus,
  queuePreviousStatus?: ApplicationStatus | null,
): ApplicationStatus {
  const effectiveStatus = queuePreviousStatus || status;
  return ["Downloaded", "Applied"].includes(effectiveStatus) ? effectiveStatus : "Generated";
}

function statusNeedsRecovery(status: ApplicationStatus) {
  return ["Pending", "Generating", "Failed"].includes(status);
}

function responseData(
  applicationId: string,
  status: ApplicationStatus,
  hasGeneratedResume: boolean,
  driveUpload?: GoogleDriveUpload | null,
): GenerationData {
  return {
    _id: applicationId,
    status,
    ...(hasGeneratedResume ? {
      resumeWordPath: `/applications/${applicationId}/download`,
    } : {}),
    ...(driveUpload !== undefined ? {
      driveDocxLink: driveUpload?.viewLink || null,
      driveDocxDownloadLink: driveUpload?.downloadLink || null,
    } : {}),
  };
}

function currentDriveUpload(application: ApplicationRecord): GoogleDriveUpload | null {
  if (!application.drive_file_id || !application.drive_docx_link) return null;
  return {
    fileId: application.drive_file_id,
    viewLink: application.drive_docx_link,
    downloadLink: application.drive_docx_download_link
      || `https://docs.google.com/document/d/${application.drive_file_id}/export?format=docx`,
  };
}

function wasUpdatedRecently(application: ApplicationRecord) {
  const lastUpdate = Date.parse(application.updated_at);
  return Number.isFinite(lastUpdate) && Date.now() - lastUpdate < GENERATING_STALE_AFTER_MS;
}

async function claimApplication(
  supabase: ServerSupabaseClient,
  userId: string,
  application: ApplicationRecord,
  changes: Record<string, unknown>,
) {
  let claim = supabase
    .from("applications")
    .update(changes)
    .eq("id", application.id)
    .eq("user_id", userId)
    .eq("status", application.status);
  if (application.updated_at) claim = claim.eq("updated_at", application.updated_at);

  const { data, error } = await claim.select("id").maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function updateApplication(
  supabase: ServerSupabaseClient,
  userId: string,
  applicationId: string,
  changes: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from("applications")
    .update(changes)
    .eq("id", applicationId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("The application no longer exists.");
}

export async function generateApplicationResume({
  supabase,
  userId,
  applicationId,
  driveOnly = false,
  queueClaimed = false,
}: GenerateApplicationResumeOptions): Promise<ApplicationResumeGenerationResult> {
  const { data: loadedApplication, error: loadError } = await supabase
    .from("applications")
    .select("*,profiles(*)")
    .eq("id", applicationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (loadError || !loadedApplication) {
    return {
      success: false,
      kind: "load_failed",
      status: loadError ? 500 : 404,
      message: "Application could not be loaded.",
      ...(loadError?.message ? { error: loadError.message } : {}),
    };
  }

  const application = loadedApplication as unknown as ApplicationRecord;
  if (queueClaimed && application.status !== "Generating") {
    return {
      success: false,
      kind: "load_failed",
      status: 409,
      message: "The queued application is no longer in Generating status.",
    };
  }

  let stage = "preparing the application";
  let driveWorkStarted = false;
  let generatedDocxPath = application.resume_word_path || null;

  try {
    stage = "reading the profile";
    const profileRecord = Array.isArray(application.profiles)
      ? application.profiles[0]
      : application.profiles;
    if (!profileRecord) throw new Error("The application does not have a valid profile.");
    const profile = profileFrom(profileRecord);

    const driveEnabled = googleDriveUploadsEnabled();
    const hasGeneratedResume = Boolean(generatedDocxPath);
    let driveUpload = currentDriveUpload(application);
    const needsGeneration = !hasGeneratedResume;
    const needsDriveUpload = driveEnabled && !driveUpload;
    const driveUploadIsRunning = application.drive_upload_error === DRIVE_UPLOAD_IN_PROGRESS;

    if (driveOnly && !driveEnabled) {
      return {
        success: false,
        kind: "drive_failed",
        status: 503,
        message: "Google Drive uploads are disabled.",
        error: "Set UPLOAD_RESUMES_TO_DRIVE=true on the server.",
      };
    }

    if (driveOnly && needsGeneration) {
      return {
        success: false,
        kind: "generation_failed",
        status: 409,
        message: "Generate the resume before uploading it to Google Drive.",
      };
    }

    if (
      !queueClaimed
      && needsGeneration
      && application.status === "Generating"
      && wasUpdatedRecently(application)
    ) {
      return {
        success: true,
        kind: "in_progress",
        status: 202,
        message: "Resume generation is already in progress.",
        data: responseData(applicationId, "Generating", false),
      };
    }

    if (
      !queueClaimed
      && needsDriveUpload
      && (driveUploadIsRunning || application.status === "Generating")
      && wasUpdatedRecently(application)
    ) {
      return {
        success: true,
        kind: "in_progress",
        status: 202,
        message: "Google Drive upload is already in progress.",
        data: responseData(applicationId, application.status, true, driveUpload),
      };
    }

    if (!queueClaimed && needsGeneration) {
      stage = "claiming the application for generation";
      const claimed = await claimApplication(
        supabase,
        userId,
        application,
        {
          status: "Generating",
          generation_error: null,
          drive_upload_error: null,
        },
      );
      if (!claimed) {
        return {
          success: true,
          kind: "in_progress",
          status: 202,
          message: "Resume generation is already in progress.",
          data: responseData(applicationId, "Generating", false),
        };
      }
    } else if (!queueClaimed && needsDriveUpload) {
      driveWorkStarted = true;
      stage = "claiming the application for Google Drive upload";
      const claimed = await claimApplication(
        supabase,
        userId,
        application,
        {
          generation_error: null,
          drive_upload_error: DRIVE_UPLOAD_IN_PROGRESS,
        },
      );
      if (!claimed) {
        return {
          success: true,
          kind: "in_progress",
          status: 202,
          message: "Google Drive upload is already in progress.",
          data: responseData(applicationId, application.status, true, driveUpload),
        };
      }
    }

    if (hasGeneratedResume && generatedDocxPath) {
      if (driveEnabled && !driveUpload) {
        driveWorkStarted = true;
        stage = "reading the generated DOCX from Supabase Storage";
        const { data: storedDocx, error: storedDocxError } = await supabase.storage
          .from("resumes")
          .download(generatedDocxPath);
        if (storedDocxError || !storedDocx) {
          throw new Error(storedDocxError?.message || "The generated DOCX could not be read.");
        }

        stage = DRIVE_UPLOAD_STAGE;
        driveWorkStarted = true;
        const docx = Buffer.from(await storedDocx.arrayBuffer());
        driveUpload = await uploadDocxAsGoogleDoc(docx, resumeBaseName(profile.fullName), applicationId);
      }

      const status = finishedStatus(application.status, application.queue_previous_status);
      const changes: Record<string, unknown> = {
        generation_error: null,
        queue_previous_status: null,
      };
      if (statusNeedsRecovery(application.status)) changes.status = status;
      if (driveEnabled || driveUploadIsRunning) changes.drive_upload_error = null;
      if (driveUpload) {
        changes.drive_file_id = driveUpload.fileId;
        changes.drive_docx_link = driveUpload.viewLink;
        changes.drive_docx_download_link = driveUpload.downloadLink;
      }

      stage = "saving generated resume details";
      await updateApplication(supabase, userId, applicationId, changes);

      return {
        success: true,
        kind: "completed",
        status: 200,
        message: driveEnabled ? "Resume and Google Docs copy are ready." : "Resume is ready.",
        data: responseData(applicationId, status, true, driveUpload),
      };
    }

    stage = "generating resume content with DeepSeek";
    const resume = await generateResumeJson(profile, application.description);

    stage = "rendering the DOCX file";
    const docx = await createDocx(resume, profile.template);
    const basePath = `${userId}/${applicationId}`;
    const docxPath = `${basePath}/resume.docx`;

    stage = "uploading the DOCX file to Supabase Storage";
    const { error: docxError } = await supabase.storage.from("resumes").upload(docxPath, docx, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: true,
    });
    if (docxError) {
      throw new Error(docxError.message || "Storage upload failed.");
    }
    generatedDocxPath = docxPath;

    stage = "saving generated file paths";
    await updateApplication(
      supabase,
      userId,
      applicationId,
      {
        status: "Generating",
        resume_word_path: docxPath,
        generation_error: null,
        drive_upload_error: driveEnabled ? DRIVE_UPLOAD_IN_PROGRESS : null,
      },
    );

    if (driveEnabled) {
      stage = DRIVE_UPLOAD_STAGE;
      driveWorkStarted = true;
      driveUpload = await uploadDocxAsGoogleDoc(docx, resumeBaseName(profile.fullName), applicationId);
    }

    stage = "saving generated resume details";
    const changes: Record<string, unknown> = {
      status: "Generated",
      resume_word_path: docxPath,
      generation_error: null,
      queue_previous_status: null,
    };
    if (driveEnabled) changes.drive_upload_error = null;
    if (driveUpload) {
      changes.drive_file_id = driveUpload.fileId;
      changes.drive_docx_link = driveUpload.viewLink;
      changes.drive_docx_download_link = driveUpload.downloadLink;
    }
    await updateApplication(supabase, userId, applicationId, changes);

    return {
      success: true,
      kind: "completed",
      status: 200,
      message: driveEnabled
        ? "Resume generated and uploaded to Google Docs."
        : "Resume generated successfully.",
      data: responseData(applicationId, "Generated", true, driveUpload),
    };
  } catch (error) {
    const message = messageFromUnknown(error, "Resume generation failed.");
    const diagnostic = `${stage}: ${message}`;
    const driveFailure = driveWorkStarted;
    const failureChanges: Record<string, unknown> = driveFailure
      ? {
          generation_error: null,
          drive_upload_error: diagnostic,
          queue_previous_status: null,
        }
      : {
          status: "Failed",
          generation_error: diagnostic,
          queue_previous_status: null,
        };
    if (driveFailure && statusNeedsRecovery(application.status)) {
      failureChanges.status = finishedStatus(application.status, application.queue_previous_status);
    }
    if (generatedDocxPath) {
      failureChanges.resume_word_path = generatedDocxPath;
    }
    let recordedDiagnostic = diagnostic;
    try {
      const { data: failedApplication, error: failureUpdateError } = await supabase
        .from("applications")
        .update(failureChanges)
        .eq("id", applicationId)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();
      if (failureUpdateError) {
        recordedDiagnostic += ` Failure status could not be saved: ${failureUpdateError.message}`;
      } else if (!failedApplication) {
        recordedDiagnostic += " Failure status could not be saved because the application no longer exists.";
      }
    } catch (failureUpdateError) {
      const detail = messageFromUnknown(failureUpdateError, "Unknown database error.");
      recordedDiagnostic += ` Failure status could not be saved: ${detail}`;
    }

    return {
      success: false,
      kind: driveFailure ? "drive_failed" : "generation_failed",
      status: driveFailure ? 502 : 500,
      message: driveFailure
        ? "Resume generated, but Google Drive upload failed."
        : `Resume generation failed while ${stage}.`,
      error: recordedDiagnostic,
      data: responseData(
        applicationId,
        driveFailure
          ? finishedStatus(application.status, application.queue_previous_status)
          : "Failed",
        Boolean(generatedDocxPath),
      ),
    };
  }
}
