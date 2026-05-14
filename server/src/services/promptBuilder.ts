import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FileMapEntry } from "./fileMap.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const catalogPath = path.resolve(repoRoot, "config", "kaze-component-catalog.md");

export interface PackInputFields {
  projectName: string;
  shortDescription: string;
  designSource: string;
  iconSystem: string;
  additionalNotes: string;
}

export async function loadKazeComponentCatalog(): Promise<string> {
  return fs.readFile(catalogPath, "utf8");
}

export function buildPackInputMarkdown(
  fields: PackInputFields,
  fileMapEntries: FileMapEntry[],
  fileMapText: string
): string {
  const additionalNotes =
    fields.additionalNotes.trim() || "Use standard Kaze states unless custom states are shown.";

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
        `| ${entry.filename} | ${entry.parsed.screenName ?? "Unknown"} | ${entry.parsed.state ?? "Unknown"} | ${entry.parsed.viewport ?? "Unknown"} |`
    ),
    "",
    "## File Map",
    ...fileMapText.split("\n").slice(1)
  ].join("\n");
}

export function buildAiPrompt(params: {
  packInputMarkdown: string;
  kazeComponentCatalog: string;
  fileMapText: string;
}): string {
  return `You are a Kaze UI Screen Pack Generator.

Your job is to generate an implementation-ready markdown pack from uploaded screen screenshots.

Keep pack-manifest.md clean and high-level. Do not include Kaze tokens, colors, spacing, component names, CSS, implementation details, API details, or route details in pack-manifest.md.

Allowed exact Kaze components are ONLY the components listed under Confirmed Kaze Components in kaze-component-catalog.md. Do not output any Kaze* component name that is not listed there. For sidebar, avatar, typography, layout, icon wrapper, card, or prompt bar, output "Unknown / verify from Kaze" unless the catalog explicitly confirms the component.

Do not output these unless listed in catalog:
- KazeGreeting
- KazePromptBar
- KazeSidebar
- KazeAvatar
- KazeCard
- KazeIcon
- KazeLayout
- KazeText
- KazeTypography
- KazeFlex
- KazeBox
- KazeHeading

Input:
- pack-input.md
- kaze-component-catalog.md
- File Map
- Attached images

Context:
- Screenshots are exported from Figma/Sketch as image files.
- Each screenshot represents one screen or one state of a screen.
- Designs follow Kaze UI.
- Icons use Font Awesome where available.
- Standard Kaze states such as loading, empty, error, disabled, validation, modal, and table states already exist unless screenshots show custom behaviour.
- This stage is only for generating implementation documents.
- Do not generate final React code.

Filename rules:
- Use only filenames from the File Map.
- Do not invent filenames.
- Do not rename screenshots.
- Derive ScreenName, State, and Viewport only from "Parsed Screenshot Names".
- Filename parsing rule: remove extension, split basename by "_", first part = ScreenName, last part = Viewport, middle part(s) joined by "_" = State.
- Example: HomeGreeting_Default_Desktop.png parses as ScreenName = HomeGreeting, State = Default, Viewport = Desktop.
- In pack-manifest.md, screen headings must use ScreenName only.
- Correct screen heading: "### HomeGreeting".
- Incorrect screen headings: "### Screen: HomeGreeting", "### Screen Name: HomeGreeting", "### Screen: HomeGreeting_Default", "### HomeGreeting_Default".
- If an image has no filename in the File Map, mark it as "Filename missing from File Map".
- Never write "Filename unavailable".

State rules:
- Use the State from "Parsed Screenshot Names" exactly unless the screenshot clearly shows a different state.
- Do not label landing screens as Empty unless the filename state is Empty or the screenshot clearly shows an empty data/table/list state.
- For HomeGreeting_Default_Desktop.png, the state is Default only. Do not write "Default / Empty", "Initial / Empty", or "Empty no history".

Critical Kaze mapping rules:
- Use kaze-component-catalog.md as the only trusted list of known Kaze components.
- Do not invent exact Kaze component names or props.
- If a visible UI element maps clearly to a component listed in kaze-component-catalog.md, use that component.
- If a visible UI element does not map clearly to the catalog, write "Unknown / verify from Kaze".
- Use "Intended Kaze Pattern" when the exact component is not confirmed.
- Exact component names and props must still be verified later by Cline/Codex from actual project exports, Storybook, or existing project usage.

Critical visual accuracy rules:
- Do not output exact pixel measurements unless provided in pack-input.md or design specs.
- If estimating spacing, sizing, colours, or radius from screenshot, label them as "approximate visual estimate".
- Prefer Kaze tokens and existing project styles over hardcoded pixel/hex values.
- Do not invent animation values such as scale, transition duration, hover lift, or custom focus effects.
- For unknown behaviours, write "Use standard Kaze behaviour" instead of inventing custom behaviour.
- For unknown icons, write "Unknown / verify Font Awesome icon" instead of guessing.

Output rules:
- Output only the final markdown files.
- Do not include reasoning, chain-of-thought, analysis, citations, <details> blocks, or explanatory notes.
- Use this exact file separation format:

--- File: pack-manifest.md ---
[content]

--- File: handoff.md ---
[content]

--- File: kaze-component-mapping.md ---
[content]

--- File: cline-implementation-prompt.md ---
[content]

--- File: qa-checklist.md ---
[content]

Required files:

1. pack-manifest.md
Must include:
- Project / feature name
- Short description
- Design source
- Screens grouped by screen name
- Screenshot list for each screen
- Detected state for each screenshot
- Detected viewport for each screenshot
- Inferred screen purpose
- Main visible actions
- Screen/flow unknowns

pack-manifest.md must stay clean. Do not include:
- Kaze component verification
- confirmed Kaze components
- Kaze token details
- color tokens
- spacing tokens
- component names
- implementation details
- implementation instructions
- API endpoint details
- route details
- CSS values
- exact pixel values

Keep component verification out of pack-manifest.md. Component mapping belongs in kaze-component-mapping.md.

2. handoff.md
Must include:
- Overview
- Screenshots
- Visible layout
- Main user actions
- Visual notes
- Required states
- Unknowns / needs confirmation

Required states rules for handoff.md:
- Include only states shown by filename/screenshot, plus likely interaction states marked as likely or TODO.
- For a default landing/input screen, use:
  - Default: shown in screenshot
  - Input focused: likely, use standard Kaze input behavior
  - Input with text: likely, enable action if supported
  - Processing/loading: unknown, mark TODO unless confirmed
  - Error: unknown, only if submit/search action is implemented
  - Disabled: unknown, only if rules require it
- Do not include generic loading, empty, error, or disabled states as if all are required.

3. kaze-component-mapping.md
Must include:
- Source files
- Rule section
- Screen-specific mapping table
- Icon mapping table
- Confidence levels
- Unknown / verify from Kaze where needed

4. cline-implementation-prompt.md
Must include:
- Inputs
- Critical first step
- Implementation rules
- Screen requirements
- State requirements
- Validation steps

The Cline prompt must instruct the coding agent to:
- Inspect actual project structure
- Find existing Kaze usage
- Inspect package exports
- Inspect Storybook/docs if available
- Verify exact Kaze components and props
- Avoid guessed Kaze components
- Run typecheck/build if available

The Cline prompt must include this fallback rule:
If a Kaze component is not verified:
1. First search existing project patterns.
2. Use the closest approved existing project pattern.
3. Use raw HTML only for non-interactive layout wrappers.
4. Do not use raw input/button/select if Kaze equivalents exist.
5. Document the fallback clearly.

5. qa-checklist.md
Must include:
- Visual checks
- Functional checks
- Kaze compliance checks
- Code quality checks
- Accessibility checks

QA checklist wording rules:
- Do not assume optional behaviours work.
- Write "Sidebar navigation is implemented or marked as TODO." instead of "Sidebar navigation routes to correct sections."
- Write "Avatar interaction is implemented or marked as TODO." instead of "Avatar click opens profile/account menu."
- Write "Voice button behaviour is implemented or marked as TODO." instead of "Voice button triggers expected input state."
- Write "Quick action button behaviour is implemented or marked as TODO." instead of "Quick action buttons trigger appropriate flows."

Now generate the five markdown files.

PACK INPUT:
${params.packInputMarkdown}

KAZE COMPONENT CATALOG:
${params.kazeComponentCatalog}

FILE MAP:
${params.fileMapText}`;
}
