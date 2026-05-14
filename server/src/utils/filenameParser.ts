import path from "node:path";

const validViewports = new Set(["Desktop", "Tablet", "Mobile", "Unknown"]);
const validExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);

export interface ParsedScreenshotFilename {
  filename: string;
  screenName: string;
  state: string;
  viewport: string;
  warnings: string[];
}

export function parseScreenshotFilename(filename: string): ParsedScreenshotFilename {
  const cleanFilename = path.basename(filename);
  const parsed = path.parse(cleanFilename);
  const parts = parsed.name.split("_");
  const warnings: string[] = [];

  if (!validExtensions.has(parsed.ext.toLowerCase())) {
    warnings.push(
      `Filename ${cleanFilename} uses an unsupported extension. Upload PNG, JPG, JPEG, or WEBP.`
    );
  }

  const hasRequiredParts = parts.length >= 3;
  const screenName = parts[0] ?? "";
  const state = hasRequiredParts ? parts.slice(1, -1).join("_") : "";
  const viewport = hasRequiredParts ? parts[parts.length - 1] : "";

  if (!hasRequiredParts || !screenName || !state || !viewport) {
    warnings.push(
      `Filename ${cleanFilename} does not match <ScreenName>_<State>_<Viewport>.`
    );
  }

  if (hasRequiredParts && !state) {
    warnings.push(`Filename ${cleanFilename} is missing a state.`);
  }

  if (hasRequiredParts && viewport && !validViewports.has(viewport)) {
    warnings.push(
      `Filename ${cleanFilename} uses viewport "${viewport}". Use Desktop, Tablet, Mobile, or Unknown.`
    );
  }

  return {
    filename: cleanFilename,
    screenName,
    state,
    viewport,
    warnings
  };
}

export function isAllowedImageFilename(filename: string): boolean {
  return validExtensions.has(path.extname(filename).toLowerCase());
}
