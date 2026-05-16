import { EXPECTED_FILES, type GeneratedFiles } from "../types";

type ZipEntry = {
  filename: string;
  content: Uint8Array;
  isDirectory?: boolean;
};

const encoder = new TextEncoder();
const crcTable = createCrcTable();
const realExportContradictionPatterns = [
  /Forbidden\s+(?:Prefixed\s+)?Names:\s*.*`?\b(?:Button|TextField|Dropdown|Avatar|Typography)\b`?/i,
  /fake Kaze-prefixed components such as\s+`?\b(?:Button|TextField|Dropdown|Avatar|Typography)\b`?/i,
  /Does not use fake Kaze-prefixed components such as\s+`?\b(?:Button|TextField|Dropdown|Avatar|Typography)\b`?/i,
  /Does not import\s+`?\b(?:Button|TextField|Dropdown|Avatar|Typography)\b`?/i,
  /`?\b(?:Button|TextField|Dropdown|Avatar|Typography)\b`?\s+(?:is|are)\s+(?:fake|invalid|wrong|forbidden)/i,
  /(?:fake|invalid|wrong|forbidden)\s+(?:Kaze\s+)?(?:exports?|names?|components?)\s*[:\-][^\n]*\b(?:Button|TextField|Dropdown|Avatar|Typography)\b/i,
  /(?:\*\*)?(?:Wrong|Incorrect):(?:\*\*)?\s*`?import\s*{[^}]*\b(?:Button|TextField|Dropdown|Avatar|Typography)\b[^}]*}/i,
  /Invalid:\s*Do not use fake prefixed names like\s*`?\b(?:Button|TextField|Dropdown|Avatar|Typography)\b`?/i,
];
const fakeKazeImportPattern =
  /import\s*{\s*[^}]*\b(?:KazeButton|KazeInput|KazeSelect|KazeAvatar|KazeTypography)\b[^}]*}\s*from\s*["']@pcs-security\/kaze-ui-library["']/i;
const wrongMarkerPattern =
  /WRONG|Incorrect|do not use|fake Kaze-prefixed|invalid|do not import/i;

export async function downloadClineReadyZip(params: {
  files: GeneratedFiles;
  screenshots: File[];
  projectName: string;
  zipFilename: string;
}): Promise<void> {
  const archiveRoot = toArchiveRootName(params.projectName);
  validateClineReadyFileContent(params.files);
  const markdownEntries = EXPECTED_FILES
    .map((filename) => ({
      filename: `${archiveRoot}/${filename}`,
      content: params.files[filename] ?? "",
    }))
    .filter((entry) => entry.content.trim().length > 0)
    .map((entry) => textEntry(entry.filename, entry.content));
  const screenshotEntries = await Promise.all(
    params.screenshots.map(async (screenshot) => ({
      filename: `${archiveRoot}/screenshots/${sanitizeZipPathSegment(screenshot.name)}`,
      content: new Uint8Array(await screenshot.arrayBuffer()),
    })),
  );
  const entries: ZipEntry[] = [
    directoryEntry(`${archiveRoot}/`),
    directoryEntry(`${archiveRoot}/screenshots/`),
    textEntry(
      `${archiveRoot}/README_FOR_CLINE.md`,
      buildReadmeForCline(params.projectName, params.screenshots),
    ),
    textEntry(
      `${archiveRoot}/validate-pack.mjs`,
      buildValidatePackScript(params.screenshots),
    ),
    textEntry(
      `${archiveRoot}/cline-readiness-standard.md`,
      buildClineReadinessStandard(),
    ),
    ...markdownEntries,
    ...screenshotEntries,
  ];

  validateClineReadyZipEntries(entries, archiveRoot);

  const zipBytes = createZip(entries);
  const zipBuffer = zipBytes.buffer.slice(
    zipBytes.byteOffset,
    zipBytes.byteOffset + zipBytes.byteLength
  ) as ArrayBuffer;
  const blob = new Blob([zipBuffer], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = params.zipFilename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function textEntry(filename: string, content: string): ZipEntry {
  return {
    filename,
    content: encoder.encode(content),
  };
}

function directoryEntry(filename: string): ZipEntry {
  return {
    filename,
    content: new Uint8Array(0),
    isDirectory: true,
  };
}

function validateClineReadyFileContent(files: GeneratedFiles): void {
  const errors: string[] = [];

  EXPECTED_FILES.forEach((filename) => {
    const content = files[filename] ?? "";

    if (!content.trim()) {
      return;
    }

    if (realExportContradictionPatterns.some((pattern) => pattern.test(content))) {
      errors.push(
        `${filename}: Real Kaze exports must not be described as fake, invalid, wrong, or forbidden.`,
      );
    }

    const fakeImportIndex = content.search(fakeKazeImportPattern);
    if (fakeImportIndex >= 0) {
      const contextWindow = content.slice(
        Math.max(0, fakeImportIndex - 300),
        fakeImportIndex + 500,
      );

      if (!wrongMarkerPattern.test(contextWindow)) {
        errors.push(
          `${filename}: Fake Kaze-prefixed import appears without being clearly marked as wrong.`,
        );
      }
    }
  });

  if (errors.length > 0) {
    throw new Error(["Pack validation failed:", ...errors.map((error) => `- ${error}`)].join(" "));
  }
}

function buildReadmeForCline(projectName: string, screenshots: File[]): string {
  const title = projectName.trim() || "Kaze Screen Pack";
  const screenshotLines =
    screenshots.length > 0
      ? screenshots.map(
          (screenshot) =>
            `- screenshots/${sanitizeZipPathSegment(screenshot.name)}`,
        )
      : ["- No screenshots were included in this ZIP."];

  return [
    "# README FOR CLINE",
    "",
    `Project: ${title}`,
    "",
    "## Start Here",
    "1. Read README_FOR_CLINE.md.",
    "2. Read pack-manifest.md for pack contents, screen/state references, and screenshot paths.",
    "3. Read handoff.md for layout, visible actions, states, and unknowns.",
    "4. Read kaze-component-mapping.md for Kaze export guidance.",
    "5. Read cline-implementation-prompt.md before writing code.",
    "6. Use qa-checklist.md for validation before handoff.",
    "",
    "## Screenshots",
    ...screenshotLines,
    "",
    "## Validation Before Use",
    "Before giving this pack to Cline, run:",
    "",
    "```bash",
    "node validate-pack.mjs",
    "```",
    "",
    "The pack is not considered Cline-ready unless validation passes.",
    "",
    "Do not proceed if:",
    "- screenshot files are missing",
    "- manifest does not reference each screenshot",
    "- Kaze mapping contains contradictory import rules",
    "- fake Kaze-prefixed components are treated as valid",
    "- placement rule is missing",
    "- screenshot usage rule is missing",
    "- anti-hallucination rules are missing",
    "",
    "## Kaze Rules",
    "- Verify real exports from @pcs-security/kaze-ui-library before importing.",
    "- Prefer real unprefixed exports such as Button, TextField, Dropdown, Avatar, and Typography when confirmed.",
    "- Do not use fake Kaze-prefixed exports such as KazeButton, KazeInput, KazeSelect, KazeAvatar, or KazeTypography.",
    "- If a suggested Kaze export does not work, use the closest approved Kaze/project pattern and report it.",
    "",
    "## Guardrails",
    "- Inspect the target project before writing code.",
    "- Use screenshots as visual references only.",
    "- Do not infer backend APIs, routes, authentication logic, data persistence, or business workflows from screenshots.",
    "- Do not invent routes, APIs, dropdown values, permission rules, state architecture, design tokens, global styles, dependencies, or Kaze exports.",
    "- Mark unconfirmed behaviour as TODO.",
  ].join("\n");
}

