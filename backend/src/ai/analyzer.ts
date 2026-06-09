import type { ProfileData } from "../lib/profileDefaults";

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

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
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

  return `You are an expert IT automation engineer. Analyze this job post based on the user's background.

User Tech Stack: ${stackLabel}
Stop words (reduce score if found in description): ${stopWordsLabel}
User Bio: ${profile.bio}

Job Title: ${title}

Job Description to analyze:
"${description}"

CRITICAL REQUIREMENT: You must respond ONLY with a raw, valid JSON object matching the exact schema below. Do not include markdown blocks like \`\`\`json, do not include any text outside the JSON object.
JSON Schema:
{
  "score": number (1-100),
  "why_suitable": "text in Russian explaining why it fits or flags risks",
  "client_pain": "text in Russian defining what the client actually needs solved",
  "cover_letter_expert": "a high-converting professional pitch/cover letter in English tailored to this job from the automation expert perspective",
  "direct_apply_link": "string or null if not found in text"
}`;
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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing in environment variables");
  }

  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: buildPrompt(profile, title, description) }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `Gemini REST API failed with status ${response.status}: ${errText}`
    );
  }

  const data = (await response.json()) as GeminiGenerateContentResponse;

  if (data.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked the prompt: ${data.promptFeedback.blockReason}`);
  }

  try {
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!rawText) {
      throw new Error("Gemini response contained no text candidate");
    }

    const cleanJsonString = extractJsonText(rawText);
    const parsed = JSON.parse(cleanJsonString) as GeminiJobResponse;
    return mapToJobAnalysis(parsed);
  } catch (parseError) {
    console.error("[Gemini Parser Error] Failed to parse response:", data);
    const message =
      parseError instanceof Error ? parseError.message : String(parseError);
    throw new Error(
      `Failed to parse Gemini response into valid JSON structure: ${message}`
    );
  }
}
