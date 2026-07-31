import { DRIVE_UPLOAD_IN_PROGRESS } from "@/lib/resume/generation-state";

type JsonRecord = Record<string, any>;

export function mapProfile(row: JsonRecord) {
  return {
    _id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    location: row.location,
    linkedin: row.linkedin,
    educations: row.educations || [],
    experiences: row.experiences || [],
    template: row.template,
    profileStatus: row.profile_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapJob(row: JsonRecord) {
  return {
    _id: row.id,
    jobLink: row.job_link,
    jobTitle: row.job_title,
    companyName: row.company_name,
    jobDescription: row.job_description,
    profile: row.profiles ? mapProfile(row.profiles) : row.profile_id,
    createdAt: row.created_at,
  };
}

export function mapApplication(row: JsonRecord) {
  const driveUploadInProgress = row.drive_upload_error === DRIVE_UPLOAD_IN_PROGRESS;
  return {
    _id: row.id,
    job_title: row.job_title,
    company: row.company,
    job_posted_date: row.job_posted_date,
    is_closed: row.is_closed,
    job_category: row.job_category,
    seniority_level: row.seniority_level,
    country: row.country,
    employment_type: row.employment_type,
    industry_domain: row.industry_domain,
    job_url: row.job_url,
    description: row.description,
    resumeWordPath: row.resume_word_path ? `/applications/${row.id}/download` : null,
    cvPath: row.cv_path,
    driveDocxLink: row.drive_docx_link || null,
    driveDocxDownloadLink: row.drive_docx_download_link || null,
    driveUploadError: driveUploadInProgress ? null : row.drive_upload_error || null,
    driveUploadInProgress,
    date_applied: row.date_applied,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    generationError: row.generation_error,
    profile: row.profiles ? mapProfile(row.profiles) : row.profile_id,
  };
}
