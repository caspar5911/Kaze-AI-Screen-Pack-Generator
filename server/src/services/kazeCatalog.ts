import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const catalogJsonPath = path.resolve(
  repoRoot,
  "config",
  "kaze-component-catalog.json",
);

export interface KazeCatalog {
  confirmedExports: string[];
  exportGroups?: {
    visualComponents?: string[];
    utilityExports?: string[];
  };
  componentDetectionRules?: Array<{
    exportName: string;
    visualRoles?: string[];
    visualHints?: string[];
    useWhen?: string;
  }>;
  patternMappings?: Record<string, string>;
  unconfirmedPatterns?: string[];
  mandatoryMappingRules?: Array<{
    whenDetected: string[];
    mustMapTo: string;
  }>;
  forbiddenFakeNames?: string[];
  wrongNameRepairs?: Record<string, string>;
  validatorRules?: Array<Record<string, unknown>>;
  automaticFailConditions?: string[];
}

export const VALID_EXPORTS_THAT_MUST_NOT_BE_FORBIDDEN = [
  "Button",
  "TextField",
  "Dropdown",
  "Avatar",
  "Typography",
];

const PRIMARY_FAKE_NAMES = [
  "KazeButton",
  "KazeInput",
  "KazeSelect",
  "KazeAvatar",
  "KazeTypography",
];

let cachedCatalog: KazeCatalog | null = null;

export function getKazeCatalog(): KazeCatalog {
  if (cachedCatalog) {
    return cachedCatalog;
  }

  const catalog = JSON.parse(fs.readFileSync(catalogJsonPath, "utf8")) as KazeCatalog;
  cachedCatalog = catalog;
  return catalog;
}

export function getConfirmedKazeExports(): string[] {
  return [...(getKazeCatalog().confirmedExports ?? [])];
}

export function getVisualKazeExports(): string[] {
  const catalog = getKazeCatalog();
  return [
    ...(catalog.exportGroups?.visualComponents ??
      catalog.confirmedExports.filter(
        (exportName) => !["notification", "useNotification"].includes(exportName),
      )),
  ];
}

export function getUtilityKazeExports(): string[] {
  return [...(getKazeCatalog().exportGroups?.utilityExports ?? [])];
}

export function getForbiddenFakeNames(): string[] {
  return [...(getKazeCatalog().forbiddenFakeNames ?? PRIMARY_FAKE_NAMES)];
}

export function getPrimaryForbiddenFakeNames(): string[] {
  return PRIMARY_FAKE_NAMES;
}

export function repairFakeKazeName(name: string): string | null {
  return getKazeCatalog().wrongNameRepairs?.[name] ?? null;
}

export function mapVisualRoleToKazeExport(role: string): string | null {
  const normalizedRole = normalizeRole(role);
  const catalog = getKazeCatalog();
  const direct = catalog.patternMappings?.[normalizedRole];

  if (direct && isConfirmedKazeExport(direct)) {
    return direct;
  }

  for (const rule of catalog.mandatoryMappingRules ?? []) {
    if (
      rule.whenDetected.some((term) =>
        normalizedRole.includes(normalizeRole(term)),
      ) &&
      isConfirmedKazeExport(rule.mustMapTo)
    ) {
      return rule.mustMapTo;
    }
  }

  for (const rule of catalog.componentDetectionRules ?? []) {
    const terms = [...(rule.visualRoles ?? []), ...(rule.visualHints ?? [])];
    if (
      terms.some((term) => normalizedRole.includes(normalizeRole(term))) &&
      isConfirmedKazeExport(rule.exportName)
    ) {
      return rule.exportName;
    }
  }

  return null;
}

export function getMandatoryMappingRules(): KazeCatalog["mandatoryMappingRules"] {
  return [...(getKazeCatalog().mandatoryMappingRules ?? [])];
}

export function getComponentGalleryExports(): {
  visualComponents: string[];
  utilityExports: string[];
} {
  return {
    visualComponents: getVisualKazeExports(),
    utilityExports: getUtilityKazeExports(),
  };
}

export function validateKazeMappingContent(
  files: Record<string, string | undefined>,
): string[] {
  const errors: string[] = [];

  Object.entries(files).forEach(([filename, content]) => {
    if (!content || !filename.endsWith(".md")) {
      return;
    }

    for (const pattern of getRealExportContradictionPatterns()) {
      if (pattern.test(content)) {
        errors.push(
          `${filename}: Real Kaze exports must not be described as fake, invalid, wrong, or forbidden.`,
        );
        break;
      }
    }

    const fakeImportError = validateFakeKazeImportsInContent(filename, content);
    if (fakeImportError) {
      errors.push(fakeImportError);
    }
  });

  return [...new Set(errors)];
}

export function getRealExportContradictionPatterns(): RegExp[] {
  const exportsPattern = VALID_EXPORTS_THAT_MUST_NOT_BE_FORBIDDEN.join("|");

  return [
    new RegExp(
      `Forbidden\\s+(?:Prefixed\\s+)?Names:\\s*.*\\\`?\\b(?:${exportsPattern})\\b\\\`?`,
      "i",
    ),
    new RegExp(
      `fake Kaze-prefixed components such as\\s+\\\`?\\b(?:${exportsPattern})\\b\\\`?`,
      "i",
    ),
    new RegExp(
      `Does not use fake Kaze-prefixed components such as\\s+\\\`?\\b(?:${exportsPattern})\\b\\\`?`,
      "i",
    ),
    new RegExp(`Does not import\\s+\\\`?\\b(?:${exportsPattern})\\b\\\`?`, "i"),
    new RegExp(
      `\\\`?\\b(?:${exportsPattern})\\b\\\`?\\s+(?:is|are)\\s+(?:fake|invalid|wrong|forbidden)`,
      "i",
    ),
    new RegExp(
      `(?:fake|invalid|wrong|forbidden)\\s+(?:Kaze\\s+)?(?:exports?|names?|components?)\\s*[:\\-][^\\n]*\\b(?:${exportsPattern})\\b`,
      "i",
    ),
    new RegExp(
      `(?:\\*\\*)?(?:Wrong|Incorrect):(?:\\*\\*)?\\s*\\\`?import\\s*{[^}]*\\b(?:${exportsPattern})\\b[^}]*}`,
      "i",
    ),
    new RegExp(
      `Invalid:\\s*Do not use fake prefixed names like\\s*\\\`?\\b(?:${exportsPattern})\\b\\\`?`,
      "i",
    ),
  ];
}

export function validateFakeKazeImportsInContent(
  filename: string,
  content: string,
): string | null {
  const fakeKazeImportPattern =
    /import\s*{\s*[^}]*\b(?:KazeButton|KazeInput|KazeSelect|KazeAvatar|KazeTypography)\b[^}]*}\s*from\s*["']@pcs-security\/kaze-ui-library["']/i;
  const wrongMarkerPattern =
    /WRONG|Incorrect|do not use|fake Kaze-prefixed|invalid|do not import/i;
  const fakeImportIndex = content.search(fakeKazeImportPattern);

  if (fakeImportIndex < 0) {
    return null;
  }

  const contextWindow = content.slice(
    Math.max(0, fakeImportIndex - 300),
    fakeImportIndex + 500,
  );

  if (wrongMarkerPattern.test(contextWindow)) {
    return null;
  }

  return `${filename}: Fake Kaze-prefixed import appears without being clearly marked as wrong.`;
}

export function isConfirmedKazeExport(name: string): boolean {
  return getConfirmedKazeExports().includes(name);
}

function normalizeRole(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
