import {
  GoogleGenerativeAI,
  SchemaType,
  type Schema,
} from "@google/generative-ai";
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

function buildResponseSchema(techStack: string[]): Schema {
  const stackLabel = techStack.join(", ");

  return {
    type: SchemaType.OBJECT,
    properties: {
      match_percentage: {
        type: SchemaType.NUMBER,
        description: `Score from 0 to 100 indicating fit for the developer's stack: ${stackLabel}`,
      },
      estimated_price_usd: {
        type: SchemaType.NUMBER,
        description:
          "Estimated project price or annual salary range midpoint in USD for international remote contracts",
      },
      estimated_days: {
        type: SchemaType.NUMBER,
        description:
          "Estimated delivery timeline in working days for a solo senior developer (use 0 for full-time roles)",
      },
      ai_summary: {
        type: SchemaType.STRING,
        description:
          "1-2 sentence essence of the job in Russian (for internal admin dashboard)",
      },
      red_flags: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "Array of risk flags if any, empty array if none (in Russian)",
      },
      tech_stack: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "Technologies required in the job description",
      },
      cover_letter_expert: {
        type: SchemaType.STRING,
        description:
          "Cover letter strictly in English: professional, confident senior tone; proposes a concrete technical solution; highlights automation, AI agents, and LLM integration expertise",
      },
      direct_apply_link: {
        type: SchemaType.STRING,
        description:
          "Direct application destination: URL to application form (Greenhouse, Lever, company careers page) or contact email. Empty string if not found in the job text.",
      },
    },
    required: [
      "match_percentage",
      "estimated_price_usd",
      "estimated_days",
      "ai_summary",
      "red_flags",
      "tech_stack",
      "cover_letter_expert",
      "direct_apply_link",
    ],
  };
}

function buildSystemPrompt(profile: ProfileData): string {
  const stackLabel = profile.tech_stack.join(", ");
  const stopWordsLabel =
    profile.stop_words.length > 0
      ? profile.stop_words.join(", ")
      : "none specified";

  return `You are an AI analyst evaluating remote job listings from international bidding-free platforms (We Work Remotely, Contra) for a senior developer.

Developer background:
${profile.bio}

Primary tech stack: ${stackLabel}
Stop words (reduce match if found in description): ${stopWordsLabel}

Rules:
- match_percentage: objective score (0–100) for fit with the developer's stack and specialization in automated systems, AI agents, data parsers, and LLM integration.
- If stop words appear in the job description, significantly reduce match_percentage.
- estimated_price_usd: realistic USD estimate for remote international contracts. For full-time roles, use approximate annual salary midpoint.
- estimated_days: working days for project-based work; use 0 for full-time/permanent roles.
- ai_summary: write in Russian — brief essence for the admin dashboard (1–2 sentences).
- red_flags and tech_stack: risks and technologies from the job text (red_flags in Russian).
- cover_letter_expert: STRICTLY IN ENGLISH. Write as an automation systems expert with this background: ${profile.bio}. Professional, confident senior tone. Propose a concrete technical approach. Highlight experience with ${stackLabel}, automated systems, AI agents, and LLM integration. No filler or generic politeness.
- direct_apply_link: Find WHERE to send the application in the job text — application form URL (Greenhouse, Lever, company careers site), company website apply page, or contact email. Output the full URL or email address. Use empty string if not found. Never return the We Work Remotely listing URL.

Respond only with valid JSON matching the required schema — no text outside the structured response.`;
}

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenerativeAI(apiKey);
}

function normalizeAnalysis(input: JobAnalysis): JobAnalysis {
  return {
    ...input,
    match_percentage: Math.min(100, Math.max(0, input.match_percentage)),
    estimated_price_usd: Math.max(0, Math.round(input.estimated_price_usd ?? 0)),
    estimated_days: Math.max(0, Math.round(input.estimated_days ?? 0)),
    red_flags: input.red_flags ?? [],
    tech_stack: input.tech_stack ?? [],
    cover_letter_expert: input.cover_letter_expert ?? "",
    direct_apply_link: input.direct_apply_link?.trim() ?? "",
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
      systemInstruction: buildSystemPrompt(profile),
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: buildResponseSchema(profile.tech_stack),
        maxOutputTokens: 2048,
        temperature: 0.4,
      },
    },
    { apiVersion: API_VERSION }
  );

  let result;
  try {
    result = await model.generateContent(
      `Analyze this remote job listing from an international platform:\n\nTitle: ${title}\n\nDescription:\n${description}`
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

  let parsed: JobAnalysis;
  try {
    parsed = JSON.parse(text) as JobAnalysis;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse Gemini JSON response: ${message}`);
  }

  return normalizeAnalysis(parsed);
}
