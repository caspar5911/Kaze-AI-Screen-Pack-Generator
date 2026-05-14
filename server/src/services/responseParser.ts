import { EXPECTED_FILE_NAMES } from "./responseParserConstants.js";

export type GeneratedFileName = (typeof EXPECTED_FILE_NAMES)[number];

export interface ParsedAiResponse {
  files: Partial<Record<GeneratedFileName, string>>;
  rawResponse: string;
  warnings: string[];
}

export function parseAiResponse(params: {
  responseText: string;
  allowedFilenames: string[];
  kazeComponentCatalog: string;
}): ParsedAiResponse {
  const warnings: string[] = [];
  const fenceStripped = stripOuterMarkdownFence(params.responseText);
  const stripped = stripReasoningBlocks(fenceStripped.text);

  if (fenceStripped.changed) {
    warnings.push("Removed outer markdown code fence from the AI response.");
  }

  if (stripped.changed) {
    warnings.push("Removed reasoning blocks from the AI response.");
  }

  const componentSanitized = replaceUnconfirmedKazeComponents(
    stripped.text,
    params.kazeComponentCatalog
  );
  if (componentSanitized.replaced.length > 0) {
    warnings.push(
      `Replaced unconfirmed Kaze component names: ${componentSanitized.replaced.join(", ")}.`
    );
  }

  const filenameSanitized = replaceInventedFilenames(
    componentSanitized.text,
    params.allowedFilenames
  );
  if (filenameSanitized.replaced.length > 0) {
    warnings.push(
      `Replaced filenames not present in the File Map: ${filenameSanitized.replaced.join(", ")}.`
    );
  }

  const files = parseFiles(filenameSanitized.text);
  const missingFiles = EXPECTED_FILE_NAMES.filter((filename) => !files[filename]);

  if (missingFiles.length > 0) {
    warnings.push(
      `Could not parse all expected files. Please review raw output. Missing: ${missingFiles.join(", ")}.`
    );
  }

  return {
    files,
    rawResponse: filenameSanitized.text,
    warnings
  };
}

function stripReasoningBlocks(text: string): { text: string; changed: boolean } {
  const stripped = text
    .replace(/<details\b[^>]*>[\s\S]*?<\/details>/gi, "")
    .replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking\b[^>]*>[\s\S]*?<\/thinking>/gi, "")
    .trim();
  return {
    text: stripped,
    changed: stripped !== text.trim()
  };
}

function stripOuterMarkdownFence(text: string): { text: string; changed: boolean } {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);

  if (!match) {
    return {
      text,
      changed: false
    };
  }

  return {
    text: match[1].trim(),
    changed: true
  };
}

function replaceUnconfirmedKazeComponents(
  text: string,
  catalog: string
): { text: string; replaced: string[] } {
  const allowedComponents = new Set(
    catalog.match(/\bKaze[A-Z][A-Za-z0-9]*\b/g) ?? []
  );
  const replaced = new Set<string>();

  const sanitized = text.replace(/\bKaze[A-Z][A-Za-z0-9]*\b/g, (component) => {
    if (allowedComponents.has(component)) {
      return component;
    }

    replaced.add(component);
    return "Unknown / verify from Kaze";
  });

  return {
    text: sanitized,
    replaced: [...replaced].sort()
  };
}

function replaceInventedFilenames(
  text: string,
  allowedFilenames: string[]
): { text: string; replaced: string[] } {
  const allowed = new Set(allowedFilenames);
  const replaced = new Set<string>();
  const screenshotPattern =
    /(?<![\w.-])([A-Za-z0-9][A-Za-z0-9_.-]*\.(?:png|jpg|jpeg|webp))(?![\w.-])/gi;

  const sanitized = text.replace(screenshotPattern, (match) => {
    if (allowed.has(match)) {
      return match;
    }

    replaced.add(match);
    return "Filename not in File Map";
  });

  return {
    text: sanitized,
    replaced: [...replaced].sort()
  };
}

function parseFiles(text: string): Partial<Record<GeneratedFileName, string>> {
  const files: Partial<Record<GeneratedFileName, string>> = {};
  const markerPattern = /^--- File:\s*(.+?)\s*---\s*$/gm;
  const markers = [...text.matchAll(markerPattern)];

  markers.forEach((marker, index) => {
    const filename = marker[1].trim();
    if (!isExpectedFileName(filename)) {
      return;
    }

    const contentStart = marker.index! + marker[0].length;
    const nextMarker = markers[index + 1];
    const contentEnd = nextMarker?.index ?? text.length;
    files[filename] = text.slice(contentStart, contentEnd).trim();
  });

  return files;
}

function isExpectedFileName(filename: string): filename is GeneratedFileName {
  return EXPECTED_FILE_NAMES.includes(filename as GeneratedFileName);
}
