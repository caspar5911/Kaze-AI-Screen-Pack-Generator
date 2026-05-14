import fs from "node:fs/promises";

export interface AiScreenshot {
  path: string;
  mimetype: string;
}

export interface AiClientParams {
  endpointUrl: string;
  modelName: string;
  prompt: string;
  screenshots: AiScreenshot[];
}

type OpenAiContentItem =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export async function callAiEndpoint(params: AiClientParams): Promise<string> {
  const endpointUrl = params.endpointUrl.trim();
  const endpoint = new URL(endpointUrl);
  const images = await Promise.all(params.screenshots.map(readImageAsBase64));
  const payload = isOllamaEndpoint(endpoint)
    ? buildOllamaPayload(params.modelName, params.prompt, images)
    : buildOpenAiCompatiblePayload(
        params.modelName,
        params.prompt,
        params.screenshots,
        images
      );

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `AI endpoint returned ${response.status}: ${responseText.slice(0, 500)}`
    );
  }

  return extractModelContent(responseText);
}

function isOllamaEndpoint(endpoint: URL): boolean {
  return endpoint.pathname.replace(/\/+$/, "").endsWith("/api/chat");
}

async function readImageAsBase64(screenshot: AiScreenshot): Promise<string> {
  const buffer = await fs.readFile(screenshot.path);
  return buffer.toString("base64");
}

function buildOpenAiCompatiblePayload(
  modelName: string,
  prompt: string,
  screenshots: AiScreenshot[],
  base64Images: string[]
) {
  const content: OpenAiContentItem[] = [
    {
      type: "text",
      text: prompt
    },
    ...base64Images.map((image, index) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${screenshots[index]?.mimetype ?? "image/png"};base64,${image}`
      }
    }))
  ];

  return {
    model: modelName,
    stream: false,
    messages: [
      {
        role: "user",
        content
      }
    ]
  };
}

function buildOllamaPayload(
  modelName: string,
  prompt: string,
  base64Images: string[]
) {
  return {
    model: modelName,
    stream: false,
    messages: [
      {
        role: "user",
        content: prompt,
        images: base64Images
      }
    ]
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
    const ollamaContent = getNestedContent(payload.message);
    const plainResponse = payload.response;

    if (typeof openAiContent === "string") {
      return openAiContent;
    }

    if (Array.isArray(openAiContent)) {
      return openAiContent
        .map((item) => (isRecord(item) && typeof item.text === "string" ? item.text : ""))
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
  return isRecord(value) ? value.content : undefined;
}
