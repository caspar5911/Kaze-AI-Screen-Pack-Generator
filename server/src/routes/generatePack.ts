import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { callAiEndpoint } from "../services/aiClient.js";
import { buildFileMap } from "../services/fileMap.js";
import {
  buildClineQaPrompt,
  buildHandoffMappingPrompt,
  buildManifestPrompt,
  buildPackInputMarkdown,
  loadKazeComponentCatalog
} from "../services/promptBuilder.js";
import {
  applyGenerationWarningsToQuality,
  parseAllGeneratedFiles,
  parseClineQaResponse,
  parseHandoffMappingResponse,
  parseManifestResponse
} from "../services/responseParser.js";
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
      const parsedFilenames = fileMap.entries.map((entry) => ({
        filename: entry.filename,
        screenName: entry.parsed.screenName,
        state: entry.parsed.state,
        viewport: entry.parsed.viewport
      }));
      const allowedFilenames = fileMap.entries.map((entry) => entry.filename);
      const screenshots = fileMap.entries.map((entry) => ({
        path: entry.path,
        mimetype: entry.mimetype
      }));

      const manifestPrompt = buildManifestPrompt({
        packInputMarkdown,
        fileMapText: fileMap.text
      });
      const manifestRawResponse = await callAiEndpoint({
        endpointUrl: fields.aiEndpointUrl,
        modelName: fields.modelName,
        prompt: manifestPrompt,
        screenshots
      });
      const manifestParsed = parseManifestResponse({
        responseText: manifestRawResponse,
        allowedFilenames,
        kazeComponentCatalog,
        parsedFilenames
      });
      const packManifestMarkdown = manifestParsed.files["pack-manifest.md"] ?? "";

      const handoffMappingPrompt = buildHandoffMappingPrompt({
        packInputMarkdown,
        packManifestMarkdown,
        kazeComponentCatalog,
        fileMapText: fileMap.text
      });
      const handoffMappingRawResponse = await callAiEndpoint({
        endpointUrl: fields.aiEndpointUrl,
        modelName: fields.modelName,
        prompt: handoffMappingPrompt,
        screenshots
      });
      const handoffMappingParsed = parseHandoffMappingResponse({
        responseText: handoffMappingRawResponse,
        allowedFilenames,
        kazeComponentCatalog,
        parsedFilenames
      });
      const handoffMarkdown = handoffMappingParsed.files["handoff.md"] ?? "";
      const kazeComponentMappingMarkdown =
        handoffMappingParsed.files["kaze-component-mapping.md"] ?? "";

      const clineQaPrompt = buildClineQaPrompt({
        packInputMarkdown,
        packManifestMarkdown,
        handoffMarkdown,
        kazeComponentMappingMarkdown,
        kazeComponentCatalog
      });
      const clineQaRawResponse = await callAiEndpoint({
        endpointUrl: fields.aiEndpointUrl,
        modelName: fields.modelName,
        prompt: clineQaPrompt,
        screenshots: []
      });
      const clineQaParsed = parseClineQaResponse({
        responseText: clineQaRawResponse,
        allowedFilenames,
        kazeComponentCatalog,
        parsedFilenames
      });

      const rawResponses = {
        "stage-1-manifest": manifestRawResponse,
        "stage-2-handoff-mapping": handoffMappingRawResponse,
        "stage-3-cline-qa": clineQaRawResponse
      };
      const rawResponse = formatStageRawResponses(rawResponses);
      const finalParsed = parseAllGeneratedFiles({
        files: mergeGeneratedFiles(
          manifestParsed.files,
          handoffMappingParsed.files,
          clineQaParsed.files
        ),
        rawResponse,
        allowedFilenames,
        kazeComponentCatalog,
        parsedFilenames
      });
      const warnings = [
        ...new Set([
          ...fileMap.warnings,
          ...manifestParsed.warnings,
          ...handoffMappingParsed.warnings,
          ...clineQaParsed.warnings,
          ...finalParsed.warnings
        ])
      ];
      const quality = applyGenerationWarningsToQuality(
        finalParsed.quality,
        warnings
      );

      response.json({
        files: finalParsed.files,
        warnings,
        rawResponse,
        rawResponses,
        quality
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
      getOptionalString(body.designSource) || "Screenshot export",
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

function formatStageRawResponses(rawResponses: Record<string, string>): string {
  return Object.entries(rawResponses)
    .map(([stageName, rawResponse]) =>
      [`--- Stage: ${stageName} ---`, rawResponse.trim()].join("\n")
    )
    .join("\n\n");
}

function mergeGeneratedFiles(
  ...fileSets: Array<Partial<Record<string, string | undefined>>>
): Partial<Record<string, string>> {
  const merged: Partial<Record<string, string>> = {};

  fileSets.forEach((fileSet) => {
    Object.entries(fileSet).forEach(([filename, content]) => {
      if (content) {
        merged[filename] = content;
      }
    });
  });

  return merged;
}
