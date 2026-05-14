import path from "node:path";

const validViewports = new Set(["Desktop", "Tablet", "Mobile", "Unknown"]);
const validExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);

export interface ParsedScreenshotFilename {
  filename: string;
  screenName: string | null;
  state: string | null;
  viewport: string | null;
  isValid: boolean;
  warning?: string;
  warnings: string[];
}

export function parseScreenshotFilename(filename: string): ParsedScreenshotFilename {
  const cleanFilename = path.basename(filename);
  const parsed = path.parse(cleanFilename);
  const parts = parsed.name.split("_");
  const warnings: string[] = [];

  const hasRequiredParts = parts.length >= 3;
  const screenName = parts[0] || null;
  const state = hasRequiredParts ? parts.slice(1, -1).join("_") || null : null;
  const viewport = hasRequiredParts ? parts[parts.length - 1] || null : null;
  const hasAllowedExtension = validExtensions.has(parsed.ext.toLowerCase());
  const hasValidViewport = viewport ? validViewports.has(viewport) : false;
  const isValid = Boolean(
    hasAllowedExtension && screenName && state && viewport && hasValidViewport
  );

  let warning: string | undefined;
  if (!isValid) {
    warning =
      "Filename should follow: <ScreenName>_<State>_<Viewport>.png";
    if (viewport && !hasValidViewport) {
      warning += " Viewport should be Desktop, Tablet, Mobile, or Unknown.";
    }
    warnings.push(`${cleanFilename}: ${warning}`);
  }

  return {
    filename: cleanFilename,
    screenName,
    state,
    viewport,
    isValid,
    warning,
    warnings
  };
}

export function isAllowedImageFilename(filename: string): boolean {
  return validExtensions.has(path.extname(filename).toLowerCase());
}
