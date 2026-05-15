import fs from "node:fs/promises";
import sharp from "sharp";

export interface AiScreenshot {
  path: string;
  mimetype: string;
  isBase64?: boolean;
}

export interface AiClientParams {
  endpointUrl: string;
  modelName: string;
  systemPrompt?: string;
  prompt: string;
  screenshots: AiScreenshot[];
  fastMode?: boolean;
  timeoutMs?: number;
  onMetrics?: (metrics: {
    promptChars: number;
    imagePayloadKb: number;
    imageCount: number;
    endpointMode: AiEndpointMode;
    modelName: string;
    timeoutMs: number;
  }) => void;
}

export type AiEndpointMode = "ollama" | "openai-compatible";

export class AiEndpointTimeoutError extends Error {
  readonly statusCode = 504;

  constructor(timeoutMs: number) {
    super(
      `AI endpoint timed out while generating handoff and mapping. Try a smaller screenshot, faster model, or longer timeout.`,
    );
    this.name = "AiEndpointTimeoutError";
    this.timeoutMs = timeoutMs;
  }

  readonly timeoutMs: number;
}

type OpenAiContentItem =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

// Default image limits for model efficiency
const DEFAULT_MAX_WIDTH = 1600;
const DEFAULT_QUALITY = 80;
const DEFAULT_TIMEOUT_MS = 180_000;

export async function callAiEndpoint(params: AiClientParams): Promise<string> {
  const endpointUrl = params.endpointUrl.trim();
  const endpoint = new URL(endpointUrl);
  const endpointMode = getEndpointMode(endpoint);
  const requestUrl = buildRequestUrl(endpoint, endpointMode);
  const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const images = await Promise.all(
    params.screenshots.map((screenshot) =>
      compressAndReadAsBase64(screenshot, params.fastMode),
    ),
  );
  const payload =
    endpointMode === "ollama"
      ? buildOllamaPayload(
          params.modelName,
          params.prompt,
          images,
          params.systemPrompt,
        )
      : buildOpenAiCompatiblePayload(
          params.modelName,
          params.systemPrompt,
          params.prompt,
          params.screenshots,
          images,
        );

  // Log prompt size for monitoring
  const promptChars = params.prompt.length;
  const imageBytes = images.reduce((sum, img) => sum + (img || "").length, 0);
  const imagePayloadKb = Math.round(imageBytes / 1024);
  params.onMetrics?.({
    promptChars,
    imagePayloadKb,
    imageCount: params.screenshots.length,
    endpointMode,
    modelName: params.modelName,
    timeoutMs,
  });
  console.log(
    `[aiClient] Model: ${params.modelName}, Endpoint: ${endpointMode}, Path: ${requestUrl.pathname}, Timeout: ${timeoutMs}ms, Prompt: ${promptChars} chars, Images: ${imagePayloadKb}KB (${params.screenshots.length} screenshots)`,
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;

  try {
    response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(
        `AI endpoint returns ${response.status}: ${responseText.slice(0, 500)}`,
      );
    }

    return extractModelContent(responseText);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new AiEndpointTimeoutError(timeoutMs);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function compressAndReadAsBase64(
  screenshot: AiScreenshot,
  fastMode?: boolean,
): Promise<string> {
  // If the screenshot is already base64, skip file I/O
  if (screenshot.isBase64) {
    return screenshot.path;
  }

  const buffer = await fs.readFile(screenshot.path);

  // Skip compression for very small images
  if (buffer.length < 50 * 1024) {
    return buffer.toString("base64");
  }

  const maxWidth = fastMode ? 1280 : DEFAULT_MAX_WIDTH;
  const quality = fastMode ? 70 : DEFAULT_QUALITY;

  try {
    const compressed = await sharp(buffer)
      .resize({ width: maxWidth, withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();
    return compressed.toString("base64");
  } catch {
    // Fallback to original if compression fails
    return buffer.toString("base64");
  }
}

function isOllamaEndpoint(endpoint: URL): boolean {
  return endpoint.pathname.replace(/\/+$/, "").endsWith("/api/chat");
}

function getEndpointMode(endpoint: URL): AiEndpointMode {
  return isOllamaEndpoint(endpoint) ? "ollama" : "openai-compatible";
}

function buildRequestUrl(endpoint: URL, endpointMode: AiEndpointMode): URL {
  return endpointMode === "ollama"
    ? endpoint
    : buildOpenAiChatCompletionsUrl(endpoint);
}

function buildOpenAiChatCompletionsUrl(endpoint: URL): URL {
  const requestUrl = new URL(endpoint);
  const normalizedPath = requestUrl.pathname.replace(/\/+$/, "");

  if (!normalizedPath) {
    requestUrl.pathname = "/v1/chat/completions";
  } else if (normalizedPath.endsWith("/chat/completions")) {
    requestUrl.pathname = normalizedPath;
  } else if (normalizedPath.endsWith("/models")) {
    requestUrl.pathname = normalizedPath.replace(
      /\/models$/,
      "/chat/completions",
    );
  } else if (normalizedPath.endsWith("/v1")) {
    requestUrl.pathname = `${normalizedPath}/chat/completions`;
  } else {
    requestUrl.pathname = normalizedPath;
  }

  return requestUrl;
}

function buildOpenAiCompatiblePayload(
  modelName: string,
  systemPrompt: string | undefined,
  prompt: string,
  screenshots: AiScreenshot[],
  base64Images: string[],
) {
  const content: OpenAiContentItem[] = [
    {
      type: "text",
      text: prompt,
    },
    ...base64Images.map((image, index) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${screenshots[index]?.mimetype ?? "image/png"};base64,${image}`,
      },
    })),
  ];

  return {
    model: modelName,
    stream: false,
    messages: [
      ...(systemPrompt
        ? [
            {
              role: "system",
              content: systemPrompt,
            },
          ]
        : []),
      {
        role: "user",
        content,
      },
    ],
  };
}

function buildOllamaPayload(
  modelName: string,
  prompt: string,
  base64Images: string[],
  systemPrompt?: string,
) {
  return {
    model: modelName,
    stream: false,
    messages: [
      ...(systemPrompt
        ? [
            {
              role: "system",
              content: systemPrompt,
            },
          ]
        : []),
      {
        role: "user",
        content: prompt,
        images: base64Images,
      },
    ],
  };
}

function extractModelContent(responseText: string): string {
  let payload: unknown;

  try {
    payload = JSON.parse(responseText);
  } catch {
    return responseText;
  }

  if (isRecord(payload)) {
    const openAiContent = getOpenAiContent(payload);
    const ollamaContent = getNestedContent(
      (payload as Record<string, unknown>)?.message,
    );
    const plainResponse = (payload as Record<string, unknown>)?.response;

    if (typeof openAiContent === "string") {
      return openAiContent;
    }

    if (Array.isArray(openAiContent)) {
      return openAiContent
        .map((item) =>
          isRecord(item) && typeof item.text === "string" ? item.text : "",
        )
        .join("\n")
        .trim();
    }

    if (typeof ollamaContent === "string") {
      return ollamaContent;
    }

    if (typeof plainResponse === "string") {
      return plainResponse;
    }
  }

  return responseText;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getOpenAiContent(payload: Record<string, unknown>): unknown {
  const choices = payload.choices;
  if (!Array.isArray(choices)) {
    return undefined;
  }

  const firstChoice = choices[0];
  if (!isRecord(firstChoice)) {
    return undefined;
  }

  return getNestedContent(firstChoice.message);
}

function getNestedContent(value: unknown): unknown {
  return isRecord(value)
    ? (value as Record<string, unknown>)?.content
    : undefined;
}
