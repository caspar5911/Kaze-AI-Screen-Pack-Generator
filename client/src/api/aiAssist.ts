import type { AiAssistRequest, AiAssistResponse } from "../types";

export async function requestAiAssist(
  request: AiAssistRequest,
): Promise<AiAssistResponse> {
  const body = new FormData();

  body.append("aiEndpointUrl", request.aiEndpointUrl);
  body.append("modelName", request.modelName);
  body.append("targetField", request.targetField);
  body.append("screenName", request.currentValues.screenName ?? "");
  body.append(
    "shortDescription",
    request.currentValues.shortDescription ?? "",
  );
  body.append("additionalNotes", request.currentValues.additionalNotes ?? "");

  request.screenshots.forEach((file) => {
    body.append("screenshots", file, file.name);
  });

  const response = await fetch("/api/ai-assist", {
    method: "POST",
    body,
  });
  const payload = await readJsonOrText(response);

  if (!response.ok) {
    if (
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      String(payload.error).includes("invalid response")
    ) {
      throw new Error(
        "AI assist returned an invalid response. Please try again or edit manually.",
      );
    }

    if (
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      String(payload.error).includes("Upload at least one screenshot")
    ) {
      throw new Error("Upload at least one screenshot before using AI assist.");
    }

    throw new Error(
      "AI assist failed. Check the on-prem model endpoint and try again.",
    );
  }

  return normalizeAiAssistResponse(payload);
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

function normalizeAiAssistResponse(payload: unknown): AiAssistResponse {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new Error(
      "AI assist returned an invalid response. Please try again or edit manually.",
    );
  }

  const record = payload as Record<string, unknown>;

  return {
    screenName:
      typeof record.screenName === "string" ? record.screenName : undefined,
    shortDescription:
      typeof record.shortDescription === "string"
        ? record.shortDescription
        : undefined,
    additionalNotes:
      typeof record.additionalNotes === "string"
        ? record.additionalNotes
        : undefined,
  };
}
