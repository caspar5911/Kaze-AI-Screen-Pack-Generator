import type { PackFormState } from "../types";
import type {
  GeneratePackResponse,
  GenerationQuality,
  GeneratedFiles,
} from "../types";

export interface Base64Image {
  data: string;
  mimetype: string;
}

export interface ResolveUnknownsPayload {
  aiEndpointUrl: string;
  modelName: string;
  kazeComponentMapping: string;
  screenshots: Base64Image[];
  fastMode?: boolean;
  timeoutMs?: number;
}

export interface ResolvedCell {
  uiElement: string;
  resolvedExport: string;
}

export interface ResolveUnknownsResponse {
  success: boolean;
  resolved: ResolvedCell[];
  failed: string[];
  rawResponse: string;
  message?: string;
  error?: string;
}

export interface ValidatePackPayload {
  files: GeneratedFiles;
  allowedFilenames: string[];
  parsedFilenames: Array<{
    filename: string;
    screenName: string;
    state: string;
    viewport: string;
  }>;
}

export interface ValidatePackResponse {
  warnings: string[];
  quality: GenerationQuality;
}

export async function resolveUnknowns(
  payload: ResolveUnknownsPayload,
): Promise<ResolveUnknownsResponse> {
  const response = await fetch("/api/resolve-unknowns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await readJsonOrText(response);
  if (!response.ok) {
    const message =
      typeof result === "object" && result !== null && "error" in result
        ? String((result as any).error)
        : `Resolve unknowns request failed with ${response.status}`;
    throw new Error(message);
  }

  return result as ResolveUnknownsResponse;
}

export async function validatePack(
  payload: ValidatePackPayload,
): Promise<ValidatePackResponse> {
  const response = await fetch("/api/validate-pack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await readJsonOrText(response);
  if (!response.ok) {
    const message =
      typeof result === "object" && result !== null && "error" in result
        ? String((result as any).error)
        : `Validate pack request failed with ${response.status}`;
    throw new Error(message);
  }

  return result as ValidatePackResponse;
}

export async function generatePack(
  form: PackFormState,
  screenshots: File[],
): Promise<GeneratePackResponse> {
  const body = new FormData();

  body.append("projectName", form.projectName);
  body.append("shortDescription", form.shortDescription);
  body.append("designSource", form.designSource);
  body.append("iconSystem", form.iconSystem);
  body.append("additionalNotes", form.additionalNotes);
  body.append("aiEndpointUrl", form.aiEndpointUrl);
  body.append("modelName", form.modelName);
  body.append("fastMode", form.fastMode ? "true" : "false");

  screenshots.forEach((file) => {
    body.append("screenshots", file, file.name);
  });

  const response = await fetch("/api/generate-pack", {
    method: "POST",
    body,
  });

  const payload = await readJsonOrText(response);

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "error" in payload
        ? String(payload.error)
        : `Generate request failed with ${response.status}`;
    throw new Error(message);
  }

  return payload as GeneratePackResponse;
}

async function readJsonOrText(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function filesToBase64Images(
  files: File[],
): Promise<Base64Image[]> {
  return Promise.all(
    files.map(
      (file) =>
        new Promise<Base64Image>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const raw = reader.result;
            const data = typeof raw === "string" ? raw.split(",")[1] || "" : "";
            resolve({ data, mimetype: file.type || "image/png" });
          };
          reader.readAsDataURL(file);
        }),
    ),
  );
}
