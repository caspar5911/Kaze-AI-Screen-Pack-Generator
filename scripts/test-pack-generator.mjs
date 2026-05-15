import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildLocalClineImplementationPrompt,
  buildLocalPackManifestMarkdown,
  buildLocalQaChecklist,
} from "../server/src/services/promptBuilder.ts";
import { buildClineReadinessStandard } from "../client/src/utils/downloadZip.ts";
import { validateKazeMappingContent } from "../server/src/services/kazeCatalog.ts";
import {
  parseAllGeneratedFiles,
  parseHandoffMappingResponse,
  parseManifestResponse,
} from "../server/src/services/responseParser.ts";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "..");
const fixturePath = path.join(
  repoRoot,
  "fixtures",
  "screens",
  "KazeComponentGallery_Default_Desktop.png",
);

assert.ok(fs.existsSync(fixturePath), "component gallery fixture must exist");

const fields = {
  projectName: "Kaze UI Components Gallery",
  shortDescription:
    "Reference screen showing categorized Kaze UI components, utility exports, and visual usage patterns.",
  designSource: "Screenshot export",
  iconSystem: "Project icon pattern or SVG fallback",
  additionalNotes: "",
};
const fileMapEntries = [
  {
    index: 1,
    filename: "KazeComponentGallery_Default_Desktop.png",
    attachmentLabel: "attached image 1",
    path: fixturePath,
    mimetype: "image/png",
    parsed: {
      filename: "KazeComponentGallery_Default_Desktop.png",
      screenName: "KazeComponentGallery",
      state: "Default",
      viewport: "Desktop",
      isValid: true,
      warnings: [],
    },
  },
];

const baseFiles = {
  "pack-manifest.md": buildLocalPackManifestMarkdown(fields, fileMapEntries),
  "handoff.md": [
    "# Handoff",
    "",
    "## Overview",
    "- Reference gallery for reviewing Kaze UI component examples.",
    "",
    "## Screenshots",
    "- `screenshots/KazeComponentGallery_Default_Desktop.png`",
    "",
    "## Unknowns",
    "- Exact interactive behaviour for each sample component is not confirmed.",
  ].join("\n"),
  "kaze-component-mapping.md": [
    "# Kaze Component Mapping",
    "",
    "## Source Files",
    "- `screenshots/KazeComponentGallery_Default_Desktop.png`",
    "",
    "| UI Element | Intended Kaze Pattern | Exact Kaze Export | Confidence | Notes |",
    "|---|---|---|---|---|",
    "| Gallery button examples | Clickable action | Button | High | Use for primary, secondary, icon, and quick actions. |",
    "| Gallery text input examples | Text input | TextField | High | Use for single-line text input. |",
    "| Gallery profile examples | Profile image | Avatar | High | Use for circular user/profile image. |",
  ].join("\n"),
  "cline-implementation-prompt.md": buildLocalClineImplementationPrompt({
    fields,
    fileMapEntries,
  }),
  "qa-checklist.md": buildLocalQaChecklist(),
};

const testCatalog = JSON.stringify({
  confirmedExports: [],
});
const testParsedFilenames = [
  {
    filename: "KazeComponentGallery_Default_Desktop.png",
    screenName: "KazeComponentGallery",
    state: "Default",
    viewport: "Desktop",
  },
];
const testAllowedFilenames = ["KazeComponentGallery_Default_Desktop.png"];

function parseGeneratedFilesForTest(fileOverrides = {}) {
  const files = {
    ...baseFiles,
    ...fileOverrides,
  };

  return parseAllGeneratedFiles({
    files,
    rawResponse: Object.entries(files)
      .map(([name, content]) => `--- File: ${name} ---\n${content}`)
      .join("\n\n"),
    allowedFilenames: testAllowedFilenames,
    kazeComponentCatalog: testCatalog,
    parsedFilenames: testParsedFilenames,
  });
}