function buildValidatePackScript(screenshots: File[]): string {
  const screenshotPaths = screenshots.map(
    (screenshot) => `screenshots/${sanitizeZipPathSegment(screenshot.name)}`,
  );
  const requiredFiles = [
    "README_FOR_CLINE.md",
    "pack-manifest.md",
    "handoff.md",
    "kaze-component-mapping.md",
    "cline-implementation-prompt.md",
    "qa-checklist.md",
    "validate-pack.mjs",
    "cline-readiness-standard.md",
    ...screenshotPaths,
  ];
  const manifestScreenshotChecks = screenshotPaths.map((screenshotPath) => ({
    file: "pack-manifest.md",
    text: screenshotPath,
    message: `Manifest must reference ${screenshotPath}.`,
  }));

  return `import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = ${JSON.stringify(requiredFiles, null, 2)};
const markdownFiles = requiredFiles.filter((file) => file.endsWith(".md"));
const contradictionPatterns = [
  /Forbidden\\s+(?:Prefixed\\s+)?Names:\\s*.*\`?\\b(?:Button|TextField|Dropdown|Avatar|Typography)\\b\`?/i,
  /fake Kaze-prefixed components such as\\s+\`?\\b(?:Button|TextField|Dropdown|Avatar|Typography)\\b\`?/i,
  /Does not use fake Kaze-prefixed components such as\\s+\`?\\b(?:Button|TextField|Dropdown|Avatar|Typography)\\b\`?/i,
  /Does not import\\s+\`?\\b(?:Button|TextField|Dropdown|Avatar|Typography)\\b\`?/i,
  /\`?\\b(?:Button|TextField|Dropdown|Avatar|Typography)\\b\`?\\s+(?:is|are)\\s+(?:fake|invalid|wrong|forbidden)/i,
  /(?:fake|invalid|wrong|forbidden)\\s+(?:Kaze\\s+)?(?:exports?|names?|components?)\\s*[:\\-][^\\n]*\\b(?:Button|TextField|Dropdown|Avatar|Typography)\\b/i,
  /(?:\\*\\*)?(?:Wrong|Incorrect):(?:\\*\\*)?\\s*\`?import\\s*{[^}]*\\b(?:Button|TextField|Dropdown|Avatar|Typography)\\b[^}]*}/i,
  /Invalid:\\s*Do not use fake prefixed names like\\s*\`?\\b(?:Button|TextField|Dropdown|Avatar|Typography)\\b\`?/i,
];
const fakeKazeImportPattern =
  /import\\s*{\\s*[^}]*\\b(?:KazeButton|KazeInput|KazeSelect|KazeAvatar|KazeTypography)\\b[^}]*}\\s*from\\s*["']@pcs-security\\/kaze-ui-library["']/i;
const wrongMarkerPattern =
  /WRONG|Incorrect|do not use|fake Kaze-prefixed|invalid|do not import/i;
const galleryLeakPatterns = [
  /Enterprise AI Assistant/i,
  /Project\\s*\\/\\s*feature screen/i,
  /Screen type/i,
  /Additional notes/i,
  /Fast Mode/i,
  /On-prem/i,
  /Screen Pack Generator/i,
];
const iconInternalRows = [
  /Arrow Down \\(Dropdown\\)/i,
  /Checkmark \\(Checkbox\\)/i,
  /Radio Circle \\(Radio\\)/i,
  /Toggle Knob/i,
  /Navigation Arrows/i,
];
const badUnknownExportPattern =
  /confirmed\\s+[\\x60]?Unknown \\/ verify from Kaze[\\x60]?\\s+export|no confirmed\\s+[\\x60]?Unknown \\/ verify from Kaze[\\x60]?\\s+export/i;
const weakCoveragePattern =
  /Visual Kaze exports visible or expected[\\s\\S]*-\\s*[\\x60]?Pills[\\x60]?/i;

const forbiddenPatterns = [
  {
    file: "kaze-component-mapping.md",
    pattern: /Invalid:\\s*Do not use fake prefixed names like\\s*\`?Button\`?,\\s*\`?TextField\`?,\\s*\`?Avatar\`?/i,
    message: "Button/TextField/Avatar must not be described as fake invalid names.",
  },
  {
    file: "kaze-component-mapping.md",
    pattern: /(Forbidden Names|Forbidden Exports|Invalid)[^\\n]*(Do\\s+NOT\\s+use|Do\\s+not\\s+use|Never\\s+use)[^\\n]*\`?Button\`?[^\\n]*\`?TextField\`?[^\\n]*(\`?Dropdown\`?|\`?Avatar\`?|\`?Typography\`?)/i,
    message: "Real Kaze exports such as Button, TextField, Dropdown, Avatar, and Typography must not be listed as forbidden.",
  },
  {
    file: "kaze-component-mapping.md",
    pattern: /import\\s*{\\s*KazeButton/i,
    message: "Fake Kaze-prefixed import must not appear unless clearly marked as WRONG.",
    allowIfAlsoMatches: /WRONG|Incorrect|do not use fake/i,
  },
];

const requiredTextChecks = [
  ...${JSON.stringify(manifestScreenshotChecks, null, 2)},
  {
    file: "pack-manifest.md",
    text: "README_FOR_CLINE.md",
    message: "Manifest must reference README_FOR_CLINE.md.",
  },
  {
    file: "pack-manifest.md",
    text: "validate-pack.mjs",
    message: "Manifest must reference validate-pack.mjs.",
  },
  {
    file: "pack-manifest.md",
    text: "cline-readiness-standard.md",
    message: "Manifest must reference cline-readiness-standard.md.",
  },
  {
    file: "cline-implementation-prompt.md",
    text: "Placement Rule",
    message: "Implementation prompt must include Placement Rule.",
  },
  {
    file: "cline-implementation-prompt.md",
    text: "Screenshot Usage Rule",
    message: "Implementation prompt must include Screenshot Usage Rule.",
  },
  {
    file: "cline-implementation-prompt.md",
    text: "Anti-Hallucination Rules",
    message: "Implementation prompt must include Anti-Hallucination Rules.",
  },
  {
    file: "cline-implementation-prompt.md",
    text: "Kaze Setup Rule",
    message: "Implementation prompt must include Kaze Setup Rule.",
  },
  {
    file: "kaze-component-mapping.md",
    text: "Import Rule",
    message: "Mapping must include Import Rule.",
  },
  {
    file: "kaze-component-mapping.md",
    text: "KazeButton",
    message: "Mapping must explicitly warn against fake Kaze-prefixed names.",
  },
  {
    file: "qa-checklist.md",
    text: "Kaze Usage",
    message: "QA checklist must include Kaze Usage section.",
  },
  {
    file: "qa-checklist.md",
    text: "Visual",
    message: "QA checklist must include Visual section.",
  },
  {
    file: "qa-checklist.md",
    text: "Implementation Safety",
    message: "QA checklist must include Implementation Safety section.",
  },
];

const errors = [];

for (const file of requiredFiles) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    errors.push(\`Missing required file: \${file}\`);
  }
}

for (const check of requiredTextChecks) {
  const fullPath = path.join(root, check.file);
  if (!fs.existsSync(fullPath)) continue;

  const content = fs.readFileSync(fullPath, "utf8");
  if (!content.includes(check.text)) {
    errors.push(check.message);
  }
}

for (const check of forbiddenPatterns) {
  const fullPath = path.join(root, check.file);
  if (!fs.existsSync(fullPath)) continue;

  const content = fs.readFileSync(fullPath, "utf8");
  const hasForbidden = check.pattern.test(content);
  const allowed =
    check.allowIfAlsoMatches && check.allowIfAlsoMatches.test(content);

  if (hasForbidden && !allowed) {
    errors.push(check.message);
  }
}

for (const markdownFile of markdownFiles) {
  const fullPath = path.join(root, markdownFile);
  if (!fs.existsSync(fullPath)) continue;

  const content = fs.readFileSync(fullPath, "utf8");

  for (const pattern of contradictionPatterns) {
    if (pattern.test(content)) {
      errors.push(
        \`\${markdownFile}: Real Kaze exports must not be described as fake, invalid, wrong, or forbidden.\`
      );
      break;
    }
  }

  const fakeImportIndex = content.search(fakeKazeImportPattern);
  if (fakeImportIndex >= 0) {
    const contextWindow = content.slice(
      Math.max(0, fakeImportIndex - 300),
      fakeImportIndex + 500
    );

    if (!wrongMarkerPattern.test(contextWindow)) {
      errors.push(
        \`\${markdownFile}: Fake Kaze-prefixed import appears without being clearly marked as wrong.\`
      );
    }
  }
}

const manifestContent = fs.existsSync(path.join(root, "pack-manifest.md"))
  ? fs.readFileSync(path.join(root, "pack-manifest.md"), "utf8")
  : "";
const mappingContent = fs.existsSync(path.join(root, "kaze-component-mapping.md"))
  ? fs.readFileSync(path.join(root, "kaze-component-mapping.md"), "utf8")
  : "";
const isComponentGalleryPack =
  /Kaze Component Gallery|Kaze UI Components Gallery|UI Components Gallery|KazeComponentGallery/i.test(
    \`\${manifestContent}\\n\${mappingContent}\`
  );

if (isComponentGalleryPack && mappingContent) {
  for (const pattern of galleryLeakPatterns) {
    if (pattern.test(mappingContent)) {
      errors.push(
        "kaze-component-mapping.md contains component gallery template leakage."
      );
      break;
    }
  }

  for (const pattern of iconInternalRows) {
    if (pattern.test(mappingContent)) {
      errors.push(
        "kaze-component-mapping.md maps icon internals as component rows."
      );
      break;
    }
  }

  if (badUnknownExportPattern.test(mappingContent)) {
    errors.push(
      "kaze-component-mapping.md treats Unknown / verify from Kaze as an export instead of a fallback label."
    );
  }

  if (weakCoveragePattern.test(mappingContent)) {
    errors.push(
      "kaze-component-mapping.md contains weak component gallery coverage instead of the deterministic coverage section."
    );
  }
}

if (errors.length > 0) {
  console.error("Pack validation failed:");
  for (const error of errors) {
    console.error(\`- \${error}\`);
  }
  process.exit(1);
}

console.log("Pack validation passed. This pack is Cline-ready.");
`;
}

