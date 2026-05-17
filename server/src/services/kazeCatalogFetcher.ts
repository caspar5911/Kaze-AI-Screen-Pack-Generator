import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { KazeCatalog } from "./kazeCatalog.js";
import { setKazeCatalog } from "./kazeCatalog.js";
import type { RequestLogScope } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");

const defaultCachePath = ".cache/kaze-component-catalog.cache.json";
const defaultLocalPath = "config/kaze-component-catalog.local.json";
const requiredFakeNames = [
  "KazeButton",
  "KazeInput",
  "KazeSelect",
  "KazeAvatar",
  "KazeTypography",
  "KazeIcon",
  "KazeCard",
  "KazeLayout",
  "KazeTable",
  "KazeModal",
];

export interface KazeCatalogLoadResult {
  catalog: KazeCatalog;
  source: "remote" | "cache" | "local";
  sourceDetail: string;
  warnings: string[];
}

export async function loadKazeCatalog(options?: {
  catalogUrl?: string;
  cachePath?: string;
  localPath?: string;
  log?: RequestLogScope;
}): Promise<KazeCatalogLoadResult> {
  const catalogUrl = options?.catalogUrl ?? process.env.KAZE_CATALOG_URL ?? "";
  const cachePath = resolveFromRepoRoot(
    options?.cachePath ??
      process.env.KAZE_CATALOG_CACHE_PATH ??
      defaultCachePath,
  );
  const localPath = resolveFromRepoRoot(
    options?.localPath ??
      process.env.KAZE_CATALOG_LOCAL_PATH ??
      defaultLocalPath,
  );
  const warnings: string[] = [];
  const log = options?.log;

  if (catalogUrl) {
    try {
      log?.info("Trying remote Kaze catalog source=internal-approved-endpoint");
      const remoteJson = await fetchRemoteCatalog(catalogUrl);
      const remoteCatalog = parseCatalogJson(remoteJson, catalogUrl);
      const validCatalog = validateAndPrepareCatalog(remoteCatalog, catalogUrl);
      await writeCatalogCache(cachePath, validCatalog);
      setKazeCatalog(validCatalog);
      log?.info(
        `Remote Kaze catalog valid source=remote version=${validCatalog.catalogVersion ?? "unknown"} cacheUpdated=true`,
      );
      return {
        catalog: validCatalog,
        source: "remote",
        sourceDetail: catalogUrl,
        warnings,
      };
    } catch (error) {
      warnings.push(
        `Remote Kaze catalog fetch failed or returned an invalid catalog. Cache was not overwritten. ${formatError(error)}`,
      );
      log?.warn("Remote Kaze catalog unavailable or invalid. Cache was not overwritten.");
    }
  } else {
    warnings.push("Remote Kaze catalog URL is not configured.");
    log?.warn("Remote Kaze catalog URL is not configured. Trying cache.");
  }

  try {
    log?.info(`Trying cached Kaze catalog path=${cachePath}`);
    const cacheCatalog = await readCatalogFile(cachePath);
    const validCatalog = validateAndPrepareCatalog(
      cacheCatalog,
      cachePath,
    );
    setKazeCatalog(validCatalog);
    warnings.push("Remote Kaze catalog unavailable. Using cached catalog.");
    log?.info(
      `Cached Kaze catalog valid source=cache version=${validCatalog.catalogVersion ?? "unknown"}`,
    );
    return {
      catalog: validCatalog,
      source: "cache",
      sourceDetail: cachePath,
      warnings,
    };
  } catch (error) {
    warnings.push(
      `Cached Kaze catalog invalid or missing. ${formatError(error)}`,
    );
    log?.warn("Cached Kaze catalog invalid or missing. Trying local fallback.");
  }

  try {
    log?.info(`Trying local fallback Kaze catalog path=${localPath}`);
    const localCatalog = await readCatalogFile(localPath);
    const validCatalog = validateAndPrepareCatalog(
      localCatalog,
      localPath,
    );
    setKazeCatalog(validCatalog);
    warnings.push("Using local fallback Kaze catalog.");
    log?.info(
      `Local fallback Kaze catalog valid source=local version=${validCatalog.catalogVersion ?? "unknown"}`,
    );
    return {
      catalog: validCatalog,
      source: "local",
      sourceDetail: localPath,
      warnings,
    };
  } catch (error) {
    warnings.push(
      `Local fallback Kaze catalog invalid or missing. ${formatError(error)}`,
    );
    log?.warn("Local fallback Kaze catalog invalid or missing.");
  }

  log?.error("Unable to load a valid Kaze catalog from remote, cache, or local fallback.");
  throw new Error(
    [
      "Unable to load a valid Kaze catalog.",
      "Tried:",
      `- remote catalog URL${catalogUrl ? `: ${catalogUrl}` : " (not configured)"}`,
      `- cache catalog file: ${cachePath}`,
      `- local fallback catalog file: ${localPath}`,
      "Generation is blocked because no valid catalog is available.",
      ...warnings.map((warning) => `- ${warning}`),
    ].join("\n"),
  );
}

