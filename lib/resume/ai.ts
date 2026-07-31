import OpenAI from "openai";
import { messageFromUnknown } from "@/lib/errors";
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
  let parsed: GeneratedResume;
  try {
    parsed = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw);
  } catch {
    throw new Error("The resume model returned invalid or truncated JSON.");
  }
  if (!parsed?.contact || !Array.isArray(parsed.skills) || !Array.isArray(parsed.experiences)) {
    throw new Error("The resume model returned an invalid document structure.");
  }
  return parsed;
}

function deepSeekStatus(error: unknown) {
  if (!error || typeof error !== "object" || !("status" in error)) return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}

function deepSeekErrorMessage(error: unknown) {
  switch (deepSeekStatus(error)) {
    case 401:
      return "DeepSeek authentication failed (401). Replace DEEPSEEK_API_KEY in the server environment and redeploy.";
    case 402:
      return "The DeepSeek API account has insufficient balance (402). Add API credit before retrying.";
    case 429:
      return "DeepSeek rate-limited the request (429). Wait briefly before retrying.";
    case 500:
    case 503:
      return "DeepSeek is temporarily unavailable. Retry after a short delay.";
    default:
      return messageFromUnknown(error, "DeepSeek could not generate resume content.");
  }
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
  try {
    const response = await client.chat.completions.create(request);
    return parseJson(response.choices[0]?.message?.content || null);
  } catch (error) {
    throw new Error(deepSeekErrorMessage(error), { cause: error });
  }
}
