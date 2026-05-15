export interface ModelDiscoveryResult {
  models: string[];
  source: "ollama" | "openai-compatible";
}

export async function discoverModels(
  aiEndpointUrl: string
): Promise<ModelDiscoveryResult> {
  const endpoint = new URL(aiEndpointUrl.trim());
  const source = isOllamaEndpoint(endpoint) ? "ollama" : "openai-compatible";
  const modelUrl =
    source === "ollama"
      ? buildOllamaTagsUrl(endpoint)
      : buildOpenAiModelsUrl(endpoint);

  const response = await fetch(modelUrl, {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Model discovery returned ${response.status}: ${responseText.slice(0, 500)}`
    );
  }

  return {
    models:
      source === "ollama"
        ? parseOllamaModels(responseText)
        : parseOpenAiCompatibleModels(responseText),
    source
  };
}

function isOllamaEndpoint(endpoint: URL): boolean {
  return endpoint.pathname.replace(/\/+$/, "").endsWith("/api/chat");
}

function buildOllamaTagsUrl(endpoint: URL): URL {
  const modelUrl = new URL(endpoint);
  modelUrl.pathname = modelUrl.pathname.replace(/\/api\/chat\/?$/, "/api/tags");
  modelUrl.search = "";
  return modelUrl;
}

function buildOpenAiModelsUrl(endpoint: URL): URL {
  const modelUrl = new URL(endpoint);
  const normalizedPath = modelUrl.pathname.replace(/\/+$/, "");

  if (!normalizedPath) {
    modelUrl.pathname = "/v1/models";
  } else if (normalizedPath.endsWith("/chat/completions")) {
    modelUrl.pathname = normalizedPath.replace(/\/chat\/completions$/, "/models");
  } else if (normalizedPath.endsWith("/models")) {
    modelUrl.pathname = normalizedPath;
  } else {
    modelUrl.pathname = `${normalizedPath}/models`;
  }

  modelUrl.search = "";
  return modelUrl;
}

function parseOllamaModels(responseText: string): string[] {
  const payload = parseJson(responseText);
  if (!isRecord(payload) || !Array.isArray(payload.models)) {
    return [];
  }

  return uniqueSorted(
    payload.models
      .map((model) => {
        if (!isRecord(model)) {
          return "";
        }

        return typeof model.name === "string"
          ? model.name
          : typeof model.model === "string"
            ? model.model
            : "";
      })
      .filter(Boolean)
  );
}

function parseOpenAiCompatibleModels(responseText: string): string[] {
  const payload = parseJson(responseText);
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    return [];
  }

  return uniqueSorted(
    payload.data
      .map((model) =>
        isRecord(model) && typeof model.id === "string" ? model.id : ""
      )
      .filter(Boolean)
  );
}

function parseJson(responseText: string): unknown {
  try {
    return JSON.parse(responseText);
  } catch {
    return undefined;
  }
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
