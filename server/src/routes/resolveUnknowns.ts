import express, { Router } from "express";
import type { Request, Response } from "express";
import { resolveUnknowns } from "../services/resolveUnknowns.js";
import { extractUnknownCells } from "../services/responseParser.js";
import { loadKazeCatalog } from "../services/kazeCatalogFetcher.js";
import { createRequestLogScope, quoteLogValue } from "../utils/logger.js";

export const resolveUnknownsRouter = Router();
resolveUnknownsRouter.use(express.json({ limit: "50mb" }));

resolveUnknownsRouter.post(
  "/resolve-unknowns",
  async (req: Request, res: Response) => {
    const log = createRequestLogScope("resolveUnknowns");

    try {
      const {
        aiEndpointUrl,
        modelName,
        kazeComponentMapping,
        screenshots,
        fastMode,
        timeoutMs,
      } = req.body as any;
      const screenshotCount = Array.isArray(screenshots) ? screenshots.length : 0;
      log.info(
        `Request received screenshots=${screenshotCount} fastMode=${Boolean(fastMode)} model=${modelName ? quoteLogValue(String(modelName)) : "\"missing\""}`,
      );

      if (!aiEndpointUrl || !modelName) {
        res.status(400).json({
          error: "aiEndpointUrl and modelName are required.",
        });
        log.warn("Response sent status=400 reason=missing-ai-config");
        return;
      }

      const unknownCells = extractUnknownCells(kazeComponentMapping);
      log.info(`Unknown cells extracted count=${unknownCells.length}`);

      if (unknownCells.length === 0) {
        res.json({
          success: true,
          resolved: [],
          failed: [],
          message: "No unknown cells found to resolve.",
        });
        log.info("Response sent status=200 reason=no-unknowns");
        return;
      }

      // screenshots is now an array of { data: base64 string, mimetype }
      const aiScreenshots = (screenshots ?? []).map((s: any) => ({
        path: s.data, // base64 data used directly
        mimetype: s.mimetype || "image/png",
        isBase64: true,
      }));
      log.info(`AI screenshot payload prepared count=${aiScreenshots.length}`);

      const catalogLog = log.child("kazeCatalog");
      const catalogLoad = await loadKazeCatalog({ log: catalogLog });
      catalogLoad.warnings.forEach((warning) =>
        catalogLog.warn(warning),
      );
      log.info(
        `Kaze catalog loaded source=${catalogLoad.source} warnings=${catalogLoad.warnings.length}`,
      );

      log.info("Resolve unknowns model call started.");
      const result = await resolveUnknowns({
        unknownCells,
        aiEndpointUrl,
        modelName,
        screenshots: aiScreenshots,
        fastMode,
        timeoutMs,
      });
      log.info(
        `Resolve unknowns completed resolved=${result.resolved.length} failed=${result.failed.length}`,
      );

      res.json({
        success: true,
        resolved: result.resolved,
        failed: result.failed,
        rawResponse: result.rawResponse,
        catalog: {
          source: catalogLoad.source,
          sourceDetail:
            catalogLoad.source === "remote"
              ? "internal approved catalog endpoint"
              : catalogLoad.sourceDetail,
        },
      });
      log.info("Response sent status=200");
    } catch (error) {
      log.error("Resolve unknowns request failed.", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
      log.warn("Response sent status=500");
    }
  },
);
