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
import { generatePackRouter } from "./routes/generatePack.js";
import { modelsRouter } from "./routes/models.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const clientDist = path.resolve(repoRoot, "client", "dist");
const app = express();
const port = Number(process.env.PORT ?? 3971);

app.use(cors());
app.use("/api", generatePackRouter);
app.use("/api", modelsRouter);

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
    response.status(400).json({
      error: error.message || "Request failed.",
    });
  },
);

app.listen(port, "127.0.0.1", () => {
  console.log(
    `Kaze Screen Pack Generator API listening on http://127.0.0.1:${port}`,
  );
});
