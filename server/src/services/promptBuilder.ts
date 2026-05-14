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
- Derive ScreenName, State, and Viewport from the filename.
- If an image has no filename in the File Map, mark it as "Filename missing from File Map".

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
- Unknowns / needs confirmation

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

5. qa-checklist.md
Must include:
- Visual checks
- Functional checks
- Kaze compliance checks
- Code quality checks
- Accessibility checks

Now generate the five markdown files.

PACK INPUT:
${params.packInputMarkdown}

KAZE COMPONENT CATALOG:
${params.kazeComponentCatalog}

FILE MAP:
${params.fileMapText}`;
}