export function buildClineReadinessStandard(): string {
  return [
    "# Cline Readiness Standard",
    "",
    "A pack is 10/10 only if:",
    "",
    "## Required",
    "- Screenshot files exist.",
    "- Manifest references every screenshot.",
    "- Handoff explains the target screen.",
    "- Cline prompt gives implementation sequence.",
    "- Kaze mapping lists real allowed components.",
    "- Fake Kaze-prefixed components are clearly forbidden.",
    "- Placement rule exists.",
    "- Screenshot usage rule exists.",
    "- Anti-hallucination rules exist.",
    "- QA checklist covers visual, Kaze usage, implementation safety, and validation.",
    "- Validation script passes.",
    "",
    "## Automatic Fail",
    "- The pack references a screenshot that does not exist.",
    "- The pack contains contradictory Kaze component rules.",
    "- The pack incorrectly forbids valid unprefixed exports such as `Button`, `TextField`, `Dropdown`, `Avatar`, or `Typography`.",
    "- The pack treats KazeButton, KazeInput, KazeSelect, KazeAvatar, or KazeTypography as valid exports.",
    "- The pack tells the agent to invent routes.",
    "- The pack tells the agent to invent APIs.",
    "- The pack requires unknown design tokens.",
    "- The pack requires unknown Kaze components.",
  ].join("\n");
}

