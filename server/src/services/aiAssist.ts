export type AiAssistTargetField =
  | "screenName"
  | "shortDescription"
  | "additionalNotes"
  | "all";

export interface AiAssistCurrentValues {
  screenName?: string;
  shortDescription?: string;
  additionalNotes?: string;
}

export interface AiAssistResult {
  screenName?: string;
  shortDescription?: string;
  additionalNotes?: string;
}

export const AI_ASSIST_SYSTEM_PROMPT = [
  "You are assisting with a Kaze screen pack generator.",
  "",
  "Use the uploaded screenshot only as a visual reference.",
  "",
  "Return only valid JSON.",
  "",
  "Do not invent backend APIs, route paths, authentication logic, database logic, user permissions, persistence behaviour, or business workflows.",
  "",
  "Generate concise, implementation-friendly text.",
  "",
  "Fields:",
  "- screenName: short title case screen name.",
  "- shortDescription: one sentence describing the screen.",
  "- additionalNotes: practical implementation notes for matching the screenshot.",
  "",
  "Do not mention third-party editing tools or services.",
  "Do not use marketing hype.",
  "Do not include markdown.",
  "Do not include explanations outside JSON.",
].join("\n");

export function buildAiAssistPrompt(params: {
  currentValues: AiAssistCurrentValues;
  targetField: AiAssistTargetField;
}): string {
  return [
    "Analyze the uploaded screenshot and improve the requested fields.",
    "",
    "Current values:",
    `screenName: "${escapePromptValue(params.currentValues.screenName ?? "")}"`,
    `shortDescription: "${escapePromptValue(params.currentValues.shortDescription ?? "")}"`,
    `additionalNotes: "${escapePromptValue(params.currentValues.additionalNotes ?? "")}"`,
    "",
    "Target field:",
    `"${params.targetField}"`,
    "",
    "Rules:",
    "- Preserve useful user-provided intent.",
    "- Improve clarity.",
    "- Keep screenName short.",
    "- Keep shortDescription to one sentence.",
    "- Keep additionalNotes practical.",
    "- Do not invent APIs, routes, auth, persistence, database behaviour, permissions, or business rules.",
    "- Return only JSON.",
    "",
    "Expected JSON shape:",
    `{"screenName":"AI Assistant Home Screen","shortDescription":"Home screen for an AI assistant interface with a greeting section, prompt input area, and quick action shortcuts.","additionalNotes":"Match the centered greeting layout, rounded prompt input container, shortcut action buttons, and clean spacing. Use static frontend behaviour unless APIs or routes are explicitly provided."}`,
  ].join("\n");
}

export function parseAiAssistResponse(responseText: string): AiAssistResult {
  const jsonText = extractJsonText(responseText);
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(
      "AI assist returned an invalid response. Please try again or edit manually.",
    );
  }

  if (!isRecord(parsed)) {
    throw new Error(
      "AI assist returned an invalid response. Please try again or edit manually.",
    );
  }

  return {
    screenName: normalizeScreenName(parsed.screenName),
    shortDescription: normalizeShortDescription(parsed.shortDescription),
    additionalNotes: normalizeAdditionalNotes(parsed.additionalNotes),
  };
}

function escapePromptValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function extractJsonText(value: string): string {
  const trimmed = value.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function normalizeScreenName(value: unknown): string | undefined {
  const text = normalizeText(value);
  if (!text) {
    return undefined;
  }

  return text
    .replace(/[.!?]+$/g, "")
    .split(/\s+/)
    .slice(0, 8)
    .join(" ");
}

function normalizeShortDescription(value: unknown): string | undefined {
  const text = normalizeText(value);
  if (!text) {
    return undefined;
  }

  const sentenceMatch = text.match(/^.*?[.!?](?:\s|$)/);
  return (sentenceMatch?.[0] ?? text).trim();
}

function normalizeAdditionalNotes(value: unknown): string | undefined {
  const text = normalizeText(value);
  if (!text) {
    return undefined;
  }

  return text.length > 500 ? `${text.slice(0, 497).trim()}...` : text;
}

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const text = value
    .replace(/^[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

  return text.length > 0 ? text : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
