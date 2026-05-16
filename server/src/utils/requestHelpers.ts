import fs from "node:fs/promises";

export function getRequiredString(value: unknown, label: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    throw new Error(`${label} is required.`);
  }

  return text;
}

export function getOptionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function cleanupUploadedFiles(
  files: Express.Multer.File[],
): Promise<void> {
  await Promise.allSettled(
    files.map((file) => fs.rm(file.path, { force: true })),
  );
}