export function toCompactCatalogJson(catalog: KazeCatalog): string {
  return JSON.stringify({
    packageName: catalog.packageName,
    kazeVersion: catalog.kazeVersion,
    catalogVersion: catalog.catalogVersion,
    schemaVersion: catalog.schemaVersion,
    confirmedExports: catalog.confirmedExports,
    exportGroups: catalog.exportGroups,
    componentDetectionRules: catalog.componentDetectionRules,
    patternMappings: catalog.patternMappings,
    mandatoryMappingRules: catalog.mandatoryMappingRules,
    unconfirmedPatterns: catalog.unconfirmedPatterns,
    forbiddenFakeNames: catalog.forbiddenFakeNames,
    wrongNameRepairs: catalog.wrongNameRepairs,
    validatorRules: catalog.validatorRules,
    automaticFailConditions: catalog.automaticFailConditions,
  });
}

export function validateAndPrepareCatalog(
  catalog: KazeCatalog,
  sourceDetail = "catalog",
): KazeCatalog {
  const errors = validateCatalog(catalog);
  if (errors.length > 0) {
    throw new Error(`${sourceDetail}: ${errors.join(" ")}`);
  }

  return filterAiReadyCatalog(catalog);
}

export function validateCatalog(catalog: KazeCatalog): string[] {
  const errors: string[] = [];

  if (!catalog || typeof catalog !== "object") {
    return ["Catalog must be a JSON object."];
  }

  if (catalog.packageName !== "@pcs-security/kaze-ui-library") {
    errors.push("packageName must be @pcs-security/kaze-ui-library.");
  }

  if (!isNonEmptyString(catalog.schemaVersion)) {
    errors.push("schemaVersion is required.");
  }

  if (!isNonEmptyString(catalog.kazeVersion)) {
    errors.push("kazeVersion is required.");
  }

  if (!isNonEmptyString(catalog.catalogVersion)) {
    errors.push("catalogVersion is required.");
  }

  if (!Array.isArray(catalog.confirmedExports)) {
    errors.push("confirmedExports must be an array.");
  }

  if (!catalog.exportGroups || typeof catalog.exportGroups !== "object") {
    errors.push("exportGroups is required.");
  }

  if (!Array.isArray(catalog.exportGroups?.visualComponents)) {
    errors.push("exportGroups.visualComponents must be an array.");
  }

  if (!Array.isArray(catalog.exportGroups?.utilityExports)) {
    errors.push("exportGroups.utilityExports must be an array.");
  }

  if (!Array.isArray(catalog.forbiddenFakeNames)) {
    errors.push("forbiddenFakeNames must be an array.");
  }

  if (!isPlainObject(catalog.wrongNameRepairs)) {
    errors.push("wrongNameRepairs must be an object.");
  }

  if (!isPlainObject(catalog.patternMappings)) {
    errors.push("patternMappings must be an object.");
  }

  if (!Array.isArray(catalog.mandatoryMappingRules)) {
    errors.push("mandatoryMappingRules must be an array.");
  }

  if (
    catalog.catalogStatus !== undefined &&
    catalog.catalogStatus !== "verified"
  ) {
    errors.push("catalogStatus must be verified when provided.");
  }

  if (catalog.aiReady !== undefined && catalog.aiReady !== true) {
    errors.push("aiReady must be true when provided.");
  }

  const confirmedExports = new Set(catalog.confirmedExports ?? []);

  requiredFakeNames.forEach((fakeName) => {
    if (confirmedExports.has(fakeName)) {
      errors.push(`${fakeName} must not appear in confirmedExports.`);
    }
  });

  validateExportReferences(
    "exportGroups.visualComponents",
    catalog.exportGroups?.visualComponents ?? [],
    confirmedExports,
    errors,
  );
  validateExportReferences(
    "exportGroups.utilityExports",
    catalog.exportGroups?.utilityExports ?? [],
    confirmedExports,
    errors,
  );
  validateExportReferences(
    "wrongNameRepairs",
    Object.values(catalog.wrongNameRepairs ?? {}),
    confirmedExports,
    errors,
  );
  validateExportReferences(
    "patternMappings",
    Object.values(catalog.patternMappings ?? {}),
    confirmedExports,
    errors,
  );

  (catalog.mandatoryMappingRules ?? []).forEach((rule, index) => {
    if (!confirmedExports.has(rule.mustMapTo)) {
      errors.push(
        `mandatoryMappingRules[${index}].mustMapTo references unconfirmed export ${rule.mustMapTo}.`,
      );
    }
  });

  return errors;
}

