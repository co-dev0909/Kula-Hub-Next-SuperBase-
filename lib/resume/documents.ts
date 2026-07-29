import fs from "node:fs/promises";
import path from "node:path";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
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

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = String(text || "").replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
    else { if (line) lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

export async function createPdf(data: GeneratedResume) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 48;
  const pageWidth = 612;
  let page: PDFPage = pdf.addPage([pageWidth, 792]);
  let y = 744;

  const ensure = (height: number) => {
    if (y - height >= margin) return;
    page = pdf.addPage([pageWidth, 792]);
    y = 744;
  };
  const line = (text: string, options: { size?: number; isBold?: boolean; indent?: number; gap?: number } = {}) => {
    const size = options.size || 10;
    const font = options.isBold ? bold : regular;
    const indent = options.indent || 0;
    const lines = wrap(text, font, size, pageWidth - margin * 2 - indent);
    ensure(lines.length * (size + 3) + (options.gap || 0));
    for (const value of lines) {
      page.drawText(value, { x: margin + indent, y, size, font, color: rgb(0.08, 0.1, 0.14) });
      y -= size + 3;
    }
    y -= options.gap || 0;
  };
  const heading = (value: string) => { y -= 5; line(value.toUpperCase(), { size: 11, isBold: true, gap: 3 }); };

  line(data.contact.name, { size: 18, isBold: true, gap: 3 });
  line([data.contact.location, data.contact.email, data.contact.phone, data.contact.linkedin].filter(Boolean).join("  |  "), { size: 9, gap: 6 });
  heading("Professional Summary");
  line(data.summary, { gap: 5 });
  heading("Skills");
  for (const skill of data.skills) {
    const category = Object.keys(skill)[0] || "Skills";
    line(`${category}: ${skill[category] || ""}`, { size: 9, gap: 1 });
  }
  heading("Experience");
  for (const experience of data.experiences) {
    line(`${experience.jobPosition || ""} - ${experience.companyName || ""}`, { isBold: true });
    line([experience.companyLocation, experience.enterDate && experience.endDate ? `${experience.enterDate} - ${experience.endDate}` : ""].filter(Boolean).join(" | "), { size: 9, gap: 2 });
    for (const bullet of experience.bullets || []) line(`- ${bullet.content || ""}`, { size: 9, indent: 8, gap: 1 });
    y -= 3;
  }
  if (data.educations?.length) {
    heading("Education");
    for (const education of data.educations) {
      line(`${education.university_degree || ""} - ${education.university_name || ""}`, { isBold: true });
      line([education.university_location, education.university_from, education.university_to].filter(Boolean).join(" | "), { size: 9, gap: 2 });
    }
  }
  return Buffer.from(await pdf.save());
}
