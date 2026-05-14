import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { callAiEndpoint } from "../services/aiClient.js";
import { buildFileMap } from "../services/fileMap.js";
import {
  buildAiPrompt,
  buildPackInputMarkdown,
  loadKazeComponentCatalog
} from "../services/promptBuilder.js";
import { parseAiResponse } from "../services/responseParser.js";
import { isAllowedImageFilename } from "../utils/filenameParser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const uploadDir = path.resolve(repoRoot, "server", "tmp", "uploads");

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
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 20
  },
  fileFilter: (_request, file, callback) => {
    if (!isAllowedImageFilename(file.originalname)) {
      callback(new Error(`Unsupported screenshot type: ${file.originalname}`));
      return;
    }

    callback(null, true);
  }
});

export const generatePackRouter = express.Router();

generatePackRouter.post(
  "/generate-pack",
  upload.array("screenshots"),
  async (request, response, next) => {
    const uploadedFiles = (request.files ?? []) as Express.Multer.File[];

    try {
      const fields = validateFields(request.body);

      if (uploadedFiles.length === 0) {
        response.status(400).json({ error: "At least one screenshot is required." });
        return;
      }

      const fileMap = buildFileMap(
        uploadedFiles.map((file) => ({
          originalName: file.originalname,
          path: file.path,
          mimetype: file.mimetype
        }))
      );
      const packInputMarkdown = buildPackInputMarkdown(
        fields,
        fileMap.entries,
        fileMap.text
      );
      const kazeComponentCatalog = await loadKazeComponentCatalog();
      const prompt = buildAiPrompt({
        packInputMarkdown,
        kazeComponentCatalog,
        fileMapText: fileMap.text
      });
      const aiResponse = await callAiEndpoint({
        endpointUrl: fields.aiEndpointUrl,
        modelName: fields.modelName,
        prompt,
        screenshots: fileMap.entries.map((entry) => ({
          path: entry.path,
          mimetype: entry.mimetype
        }))
      });
      const parsed = parseAiResponse({
        responseText: aiResponse,
        allowedFilenames: fileMap.entries.map((entry) => entry.filename),
        kazeComponentCatalog
      });

      response.json({
        files: parsed.files,
        warnings: [...fileMap.warnings, ...parsed.warnings],
        rawResponse: parsed.rawResponse
      });
    } catch (error) {
      next(error);
    } finally {
      await cleanupFiles(uploadedFiles);
    }
  }
);

function validateFields(body: Record<string, unknown>) {
  const projectName = getRequiredString(body.projectName, "Project name");
  const shortDescription = getRequiredString(
    body.shortDescription,
    "Short description"
  );
  const aiEndpointUrl = getRequiredString(body.aiEndpointUrl, "AI endpoint URL");
  const modelName = getRequiredString(body.modelName, "Model name");

  try {
    new URL(aiEndpointUrl);
  } catch {
    throw new Error("AI endpoint URL must be a valid URL.");
  }

  return {
    projectName,
    shortDescription,
    designSource:
      getOptionalString(body.designSource) || "Screenshot export from Figma/Sketch",
    iconSystem: getOptionalString(body.iconSystem) || "Font Awesome",
    additionalNotes: getOptionalString(body.additionalNotes),
    aiEndpointUrl,
    modelName
  };
}

function getRequiredString(value: unknown, label: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    throw new Error(`${label} is required.`);
  }

  return text;
}

function getOptionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function cleanupFiles(files: Express.Multer.File[]): Promise<void> {
  await Promise.allSettled(files.map((file) => fs.rm(file.path, { force: true })));
}
