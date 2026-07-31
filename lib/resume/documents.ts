import fs from "node:fs/promises";
import path from "node:path";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import type { GeneratedResume } from "./types";

function safeTemplate(value: string) {
  return /^[1-7]$/.test(value) ? value : "1";
}

export async function createDocx(data: GeneratedResume, template: string) {
  const templatePath = path.join(process.cwd(), "templates", "resume", `${safeTemplate(template)}.docx`);
  const templateBuffer = await fs.readFile(templatePath);
  const doc = new Docxtemplater(new PizZip(templateBuffer), { paragraphLoop: true, linebreaks: true });
  doc.render({
    name: data.contact.name,
    location: data.contact.location,
    email: data.contact.email,
    phone: data.contact.phone,
    linkedin: data.contact.linkedin,
    summary: data.summary,
    skills: data.skills.map((entry) => {
      const category = Object.keys(entry)[0] || "Skills";
      return { category, skillsLine: entry[category] || "" };
    }),
    experiences: data.experiences,
    projects: data.projects || [],
    educations: data.educations || [],
    certificates: data.certificates || [],
  });
  return doc.getZip().generate({ type: "nodebuffer" }) as Buffer;
}
