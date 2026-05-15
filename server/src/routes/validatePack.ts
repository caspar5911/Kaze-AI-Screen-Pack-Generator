import express, { Router } from "express";
import type { Request, Response } from "express";
import {
  applyGenerationWarningsToQuality,
  parseAllGeneratedFiles,
} from "../services/responseParser.js";
import { loadCompactCatalogJson } from "../services/promptBuilder.js";

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

      const compactCatalog = await loadCompactCatalogJson();

      const result = parseAllGeneratedFiles({
        files,
        rawResponse: "",
        allowedFilenames: allowedFilenames ?? [],
        kazeComponentCatalog: compactCatalog,
        parsedFilenames: parsedFilenames ?? [],
      });

      res.json({
        warnings: result.warnings,
        quality: applyGenerationWarningsToQuality(
          result.quality,
          result.warnings,
        ),
      });
    } catch (error) {
      console.error("validate-pack error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Validation failed.",
      });
    }
  },
);
