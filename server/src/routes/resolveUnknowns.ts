import express, { Router } from "express";
import type { Request, Response } from "express";
import { resolveUnknowns } from "../services/resolveUnknowns.js";
import { extractUnknownCells } from "../services/responseParser.js";
import { loadKazeCatalog } from "../services/kazeCatalogFetcher.js";

export const resolveUnknownsRouter = Router();
resolveUnknownsRouter.use(express.json({ limit: "50mb" }));

resolveUnknownsRouter.post(
  "/resolve-unknowns",
  async (req: Request, res: Response) => {
    try {
      const {
        aiEndpointUrl,
        modelName,
        kazeComponentMapping,
        screenshots,
        fastMode,
        timeoutMs,
      } = req.body as any;

      if (!aiEndpointUrl || !modelName) {
        res.status(400).json({
          error: "aiEndpointUrl and modelName are required.",
        });
        return;
      }

      const unknownCells = extractUnknownCells(kazeComponentMapping);

      if (unknownCells.length === 0) {
        res.json({
          success: true,
          resolved: [],
          failed: [],
          message: "No unknown cells found to resolve.",
        });
        return;
      }

      // screenshots is now an array of { data: base64 string, mimetype }
      const aiScreenshots = (screenshots ?? []).map((s: any) => ({
        path: s.data, // base64 data used directly
        mimetype: s.mimetype || "image/png",
        isBase64: true,
      }));

      const catalogLoad = await loadKazeCatalog();
      catalogLoad.warnings.forEach((warning) =>
        console.warn(`[kazeCatalog] ${warning}`),
      );

      const result = await resolveUnknowns({
        unknownCells,
        aiEndpointUrl,
        modelName,
        screenshots: aiScreenshots,
        fastMode,
        timeoutMs,
      });

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
    } catch (error) {
      console.error("resolve-unknowns error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);
