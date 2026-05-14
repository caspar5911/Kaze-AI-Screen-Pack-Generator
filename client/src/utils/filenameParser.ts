const VALID_VIEWPORTS = new Set(["Desktop", "Tablet", "Mobile", "Unknown"]);
const VALID_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

export interface ParsedFilename {
  filename: string;
  screenName: string;
  state: string;
  viewport: string;
  warnings: string[];
}

export function parseScreenshotFilename(filename: string): ParsedFilename {
  const warnings: string[] = [];
  const extension = getExtension(filename);
  const basename = filename.slice(0, filename.length - extension.length);
  const parts = basename.split("_");

  if (!VALID_EXTENSIONS.has(extension.toLowerCase())) {
    warnings.push(
      `Filename ${filename} uses an unsupported extension. Upload PNG, JPG, JPEG, or WEBP.`
    );
  }

  const hasRequiredParts = parts.length >= 3;
  const screenName = parts[0] ?? "";
  const viewport = hasRequiredParts ? parts[parts.length - 1] : "";
  const state = hasRequiredParts ? parts.slice(1, -1).join("_") : "";

  if (!hasRequiredParts || !screenName || !state || !viewport) {
    warnings.push(
      `Filename ${filename} does not match <ScreenName>_<State>_<Viewport>.`
    );
  }

  if (hasRequiredParts && !state) {
    warnings.push(`Filename ${filename} is missing a state.`);
  }

  if (hasRequiredParts && viewport && !VALID_VIEWPORTS.has(viewport)) {
    warnings.push(
      `Filename ${filename} uses viewport "${viewport}". Use Desktop, Tablet, Mobile, or Unknown.`
    );
  }

  return {
    filename,
    screenName,
    state,
    viewport,
    warnings
  };
}

export function getFilenameWarnings(files: File[]): string[] {
  return files.flatMap((file) => parseScreenshotFilename(file.name).warnings);
}

function getExtension(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(index) : "";
}
