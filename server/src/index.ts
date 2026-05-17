import "dotenv/config";
import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { aiAssistRouter } from "./routes/aiAssist.js";
import { generatePackRouter } from "./routes/generatePack.js";
import { modelsRouter } from "./routes/models.js";
import { resolveUnknownsRouter } from "./routes/resolveUnknowns.js";
import { validatePackRouter } from "./routes/validatePack.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const clientDist = path.resolve(repoRoot, "client", "dist");
const app = express();
const port = Number(process.env.PORT ?? 3971);

app.use(cors());
app.use("/api", aiAssistRouter);
app.use("/api", generatePackRouter);
app.use("/api", modelsRouter);
app.use("/api", resolveUnknownsRouter);
app.use("/api", validatePackRouter);

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_request, response) => {
    response.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use(
  (
    error: Error,
    _request: Request,
    response: Response,
    _next: NextFunction,
  ) => {
    console.error(error);
    const statusCode =
      "statusCode" in error && typeof error.statusCode === "number"
        ? error.statusCode
        : 400;

    response.status(statusCode).json({
      error: error.message || "Request failed.",
    });
  },
);

const server = app.listen(port, "127.0.0.1", () => {
  console.log(
    `Kaze Screen Pack Generator API listening on http://127.0.0.1:${port}`,
  );
});

function shutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down API server...`);

  server.close((error) => {
    if (error) {
      console.error(error);
      process.exit(1);
    }

    process.exit(0);
  });

  setTimeout(() => {
    console.error("Forced shutdown after timeout.");
    process.exit(1);
  }, 3000).unref();
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
