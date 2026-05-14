export interface ModelListResponse {
  models: string[];
  source: "ollama" | "openai-compatible";
}

export async function listModels(
  aiEndpointUrl: string
): Promise<ModelListResponse> {
  const response = await fetch(
    `/api/models?endpointUrl=${encodeURIComponent(aiEndpointUrl)}`
  );
  const payload = await readJsonOrText(response);

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "error" in payload
        ? String(payload.error)
        : `Model discovery failed with ${response.status}`;
    throw new Error(message);
  }

  return payload as ModelListResponse;
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
