import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import multer from "multer";
import type { AiEndpointMode } from "../services/aiClient.js";
import { callAiEndpoint } from "../services/aiClient.js";
import { buildFileMap } from "../services/fileMap.js";
import {
  buildHandoffMappingPrompt,
  buildLocalClineImplementationPrompt,
  buildLocalPackManifestMarkdown,
  buildLocalQaChecklist,
  buildPackInputMarkdown,
  loadCompactCatalogJson,
} from "../services/promptBuilder.js";
import { loadKazeCatalog } from "../services/kazeCatalogFetcher.js";
import {
  applyGenerationWarningsToQuality,
  parseAllGeneratedFiles,
  parseHandoffMappingResponse,
  parseManifestResponse,
} from "../services/responseParser.js";
import { isAllowedImageFilename } from "../utils/filenameParser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const uploadDir = path.resolve(repoRoot, "server", "tmp", "uploads");
const defaultAiRequestTimeoutMs = 180_000;

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

const upload = multer({
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

export const generatePackRouter = express.Router();

generatePackRouter.post(
  "/generate-pack",
  upload.array("screenshots"),
  async (request, response, next) => {
    const uploadedFiles = (request.files ?? []) as Express.Multer.File[];

    try {
      const fields = validateFields(request.body);
      const fastMode =
        request.body.fastMode === "true" || request.body.fastMode === true;
      const aiRequestTimeoutMs = getAiRequestTimeoutMs();

      if (uploadedFiles.length === 0) {
        response
          .status(400)
          .json({ error: "At least one screenshot is required." });
        return;
      }

      const fileMap = buildFileMap(
        uploadedFiles.map((file) => ({
          originalName: file.originalname,
          path: file.path,
          mimetype: file.mimetype,
        })),
      );
      const catalogLoad = await loadKazeCatalog();
      logCatalogWarnings(catalogLoad.warnings);
      const compactCatalog = await loadCompactCatalogJson(catalogLoad.catalog);
      const packInputMarkdown = buildPackInputMarkdown(
        fields,
        fileMap.entries,
        fileMap.text,
      );
      const parsedFilenames = fileMap.entries.map((entry) => ({
        filename: entry.filename,
        screenName: entry.parsed.screenName,
        state: entry.parsed.state,
        viewport: entry.parsed.viewport,
      }));
      const allowedFilenames = fileMap.entries.map((entry) => entry.filename);
      const screenshots = fileMap.entries.map((entry) => ({
        path: entry.path,
        mimetype: entry.mimetype,
      }));

      const manifestStart = Date.now();
      const localManifestMarkdown = buildLocalPackManifestMarkdown(
        fields,
        fileMap.entries,
        {
          packageName: catalogLoad.catalog.packageName,
          kazeVersion: catalogLoad.catalog.kazeVersion,
          catalogVersion: catalogLoad.catalog.catalogVersion,
          schemaVersion: catalogLoad.catalog.schemaVersion,
          source: catalogLoad.source,
          sourceDetail: catalogLoad.sourceDetail,
        },
      );
      const manifestRawResponse = [
        "--- File: pack-manifest.md ---",
        localManifestMarkdown,
      ].join("\n");
      const stage1ManifestLocalMs = Date.now() - manifestStart;
      console.log(
        `[generatePack] Stage 1 manifest local: ${stage1ManifestLocalMs / 1000}s`,
      );
      const manifestParsed = parseManifestResponse({
        responseText: manifestRawResponse,
        allowedFilenames,
        kazeComponentCatalog: compactCatalog,
        parsedFilenames,
      });
      const packManifestMarkdown =
        manifestParsed.files["pack-manifest.md"] ?? "";

      // Stage 2: Handoff + Mapping (compact JSON catalog)
      const handoffMappingPrompt = buildHandoffMappingPrompt({
        packInputMarkdown,
        packManifestMarkdown,
        compactCatalog,
        fileMapText: fileMap.text,
      });
      const handoffStart = Date.now();
      let stage2ImagePayloadKb = 0;
      let stage2PromptChars = handoffMappingPrompt.length;
      let stage2ImageCount = screenshots.length;
      let stage2EndpointMode: AiEndpointMode | undefined;
      const handoffMappingRawResponse = await callAiEndpoint({
        endpointUrl: fields.aiEndpointUrl,
        modelName: fields.modelName,
        prompt: handoffMappingPrompt,
        screenshots,
        fastMode,
        timeoutMs: aiRequestTimeoutMs,
        onMetrics: (metrics) => {
          stage2ImagePayloadKb = metrics.imagePayloadKb;
          stage2PromptChars = metrics.promptChars;
          stage2ImageCount = metrics.imageCount;
          stage2EndpointMode = metrics.endpointMode;
        },
      });
      const stage2HandoffMappingMs = Date.now() - handoffStart;
      console.log(
        `[generatePack] Stage 2 handoff-mapping: ${stage2HandoffMappingMs / 1000}s (model=${fields.modelName}, endpoint=${stage2EndpointMode ?? "unknown"}, prompt=${stage2PromptChars} chars, images=${stage2ImagePayloadKb}KB/${stage2ImageCount}, timeout=${aiRequestTimeoutMs}ms)`,
      );
      const handoffMappingParsed = parseHandoffMappingResponse({
        responseText: handoffMappingRawResponse,
        allowedFilenames,
        kazeComponentCatalog: compactCatalog,
        parsedFilenames,
      });
      const handoffMarkdown = handoffMappingParsed.files["handoff.md"] ?? "";
      const kazeComponentMappingMarkdown =
        handoffMappingParsed.files["kaze-component-mapping.md"] ?? "";

      // Stage 3: Cline + QA (local deterministic templates)
      const clineStart = Date.now();
      const clineImplementationPromptMarkdown =
        buildLocalClineImplementationPrompt({
          fields,
          fileMapEntries: fileMap.entries,
        });
      const qaChecklistMarkdown = buildLocalQaChecklist();
      const clineQaRawResponse = [
        "--- File: cline-implementation-prompt.md ---",
        clineImplementationPromptMarkdown,
        "",
        "--- File: qa-checklist.md ---",
        qaChecklistMarkdown,
      ].join("\n");
      const stage3ClineQaMs = Date.now() - clineStart;
      console.log(
        `[generatePack] Stage 3 cline-qa local: ${stage3ClineQaMs / 1000}s`,
      );
      const clineQaFiles = {
        "cline-implementation-prompt.md": clineImplementationPromptMarkdown,
        "qa-checklist.md": qaChecklistMarkdown,
      };

      const rawResponses = {
        "stage-1-manifest-local": manifestRawResponse,
        "stage-2-handoff-mapping": handoffMappingRawResponse,
        "stage-3-cline-qa-local": clineQaRawResponse,
      };
      const rawResponse = formatStageRawResponses(rawResponses);
      const validationStart = Date.now();
      const finalParsed = parseAllGeneratedFiles({
        files: mergeGeneratedFiles(
          manifestParsed.files,
          handoffMappingParsed.files,
          clineQaFiles,
        ),
        rawResponse,
        allowedFilenames,
        kazeComponentCatalog: compactCatalog,
        parsedFilenames,
      });
      const validationMs = Date.now() - validationStart;
      const warnings = [
        ...new Set([
          ...fileMap.warnings,
          ...finalParsed.warnings,
        ]),
      ];
      const quality = applyGenerationWarningsToQuality(
        finalParsed.quality,
        warnings,
      );
      const responseMeta = {
        mode: "local-manifest-local-cline-qa-staged",
        fastMode,
        timingsMs: {
          stage1ManifestLocal: stage1ManifestLocalMs,
          stage2HandoffMapping: stage2HandoffMappingMs,
          stage3ClineQa: stage3ClineQaMs,
          validation: validationMs,
        },
        promptSizes: {
          stage2HandoffMapping: stage2PromptChars,
          stage3ClineQa: clineQaRawResponse.length,
        },
        imagePayloadKb: stage2ImagePayloadKb,
        ai: {
          timeoutMs: aiRequestTimeoutMs,
          endpointMode: stage2EndpointMode,
          modelName: fields.modelName,
        },
        kazeCatalog: {
          source: catalogLoad.source,
          sourceDetail:
            catalogLoad.source === "remote"
              ? "internal approved catalog endpoint"
              : catalogLoad.sourceDetail,
          packageName: catalogLoad.catalog.packageName,
          kazeVersion: catalogLoad.catalog.kazeVersion,
          catalogVersion: catalogLoad.catalog.catalogVersion,
          schemaVersion: catalogLoad.catalog.schemaVersion,
          warnings: catalogLoad.warnings,
        },
      };

      if (quality.status === "failed") {
        response.status(422).json({
          error: [
            "Pack validation failed:",
            ...quality.issues.map((issue) => `- ${issue}`),
          ].join("\n"),
          files: finalParsed.files,
          warnings,
          rawResponse,
          rawResponses,
          quality,
          meta: responseMeta,
        });
        return;
      }

      response.json({
        files: finalParsed.files,
        warnings,
        rawResponse,
        rawResponses,
        quality,
        meta: responseMeta,
      });
    } catch (error) {
      next(error);
    } finally {
      await cleanupFiles(uploadedFiles);
    }
  },
);

function validateFields(body: Record<string, unknown>) {
  const projectName = getRequiredString(body.projectName, "Project name");
  const shortDescription = getRequiredString(
    body.shortDescription,
    "Short description",
  );
  const aiEndpointUrl = getRequiredString(
    body.aiEndpointUrl,
    "AI endpoint URL",
  );
  const modelName = getRequiredString(body.modelName, "Model name");

  try {
    new URL(aiEndpointUrl);
  } catch {
    throw new Error("AI endpoint URL must be a valid URL.");
  }

  return {
    projectName,
    shortDescription,
    designSource: getOptionalString(body.designSource) || "Screenshot export",
    iconSystem: getOptionalString(body.iconSystem) || "Font Awesome",
    additionalNotes: getOptionalString(body.additionalNotes),
    aiEndpointUrl,
    modelName,
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

function getAiRequestTimeoutMs(): number {
  const configured = Number(process.env.AI_REQUEST_TIMEOUT_MS);

  if (Number.isFinite(configured) && configured > 0) {
    return Math.trunc(configured);
  }

  return defaultAiRequestTimeoutMs;
}

function logCatalogWarnings(warnings: string[]): void {
  warnings.forEach((warning) => {
    console.warn(`[kazeCatalog] ${warning}`);
  });
}

async function cleanupFiles(files: Express.Multer.File[]): Promise<void> {
  await Promise.allSettled(
    files.map((file) => fs.rm(file.path, { force: true })),
  );
}

function formatStageRawResponses(rawResponses: Record<string, string>): string {
  return Object.entries(rawResponses)
    .map(([stageName, rawResponse]) =>
      [`--- Stage: ${stageName} ---`, rawResponse.trim()].join("\n"),
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
