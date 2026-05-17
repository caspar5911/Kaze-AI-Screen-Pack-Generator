import express, { Router } from "express";
import type { Request, Response } from "express";
import {
  applyGenerationWarningsToQuality,
  parseAllGeneratedFiles,
} from "../services/responseParser.js";
import { loadCompactCatalogJson } from "../services/promptBuilder.js";
import { loadKazeCatalog } from "../services/kazeCatalogFetcher.js";
import { createRequestLogScope } from "../utils/logger.js";

export const validatePackRouter = Router();
validatePackRouter.use(express.json({ limit: "10mb" }));

validatePackRouter.post(
  "/validate-pack",
  async (req: Request, res: Response) => {
    const log = createRequestLogScope("validatePack");

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
      const fileCount = files ? Object.keys(files).length : 0;
      log.info(`Request received files=${fileCount}`);

      if (!files || Object.keys(files).length === 0) {
        res.status(400).json({ error: "No files provided." });
        log.warn("Response sent status=400 reason=no-files");
        return;
      }

      const catalogLog = log.child("kazeCatalog");
      const catalogLoad = await loadKazeCatalog({ log: catalogLog });
      const compactCatalog = await loadCompactCatalogJson(catalogLoad.catalog);
      log.info(
        `Kaze catalog loaded source=${catalogLoad.source} warnings=${catalogLoad.warnings.length}`,
      );

      const result = parseAllGeneratedFiles({
        files,
        rawResponse: "",
        allowedFilenames: allowedFilenames ?? [],
        kazeComponentCatalog: compactCatalog,
        parsedFilenames: parsedFilenames ?? [],
      });
      catalogLoad.warnings.forEach((warning) =>
        catalogLog.warn(warning),
      );
      const quality = applyGenerationWarningsToQuality(
        result.quality,
        result.warnings,
      );
      log.info(
        `Validation completed status=${quality.status} warnings=${result.warnings.length} issues=${quality.issues.length}`,
      );

      res.json({
        warnings: result.warnings,
        quality,
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
      log.info("Response sent status=200");
    } catch (error) {
      log.error("Validate pack request failed.", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Validation failed.",
      });
      log.warn("Response sent status=500");
    }
  },
);
