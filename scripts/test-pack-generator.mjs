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
  "qa-checklist.md": buildLocalQaChecklist({
    fields,
    fileMapEntries,
  }),
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

const localCatalogManifest = buildLocalPackManifestMarkdown(
  fields,
  fileMapEntries,
  {
    packageName: "@pcs-security/kaze-ui-library",
    kazeVersion: "3.1.8",
    catalogVersion: "2026-05-15",
    schemaVersion: "1.0.0",
    source: "local",
    sourceDetail:
      "C:\\Users\\Caspar\\Desktop\\Kaze-AI-Screen-Pack-Generator\\config\\kaze-component-catalog.local.json",
  },
);
assert.match(
  localCatalogManifest,
  /- Catalog source detail: local bundled fallback catalog/,
  "local catalog source detail must not expose absolute paths",
);
assert.doesNotMatch(
  localCatalogManifest,
  /C:\\Users\\/,
  "local manifest catalog metadata must not expose Windows user paths",
);
const cacheCatalogManifest = buildLocalPackManifestMarkdown(
  fields,
  fileMapEntries,
  {
    packageName: "@pcs-security/kaze-ui-library",
    kazeVersion: "3.1.8",
    catalogVersion: "2026-05-15",
    schemaVersion: "1.0.0",
    source: "cache",
    sourceDetail:
      "C:\\Users\\Caspar\\Desktop\\Kaze-AI-Screen-Pack-Generator\\server\\tmp\\catalog-cache.json",
  },
);
assert.match(
  cacheCatalogManifest,
  /- Catalog source detail: cached catalog/,
  "cached catalog source detail must not expose cache file paths",
);
const remoteCatalogManifest = buildLocalPackManifestMarkdown(
  fields,
  fileMapEntries,
  {
    packageName: "@pcs-security/kaze-ui-library",
    kazeVersion: "3.1.8",
    catalogVersion: "2026-05-15",
    schemaVersion: "1.0.0",
    source: "remote",
    sourceDetail: "https://catalog.internal.example/kaze",
  },
);
assert.match(
  remoteCatalogManifest,
  /- Catalog source detail: internal approved catalog endpoint/,
  "remote catalog source detail must use approved endpoint wording",
);

