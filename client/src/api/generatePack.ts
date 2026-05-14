import type { GeneratePackResponse, PackFormState } from "../types";

export async function generatePack(
  form: PackFormState,
  screenshots: File[]
): Promise<GeneratePackResponse> {
  const body = new FormData();

  Object.entries(form).forEach(([key, value]) => {
    body.append(key, value);
  });

  screenshots.forEach((file) => {
    body.append("screenshots", file, file.name);
  });

  const response = await fetch("/api/generate-pack", {
    method: "POST",
    body
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