async function fetchRemoteCatalog(catalogUrl: string): Promise<string> {
  const response = await fetch(catalogUrl, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function readCatalogFile(filePath: string): Promise<KazeCatalog> {
  return parseCatalogJson(await fs.readFile(filePath, "utf8"), filePath);
}

function parseCatalogJson(text: string, sourceDetail: string): KazeCatalog {
  try {
    return JSON.parse(stripBom(text)) as KazeCatalog;
  } catch (error) {
    throw new Error(`${sourceDetail}: invalid JSON. ${formatError(error)}`);
  }
}

async function writeCatalogCache(
  cachePath: string,
  catalog: KazeCatalog,
): Promise<void> {
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
}

function filterAiReadyCatalog(catalog: KazeCatalog): KazeCatalog {
  if (!catalog.exportMetadata) {
    return catalog;
  }

  const usableExports = new Set(
    catalog.confirmedExports.filter((exportName) => {
      const metadata = catalog.exportMetadata?.[exportName];
      if (!metadata) {
        return true;
      }
      return metadata.catalogStatus === "verified" && metadata.aiReady === true;
    }),
  );

  return {
    ...catalog,
    confirmedExports: catalog.confirmedExports.filter((exportName) =>
      usableExports.has(exportName),
    ),
    exportGroups: {
      visualComponents: (catalog.exportGroups?.visualComponents ?? []).filter(
        (exportName) => usableExports.has(exportName),
      ),
      utilityExports: (catalog.exportGroups?.utilityExports ?? []).filter(
        (exportName) => usableExports.has(exportName),
      ),
    },
    patternMappings: Object.fromEntries(
      Object.entries(catalog.patternMappings ?? {}).filter(([, exportName]) =>
        usableExports.has(exportName),
      ),
    ),
    mandatoryMappingRules: (catalog.mandatoryMappingRules ?? []).filter((rule) =>
      usableExports.has(rule.mustMapTo),
    ),
    wrongNameRepairs: Object.fromEntries(
      Object.entries(catalog.wrongNameRepairs ?? {}).filter(([, exportName]) =>
        usableExports.has(exportName),
      ),
    ),
  };
}

function validateExportReferences(
  label: string,
  exportNames: string[],
  confirmedExports: Set<string>,
  errors: string[],
): void {
  exportNames.forEach((exportName) => {
    if (!confirmedExports.has(exportName)) {
      errors.push(`${label} references unconfirmed export ${exportName}.`);
    }
  });
}

function resolveFromRepoRoot(configuredPath: string): string {
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(repoRoot, configuredPath);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, "");
}
