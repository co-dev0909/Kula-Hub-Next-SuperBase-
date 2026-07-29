import type { ResumeProfile } from "./types";

function firstValue(record: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value) return value;
  }
  return "";
}

export function buildResumePrompt(profile: ResumeProfile, jobDescription: string) {
  const fullName = profile.fullName || "";
  const experiences = profile.experiences || [];
  const educations = profile.educations || [];

  const requiredStructure = {
    contact: {
      name: fullName,
      location: profile.location || "",
      email: profile.email || "",
      phone: profile.phone || "",
      linkedin: profile.linkedin || "",
    },
    summary: "Always generate a professional summary aligned with the job description, containing between 700 and 800 characters including spaces and line breaks, stating 9 or 9+ years of experience if unspecified, and highlighting relevant skills and achievements without using personal pronouns.",
    skills: [
      { category1: "item1, item2, ..." },
      { category2: "item1, item2, ..." },
      { category3: "item1, item2, ..." },
      { category4: "item1, item2, ..." },
      { category5: "item1, item2, ..." },
    ],
    experiences: experiences.map((experience) => ({
      jobPosition: firstValue(experience, "jobTitle", "jobPosition"),
      workSetting: firstValue(experience, "workSetting", "jobType"),
      companyName: firstValue(experience, "companyName"),
      companyLocation: firstValue(experience, "companyLocation"),
      enterDate: firstValue(experience, "enterDate"),
      endDate: firstValue(experience, "endDate"),
      bullets: [
        { content: "This is a sample sentence describing a task or achievement 1" },
        { content: "This is a sample sentence describing a task or achievement 2" },
      ],
    })),
    projects: [
      {
        project_name: "This is a sample project name 1",
        project_description: "This is a sample project description 1. This should contain about 180 words.",
      },
      {
        project_name: "This is a sample project name 2",
        project_description: "This is a sample project description 2. This should contain about 180 words.",
      },
    ],
    certificates: [
      { certificate_name: "This is a sample certificate name 1" },
      { certificate_name: "This is a sample certificate name 2" },
      { certificate_name: "This is a sample certificate name 3" },
      { certificate_name: "This is a sample certificate name 4" },
    ],
    educations: educations.map((education) => ({
      university_name: firstValue(education, "universityName", "university_name"),
      university_degree: firstValue(education, "universityDegree", "university_degree"),
      university_location: firstValue(education, "universityLocation", "university_location"),
      university_from: firstValue(education, "enterDate", "university_from"),
      university_to: firstValue(education, "endDate", "university_to"),
    })),
  };

  return `
You are a professional resume writer.
Your task is to generate a high-quality, tailored resume in JSON based on the candidate's background and the job description provided. Achieve the highest possible ATS match score using only job-relevant information.
The resume must be concise, impactful, and ATS-friendly. Highlight the candidate's relevant skills, experience, and achievements that align with the job description, and structure the content so Applicant Tracking Systems can parse it easily.

JOB DESCRIPTION:
"""
${jobDescription}
"""

CANDIDATE PROFILE SOURCE DATA:
${JSON.stringify(profile, null, 2)}

The resume must follow this exact JSON structure. Replace the skill category placeholders with meaningful category names and replace all other sample text with generated content:

${JSON.stringify(requiredStructure, null, 2)}

Resume Generation Instructions:
- Tailor all resume content specifically to the provided job description using relevant skills, experiences, and keywords.
- Return one valid JSON object using the exact structure above. Return JSON only, without Markdown fences or commentary.
- Do not use personal pronouns such as "I", "me", or "my".
- Exclude references and hobbies.
- Create 5 to 6 skill sections with clear, Title Case names. Each section must include 3 to 10 relevant skill items. Do not use generic names such as "Category1". Use technical skills that align closely with the job description.
- Vary bullet counts per role: 10 for the most recent role, 8 for the second most recent role, then decrease by one for each earlier role, with a minimum of 5 bullets per role.
- Every experience bullet must be one detailed sentence containing more than 55 words.
- Use the exact jobPosition, workSetting, companyName, companyLocation, enterDate, and endDate values from the candidate profile without changes or substitutions.
- Use companyInformation from the candidate profile only as factual background for the corresponding role; do not add it as a separate output field.
- Do not invent or force numbers. Numbers or percentages may be included only when they fit naturally, are supported by the candidate data, and improve ATS relevance.
- Do not promote the candidate into an invented managerial title.
- Do not copy or reuse company or project names from the job description. Write all content naturally and originally.
- Generate a complete and fully ATS-optimized resume following every rule in this prompt.
- If the target job title contains a level suffix such as I or II, ignore the suffix when interpreting the target role. For example, interpret "Software Engineer I" as "Software Engineer" for tailoring purposes.
- Use every supplied work-experience entry and preserve its factual fields exactly.
- For each work-experience entry, write detailed single-sentence bullets longer than ${fullName === "Akil Omari Batiste" ? "150" : "100"} characters.

Allowed Job Description Sections (use only these or their equivalents):
- Responsibilities / Role / Role Description / You Will
- Requirements / Qualifications
- Preferred Qualifications
- Top Skills
- Nice to Have / Bonus to Have
- Key Activities
- Key Success Metrics
- Ideal Background & Expertise
- Technologies

Disallowed Job Description Content (do not use or reference):
- Company culture
- Mission or vision
- About-the-company content
- Employer-branding language
- Values, DEI statements, or storytelling content

If job-description content does not clearly define skills, responsibilities, tools, technologies, or measurable outcomes, ignore it completely.

Interview-Only Evaluation Criteria Exclusion:
- Some job-description requirements describe how candidates will be evaluated in interviews rather than valid resume content.
- Treat references to judgment, decision-making quality, prioritization ability, planning horizons such as the next 1-2 months, ambiguity management, ownership mentality, or "making good decisions" as interview-only evaluation criteria.
- Do not reflect, paraphrase, or restate those requirements in the Summary, Skills, Experience, Projects, or Certificates sections.
- Such traits may be demonstrated only implicitly through concrete actions, delivered systems, deployed models, and measurable outcomes.
- If a requirement cannot be proven through observable work or results, exclude it entirely from the resume.

Evidence-Only Resume Rule:
- Every resume bullet must describe a concrete action taken, system built, model developed, or outcome delivered.
- Abstract self-assessments such as good judgment, strong prioritization, ownership mindset, or decision quality are prohibited unless demonstrated through tangible work outputs.

Do not forget: every Experience bullet for every company must contain more than 55 words.
`;
}