function validateClineReadyZipEntries(
  entries: ZipEntry[],
  archiveRoot: string,
): void {
  const entryNames = new Set(entries.map((entry) => entry.filename));
  const missing: string[] = [];

  if (!entryNames.has(`${archiveRoot}/`)) {
    missing.push(`ZIP does not include ${archiveRoot}/.`);
  }

  if (!entryNames.has(`${archiveRoot}/screenshots/`)) {
    missing.push("ZIP does not include screenshots/.");
  }

  if (!entryNames.has(`${archiveRoot}/README_FOR_CLINE.md`)) {
    missing.push("ZIP does not include README_FOR_CLINE.md.");
  }

  if (!entryNames.has(`${archiveRoot}/validate-pack.mjs`)) {
    missing.push("ZIP does not include validate-pack.mjs.");
  }

  if (!entryNames.has(`${archiveRoot}/cline-readiness-standard.md`)) {
    missing.push("ZIP does not include cline-readiness-standard.md.");
  }

  EXPECTED_FILES.forEach((filename) => {
    if (!entryNames.has(`${archiveRoot}/${filename}`)) {
      missing.push(`ZIP does not include ${filename}.`);
    }
  });

  const screenshotCount = entries.filter(
    (entry) =>
      !entry.isDirectory &&
      entry.filename.startsWith(`${archiveRoot}/screenshots/`),
  ).length;

  if (screenshotCount === 0) {
    missing.push("ZIP does not include any files inside screenshots/.");
  }

  if (missing.length > 0) {
    throw new Error(missing.join(" "));
  }
}