const manifestStageResult = parseManifestResponse({
  responseText: [
    "--- File: pack-manifest.md ---",
    baseFiles["pack-manifest.md"],
  ].join("\n"),
  allowedFilenames: testAllowedFilenames,
  kazeComponentCatalog: testCatalog,
  parsedFilenames: testParsedFilenames,
});
assert.doesNotMatch(
  manifestStageResult.warnings.join("\n"),
  /kaze-component-mapping\.md is missing clear import/i,
  "manifest-only validation must not report mapping guidance warnings",
);

const result = parseGeneratedFilesForTest();

const balancedDetailsResult = parseGeneratedFilesForTest({
  "handoff.md": [
    baseFiles["handoff.md"],
    "",
    "<details>",
    "private model reasoning",
    "</details>",
  ].join("\n"),
});
assert.doesNotMatch(
  Object.values(balancedDetailsResult.files).join("\n\n"),
  /<details/i,
  "balanced details blocks must be stripped from final files",
);
assert.equal(
  balancedDetailsResult.quality.status,
  "ready",
  balancedDetailsResult.quality.issues.join("\n"),
);

const unclosedDetailsResult = parseGeneratedFilesForTest({
  "handoff.md": [
    baseFiles["handoff.md"],
    "",
    "<details>",
    "private model reasoning",
  ].join("\n"),
});
assert.doesNotMatch(
  Object.values(unclosedDetailsResult.files).join("\n\n"),
  /<details/i,
  "unclosed details blocks at the end of a file must be stripped",
);
assert.equal(
  unclosedDetailsResult.quality.status,
  "ready",
  unclosedDetailsResult.quality.issues.join("\n"),
);

const stageResponseWithUnclosedDetails = parseHandoffMappingResponse({
  responseText: [
    "<details>",
    "private model reasoning before file markers",
    "--- File: handoff.md ---",
    baseFiles["handoff.md"],
    "",
    "--- File: kaze-component-mapping.md ---",
    baseFiles["kaze-component-mapping.md"],
  ].join("\n"),
  allowedFilenames: testAllowedFilenames,
  kazeComponentCatalog: testCatalog,
  parsedFilenames: testParsedFilenames,
});
assert.doesNotMatch(
  Object.values(stageResponseWithUnclosedDetails.files).join("\n\n"),
  /<details/i,
  "unclosed details before file markers must not leak into parsed stage files",
);

const stageResponseWithDetailsClosedAfterFiles = parseHandoffMappingResponse({
  responseText: [
    "<details>",
    "private model reasoning before file markers",
    "--- File: handoff.md ---",
    baseFiles["handoff.md"],
    "",
    "--- File: kaze-component-mapping.md ---",
    baseFiles["kaze-component-mapping.md"],
    "</details>",
  ].join("\n"),
  allowedFilenames: testAllowedFilenames,
  kazeComponentCatalog: testCatalog,
  parsedFilenames: testParsedFilenames,
});
assert.match(
  stageResponseWithDetailsClosedAfterFiles.files["handoff.md"] ?? "",
  /# Handoff/,
  "reasoning stripping must preserve file markers after an opened details block",
);
assert.doesNotMatch(
  Object.values(stageResponseWithDetailsClosedAfterFiles.files).join("\n\n"),
  /<\/?details/i,
  "details tags closed after file markers must still be stripped",
);

const malformedDetailsResult = parseGeneratedFilesForTest({
  "handoff.md": [
    baseFiles["handoff.md"],
    "",
    "Malformed reasoning marker <details should remain blocked.",
  ].join("\n"),
});
assert.equal(
  malformedDetailsResult.quality.status,
  "failed",
  "final validation must still fail if a risky details token remains",
);
assert.match(malformedDetailsResult.quality.issues.join("\n"), /<details/i);

