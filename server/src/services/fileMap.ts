import { parseScreenshotFilename, type ParsedScreenshotFilename } from "../utils/filenameParser.js";

export interface UploadedScreenshot {
  originalName: string;
  path: string;
  mimetype: string;
}

export interface FileMapEntry {
  index: number;
  filename: string;
  attachmentLabel: string;
  parsed: ParsedScreenshotFilename;
  path: string;
  mimetype: string;
}

export function buildFileMap(files: UploadedScreenshot[]): {
  entries: FileMapEntry[];
  text: string;
  warnings: string[];
} {
  const entries = files.map((file, fileIndex) => {
    const index = fileIndex + 1;
    const parsed = parseScreenshotFilename(file.originalName);

    return {
      index,
      filename: parsed.filename,
      attachmentLabel: `attached image ${index}`,
      parsed,
      path: file.path,
      mimetype: file.mimetype
    };
  });

  return {
    entries,
    text: [
      "File Map:",
      ...entries.map(
        (entry) =>
          `${entry.index}. ${entry.filename} = ${entry.attachmentLabel}`
      )
    ].join("\n"),
    warnings: entries.flatMap((entry) => entry.parsed.warnings)
  };
}
