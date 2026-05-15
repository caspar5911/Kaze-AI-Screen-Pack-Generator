import type { GeneratePackResponse, PackFormState } from "../types";

export async function generatePack(
  form: PackFormState,
  screenshots: File[],
): Promise<GeneratePackResponse> {
  const body = new FormData();

  // Spread all form fields, converting boolean fastMode to string
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
