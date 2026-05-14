const VALID_VIEWPORTS = new Set(["Desktop", "Tablet", "Mobile", "Unknown"]);
const VALID_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

export type ParsedScreenshotName = {
  filename: string;
  screenName: string | null;
  state: string | null;
  viewport: string | null;
  isValid: boolean;
  warning?: string;
};

export function parseScreenshotFilename(filename: string): ParsedScreenshotName {
  const extension = getExtension(filename);
  const basename = filename.slice(0, filename.length - extension.length);
  const parts = basename.split("_");
  const hasRequiredParts = parts.length >= 3;
  const screenName = parts[0] || null;
  const viewport = hasRequiredParts ? parts[parts.length - 1] || null : null;
  const state = hasRequiredParts ? parts.slice(1, -1).join("_") || null : null;
  const hasAllowedExtension = VALID_EXTENSIONS.has(extension.toLowerCase());
  const hasValidViewport = viewport ? VALID_VIEWPORTS.has(viewport) : false;
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
  }

  return {
    filename,
    screenName,
    state,
    viewport,
    isValid,
    warning
  };
}

export function getFilenameWarnings(files: File[]): string[] {
  return files
    .map((file) => parseScreenshotFilename(file.name))
    .filter((parsed) => !parsed.isValid && parsed.warning)
    .map((parsed) => `${parsed.filename}: ${parsed.warning}`);
}

function getExtension(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(index) : "";
}