function toArchiveRootName(projectName: string): string {
  const words = projectName.match(/[A-Za-z0-9]+/g) ?? [];
  const rootName = words
    .map((word) => {
      if (/^[A-Z0-9]+$/.test(word)) {
        return word;
      }

      return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    })
    .join("");

  return rootName || "KazeScreenPack";
}

function sanitizeZipPathSegment(value: string): string {
  return value.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_").trim() || "file";
}

function createZip(entries: ZipEntry[]): Uint8Array {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  entries.forEach((entry) => {
    const filenameBytes = encoder.encode(entry.filename);
    const contentBytes = entry.content;
    const crc = crc32(contentBytes);

    const localHeader = concatBytes(
      u32(0x04034b50),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(contentBytes.length),
      u32(contentBytes.length),
      u16(filenameBytes.length),
      u16(0),
      filenameBytes
    );

    const centralHeader = concatBytes(
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(contentBytes.length),
      u32(contentBytes.length),
      u16(filenameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(entry.isDirectory ? 0x10 : 0),
      u32(offset),
      filenameBytes
    );

    localParts.push(localHeader, contentBytes);
    centralParts.push(centralHeader);
    offset += localHeader.length + contentBytes.length;
  });

  const centralDirectory = concatBytes(...centralParts);
  const endRecord = concatBytes(
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralDirectory.length),
    u32(offset),
    u16(0)
  );

  return concatBytes(...localParts, centralDirectory, endRecord);
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let cursor = 0;

  chunks.forEach((chunk) => {
    output.set(chunk, cursor);
    cursor += chunk.length;
  });

  return output;
}

function u16(value: number): Uint8Array {
  const bytes = new Uint8Array(2);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, value, true);
  return bytes;
}

function u32(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, value >>> 0, true);
  return bytes;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;

  bytes.forEach((byte) => {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  });

  return (crc ^ 0xffffffff) >>> 0;
}

function createCrcTable(): Uint32Array {
  const table = new Uint32Array(256);

  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }

  return table;
}
