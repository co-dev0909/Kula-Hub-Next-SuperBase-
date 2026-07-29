import OpenAI from "openai";
import { buildResumePrompt } from "./prompt";
import type { GeneratedResume, ResumeProfile } from "./types";

function numberEnv(name: string, fallback: number) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseJson(content: string | null): GeneratedResume {
  if (!content) throw new Error("The resume model returned an empty response.");
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const raw = (fenced?.[1] || content).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  const parsed = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw);
  if (!parsed?.contact || !Array.isArray(parsed.skills) || !Array.isArray(parsed.experiences)) {
    throw new Error("The resume model returned an invalid document structure.");
  }
  return parsed as GeneratedResume;
}

export async function generateResumeJson(profile: ResumeProfile, jobDescription: string) {
  if (!process.env.DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY is missing from .env.local.");
  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    timeout: numberEnv("DEEPSEEK_TIMEOUT_MS", 180_000),
  });
  const request = {
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    messages: [
      { role: "system", content: "Generate ATS resumes. Return valid JSON only." },
      { role: "user", content: buildResumePrompt(profile, jobDescription) },
    ],
    response_format: { type: "json_object" },
    temperature: numberEnv("DEEPSEEK_TEMPERATURE", 0.3),
    max_tokens: numberEnv("DEEPSEEK_MAX_TOKENS", 8192),
    // V4 enables thinking by default. Resume JSON generation is faster and more
    // predictable in non-thinking mode.
    thinking: { type: "disabled" },
  } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
    thinking: { type: "disabled" };
  };
  const response = await client.chat.completions.create(request);
  return parseJson(response.choices[0]?.message?.content || null);
}