const aiAuthoredBadMapping = [
  "# Kaze Component Mapping",
  "",
  "## Source Files",
  "- `README_FOR_CLINE.md`, `pack-manifest.md`, `handoff.md`, `kaze-component-mapping.md`.",
  "",
  "## Import Rule",
  "- **Correct:** `import { Button, TextField, Dropdown, Avatar, Typography } from '@pcs-security/kaze-ui-library';`",
  "- **Wrong:** `import { Button, TextField, Dropdown, Avatar, Typography } from '...'; // WRONG`",
  "",
  "## Confirmed Kaze Exports Used",
  "- **Core:** `Button`, `TextField`, `Dropdown`, `Avatar`, `Typography`.",
  "",
  "## Forbidden Fake Names",
  "- `KazeButton`, `KazeInput`, `KazeSelect`, `KazeAvatar`, `KazeTypography`.",
  "",
  "## Fallback Rule",
  '- When a Kaze export is "Unknown / verify from Kaze", use standard HTML fallback.',
  "",
  "| UI Element | Intended Kaze Pattern | Exact Kaze Export | Confidence | Notes |",
  "|---|---|---|---|---|",
  "| Generate / Preview Buttons | Clickable action / Primary button | Button | High | Real unprefixed export. |",
  "| Columns selected | Dropdown | Dropdown | High | Table configuration control. |",
  "| Sidebar Nav | Unknown / verify from Kaze | Unknown / verify from Kaze | Low | Verify project pattern. |",
].join("\n");
const repairedBadMappingResult = parseGeneratedFilesForTest({
  "kaze-component-mapping.md": aiAuthoredBadMapping,
});
const repairedBadMapping =
  repairedBadMappingResult.files["kaze-component-mapping.md"] ?? "";
