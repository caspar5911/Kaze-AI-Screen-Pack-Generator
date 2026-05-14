import express from "express";
import { discoverModels } from "../services/modelDiscovery.js";

export const modelsRouter = express.Router();

modelsRouter.get("/models", async (request, response, next) => {
  try {
    const endpointUrl =
      typeof request.query.endpointUrl === "string"
        ? request.query.endpointUrl.trim()
        : "";

    if (!endpointUrl) {
      response.status(400).json({ error: "AI endpoint URL is required." });
      return;
    }

    try {
      new URL(endpointUrl);
    } catch {
      response.status(400).json({ error: "AI endpoint URL must be a valid URL." });
      return;
    }

    const result = await discoverModels(endpointUrl);
    response.json(result);
  } catch (error) {
    next(error);
  }
});
