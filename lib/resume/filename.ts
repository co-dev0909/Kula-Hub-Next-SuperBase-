export function resumeBaseName(fullName: string | null | undefined) {
  const nameParts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  const firstName = nameParts[0] || "Resume";
  const lastInitial = nameParts.length > 1 ? Array.from(nameParts.at(-1) || "")[0] || "" : "";

  return `${firstName}${lastInitial}`
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]/gi, "") || "Resume";
}

export function resumeFilename(fullName: string | null | undefined, extension: "docx" | "pdf") {
  return `${resumeBaseName(fullName)}.${extension}`;
}
