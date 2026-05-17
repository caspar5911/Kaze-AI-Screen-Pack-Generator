import type { FileMapEntry } from "./fileMap.js";
import type { KazeCatalog } from "./kazeCatalog.js";
import {
  getComponentGalleryExports,
  getConfirmedKazeExports,
  getForbiddenFakeNames,
  getKazeCatalog,
  getPrimaryForbiddenFakeNames,
  getUtilityKazeExports,
  getVisualKazeExports,
} from "./kazeCatalog.js";

const AI_ASSISTANT_HOME_VISIBLE_ACTIONS = [
  "Type a prompt in the input field.",
  "Add attachments using the plus icon.",
  "Interact with the visible Thinking selector.",
  "Use microphone/voice controls.",
  "Use the white circular action button.",
  "Select quick actions: Create an image, Write or edit, Look something up.",
  "Use sidebar navigation icons.",
  "Use the avatar/profile area.",
];
const COMPONENT_GALLERY_VISIBLE_ACTIONS = [
  "Review component groups.",
  "Compare visual component examples.",
  "Identify matching Kaze exports for screenshot-to-code generation.",
  "Verify utility exports such as `notification` and `useNotification`.",
];
const COMPONENT_GALLERY_UNKNOWNS = [
  "Exact interactive behaviour for each sample component is not confirmed.",
  "Component props and variants should be verified against the installed Kaze package typings or Storybook.",
  "Utility exports such as `notification` and `useNotification` should only be used when notification behaviour is required.",
  "Layout wrappers/cards are not confirmed Kaze exports unless package typings prove they exist.",
];
const GENERIC_MANIFEST_UNKNOWNS = [
  "Exact interaction behaviour for visible controls is not confirmed.",
  "Responsive mobile/tablet layouts are not provided unless matching screenshots are uploaded.",
  "Kaze component props and variants should be verified against the installed package typings or Storybook.",
  "Routes, APIs, permissions, and persistence behaviour are not provided.",
];
const PACK_CONTENT_FILES = [
  "README_FOR_CLINE.md",
  "pack-manifest.md",
  "handoff.md",
  "kaze-component-mapping.md",
  "cline-implementation-prompt.md",
  "qa-checklist.md",
  "validate-pack.mjs",
  "cline-readiness-standard.md",
];

export interface PackInputFields {
  projectName: string;
  shortDescription: string;
  designSource: string;
  iconSystem: string;
  additionalNotes: string;
}

export interface KazeCatalogSourceMetadata {
  packageName?: string;
  kazeVersion?: string;
  catalogVersion?: string;
  schemaVersion?: string;
  source: "remote" | "cache" | "local";
  sourceDetail: string;
}

