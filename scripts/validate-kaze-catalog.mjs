import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "..");
const localPath =
  process.env.KAZE_CATALOG_LOCAL_PATH ??
  path.join(repoRoot, "config", "kaze-component-catalog.local.json");
const cachePath =
  process.env.KAZE_CATALOG_CACHE_PATH ??
  path.join(repoRoot, ".cache", "kaze-component-catalog.cache.json");
const fakeNames = [
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

const targets = [
  { label: "local fallback", path: localPath, required: true },
  { label: "cache", path: cachePath, required: false },
];

let checked = 0;

for (const target of targets) {
  if (!fs.existsSync(target.path)) {
    if (target.required) {
      throw new Error(`Missing required ${target.label} catalog: ${target.path}`);
    }
    console.log(`Skipping missing optional ${target.label} catalog.`);
    continue;
  }

  const catalog = JSON.parse(
    fs.readFileSync(target.path, "utf8").replace(/^\uFEFF/, ""),
  );
  validateCatalog(catalog, target.path);
  checked += 1;
  console.log(`Validated ${target.label} catalog: ${target.path}`);
}

assert.ok(checked > 0, "At least one Kaze catalog must be validated.");
console.log("Kaze catalog validation passed.");

function validateCatalog(catalog, source) {
  assert.equal(
    catalog.packageName,
    "@pcs-security/kaze-ui-library",
    `${source}: packageName must match Kaze package.`,
  );
  assertNonEmptyString(catalog.schemaVersion, `${source}: schemaVersion`);
  assertNonEmptyString(catalog.kazeVersion, `${source}: kazeVersion`);
  assertNonEmptyString(catalog.catalogVersion, `${source}: catalogVersion`);
  assert.ok(Array.isArray(catalog.confirmedExports), `${source}: confirmedExports must be an array.`);
  assert.ok(catalog.exportGroups && typeof catalog.exportGroups === "object", `${source}: exportGroups is required.`);
  assert.ok(Array.isArray(catalog.exportGroups.visualComponents), `${source}: visualComponents must be an array.`);
  assert.ok(Array.isArray(catalog.exportGroups.utilityExports), `${source}: utilityExports must be an array.`);
  assert.ok(Array.isArray(catalog.forbiddenFakeNames), `${source}: forbiddenFakeNames must be an array.`);
  assertPlainObject(catalog.wrongNameRepairs, `${source}: wrongNameRepairs`);
  assertPlainObject(catalog.patternMappings, `${source}: patternMappings`);
  assert.ok(Array.isArray(catalog.mandatoryMappingRules), `${source}: mandatoryMappingRules must be an array.`);

  const confirmed = new Set(catalog.confirmedExports);
  for (const fakeName of fakeNames) {
    assert.ok(!confirmed.has(fakeName), `${source}: ${fakeName} must not be confirmed.`);
  }

  assertKnownExports(catalog.exportGroups.visualComponents, confirmed, `${source}: visualComponents`);
  assertKnownExports(catalog.exportGroups.utilityExports, confirmed, `${source}: utilityExports`);
  assertKnownExports(Object.values(catalog.wrongNameRepairs), confirmed, `${source}: wrongNameRepairs`);
  assertKnownExports(Object.values(catalog.patternMappings), confirmed, `${source}: patternMappings`);

  catalog.mandatoryMappingRules.forEach((rule, index) => {
    assert.ok(
      confirmed.has(rule.mustMapTo),
      `${source}: mandatoryMappingRules[${index}].mustMapTo is not confirmed: ${rule.mustMapTo}`,
    );
  });
}

function assertKnownExports(values, confirmed, label) {
  values.forEach((value) => {
    assert.ok(confirmed.has(value), `${label} references unconfirmed export: ${value}`);
  });
}

function assertNonEmptyString(value, label) {
  assert.equal(typeof value, "string", `${label} must be a string.`);
  assert.ok(value.trim(), `${label} must not be empty.`);
}

function assertPlainObject(value, label) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object.`);
}
