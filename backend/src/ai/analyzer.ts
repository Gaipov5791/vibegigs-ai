import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ProfileData } from "../lib/profileDefaults";

const MODEL = "gemini-1.5-flash";
const API_VERSION = "v1";

export interface JobAnalysis {
  match_percentage: number;
  estimated_price_usd: number;
  estimated_days: number;
  ai_summary: string;
  red_flags: string[];
  tech_stack: string[];
  cover_letter_expert: string;
  direct_apply_link: string;
}

interface GeminiJobResponse {
  score: number;
  why_suitable: string;
  client_pain: string;
  cover_letter_expert: string;
  direct_apply_link: string | null;
}

function buildPrompt(
  profile: ProfileData,
  title: string,
  description: string
): string {
  const stackLabel = profile.tech_stack.join(", ");
  const stopWordsLabel =
    profile.stop_words.length > 0
      ? profile.stop_words.join(", ")
      : "none specified";

  return `You are an AI analyst evaluating remote job listings from international bidding-free platforms (We Work Remotely, Contra) for a senior developer specializing in automation systems, AI agents, data parsers, and LLM integration.

Developer background:
${profile.bio}

Primary tech stack: ${stackLabel}
Stop words (reduce score if found in description): ${stopWordsLabel}

Rules:
- score: objective fit score (1–100) for the developer's stack and automation/AI specialization.
- If stop words appear in the job description, significantly reduce score.
- why_suitable: explain in Russian why this job fits the developer (1–2 sentences).
- client_pain: describe in Russian the client's core problem or need inferred from the listing.
- cover_letter_expert: STRICTLY IN ENGLISH. Write as an automation systems expert with this background: ${profile.bio}. Professional, confident senior tone. Propose a concrete technical approach. Highlight experience with ${stackLabel}, automated systems, AI agents, and LLM integration. No filler or generic politeness.
- direct_apply_link: Find WHERE to send the application in the job text — application form URL (Greenhouse, Lever, company careers site), company website apply page, or contact email. Use null if not found. Never return the We Work Remotely listing URL.

Analyze this remote job listing from an international platform:

Title: ${title}

Description:
${description}

CRITICAL: You must respond ONLY with a raw, valid JSON object matching the schema below. Do not include markdown blocks like \`\`\`json, do not include any text outside the JSON object.
Schema:
{
  "score": number (1-100),
  "why_suitable": "text in Russian",
  "client_pain": "text in Russian",
  "cover_letter_expert": "text in English",
  "direct_apply_link": "string or null"
}`;
}

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenerativeAI(apiKey);
}

function extractJsonText(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function mapToJobAnalysis(parsed: GeminiJobResponse): JobAnalysis {
  const clientPain = parsed.client_pain?.trim() ?? "";

  return {
    match_percentage: Math.min(100, Math.max(0, parsed.score ?? 0)),
    estimated_price_usd: 0,
    estimated_days: 0,
    ai_summary: parsed.why_suitable?.trim() ?? "",
    red_flags: clientPain ? [clientPain] : [],
    tech_stack: [],
    cover_letter_expert: parsed.cover_letter_expert?.trim() ?? "",
    direct_apply_link:
      parsed.direct_apply_link === null
        ? ""
        : (parsed.direct_apply_link?.trim() ?? ""),
  };
}

export async function analyzeJob(
  description: string,
  title: string,
  profile: ProfileData
): Promise<JobAnalysis> {
  const client = getClient();

  const model = client.getGenerativeModel(
    {
      model: MODEL,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.4,
      },
    },
    { apiVersion: API_VERSION }
  );

  let result;
  try {
    result = await model.generateContent(
      buildPrompt(profile, title, description)
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini API request failed: ${message}`);
  }

  const response = result.response;

  if (response.promptFeedback?.blockReason) {
    throw new Error(
      `Gemini blocked the prompt: ${response.promptFeedback.blockReason}`
    );
  }

  let text: string;
  try {
    text = response.text();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini response blocked or empty: ${message}`);
  }

  if (!text) {
    throw new Error("Gemini did not return structured analysis");
  }

  let parsed: GeminiJobResponse;
  try {
    parsed = JSON.parse(extractJsonText(text)) as GeminiJobResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse Gemini JSON response: ${message}`);
  }

  return mapToJobAnalysis(parsed);
}
