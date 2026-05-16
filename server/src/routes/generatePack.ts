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
import {
  createRequestLogScope,
  formatMs,
  quoteLogValue,
} from "../utils/logger.js";
import {
  cleanupUploadedFiles,
  getOptionalString,
  getRequiredString,
} from "../utils/requestHelpers.js";

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
    const log = createRequestLogScope("generatePack");
    const requestStart = Date.now();

    try {
      log.info(`Request received uploadedFiles=${uploadedFiles.length}`);
      const fields = validateFields(request.body);
      const fastMode =
        request.body.fastMode === "true" || request.body.fastMode === true;
      const aiRequestTimeoutMs = getAiRequestTimeoutMs();
      log.info(
        `Fields validated project=${quoteLogValue(fields.projectName)} screenshots=${uploadedFiles.length} fastMode=${fastMode} model=${quoteLogValue(fields.modelName)}`,
      );

      if (uploadedFiles.length === 0) {
        log.warn("Rejected request because no screenshots were uploaded.");
        response
          .status(400)
          .json({ error: "At least one screenshot is required." });
        log.info("Response sent status=400");
        return;
      }

      const fileMap = buildFileMap(
        uploadedFiles.map((file) => ({
          originalName: file.originalname,
          path: file.path,
          mimetype: file.mimetype,
        })),
      );
      log.info(
        `File Map built files=${fileMap.entries.length} warnings=${fileMap.warnings.length} filenames=${fileMap.entries.map((entry) => entry.filename).join(", ")}`,
      );
      log.info("Loading Kaze catalog.");
      const catalogLog = log.child("kazeCatalog");
      const catalogLoad = await loadKazeCatalog({ log: catalogLog });
      catalogLoad.warnings.forEach((warning) => catalogLog.warn(warning));
      log.info(
        `Kaze catalog loaded source=${catalogLoad.source} version=${catalogLoad.catalog.catalogVersion ?? "unknown"} warnings=${catalogLoad.warnings.length}`,
      );
      const compactCatalog = await loadCompactCatalogJson(catalogLoad.catalog);
      log.info(
        `Compact catalog prepared chars=${compactCatalog.length} exports=${catalogLoad.catalog.confirmedExports?.length ?? 0}`,
      );
      const packInputMarkdown = buildPackInputMarkdown(
        fields,
        fileMap.entries,
        fileMap.text,
      );
      log.info(`Pack input built chars=${packInputMarkdown.length}`);
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

      log.info("Stage 1 manifest local started.");
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
      log.info(
        `Stage 1 manifest local completed ms=${stage1ManifestLocalMs}`,
      );
      const manifestParsed = parseManifestResponse({
        responseText: manifestRawResponse,
        allowedFilenames,
        kazeComponentCatalog: compactCatalog,
        parsedFilenames,
      });
      const packManifestMarkdown =
        manifestParsed.files["pack-manifest.md"] ?? "";
      log.info(
        `Stage 1 parsed hasManifest=${Boolean(packManifestMarkdown)} warnings=${manifestParsed.warnings.length}`,
      );

      // Stage 2: Handoff + Mapping (compact JSON catalog)
      log.info("Stage 2 handoff-mapping prompt build started.");
      const handoffMappingPrompt = buildHandoffMappingPrompt({
        packInputMarkdown,
        packManifestMarkdown,
        compactCatalog,
        fileMapText: fileMap.text,
      });
      log.info(
        `Stage 2 handoff-mapping prompt built chars=${handoffMappingPrompt.length} images=${screenshots.length}`,
      );
      log.info("Stage 2 handoff-mapping AI call started.");
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
      log.info(
        `Stage 2 handoff-mapping completed ms=${stage2HandoffMappingMs} model=${quoteLogValue(fields.modelName)} endpoint=${stage2EndpointMode ?? "unknown"} prompt=${stage2PromptChars} images=${stage2ImagePayloadKb}KB/${stage2ImageCount} timeout=${aiRequestTimeoutMs}ms`,
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
      log.info(
        `Stage 2 parsed hasHandoff=${Boolean(handoffMarkdown)} hasMapping=${Boolean(kazeComponentMappingMarkdown)} warnings=${handoffMappingParsed.warnings.length}`,
      );

      // Stage 3: Cline + QA (local deterministic templates)
      log.info("Stage 3 cline-qa local started.");
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
      log.info(`Stage 3 cline-qa local completed ms=${stage3ClineQaMs}`);
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
      log.info("Final validation started.");
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
      log.info(
        `Validation completed ms=${validationMs} status=${quality.status} warnings=${warnings.length} issues=${quality.issues.length}`,
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
        log.warn(
          `Response sent status=422 quality=${quality.status} warnings=${warnings.length} issues=${quality.issues.length}`,
        );
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
      log.info(
        `Response sent status=200 quality=${quality.status} warnings=${warnings.length} total=${formatMs(Date.now() - requestStart)}`,
      );
    } catch (error) {
      log.error("Request failed.", error);
      next(error);
    } finally {
      await cleanupUploadedFiles(uploadedFiles);
      log.info(`Temp files cleaned count=${uploadedFiles.length}`);
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

function getAiRequestTimeoutMs(): number {
  const configured = Number(process.env.AI_REQUEST_TIMEOUT_MS);

  if (Number.isFinite(configured) && configured > 0) {
    return Math.trunc(configured);
  }

  return defaultAiRequestTimeoutMs;
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
