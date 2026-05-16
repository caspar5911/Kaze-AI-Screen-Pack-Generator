import express, { Router } from "express";
import type { Request, Response } from "express";
import {
  applyGenerationWarningsToQuality,
  parseAllGeneratedFiles,
} from "../services/responseParser.js";
import { loadCompactCatalogJson } from "../services/promptBuilder.js";
import { loadKazeCatalog } from "../services/kazeCatalogFetcher.js";

export const validatePackRouter = Router();
validatePackRouter.use(express.json({ limit: "10mb" }));

validatePackRouter.post(
  "/validate-pack",
  async (req: Request, res: Response) => {
    try {
      const { files, allowedFilenames, parsedFilenames } = req.body as {
        files: Record<string, string>;
        allowedFilenames: string[];
        parsedFilenames: Array<{
          filename: string;
          screenName: string;
          state: string;
          viewport: string;
        }>;
      };

      if (!files || Object.keys(files).length === 0) {
        res.status(400).json({ error: "No files provided." });
        return;
      }

      const catalogLoad = await loadKazeCatalog();
      const compactCatalog = await loadCompactCatalogJson(catalogLoad.catalog);

      const result = parseAllGeneratedFiles({
        files,
        rawResponse: "",
        allowedFilenames: allowedFilenames ?? [],
        kazeComponentCatalog: compactCatalog,
        parsedFilenames: parsedFilenames ?? [],
      });
      catalogLoad.warnings.forEach((warning) =>
        console.warn(`[kazeCatalog] ${warning}`),
      );

      res.json({
        warnings: result.warnings,
        quality: applyGenerationWarningsToQuality(
          result.quality,
          result.warnings,
        ),
        meta: {
          kazeCatalog: {
            source: catalogLoad.source,
            sourceDetail:
              catalogLoad.source === "remote"
                ? "internal approved catalog endpoint"
                : catalogLoad.sourceDetail,
            warnings: catalogLoad.warnings,
          },
        },
      });
    } catch (error) {
      console.error("validate-pack error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Validation failed.",
      });
    }
  },
);
