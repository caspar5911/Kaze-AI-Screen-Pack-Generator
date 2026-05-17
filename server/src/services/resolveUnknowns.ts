import { callAiEndpoint, type AiScreenshot } from "./aiClient.js";
import { getConfirmedKazeExports } from "./kazeCatalog.js";

export interface UnknownCell {
  uiElement: string;
  pattern: string;
  cellValue: string;
  confidence: string;
  notes: string;
}

export interface ResolvedCell {
  uiElement: string;
  resolvedExport: string;
}

export interface ResolveUnknownsParams {
  unknownCells: UnknownCell[];
  aiEndpointUrl: string;
  modelName: string;
  screenshots: AiScreenshot[];
  fastMode?: boolean;
  timeoutMs?: number;
}

export interface ResolveUnknownsResult {
  resolved: ResolvedCell[];
  failed: string[];
  rawResponse: string;
}

export async function resolveUnknowns(
  params: ResolveUnknownsParams,
): Promise<ResolveUnknownsResult> {
  const {
    unknownCells,
    aiEndpointUrl,
    modelName,
    screenshots,
    fastMode,
    timeoutMs,
  } = params;

  if (!unknownCells.length) {
    return { resolved: [], failed: [], rawResponse: "" };
  }

  const cellDescriptions = unknownCells
    .map(
      (cell) =>
        `- **${cell.uiElement}**: Pattern: ${cell.pattern}, Notes: ${cell.notes}`,
    )
    .join("\n");

  const exportsList = getConfirmedKazeExports().join(", ");

  const prompt = [
    "You are a Kaze UI Component Resolver.",
    "",
    "Given UI element descriptions and screenshots, identify the closest confirmed Kaze export for each unknown element.",
    "",
    "Allowed Kaze exports from @pcs-security/kaze-ui-library:",
    exportsList,
    "",
    "Unknown UI elements to resolve:",
    cellDescriptions,
    "",
    "For each unknown element, analyze the screenshots and return ONLY valid Kaze exports.",
    "",
    "Output format (JSON only, no markdown fences):",
    "{",
    '  "resolved": [',
    '    { "uiElement": "...", "resolvedExport": "Button" }',
    "  ],",
    '  "failed": ["UI element that could not be resolved"]',
    "}",
    "",
    "Rules:",
    "- Only return exports from the allowed list.",
    '- If you cannot confidently match an element, put it in "failed".',
    "- Do not invent exports.",
    "- Do not return fake Kaze-prefixed names (KazeButton, KazeInput, etc.).",
  ].join("\n");

  const rawResponse = await callAiEndpoint({
    endpointUrl: aiEndpointUrl,
    modelName: modelName,
    prompt: prompt,
    screenshots: screenshots,
    fastMode: fastMode,
    timeoutMs: timeoutMs,
  });

  return parseResolveResponse(rawResponse, unknownCells);
}

function parseResolveResponse(
  rawResponse: string,
  unknownCells: UnknownCell[],
): ResolveUnknownsResult {
  const cleaned = rawResponse
    .replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i, "$1")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    const resolved: ResolvedCell[] = [];
    const rawResolved = (parsed as any).resolved ?? [];
    for (const r of rawResolved) {
      if (
        r.resolvedExport &&
        r.uiElement &&
        getConfirmedKazeExports().includes(r.resolvedExport)
      ) {
        resolved.push({
          uiElement: r.uiElement,
          resolvedExport: r.resolvedExport,
        });
      }
    }
    const failed: string[] = (parsed as any).failed ?? [];
    return { resolved, failed, rawResponse };
  } catch {
    const failed = unknownCells.map((c) => c.uiElement);
    return { resolved: [], failed, rawResponse };
  }
}