export async function loadCompactCatalogJson(
  catalog: KazeCatalog = getKazeCatalog(),
): Promise<string> {
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

export function buildPackInputMarkdown(
  fields: PackInputFields,
  fileMapEntries: FileMapEntry[],
  fileMapText: string,
): string {
  const additionalNotes =
    fields.additionalNotes.trim() ||
    "Use standard Kaze states unless custom states are shown.";

  return [
    "# Pack Input",
    "",
    "## Project / Feature Name",
    fields.projectName,
    "",
    "## Short Description",
    fields.shortDescription,
    "",
    "## Design Source",
    fields.designSource,
    "",
    "## Design System",
    "This design follows Kaze UI.",
    "",
    "## Icon System",
    fields.iconSystem,
    "",
    "## Additional Notes",
    additionalNotes,
    "",
    "## Uploaded Screenshots",
    ...fileMapEntries.map((entry) => `- ${entry.filename}`),
    "",
    "## Parsed Screenshot Names",
    "| Filename | ScreenName | State | Viewport |",
    "|---|---|---|---|",
    ...fileMapEntries.map(
      (entry) =>
        `| ${entry.filename} | ${entry.parsed.screenName ?? "Unknown"} | ${entry.parsed.state ?? "Unknown"} | ${entry.parsed.viewport ?? "Unknown"} |`,
    ),
    "",
    "## File Map",
    ...fileMapText.split("\n").slice(1),
  ].join("\n");
}

export function buildLocalPackManifestMarkdown(
  fields: PackInputFields,
  fileMapEntries: FileMapEntry[],
  catalogSource?: KazeCatalogSourceMetadata,
): string {
  const groupedEntries = new Map<string, FileMapEntry[]>();

  fileMapEntries.forEach((entry) => {
    const screenName =
      entry.parsed.screenName?.trim() || `UnknownScreen${entry.index}`;
    groupedEntries.set(screenName, [
      ...(groupedEntries.get(screenName) ?? []),
      entry,
    ]);
  });

  const screenSections = [...groupedEntries.entries()].flatMap(
    ([screenName, entries]) => {
      const displayScreenName = getManifestScreenTitle(
        fields,
        screenName,
        entries,
      );

      return [
        `### ${displayScreenName}`,
        "",
        "Purpose:",
        getManifestScreenPurpose(fields, displayScreenName, entries),
        "",
        "Screenshots:",
        ...entries.flatMap((entry) => [
          `- \`screenshots/${entry.filename}\``,
          `  - State: \`${entry.parsed.state ?? "Unknown"}\``,
          `  - Viewport: \`${entry.parsed.viewport ?? "Unknown"}\``,
        ]),
        "",
        "Main Visible Actions:",
        ...buildLocalManifestVisibleActions(fields, screenName, entries).map(
          (action) => `- ${action}`,
        ),
        "",
      ];
    },
  );

  return [
    "# Pack Manifest",
    "",
    "## Project / Feature Name",
    fields.projectName,
    "",
    "## Short Description",
    fields.shortDescription,
    "",
    "## Design Source",
    fields.designSource,
    "",
    ...(catalogSource
      ? [
          "## Kaze Catalog Source",
          `- Package: \`${catalogSource.packageName ?? "@pcs-security/kaze-ui-library"}\``,
          `- Kaze version: \`${catalogSource.kazeVersion ?? "unknown"}\``,
          `- Catalog version: \`${catalogSource.catalogVersion ?? "unknown"}\``,
          `- Catalog schema version: \`${catalogSource.schemaVersion ?? "unknown"}\``,
          `- Catalog source: \`${catalogSource.source}\``,
          `- Catalog source detail: ${formatCatalogSourceDetail(catalogSource)}`,
          "",
        ]
      : []),
    "## Pack Contents",
    ...PACK_CONTENT_FILES.map((filename) => `- \`${filename}\``),
    ...fileMapEntries.map((entry) => `- \`screenshots/${entry.filename}\``),
    "",
    "## Screens",
    "",
    ...screenSections,
    "## Unknowns / Needs Confirmation",
    ...buildLocalManifestUnknowns(fields, fileMapEntries).map(
      (unknown) => `- ${unknown}`,
    ),
  ].join("\n");
}

function formatCatalogSourceDetail(
  catalogSource: KazeCatalogSourceMetadata,
): string {
  return sanitizeCatalogSourceDetail(catalogSource.source);
}

function sanitizeCatalogSourceDetail(
  source: KazeCatalogSourceMetadata["source"],
): string {
  if (source === "local") {
    return "local bundled fallback catalog";
  }

  if (source === "cache") {
    return "cached catalog";
  }

  if (source === "remote") {
    return "internal approved catalog endpoint";
  }

  return "catalog source";
}

function buildCompactPackContext(packInputMarkdown: string): string {
  const sectionNames = [
    "Project / Feature Name",
    "Short Description",
    "Design Source",
    "Icon System",
    "Additional Notes",
  ];

  return sectionNames
    .map((sectionName) => {
      const value = readMarkdownSection(packInputMarkdown, sectionName);
      return value ? `${sectionName}: ${value}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function readMarkdownSection(markdown: string, sectionName: string): string {
  const pattern = new RegExp(
    `^## ${escapeRegExp(sectionName)}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`,
    "m",
  );
  return markdown.match(pattern)?.[1]?.trim().replace(/\s+/g, " ") ?? "";
}

function buildScreenFolderNameFromPackContext(
  packInputMarkdown: string,
  fileMapText: string,
): string {
  const fields: PackInputFields = {
    projectName: readMarkdownSection(packInputMarkdown, "Project / Feature Name"),
    shortDescription: readMarkdownSection(packInputMarkdown, "Short Description"),
    designSource: readMarkdownSection(packInputMarkdown, "Design Source"),
    iconSystem: readMarkdownSection(packInputMarkdown, "Icon System"),
    additionalNotes: readMarkdownSection(packInputMarkdown, "Additional Notes"),
  };
  const filenames = [...fileMapText.matchAll(/^\s*\d+\.\s+(.+?)\s+=/gm)].map(
    (match) => match[1],
  );

  return buildScreenFolderNameFromFieldsAndFilenames(fields, filenames);
}

function buildScreenFolderNameFromFieldsAndFilenames(
  fields: PackInputFields,
  filenames: string[],
): string {
  const filenameContext = filenames.join(" ");
  const firstScreenName =
    filenames[0]?.replace(/\.[^.]+$/, "").split("_")[0]?.trim() ?? "";

  if (
    isComponentGalleryText(
      `${fields.projectName} ${fields.shortDescription} ${filenameContext}`,
    )
  ) {
    return "UIComponentsGallery";
  }

  const source = fields.projectName.trim() || firstScreenName || "GeneratedScreen";

  return toPascalIdentifier(source) || "GeneratedScreen";
}

function getTargetPlacementPaths(screenFolderName: string): {
  componentPath: string;
  cssPath: string;
  entrypointPath: string;
} {
  return {
    componentPath: `src/pages/${screenFolderName}/${screenFolderName}.tsx`,
    cssPath: `src/pages/${screenFolderName}/${screenFolderName}.css`,
    entrypointPath: "src/main.tsx",
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildManifestPrompt(params: {
  packInputMarkdown: string;
  fileMapText: string;
}): string {
  // Stage 1: No Kaze catalog, no docs. AI only fills Purpose, Actions, Unknowns.
  return `You are a Kaze UI Screen Pack Manifest Generator.

Generate only pack-manifest.md from File Map and screenshots.

Filename rules:
- Use only filenames from the File Map.
- Do not invent, rename, or shorten filenames.
- Parse: <ScreenName>_<State>_<Viewport>.png
- Example: HomeGreeting_Default_Desktop.png => ScreenName=HomeGreeting, State=Default, Viewport=Desktop

Screen heading rule:
Use ScreenName only.
Correct: ### HomeGreeting
Incorrect: ### Screen: HomeGreeting, ### Screen Name: HomeGreeting, ### HomeGreeting_Default

State rule:
Do not label landing/home screens as Empty state unless filename state is Empty.

pack-manifest.md must ONLY include:
- Project / feature name
- Short description
- Design source
- Screens grouped by ScreenName
- Screenshot list per screen
- Detected state and viewport
- Inferred screen purpose
- Main visible actions
- Unknowns / Needs Confirmation

pack-manifest.md must NOT include:
- Kaze export names or verification
- Token, color, spacing, CSS, px values
- Route names or API endpoints
- Storybook instructions
- Implementation instructions

Output rules:
- Output only the file section. No private reasoning, citations, or commentary.

--- File: pack-manifest.md ---

PACK INPUT:
${params.packInputMarkdown}

FILE MAP:
${params.fileMapText}`;
}

export function buildHandoffMappingPrompt(params: {
  packInputMarkdown: string;
  packManifestMarkdown: string;
  compactCatalog: string;
  fileMapText: string;
}): string {
  // Stage 2: Use compact catalog JSON, not full docs.
  const catalog = JSON.parse(params.compactCatalog);
  const packContext = buildCompactPackContext(params.packInputMarkdown);
  const confirmedExports = getConfirmedKazeExports().join(", ");
  const forbiddenFakeNames = getForbiddenFakeNames().join(", ");
  const unconfirmedPatterns = (catalog.unconfirmedPatterns ?? []).join(", ");
  const screenFolderName = buildScreenFolderNameFromPackContext(
    params.packInputMarkdown,
    params.fileMapText,
  );
  const targetPaths = getTargetPlacementPaths(screenFolderName);
  const isComponentGallery = isComponentGalleryText(
    `${packContext} ${params.fileMapText}`,
  );
  const componentGallerySectionOrder = isComponentGallery
    ? [
        "If this is the Kaze component gallery screenshot, use this Required Section Order exactly:",
        "1. Typography",
        "2. Buttons",
        "3. Avatar + Badge",
        "4. Inputs",
        "5. Selection",
        "6. Segmented + Slider",
        "7. Labels",
        "8. Progress + Steps",
        "9. Navigation",
        "10. Feedback",
        "11. Upload",
        "12. Collapse + Context",
        "13. Tables",
        "14. Utility Exports",
      ].join("\n")
    : "Required Section Order must list visible regions/sections in exact top-to-bottom, left-to-right order from the screenshot.";

  return `You are a Kaze UI Handoff and Component Mapping Generator.

Generate only:
1. handoff.md
2. kaze-component-mapping.md

Input: compact pack context, sanitized manifest, File Map, screenshots.

Kaze export rules:
- Package: ${catalog.packageName ?? "@pcs-security/kaze-ui-library"}
- Kaze version: ${catalog.kazeVersion ?? "unknown"}
- Catalog version: ${catalog.catalogVersion ?? "unknown"}
- Allowed exact exports: ${confirmedExports}
- Forbidden fake names: ${forbiddenFakeNames}
- Unconfirmed patterns: ${unconfirmedPatterns}
- Use only exports listed in the provided Kaze catalog JSON.
- Use public export names only: TextArea, not TextAreaField; Swatch, not ColourSwatch.
- Do not rely on internal declaration names from generated typings.
- Do not use catalog entries marked pending or aiReady=false.
- Use componentDetectionRules, patternMappings, and mandatoryMappingRules from the catalog as source of truth.
- List visible UI elements and generic visual roles first.
- Do not invent Kaze component names.
- If a visual role matches the catalog mapping dictionary, use the exact confirmed Kaze export.
- Do not assume AntD subcomponent APIs exist through Kaze, such as Table.Row, Table.Cell, Steps.Step, Tabs.TabPane, Dropdown.Option, or Select.Option, unless installed Kaze typings or existing project usage confirms them.

For unconfirmed patterns, output: Unknown / verify from Kaze

Target placement for handoff.md:
- Implement this screen in \`${targetPaths.componentPath}\`.
- React structure belongs in \`${targetPaths.componentPath}\`.
- CSS/layout styling belongs in \`${targetPaths.cssPath}\`.
- \`${targetPaths.entrypointPath}\` may be edited only for Kaze CSS/theme imports if missing.
- Existing blank, placeholder, sidebar, or scaffold-only output in the allowed target files should be replaced when it does not match the screenshot.
- Do not rewrite unrelated files. This means stay inside the allowed target files; it does not mean preserving a wrong layout.

Screenshot structure authority:
- The target screenshot is the source of truth for visible page structure.
- If the current implementation is blank, scaffold-only, placeholder-only, or structurally different from the target screenshot, the allowed page component/CSS may be rewritten.
- Do not preserve sidebar, toolbar, footer, modal, table, card, or empty-state scaffolding unless visible in the target screenshot.
- Avoid generic landing-page assumptions unless the screenshot is actually a landing page.

Unknown cell fallback rule:
- When a Kaze export is marked as "Unknown / verify from Kaze", the Notes column MUST include a concrete fallback specification.
- Example: "Use standard HTML <div> with project CSS classes as fallback."
- Example: "Implement with raw HTML <button> until Kaze pattern is verified."
- Example: "Use native <select> with inline styles as fallback."
- This allows developers to implement the UI with standard HTML while the Kaze export is pending verification.

Quick action mapping rule:
- For clickable quick action buttons, prefer Exact Kaze Export: Button.
- Notes: Use rounded/button variant if supported; verify existing project pattern.
- Do not map clickable quick actions to Pills unless Pills is confirmed to support interactive action behaviour in the target project.

Visual accuracy:
- Do not output exact px/hex/radius values.
- Write "Dark themed background. Follow Kaze/project tokens." instead of #000000.
- Label estimated spacing as "approximate visual estimate".
- Icons use the existing project icon pattern if available; otherwise use inline SVG fallback. Do not assume or install any icon library. There is no confirmed Kaze \`Icon\` export.
- Describe visible top-level regions in order, such as header, sidebar, toolbar, content area, cards, table, form, footer, modal, or empty state.
- Describe major density, background, border, typography, and visual hierarchy requirements from the screenshot.
- State what should not appear if it is absent from the screenshot.

${componentGallerySectionOrder}

State rules for landing screens:
- Default: shown
- Input focused: likely, standard Kaze behaviour
- Input with text: likely, enable if pattern supports
- Processing/loading: TODO unless confirmed
- Error: TODO unless submit action confirmed
- Disabled: TODO unless required

handoff.md must be concise and include these sections:
- Overview
- Screenshots
- Target Placement
- Screenshot Structure Authority
- Required Visual Structure
- Required Content and Section Order
- Confirmed Public Kaze Exports
- Layout Implementation Rules
- Visual Requirements
- Main Actions and States
- Unknowns
- Validation Requirements
- Keep each section to 3-6 bullets where practical.
- Keep the whole file under roughly 120 lines.
- Do not repeat the manifest.
- Do not describe broad implementation steps beyond placement, allowed files, and validation.

kaze-component-mapping.md must be concise and include: Source files, Import Rule, Confirmed Public Kaze Exports, Confirmed Kaze Exports Used, Forbidden Fake Names, Layout Fallback Rule, Screen mapping table, Confidence levels.
- Do not generate a separate Icon table.
- Do not map internal icons such as arrows, checkmarks, radio circles, toggle knobs, or close icons as separate Kaze components.
- For icons, use the Icon Usage Rule only.
- Only include mapping rows for visible UI elements.
- Keep notes short.
- Do not add speculative rows for unseen behaviours.
- State that Button, TextField, and Dropdown are real unprefixed exports.
- State that fake Kaze-prefixed names such as KazeButton, KazeInput, KazeSelect, KazeAvatar, and KazeTypography are wrong.
- State that TextAreaField and ColourSwatch are internal/invalid import names; use TextArea and Swatch.
- Include the correct import example using Button, TextField, Dropdown, Avatar, and Typography.
- Include the wrong fake-prefixed import example and clearly mark it WRONG.
- Never list Button, TextField, Dropdown, Avatar, or Typography under Forbidden Names.
- If you include a Forbidden Names line, it must only forbid fake Kaze-prefixed names such as KazeButton, KazeInput, KazeSelect, KazeAvatar, and KazeTypography.

Mapping table columns:
| Visual Element | Intended Role | Exact Kaze Export or HTML/CSS | Confidence | Required Visible Text/State | Confirmed Prop Guidance | Fallback if API Uncertain |

For each visible UI element, document:
- visual element name
- intended role
- recommended Kaze component or plain HTML/CSS
- confidence level
- required visible text/state
- known prop guidance if confirmed
- fallback if the Kaze API is uncertain

Visual Element To Kaze Component Mapping (strict mapping dictionary):

If screenshot shows this → Use this Kaze component:
- circular profile image / user profile photo / account image / round image with initials / profile icon / user icon in header → Avatar
- clickable action / primary button / secondary button / icon button / quick action button / card-like action button / submit action → Button
- text input / single-line input / search bar / prompt input / input with placeholder → TextField
- large multi-line text box / notes field / comment box / long prompt box → TextArea
- dropdown field / select field / option picker / field with down arrow → Dropdown
- checkbox / square tick box / boolean option → Checkbox
- toggle switch → Toggle
- radio option → Radio
- radio group → RadioGroup
- tabs / tab navigation → Tabs
- table / rows and columns / simple data table → Table
- complex enterprise grid / sortable/filterable data grid → AgGridTable
- popup dialog / confirmation dialog / overlay dialog → Modal
- small count bubble / notification count → Badge
- status label / category pill / small metadata chip → Tag
- alert message / warning banner / success/error/info message → Alert
- tooltip hint / hover hint → Tooltip
- progress bar → Progress
- stepper → Steps
- breadcrumb navigation → Breadcrumb
- pagination control → Pagination
- file upload area → Upload
- date input → Datepicker
- time input → Timepicker
- heading text / title text / paragraph text / label text / caption text → Typography

If unsure between TextField and TextArea:
- Use TextField for single-line input.
- Use TextArea for large or multi-line input.

If unsure between Table and AgGridTable:
- Use Table for simple rows and columns.
- Use AgGridTable for complex enterprise grids with sorting, filtering, many columns, or admin data.

If unsure between Tag and Badge:
- Use Badge for small numbers/counts.
- Use Tag for labels/categories/status pills.

Hard rules for Kaze component detection:
1. Every visible UI element must map to one Kaze component if a matching Kaze component exists.
2. Do not describe visual elements only in generic words. Always include the Kaze component name.
3. If visual evidence matches the mapping dictionary above, the Kaze component is mandatory.
4. Do not call an avatar a generic "profile control" only — if the screenshot has a profile image, you must mention Avatar.
5. Do not call a button a generic "action control" only — if the screenshot has a clickable action, you must mention Button.
6. Do not call an input a generic "prompt area" only — if the screenshot has a text input, you must mention TextField or TextArea.

Layout implementation rules:
- Use plain HTML/CSS for page shell, cards, grid, spacing, and wrappers.
- Do not invent Kaze layout exports such as KazeCard, KazeLayout, KazeFlex, or KazeBox.
- Use Kaze components only for actual UI controls and display elements.
- If an export or prop is uncertain, verify against installed package typings or existing project usage.
- If still uncertain, use a simpler confirmed component or plain HTML/CSS wrapper instead of inventing an API.

CRITICAL: Never output bare "Unknown" by itself. Always write "Unknown / verify from Kaze" as a single token. If you are unsure about a Kaze component, use "Unknown / verify from Kaze" - never just "Unknown". This applies to ALL mapping table cells and ALL notes fields.

Output rules:
- Output only the two file sections. No private reasoning, citations, or commentary.
- You MUST use these exact file markers:
  --- File: handoff.md ---
  --- File: kaze-component-mapping.md ---
- Do not wrap either file in standalone markdown fences.
- Do not output bare headings such as "# Kaze UI Library Handoff" without the required file marker immediately before the file content.
- Keep each file concise. Do not repeat the full pack context, catalog JSON, or File Map in the output.
- Prefer short bullets over paragraphs.

--- File: handoff.md ---

--- File: kaze-component-mapping.md ---

PACK CONTEXT:
${packContext}

PACK MANIFEST:
${params.packManifestMarkdown}

FILE MAP:
${params.fileMapText}`;
}

export function buildClineQaPrompt(params: {
  packInputMarkdown: string;
  packManifestMarkdown: string;
  handoffMarkdown: string;
  kazeComponentMappingMarkdown: string;
  compactCatalog: string;
}): string {
  // Stage 3: No full docs, no full catalog. Only sanitized prior outputs and compact context.
  const catalog = JSON.parse(params.compactCatalog);
  const packContext = buildCompactPackContext(params.packInputMarkdown);

  return `You are a Kaze UI Cline Prompt and QA Checklist Generator.

Generate only:
1. cline-implementation-prompt.md
2. qa-checklist.md

Compact Kaze Catalog:
${params.compactCatalog}

Allowed Kaze exports: ${catalog.confirmedExports.join(", ")}
Forbidden fake names: ${catalog.forbiddenFakeNames.join(", ")}

cline-implementation-prompt.md must include:

## Critical First Step

Before writing code:
1. Inspect actual project structure.
2. Inspect existing pages/screens that already use Kaze.
3. Inspect @pcs-security/kaze-ui-library package exports.
4. Inspect Kaze Storybook/docs if available.
5. Confirm exact Kaze export names and props.
6. Do not use guessed Kaze exports.
7. If a suggested Kaze export does not work, use the closest approved Kaze/project pattern and report it.

Kaze import rule:
Correct:
\`\`\`ts
import { Button, TextField, Dropdown, Avatar, Typography, TextArea, Swatch } from "@pcs-security/kaze-ui-library";
\`\`\`

Incorrect:
\`\`\`ts
// WRONG — fake Kaze-prefixed exports do not exist
import {
  KazeButton,
  KazeInput,
  KazeSelect,
  KazeAvatar,
  KazeTypography,
} from "@pcs-security/kaze-ui-library";
\`\`\`

Implementation rules:
- Use confirmed Kaze exports where available.
- Do not use raw input/button/select/table/modal/form controls if Kaze equivalents exist.
- Use raw HTML only for non-interactive layout wrappers.
- Use plain HTML/CSS for page shell, cards, grid, spacing, and layout wrappers unless a Kaze layout export is explicitly confirmed.
- Do not use Ant Design directly if Kaze wraps it.
- Do not assume AntD subcomponent APIs exist through Kaze, such as Table.Row, Table.Cell, Steps.Step, Tabs.TabPane, Dropdown.Option, or Select.Option, unless the installed Kaze package or existing project usage confirms them.
- Use TextArea, not TextAreaField.
- Use Swatch, not ColourSwatch.
- Do not invent routes, APIs, dropdown values, or permission rules.
- Mark unknown behaviour as TODO.
- Run npm run build after edits.
- Report unresolved unknowns and fallback choices.
- Write "Dark mode using existing Kaze/project tokens or styles."

Target placement and screenshot authority:
- Use the Target Placement section in handoff.md as the allowed file list.
- The target screenshot is the source of truth for visible page structure.
- If current files are blank, scaffold-only, placeholder-only, or structurally different, rewrite the allowed page component/CSS to match the screenshot.
- Do not preserve unrelated scaffolding that is absent from the screenshot.
- Do not edit outside the configured allowed files.

Fallback rule:
If a Kaze export is not verified:
1. First search existing project patterns.
2. Use the closest approved existing project pattern.
3. Use raw HTML only for non-interactive layout wrappers.
4. Do not use raw input/button/select if Kaze equivalents exist.
5. Document the fallback clearly.

After implementation, report:
- Files created or modified
- Confirmed Kaze exports used
- Fallbacks used
- TODOs left unresolved
- Typecheck/build result

qa-checklist.md rules:
- Do not assume unconfirmed behaviour works.
- Every item uses checkbox format: "- [ ] ...".
- Write "is implemented or marked as TODO." instead of assuming it works.
- Write "matches the screenshot and existing Kaze/project typography pattern." instead of "matches typography specs".
- Include screenshot-specific visual checks from handoff.md.
- Include checks that the page is not blank or placeholder-only unless the target screenshot is an empty state.
- Include checks that invalid Kaze names such as TextAreaField or ColourSwatch are not imported.
- Include checks that npm run build was run.

qa-checklist.md must include: Visual checks, Functional checks, Kaze compliance checks, Implementation safety checks, Validation requirements, Code quality checks, Accessibility checks.

Output rules:
- Output only the two file sections. No private reasoning, citations, or commentary.
- Keep each file concise. Do not repeat full prior files or catalog JSON in the output.

--- File: cline-implementation-prompt.md ---

--- File: qa-checklist.md ---

PACK CONTEXT:
${packContext}

PACK MANIFEST:
${params.packManifestMarkdown}

HANDOFF:
${params.handoffMarkdown}

KAZE COMPONENT MAPPING:
${params.kazeComponentMappingMarkdown}`;
}

export function buildLocalClineImplementationPrompt(params?: {
  fields?: PackInputFields;
  fileMapEntries?: FileMapEntry[];
  screenFolderName?: string;
}): string {
  const screenFolderName =
    params?.screenFolderName ??
    buildScreenFolderName(params?.fields, params?.fileMapEntries ?? []);
  const targetPaths = getTargetPlacementPaths(screenFolderName);

  return [
    "# Cline Implementation Prompt",
    "",
    "## Inputs",
    "- `pack-manifest.md`",
    "- `handoff.md`",
    "- `kaze-component-mapping.md`",
    "- `qa-checklist.md`",
    "- `screenshots/` visual references",
    "",
    "## Critical First Step",
    "",
    "Before writing code:",
    "",
    "1. Inspect actual project structure.",
    "2. Inspect existing pages/screens that already use Kaze.",
    "3. Inspect @pcs-security/kaze-ui-library package exports.",
    "4. Inspect Kaze Storybook/docs if available.",
    "5. Confirm exact Kaze export names and props.",
    "6. Do not use guessed Kaze exports.",
    "7. If a suggested Kaze export does not work, use the closest approved Kaze/project pattern and report it.",
    "",
    "## Kaze Import Rule",
    "",
    "Kaze UI package uses unprefixed named exports from `@pcs-security/kaze-ui-library`.",
    "",
    "Correct:",
    "",
    "```ts",
    'import { Button, TextField, Dropdown, Avatar, Typography, TextArea, Swatch } from "@pcs-security/kaze-ui-library";',
    "```",
    "",
    "Incorrect:",
    "",
    "```ts",
    "// WRONG — fake Kaze-prefixed exports do not exist",
    "import {",
    "  KazeButton,",
    "  KazeInput,",
    "  KazeSelect,",
    "  KazeAvatar,",
    "  KazeTypography,",
    '} from "@pcs-security/kaze-ui-library";',
    "```",
    "",
    "## Implementation Rules",
    "",
    "- Use `pack-manifest.md` for screen/state/screenshot references.",
    "- Use `handoff.md` for layout, visible actions, states, and unknowns.",
    "- Use `kaze-component-mapping.md` for Kaze export guidance.",
    "- Use `qa-checklist.md` for validation.",
    "- Use confirmed Kaze exports where available.",
    "- Do not use raw input/button/select/table/modal/form controls if Kaze equivalents exist.",
    "- Use plain HTML/CSS for page shell, cards, grid, spacing, and layout wrappers unless a Kaze layout export is explicitly confirmed.",
    "- Use raw HTML only for non-interactive layout wrappers.",
    "- Do not use Ant Design directly if Kaze wraps it.",
    "- Do not assume AntD subcomponent APIs exist through Kaze, such as `Table.Row`, `Table.Cell`, `Steps.Step`, `Tabs.TabPane`, `Dropdown.Option`, or `Select.Option`, unless installed Kaze typings or existing project usage confirms them.",
    "- Use `TextArea`, not `TextAreaField`.",
    "- Use `Swatch`, not `ColourSwatch`.",
    "- Do not invent routes.",
    "- Do not invent APIs.",
    "- Do not invent dropdown values.",
    "- Do not invent permission rules.",
    "- Mark unknown behaviour as TODO.",
    "- Run `npm run build` after edits.",
    "- Report unresolved unknowns and fallback choices.",
    "",
    "## Target Placement",
    "",
    "Before creating files, inspect the actual project structure and then stay inside these allowed files unless the user explicitly expands scope.",
    "",
    "Allowed implementation files:",
    "",
    `- React structure: \`${targetPaths.componentPath}\``,
    `- CSS/layout styling: \`${targetPaths.cssPath}\``,
    `- App entrypoint: \`${targetPaths.entrypointPath}\` only for Kaze CSS/theme imports if missing.`,
    "",
    "- The screen should replace an existing empty, placeholder, sidebar, or scaffold-only implementation in these target files when that scaffold is absent from the screenshot.",
    "- Do not preserve a wrong layout just because it already exists.",
    "- Do not register a route or invent route paths unless explicitly requested.",
    "",
    "## Screenshot Structure Authority",
    "",
    "The target screenshot is the source of truth for visible page structure.",
    "",
    "Use it to match:",
    "- layout",
    "- top-level page shell",
    "- primary regions and their order",
    "- spacing",
    "- density",
    "- background and borders",
    "- visual hierarchy",
    "- text placement",
    "- component choice",
    "- approximate responsive behaviour",
    "",
    "If the current implementation is blank, scaffold-only, placeholder-only, or structurally different from the screenshot, rewrite the allowed page component/CSS to match the screenshot.",
    "",
    "Do not preserve unless visible in the screenshot:",
    "- sidebar",
    "- toolbar",
    "- footer",
    "- modal",
    "- table",
    "- card grid",
    "- existing empty-state scaffold",
    "",
    "Do not infer:",
    "- backend APIs",
    "- route paths",
    "- authentication logic",
    "- database logic",
    "- persistence behaviour",
    "- user permissions",
    "- production business rules",
    "",
    "If the screenshot contains unclear behaviour, implement only static frontend behaviour unless explicitly specified in `handoff.md`.",
    "",
    "## Validation Requirements",
    "",
    "- Run `npm run build` after edits.",
    "- The final page must not remain blank or placeholder-only unless the target screenshot is an empty state.",
    "- The final page must not preserve unrelated scaffolding that is absent from the target screenshot.",
    "- The implementation must not import invalid Kaze names such as `TextAreaField` or `ColourSwatch`.",
    "- The implementation must not edit outside the configured allowed files.",
    "",
    "## Implementation Sequence",
    "",
    "1. Read `README_FOR_CLINE.md`.",
    "2. Read `handoff.md`.",
    "3. Read `kaze-component-mapping.md`.",
    "4. Read `qa-checklist.md`.",
    "5. Inspect the actual React project structure.",
    "6. Inspect existing usage of `@pcs-security/kaze-ui-library`.",
    "7. Confirm available Kaze exports from existing imports or package typings.",
    "8. Create the screen files following the project's existing structure.",
    "9. Use only real Kaze exports.",
    "10. Match the screenshot visually.",
    "11. Avoid inventing APIs, routes, or backend calls.",
    "12. Run `npm run build`.",
    "13. Report changed files and any assumptions.",
    "",
    "## Anti-Hallucination Rules",
    "",
    "Do not invent:",
    "- Kaze component names",
    "- route paths",
    "- backend API endpoints",
    "- auth logic",
    "- state management architecture",
    "- design tokens",
    "- global styles",
    "- new dependencies",
    "- fake Storybook APIs",
    "- fake test utilities",
    "",
    "If a required component is missing from Kaze:",
    "1. Use the closest real Kaze component.",
    "2. If no suitable Kaze component exists, use a minimal native HTML element.",
    "3. Document the fallback in the final response.",
    "",
    "Do not install new UI libraries unless explicitly instructed.",
    "",
    "## Kaze Setup Rule",
    "",
    "Before implementation, inspect existing project usage of:",
    "",
    "```ts",
    "@pcs-security/kaze-ui-library",
    "```",
    "",
    "Check:",
    "- existing import style",
    "- existing CSS import",
    "- available package version",
    "- existing component usage patterns",
    "",
    "Do not guess Kaze API props.",
    "",
    "Prefer examples from:",
    "- existing project code",
    "- installed package typings",
    "- Kaze documentation files, if available",
    "",
    "If the project already imports Kaze CSS globally, do not duplicate the import.",
    "",
    `If no global Kaze CSS import exists, use \`${targetPaths.entrypointPath}\` only for Kaze CSS/theme imports and report the change.`,
    "",
    "## Fallback Rule",
    "",
    "If a Kaze export is not verified:",
    "",
    "1. First search existing project patterns.",
    "2. Use the closest approved existing project pattern.",
    "3. Use raw HTML only for non-interactive layout wrappers.",
    "4. Do not use raw input/button/select if Kaze equivalents exist.",
    "5. Document the fallback clearly.",
    "",
    "## Final Response Format",
    "",
    "After implementation, respond with:",
    "",
    "```txt",
    "Implemented files:",
    "- <file path>",
    "- <file path>",
    "",
    "Kaze components used:",
    "- <component>",
    "- <component>",
    "",
    "Validation performed:",
    "- Typecheck: pass/fail/not available",
    "- Build: pass/fail/not available",
    "- Lint: pass/fail/not available",
    "",
    "Assumptions:",
    "- <assumption>",
    "",
    "Fallbacks:",
    "- <fallback, if any>",
    "```",
    "",
    "## After Implementation",
    "",
    "After implementation, report:",
    "",
    "- Files created or modified",
    "- Confirmed Kaze exports used",
    "- Fallbacks used",
    "- TODOs left unresolved",
    "- Typecheck/build result",
  ].join("\n");
}

function getManifestScreenTitle(
  fields: PackInputFields,
  screenName: string,
  entries: FileMapEntry[],
): string {
  if (isComponentGalleryContext(fields, screenName, entries)) {
    return "Kaze Component Gallery";
  }

  return screenName;
}

function getManifestScreenPurpose(
  fields: PackInputFields,
  displayScreenName: string,
  entries: FileMapEntry[],
): string {
  if (isComponentGalleryContext(fields, displayScreenName, entries)) {
    return "Reference gallery for reviewing available Kaze UI components and their intended usage in screen generation.";
  }

  return `${displayScreenName} screen for ${fields.projectName}. Use the screenshot references and handoff file for detailed visual interpretation.`;
}

function buildLocalManifestVisibleActions(
  fields: PackInputFields,
  screenName: string,
  entries: FileMapEntry[] = [],
): string[] {
  const context = `${fields.projectName} ${fields.shortDescription} ${screenName} ${entries.map((entry) => entry.filename).join(" ")}`;

  if (isComponentGalleryContext(fields, screenName, entries)) {
    return COMPONENT_GALLERY_VISIBLE_ACTIONS;
  }

  if (
    /assistant|prompt input|thinking selector|microphone|voice input|quick actions?/i.test(
      context,
    ) &&
    !isComponentGalleryContext(fields, screenName, entries)
  ) {
    return AI_ASSISTANT_HOME_VISIBLE_ACTIONS;
  }

  return [
    "Use visible primary controls shown in the screenshot.",
    "Use visible navigation or menu controls shown in the screenshot.",
    "Use visible profile/account controls shown in the screenshot.",
  ];
}

function buildLocalManifestUnknowns(
  fields: PackInputFields,
  entries: FileMapEntry[],
): string[] {
  if (isComponentGalleryContext(fields, "", entries)) {
    return COMPONENT_GALLERY_UNKNOWNS;
  }

  if (
    entries.some((entry) =>
      /homegreeting|assistant|prompt|thinking/i.test(
        `${entry.filename} ${entry.parsed.screenName ?? ""}`,
      ),
    ) ||
    /assistant|prompt input|thinking selector|microphone|voice input/i.test(
      `${fields.projectName} ${fields.shortDescription}`,
    )
  ) {
    return [
      "Navigation behaviour is not confirmed.",
      "Avatar interaction is not confirmed.",
      "Thinking selector options are not visible.",
      "White circular action button behaviour is not confirmed.",
      "Quick action behaviours are not confirmed.",
      "Voice input behaviour is not confirmed.",
    ];
  }

  return GENERIC_MANIFEST_UNKNOWNS;
}

function isComponentGalleryContext(
  fields: PackInputFields,
  screenName: string,
  entries: FileMapEntry[] = [],
): boolean {
  const context = [
    fields.projectName,
    fields.shortDescription,
    screenName,
    ...entries.map(
      (entry) => `${entry.filename} ${entry.parsed.screenName ?? ""}`,
    ),
  ].join(" ");

  return isComponentGalleryText(context);
}

function isComponentGalleryText(context: string): boolean {
  return /component\s*gallery|components\s*gallery|kaze\s*component|kaze\s*ui\s*components/i.test(
    context,
  );
}

export function buildScreenFolderName(
  fields?: PackInputFields,
  entries: FileMapEntry[] = [],
): string {
  const fallbackFields = fields ?? {
    projectName: "",
    shortDescription: "",
    designSource: "",
    iconSystem: "",
    additionalNotes: "",
  };

  if (isComponentGalleryContext(fallbackFields, "", entries)) {
    return "UIComponentsGallery";
  }

  return buildScreenFolderNameFromFieldsAndFilenames(
    fallbackFields,
    entries.map((entry) => entry.filename),
  );
}

function toPascalIdentifier(value: string): string {
  const words = value.match(/[A-Za-z0-9]+/g) ?? [];

  return words
    .map((word) => {
      if (/^[A-Z0-9]+$/.test(word)) {
        return word;
      }

      return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    })
    .join("");
}

function buildScreenshotSpecificVisualChecks(params?: {
  fields?: PackInputFields;
  fileMapEntries?: FileMapEntry[];
}): string[] {
  const fields = params?.fields ?? {
    projectName: "",
    shortDescription: "",
    designSource: "",
    iconSystem: "",
    additionalNotes: "",
  };
  const entries = params?.fileMapEntries ?? [];

  if (isComponentGalleryContext(fields, "", entries)) {
    return [
      "- [ ] Full-page Kaze component gallery structure matches the screenshot.",
      '- [ ] Header includes visible "Kaze UI Library" title and Kaze version note if shown in the screenshot.',
      "- [ ] No sidebar is preserved unless it appears in the screenshot.",
      "- [ ] Responsive component category card grid fills the desktop viewport similarly to the screenshot.",
      "- [ ] Tables section spans the wider content area.",
      "- [ ] Utility Exports section appears after visual component sections.",
      "- [ ] Required section order matches handoff.md: Typography, Buttons, Avatar + Badge, Inputs, Selection, Segmented + Slider, Labels, Progress + Steps, Navigation, Feedback, Upload, Collapse + Context, Tables, Utility Exports.",
    ];
  }

  return [
    "- [ ] Top-level page shell matches the screenshot.",
    "- [ ] Primary regions appear in the same order as `handoff.md`.",
    "- [ ] Elements absent from the screenshot are not preserved from unrelated scaffolding.",
    "- [ ] Desktop/mobile assumptions match the uploaded screenshot set.",
  ];
}

export function buildLocalQaChecklist(params?: {
  fields?: PackInputFields;
  fileMapEntries?: FileMapEntry[];
}): string {
  const screenshotSpecificVisualChecks =
    buildScreenshotSpecificVisualChecks(params);

  return [
    "# QA Checklist",
    "",
    "## 1. Pack Integrity",
    "- [ ] `pack-manifest.md` exists.",
    "- [ ] `README_FOR_CLINE.md` exists.",
    "- [ ] `handoff.md` exists.",
    "- [ ] `kaze-component-mapping.md` exists.",
    "- [ ] `cline-implementation-prompt.md` exists.",
    "- [ ] `qa-checklist.md` exists.",
    "- [ ] Screenshot folder exists.",
    "- [ ] Screenshot files exist.",
    "- [ ] Manifest references every screenshot path.",
    "",
    "## 2. Kaze Usage",
    "- [ ] Uses only real `@pcs-security/kaze-ui-library` exports.",
    "- [ ] Allows valid unprefixed exports such as `Button`, `TextField`, `Dropdown`, `Avatar`, `Typography`, `TextArea`, and `Swatch`.",
    "- [ ] Does not use fake Kaze-prefixed components such as `KazeButton`, `KazeInput`, `KazeSelect`, `KazeAvatar`, or `KazeTypography`.",
    "- [ ] Does not import `KazeButton`.",
    "- [ ] Does not import `KazeInput`.",
    "- [ ] Does not import `KazeSelect`.",
    "- [ ] Does not import `KazeAvatar`.",
    "- [ ] Does not import `KazeTypography`.",
    "- [ ] Does not import `TextAreaField`; use `TextArea` instead.",
    "- [ ] Does not import `ColourSwatch`; use `Swatch` instead.",
    "- [ ] Does not rely on unverified Kaze subcomponent APIs such as `Table.Row`, `Table.Cell`, `Steps.Step`, `Tabs.TabPane`, `Dropdown.Option`, or `Select.Option`.",
    "- [ ] Does not install another UI library.",
    "- [ ] Does not bypass Kaze when a suitable Kaze component exists.",
    "",
    "## 3. Visual",
    "- [ ] Layout matches screenshot.",
    "- [ ] Primary screen content matches screenshot.",
    "- [ ] Visible controls match screenshot.",
    "- [ ] Action buttons, panels, and component examples match screenshot.",
    "- [ ] Spacing is close to screenshot.",
    "- [ ] Typography hierarchy is close to screenshot.",
    "- [ ] Responsive behaviour does not break the layout.",
    "- [ ] Final page is not blank or placeholder-only unless the target screenshot is an empty state.",
    ...screenshotSpecificVisualChecks,
    "",
    "## 4. Implementation Safety",
    "- [ ] No fake backend APIs.",
    "- [ ] No fake route paths.",
    "- [ ] No invented authentication logic.",
    "- [ ] No invented persistence logic.",
    "- [ ] No unnecessary global CSS.",
    "- [ ] No unnecessary dependencies.",
    "- [ ] No broad project refactor.",
    "- [ ] No edits outside the configured allowed files from `handoff.md`.",
    "- [ ] Previous scaffold/sidebar/placeholder output is replaced when absent from the target screenshot.",
    "- [ ] Plain HTML/CSS is used for page shell, cards, grid, spacing, and wrappers unless a Kaze layout export is verified.",
    "",
    "## 5. Code Quality",
    "- [ ] TypeScript compiles.",
    "- [ ] No unused imports.",
    "- [ ] No obvious accessibility regression.",
    "- [ ] Component is isolated.",
    "- [ ] File placement follows existing project structure.",
    "- [ ] Build/typecheck/lint results are reported.",
    "- [ ] `npm run build` was run after edits.",
    "",
    "## 6. Validation Requirements",
    "- [ ] `npm run build` was run after edits.",
    "- [ ] Build output has no invalid Kaze export errors.",
    "- [ ] Page is not blank or placeholder-only unless the screenshot is an empty state.",
    "- [ ] Previous unrelated scaffold absent from the screenshot is not preserved.",
    "- [ ] Implementation stays inside the allowed files from `handoff.md`.",
    "",
    "## 7. Accessibility",
    "- [ ] Visible controls have accessible names or labels.",
    "- [ ] Keyboard focus remains visible for interactive controls.",
    "- [ ] Static visual fidelity does not remove expected semantic structure.",
    "- [ ] Unknown interactive behavior is implemented or marked as TODO.",
    "",
    "## 8. Final Response",
    "- [ ] Changed files are listed.",
    "- [ ] Kaze components used are listed.",
    "- [ ] Validation results are listed.",
    "- [ ] Assumptions are listed.",
    "- [ ] Fallbacks are listed.",
    "",
    "## 9. Icon Usage",
    "- [ ] Does not invent `KazeIcon`.",
    "- [ ] Does not assume a specific icon library without project confirmation.",
    "- [ ] Uses existing project icon pattern if available.",
    "- [ ] Uses SVG fallback only if no project icon pattern exists.",
    "- [ ] Does not install a new icon dependency.",
  ].join("\n");
}

export function buildAiPrompt(params: {
  packInputMarkdown: string;
  compactCatalog: string;
  fileMapText: string;
}): string {
  // Legacy single-call prompt (kept for backward compatibility but also compact).
  const catalog = JSON.parse(params.compactCatalog);

  return `You are a Kaze UI Screen Pack Generator.

Compact Kaze Catalog:
${params.compactCatalog}

Allowed exports: ${catalog.confirmedExports.join(", ")}
Forbidden fake names: ${catalog.forbiddenFakeNames.join(", ")}

Filename rules: use only File Map filenames. Parse <ScreenName>_<State>_<Viewport>.png.

pack-manifest.md must ONLY include: project name, description, design source, screens by ScreenName, screenshot list, state, viewport, purpose, visible actions, Unknowns / Needs Confirmation.
Must NOT include: component names, tokens, CSS, px, routes, APIs, Storybook, implementation.

State rules: do not label landing screens as Empty unless filename is Empty.

Component rules: use exact confirmed exports only. For unconfirmed: Unknown / verify from Kaze.
Use TextArea, not TextAreaField. Use Swatch, not ColourSwatch.
Do not assume AntD subcomponent APIs such as Table.Row, Table.Cell, Steps.Step, Tabs.TabPane, Dropdown.Option, or Select.Option.
Use plain HTML/CSS for page shell, cards, grid, spacing, and layout wrappers unless a Kaze layout export is explicitly confirmed.

Visual rules: no exact px/hex/radius. Use "Dark themed background. Follow Kaze/project tokens."

handoff.md must include: Target Placement, Screenshot Structure Authority, Required Visual Structure, Required Content and Section Order, Confirmed Public Kaze Exports, Layout Implementation Rules, Visual Requirements, Validation Requirements.

Cline prompt must include: ## Critical First Step, Inspect actual project structure, Target Placement, Screenshot Structure Authority, Validation Requirements.

QA wording: use "is implemented or marked as TODO." format.

Output five files with exact markers:
--- File: pack-manifest.md ---
--- File: handoff.md ---
--- File: kaze-component-mapping.md ---
--- File: cline-implementation-prompt.md ---
--- File: qa-checklist.md ---

PACK INPUT:
${params.packInputMarkdown}

FILE MAP:
${params.fileMapText}`;
}
