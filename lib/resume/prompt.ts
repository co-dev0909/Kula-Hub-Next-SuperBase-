import type { ResumeProfile } from "./types";

export function buildResumePrompt(profile: ResumeProfile, jobDescription: string) {
  return `You are a professional ATS resume writer. Generate a tailored resume using only the candidate facts below and relevant requirements from the job description.

Candidate profile:
${JSON.stringify(profile, null, 2)}

Job description:
${jobDescription}

Return one valid JSON object with exactly this shape:
{
  "contact": { "name": "", "location": "", "email": "", "phone": "", "linkedin": "" },
  "summary": "",
  "skills": [{ "(Meaningful Category)": "skill, skill" }],
  "experiences": [{ "jobPosition": "", "workSetting": "", "companyName": "", "companyLocation": "", "enterDate": "", "endDate": "", "bullets": [{ "content": "" }] }],
  "projects": [{ "project_name": "", "project_description": "" }],
  "certificates": [{ "certificate_name": "" }],
  "educations": [{ "university_name": "", "university_degree": "", "university_location": "", "university_from": "", "university_to": "" }]
}

Rules:
- Preserve contact, employer, location, education, and date facts exactly.
- Do not invent employers, degrees, certifications, or dates.
- Use no personal pronouns and no employer culture/mission language.
- Create 5-6 clearly named skill categories containing job-relevant keywords.
- Every experience bullet must describe a concrete action, system, or outcome.
- Tailor titles and bullet emphasis to the role without changing factual job titles.
- Return JSON only, without Markdown fences.`;
}
