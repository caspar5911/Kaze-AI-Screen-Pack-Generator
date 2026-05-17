import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { isAllowedImageFilename } from "./filenameParser.js";

export function getRequiredString(value: unknown, label: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    throw new Error(`${label} is required.`);
  }

  return text;
}

export function getRequiredUrlString(
  value: unknown,
  label: string,
  invalidMessage: string,
): string {
  const text = getRequiredString(value, label);

  try {
    new URL(text);
  } catch {
    throw new Error(invalidMessage);
  }

  return text;
}

export function getOptionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function createImageUploadMiddleware(uploadDir: string): multer.Multer {
  const storage = multer.diskStorage({
    destination: async (_request, _file, callback) => {
      try {
        await fs.mkdir(uploadDir, { recursive: true });
        callback(null, uploadDir);
      } catch (error) {
        callback(error as Error, uploadDir);
      }
    },
    filename: (_request, file, callback) => {
      const safeBase = path.basename(file.originalname).replace(/[^\w.-]+/g, "_");
      callback(null, `${Date.now()}-${randomUUID()}-${safeBase}`);
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: 15 * 1024 * 1024,
      files: 20,
    },
    fileFilter: (_request, file, callback) => {
      if (!isAllowedImageFilename(file.originalname)) {
        callback(new Error(`Unsupported screenshot type: ${file.originalname}`));
        return;
      }

      callback(null, true);
    },
  });
}

export async function cleanupUploadedFiles(
  files: Express.Multer.File[],
): Promise<void> {
  await Promise.allSettled(
    files.map((file) => fs.rm(file.path, { force: true })),
  );
}