const outputPolishResult = parseGeneratedFilesForTest({
  "pack-manifest.md": [
    baseFiles["pack-manifest.md"],
    "",
    "- Catalog source detail: `C:\\Users\\Caspar\\Desktop\\Kaze-AI-Screen-Pack-Generator\\config\\kaze-component-catalog.local.json`",
  ].join("\n"),
  "handoff.md": [
    baseFiles["handoff.md"],
    "",
    "## Visual Notes",
    "- Follow Kaze/project tokens for colors (e.g., Primary Blue `#0066FF`), borders, and shadows.",
    "- Icons: Use project icon pattern or inline SVG fallback.",
    "- Icons use project icon pattern or inline SVG fallback",
    "- Icons use existing project pattern or inline SVG fallback.",
    "- Icons use existing project icon pattern or SVG fallback.",
    "- Use project icon pattern or inline SVG fallback for icons; no separate `Icon` export.",
  ].join("\n"),
});
const polishedOutput = Object.values(outputPolishResult.files).join("\n\n");
assert.equal(
  outputPolishResult.quality.status,
  "ready",
  outputPolishResult.quality.issues.join("\n"),
);
assert.doesNotMatch(
  polishedOutput,
  /C:\\Users\\/,
  "final sanitizer must remove absolute Windows paths from generated packs",
);
assert.doesNotMatch(
  outputPolishResult.files["handoff.md"] ?? "",
  /#[0-9A-Fa-f]{3,8}\b/,
  "handoff sanitizer must remove hardcoded hex colors",
);
assert.match(
  outputPolishResult.files["handoff.md"] ?? "",
  /Follow Kaze\/project tokens for colors, borders, spacing, and shadows\. Do not hardcode exact colors unless the project token confirms them\./,
  "handoff sanitizer must replace hardcoded colors with token-based wording",
);
assert.match(
  outputPolishResult.files["handoff.md"] ?? "",
  /Icons use the existing project icon pattern if available; otherwise use inline SVG fallback\. Do not assume or install any icon library\. There is no confirmed Kaze `Icon` export\./,
  "handoff sanitizer must normalize icon wording to the strict fallback rule",
);
assert.doesNotMatch(
  outputPolishResult.files["handoff.md"] ?? "",
  /Icons:\s*Use project icon pattern or inline SVG fallback\./i,
  "handoff sanitizer must remove labelled weak icon wording",
);
assert.doesNotMatch(
  outputPolishResult.files["handoff.md"] ?? "",
  /Icons use project icon pattern or inline SVG fallback/i,
  "handoff sanitizer must remove unlabelled weak icon wording",
);
assert.doesNotMatch(
  outputPolishResult.files["handoff.md"] ?? "",
  /Icons use existing project pattern or inline SVG fallback/i,
  "handoff sanitizer must remove existing-project weak icon wording",
);
assert.doesNotMatch(
  outputPolishResult.files["handoff.md"] ?? "",
  /Icons use existing project icon pattern or SVG fallback/i,
  "handoff sanitizer must remove non-inline SVG weak icon wording",
);
assert.doesNotMatch(
  outputPolishResult.files["handoff.md"] ?? "",
  /Use project icon pattern or inline SVG fallback for icons;?\s*no separate [`"]?Icon[`"]? export/i,
  "handoff sanitizer must remove weak icon wording",
);

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

const markerlessFencedStage2Response = parseHandoffMappingResponse({
  responseText: [
    "```markdown",
    "# Kaze UI Library Handoff",
    "",
    "## Overview",
    "- Reference gallery showcasing all available UI components.",
    "",
    "## Screenshots",
    "- `screenshots/KazeComponentGallery_Default_Desktop.png`",
    "```",
    "",
    "```markdown",
    "# Kaze Component Mapping",
    "",
    "## Source Files",
    "- `screenshots/KazeComponentGallery_Default_Desktop.png`",
    "",
    "| UI Element | Intended Kaze Pattern | Exact Kaze Export | Confidence | Notes |",
    "|---|---|---|---|---|",
    "| Button preview | Button | Button | High | Recovered from markerless response. |",
    "```",
  ].join("\n"),
  allowedFilenames: testAllowedFilenames,
  kazeComponentCatalog: testCatalog,
  parsedFilenames: testParsedFilenames,
});
assert.equal(
  markerlessFencedStage2Response.quality.status,
  "ready",
  markerlessFencedStage2Response.quality.issues.join("\n"),
);
assert.match(
  markerlessFencedStage2Response.files["handoff.md"] ?? "",
  /# Kaze UI Library Handoff/,
  "Stage 2 parser must recover handoff.md from markerless fenced headings",
);
assert.match(
  markerlessFencedStage2Response.files["kaze-component-mapping.md"] ?? "",
  /\| Button Examples \| Clickable action \| Button \| High \|/,
  "Stage 2 parser must recover and sanitize markerless component mapping",
);

const markerlessGalleryHandoffOnlyResponse = parseHandoffMappingResponse({
  responseText: [
    "```markdown",
    "# Kaze UI Library Handoff",
    "",
    "## Overview",
    "- Reference gallery showcasing all available UI components.",
    "",
    "## Screenshots",
    "- `screenshots/KazeComponentGallery_Default_Desktop.png`",
    "```",
  ].join("\n"),
  allowedFilenames: testAllowedFilenames,
  kazeComponentCatalog: testCatalog,
  parsedFilenames: testParsedFilenames,
});
assert.equal(
  markerlessGalleryHandoffOnlyResponse.quality.status,
  "ready",
  markerlessGalleryHandoffOnlyResponse.quality.issues.join("\n"),
);
assert.match(
  markerlessGalleryHandoffOnlyResponse.files["handoff.md"] ?? "",
  /# Kaze UI Library Handoff/,
  "Stage 2 parser must recover handoff.md from a single markerless handoff block",
);
assert.match(
  markerlessGalleryHandoffOnlyResponse.files["kaze-component-mapping.md"] ?? "",
  /\| Checkbox Dropdown Example \| Multi-select dropdown \| CheckboxDropdown \| High \|/,
  "Gallery packs must receive deterministic mapping even if the model omitted the mapping file marker",
);

const unrecognizableStage2Response = parseHandoffMappingResponse({
  responseText:
    "Here is your pack. It has useful prose but no recognizable file markers or Stage 2 headings.",
  allowedFilenames: testAllowedFilenames,
  kazeComponentCatalog: testCatalog,
  parsedFilenames: testParsedFilenames,
});
assert.equal(
  unrecognizableStage2Response.quality.status,
  "failed",
  "unrecognizable Stage 2 output must still fail",
);
assert.match(
  unrecognizableStage2Response.quality.issues.join("\n"),
  /Missing expected files: handoff\.md/,
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
  "| Project / feature screen | Text input | TextField | High | Generator UI leak. |",
  "| Screen type | Dropdown | Dropdown | High | Generator UI leak. |",
  "| Fast Mode | Checkbox | Checkbox | High | Generator UI leak. |",
  "| On-prem Switch | Toggle | Toggle | High | Generator UI leak. |",
  "| Sidebar Nav | Unknown / verify from Kaze | Unknown / verify from Kaze | Low | Verify project pattern. |",
  "",
  "## Icon Table",
  "",
  "| Icon Element | Component Pattern | Exact Kaze Export | Confidence | Notes |",
  "|---|---|---|---|---|",
  "| Arrow Down (Dropdown) | Icon internal | Dropdown | Low | Do not map this separately. |",
  "| Checkmark (Checkbox) | Icon internal | Checkbox | Low | Do not map this separately. |",
  "",
  "There is no confirmed `Unknown / verify from Kaze` export.",
  "Unknown / verify from Kaze for any undocumented prop behaviors.",
  "",
  "## Component Gallery Coverage",
  "",
  "Visual Kaze exports visible or expected in this component gallery:",
  "- `Pills`",
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
  /\| Checkbox Dropdown Example \| Multi-select dropdown \| CheckboxDropdown \| High \|/,
);
assert.match(
  repairedBadMapping,
  /\| Enterprise Grid Example \| Complex data grid \| AgGridTable \| High \|/,
);
assert.match(
  repairedBadMapping,
  /\| Lozenge Example \| Status label \| Lozenge \| High \|/,
);
assert.match(
  repairedBadMapping,
  /\| Radio Group Example \| Grouped radio options \| RadioGroup \| High \|/,
);
assert.doesNotMatch(
  repairedBadMapping,
  /Project \/ feature screen|Screen type|Fast Mode|On-prem|Screen Pack Generator|Enterprise AI Assistant/i,
  "component gallery mapping must not keep generator-specific rows",
);
assert.doesNotMatch(
  repairedBadMapping,
  /## Icon Table|Arrow Down \(Dropdown\)|Checkmark \(Checkbox\)|Radio Circle \(Radio\)|Toggle Knob|Navigation Arrows/i,
  "component gallery mapping must not map icon internals as rows",
);
assert.doesNotMatch(
  repairedBadMapping,
  /no confirmed\s+`Unknown \/ verify from Kaze`\s+export|There is no confirmed\s+`Unknown \/ verify from Kaze`\s+export/i,
);
assert.doesNotMatch(
  repairedBadMapping,
  /Visual Kaze exports visible or expected/i,
);
assert.match(repairedBadMapping, /## Icon Usage Rule/);
assert.match(
  repairedBadMapping,
  /Use `Unknown \/ verify from Kaze` only as a fallback label when no confirmed Kaze export exists\./,
);
assert.match(
  repairedBadMapping,
  /Undocumented prop behavior should be verified against package typings or Storybook\./,
);
assert.match(
  repairedBadMapping,
  /Visual Kaze exports are covered in the mapping table above\./,
);
assert.match(repairedBadMapping, /## Confirmed Public Kaze Exports/);
assert.match(repairedBadMapping, /`TextArea`, not `TextAreaField`/);
assert.match(repairedBadMapping, /`Swatch`, not `ColourSwatch`/);
assert.match(
  repairedBadMapping,
  /\| Visual Element \| Intended Role \| Exact Kaze Export or HTML\/CSS \| Confidence \| Required Visible Text\/State \| Confirmed Prop Guidance \| Fallback if API Uncertain \|/,
);

[
  ["Heading / Body Text", "Typography"],
  ["Button Examples", "Button"],
  ["Avatar Example", "Avatar"],
  ["Badge Example", "Badge"],
  ["Text Input Example", "TextField"],
  ["Text Area Example", "TextArea"],
  ["Dropdown Example", "Dropdown"],
  ["Date Input Example", "Datepicker"],
  ["Time Input Example", "Timepicker"],
  ["Checkbox Example", "Checkbox"],
  ["Radio Example", "Radio"],
  ["Radio Group Example", "RadioGroup"],
  ["Toggle Example", "Toggle"],
  ["Segmented Example", "Segmented"],
  ["Slider Example", "Slider"],
  ["Tag Example", "Tag"],
  ["Lozenge Example", "Lozenge"],
  ["Pills Example", "Pills"],
  ["Swatch Example", "Swatch"],
  ["Progress Example", "Progress"],
  ["Steps Example", "Steps"],
  ["Breadcrumb Example", "Breadcrumb"],
  ["Tabs Example", "Tabs"],
  ["Pagination Example", "Pagination"],
  ["Alert Example", "Alert"],
  ["Notification Example", "Notification"],
  ["Toast Example", "Toast"],
  ["Tooltip Example", "Tooltip"],
  ["Modal Example", "Modal"],
  ["Upload Example", "Upload"],
  ["Collapse Example", "Collapse"],
  ["Context Menu Example", "ContextMenu"],
  ["Table Example", "Table"],
  ["Enterprise Grid Example", "AgGridTable"],
  ["Checkbox Dropdown Example", "CheckboxDropdown"],
  ["Utility Notification Hook", "useNotification"],
  ["Utility Notification Function", "notification"],
].forEach(([label, exactExport]) => {
  assert.match(
    repairedBadMapping,
    new RegExp(
      `\\| ${escapeRegExp(label)} \\| [^|]+ \\| ${escapeRegExp(exactExport)} \\| High \\|`,
    ),
    `${label} must be rendered in deterministic gallery mapping`,
  );
});

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
assert.match(handoff, /## Target Placement/);
assert.match(handoff, /src\/pages\/UIComponentsGallery\/UIComponentsGallery\.tsx/);
assert.match(handoff, /## Screenshot Structure Authority/);
assert.match(handoff, /## Required Content and Section Order/);
assert.match(handoff, /1\. Typography[\s\S]*14\. Utility Exports/);
assert.match(handoff, /`TextArea`, not `TextAreaField`/);
assert.match(handoff, /`Swatch`, not `ColourSwatch`/);
assert.match(clinePrompt, /## Target Placement/);
assert.match(clinePrompt, /## Screenshot Structure Authority/);
assert.match(clinePrompt, /## Validation Requirements/);
assert.match(clinePrompt, /npm run build/);
assert.match(checklist, /Required section order matches handoff\.md: Typography/);
assert.match(checklist, /Does not import `TextAreaField`; use `TextArea` instead\./);

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

const internalImportErrors = validateKazeMappingContent({
  "kaze-component-mapping.md":
    'import { TextAreaField, ColourSwatch } from "@pcs-security/kaze-ui-library";',
});
assert.ok(
  internalImportErrors.length > 0,
  "validator must fail when internal Kaze names are imported as public exports",
);

console.log("Pack generator regression tests passed.");
