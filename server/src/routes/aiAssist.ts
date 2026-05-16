import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { callAiEndpoint } from "../services/aiClient.js";
import {
  AI_ASSIST_SYSTEM_PROMPT,
  buildAiAssistPrompt,
  parseAiAssistResponse,
  type AiAssistTargetField,
} from "../services/aiAssist.js";
import { isAllowedImageFilename } from "../utils/filenameParser.js";
import { createRequestLogScope, quoteLogValue } from "../utils/logger.js";
import {
  cleanupUploadedFiles,
  getOptionalString,
  getRequiredString,
} from "../utils/requestHelpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const uploadDir = path.resolve(repoRoot, "server", "tmp", "ai-assist");
const defaultAiAssistTimeoutMs = 120_000;
const targetFields = new Set<AiAssistTargetField>([
  "screenName",
  "shortDescription",
  "additionalNotes",
  "all",
]);

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

export const aiAssistRouter = express.Router();

aiAssistRouter.post(
  "/ai-assist",
  upload.array("screenshots"),
  async (request, response, next) => {
    const uploadedFiles = (request.files ?? []) as Express.Multer.File[];
    const log = createRequestLogScope("aiAssist");

    try {
      log.info(`Request received uploadedFiles=${uploadedFiles.length}`);
      const fields = validateAiAssistFields(request.body);
      log.info(
        `Fields validated target=${fields.targetField} screenshots=${uploadedFiles.length} model=${quoteLogValue(fields.modelName)}`,
      );

      if (uploadedFiles.length === 0) {
        response.status(400).json({
          error: "Upload at least one screenshot before using AI assist.",
        });
        log.warn("Response sent status=400 reason=no-screenshots");
        return;
      }

      const prompt = buildAiAssistPrompt({
        currentValues: {
          screenName: fields.screenName,
          shortDescription: fields.shortDescription,
          additionalNotes: fields.additionalNotes,
        },
        targetField: fields.targetField,
      });
      log.info(`Prompt built chars=${prompt.length}`);
      log.info("AI assist model call started.");
      const modelResponse = await callAiEndpoint({
        endpointUrl: fields.aiEndpointUrl,
        modelName: fields.modelName,
        systemPrompt: AI_ASSIST_SYSTEM_PROMPT,
        prompt,
        screenshots: uploadedFiles.map((file) => ({
          path: file.path,
          mimetype: file.mimetype,
        })),
        timeoutMs: getAiAssistTimeoutMs(),
      });
      log.info(`AI assist model response received chars=${modelResponse.length}`);

      log.info("Parsing AI assist response.");
      const assistResult = parseAiAssistResponse(modelResponse);
      log.info("AI assist response parsed successfully.");
      response.json(assistResult);
      log.info("Response sent status=200");
    } catch (error) {
      if (
        error instanceof Error &&
        error.message ===
          "AI assist returned an invalid response. Please try again or edit manually."
      ) {
        response.status(502).json({ error: error.message });
        log.warn("Response sent status=502 reason=invalid-ai-assist-response");
        return;
      }

      log.error("AI assist request failed.", error);
      next(
        new Error(
          "AI assist failed. Check the on-prem model endpoint and try again.",
        ),
      );
    } finally {
      await cleanupUploadedFiles(uploadedFiles);
      log.info(`Temp files cleaned count=${uploadedFiles.length}`);
    }
  },
);

function validateAiAssistFields(body: Record<string, unknown>) {
  const aiEndpointUrl = getRequiredString(
    body.aiEndpointUrl,
    "AI endpoint URL",
  );
  const modelName = getRequiredString(body.modelName, "Model name");
  const targetField = getRequiredString(
    body.targetField,
    "AI assist target field",
  );

  try {
    new URL(aiEndpointUrl);
  } catch {
    throw new Error("AI endpoint URL must be a valid URL.");
  }

  if (!targetFields.has(targetField as AiAssistTargetField)) {
    throw new Error("AI assist target field is invalid.");
  }

  return {
    aiEndpointUrl,
    modelName,
    targetField: targetField as AiAssistTargetField,
    screenName: getOptionalString(body.screenName),
    shortDescription: getOptionalString(body.shortDescription),
    additionalNotes: getOptionalString(body.additionalNotes),
  };
}

function getAiAssistTimeoutMs(): number {
  const configured = Number(
    process.env.AI_ASSIST_TIMEOUT_MS ?? process.env.AI_REQUEST_TIMEOUT_MS,
  );

  if (Number.isFinite(configured) && configured > 0) {
    return Math.trunc(configured);
  }

  return defaultAiAssistTimeoutMs;
}
