import fs from "node:fs/promises";
import path from "node:path";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { messageFromUnknown } from "@/lib/errors";
import type { GeneratedResume } from "./types";

function safeTemplate(value: string) {
  return /^[1-7]$/.test(value) ? value : "1";
}

function isXml10CodePoint(codePoint: number) {
  return codePoint === 0x09
    || codePoint === 0x0a
    || codePoint === 0x0d
    || (codePoint >= 0x20 && codePoint <= 0xd7ff)
    || (codePoint >= 0xe000 && codePoint <= 0xfffd)
    || (codePoint >= 0x10000 && codePoint <= 0x10ffff);
}

export function sanitizeXmlText(value: string) {
  let result = "";
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && isXml10CodePoint(codePoint)) result += character;
  }
  return result;
}

function sanitizeTemplateValue<T>(value: T): T {
  if (typeof value === "string") return sanitizeXmlText(value) as T;
  if (Array.isArray(value)) return value.map(sanitizeTemplateValue) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, sanitizeTemplateValue(child)]),
    ) as T;
  }
  return value;
}

function recordFrom(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function shortText(value: unknown, maxLength = 300) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : "";
}

export function docxErrorMessage(error: unknown) {
  const outer = recordFrom(error);
  const properties = recordFrom(outer?.properties);
  const nested = Array.isArray(properties?.errors) ? properties.errors : [];
  const details = nested.slice(0, 5).map((item) => {
    const nestedError = recordFrom(item);
    const nestedProperties = recordFrom(nestedError?.properties);
    const parts = [
      shortText(nestedProperties?.id, 80),
      shortText(nestedProperties?.explanation),
      shortText(nestedProperties?.xtag, 80) && `tag: ${shortText(nestedProperties?.xtag, 80)}`,
      shortText(nestedProperties?.file, 120) && `file: ${shortText(nestedProperties?.file, 120)}`,
    ].filter(Boolean);
    return parts.join("; ");
  }).filter(Boolean);

  if (details.length > 0) return details.join(" | ").slice(0, 1500);
  return messageFromUnknown(error, "The DOCX template could not be rendered.");
}

export async function createDocx(data: GeneratedResume, template: string) {
  const templatePath = path.join(process.cwd(), "templates", "resume", `${safeTemplate(template)}.docx`);
  const templateBuffer = await fs.readFile(templatePath);
  const templateData = sanitizeTemplateValue({
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

  try {
    const doc = new Docxtemplater(new PizZip(templateBuffer), {
      paragraphLoop: true,
      linebreaks: true,
      errorLogging: false,
    });
    doc.render(templateData);
    return doc.getZip().generate({ type: "nodebuffer" }) as Buffer;
  } catch (error) {
    throw new Error(docxErrorMessage(error), { cause: error });
  }
}