assert.equal(
  repairedBadMappingResult.quality.status,
  "ready",
  repairedBadMappingResult.quality.issues.join("\n"),
);
assert.doesNotMatch(
  repairedBadMapping,
  /\*\*Wrong:\*\*[^`\n]*`import\s*{\s*Button/i,
  "AI-authored wrong import using real exports must be removed",
);
assert.doesNotMatch(
  repairedBadMapping,
  /Primary fake aliases[^.\n]*`Button`/i,
  "primary fake aliases must never list real unprefixed exports",
);
assert.match(
  repairedBadMapping,
  /Primary fake aliases[^.\n]*`KazeButton`[^.\n]*`KazeInput`/i,
);
assert.match(
  repairedBadMapping,
  /## Source Files\s+- `screenshots\/KazeComponentGallery_Default_Desktop\.png`/i,
);
assert.doesNotMatch(
  repairedBadMapping,
  /Unknown \/ verify from Kaze \/ verify from Kaze/i,
);
assert.match(
  repairedBadMapping,
  /\| Columns selected \| Checkbox dropdown \/ column picker \| CheckboxDropdown \| High \| Multi-select dropdown for table column selection\. \|/,
);
assert.match(
  repairedBadMapping,
  /\| Enterprise Grid Preview \| Enterprise data grid \| AgGridTable \| High \| Complex enterprise table\/grid pattern\. \|/,
);
assert.match(
  repairedBadMapping,
  /\| Status Lozenge \| Compact status label \| Lozenge \| High \| Status\/state label pattern\. \|/,
);
assert.match(
  repairedBadMapping,
  /\| Standard Mode Options \| Radio group \| RadioGroup \| High \| Grouped single-choice options\. \|/,
);

const countNormalizedResult = parseGeneratedFilesForTest({
  "handoff.md": [
    "# Handoff",
    "",
    "## Overview",
    "- Gallery showing 36 component exports + hooks/utilities.",
    "",
    "## Screenshots",
    "- `screenshots/KazeComponentGallery_Default_Desktop.png`",
    "",
    "## Unknowns",
    "- Exact interactive behaviour for each sample component is not confirmed.",
  ].join("\n"),
});
assert.match(
  countNormalizedResult.files["handoff.md"] ?? "",
  /35 visual components \+ 2 utility exports/,
);
assert.doesNotMatch(
  countNormalizedResult.files["handoff.md"] ?? "",
  /36 component exports \+ hooks\/utilities/i,
);

const manifest = result.files["pack-manifest.md"] ?? "";
const mapping = result.files["kaze-component-mapping.md"] ?? "";
const checklist = result.files["qa-checklist.md"] ?? "";
const clinePrompt = result.files["cline-implementation-prompt.md"] ?? "";
const handoff = result.files["handoff.md"] ?? "";
const allContent = Object.values(result.files).join("\n\n");

assert.equal(result.quality.status, "ready", result.quality.issues.join("\n"));
assert.match(manifest, /Kaze Component Gallery/);
assert.match(
  manifest,
  /screenshots\/KazeComponentGallery_Default_Desktop\.png/,
);
assert.match(mapping, /`?Button`?/);
assert.match(mapping, /`?TextField`?/);
assert.match(mapping, /`?Avatar`?/);
assert.match(checklist, /`KazeButton`/);
assert.doesNotMatch(
  checklist,
  /fake Kaze-prefixed components such as `Button`/i,
);
assert.doesNotMatch(allContent, /AIAssistantHomeScreen/);
assert.doesNotMatch(allContent, /white circular action button/i);
assert.doesNotMatch(handoff, /voice input/i);
assert.match(clinePrompt, /src\/pages\/UIComponentsGallery\//);

const contradictionErrors = validateKazeMappingContent({
  "kaze-component-mapping.md":
    "- **Forbidden Prefixed Names:** `Button`, `TextField`, `Dropdown`, `Avatar`, `Typography`",
});
assert.ok(
  contradictionErrors.length > 0,
  "validator must fail when real exports are listed as fake/forbidden",
);

const qaContradictionErrors = validateKazeMappingContent({
  "qa-checklist.md": "- [ ] Does not import `Button`.",
});
assert.ok(
  qaContradictionErrors.length > 0,
  "validator must fail when QA says not to import Button",
);

const wrongRealImportErrors = validateKazeMappingContent({
  "kaze-component-mapping.md":
    "**Wrong:** `import { Button, TextField, Dropdown, Avatar, Typography } from '@pcs-security/kaze-ui-library';`",
});
assert.ok(
  wrongRealImportErrors.length > 0,
  "validator must fail when a wrong import example uses real exports",
);

const validRepairGuidanceErrors = validateKazeMappingContent({
  "kaze-component-mapping.md":
    "KazeButton is wrong; use Button. KazeInput is invalid; replace with TextField. KazeSelect -> Dropdown.",
});
assert.deepEqual(
  validRepairGuidanceErrors,
  [],
  "validator must allow fake-name repair guidance that recommends real exports",
);

const readinessStandardErrors = validateKazeMappingContent({
  "cline-readiness-standard.md": buildClineReadinessStandard(),
});
assert.deepEqual(
  readinessStandardErrors,
  [],
  "generated cline-readiness-standard.md must pass real-export contradiction validation",
);

const fakeImportErrors = validateKazeMappingContent({
  "kaze-component-mapping.md":
    'import { KazeButton, KazeInput } from "@pcs-security/kaze-ui-library";',
});
assert.ok(
  fakeImportErrors.length > 0,
  "validator must fail when fake imports are not marked wrong",
);

const allowedWrongExampleErrors = validateKazeMappingContent({
  "kaze-component-mapping.md": [
    "Incorrect:",
    "```ts",
    "// WRONG - fake Kaze-prefixed exports do not exist",
    'import { KazeButton, KazeInput, KazeSelect, KazeAvatar, KazeTypography } from "@pcs-security/kaze-ui-library";',
    "```",
  ].join("\n"),
});
assert.deepEqual(
  allowedWrongExampleErrors,
  [],
  "validator must pass when fake names are only shown as wrong examples",
);

console.log("Pack generator regression tests passed.");
