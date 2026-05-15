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

Keep pack-manifest.md clean and high-level. Do not include Kaze tokens, color tokens, spacing tokens, CSS values, component names, implementation instructions, API endpoints, route details, or exact pixel values in pack-manifest.md.

Allowed exact Kaze components are ONLY those listed under Confirmed Kaze Components in kaze-component-catalog.md. Do not output any Kaze* component name that is not listed there. If a UI pattern is not confirmed, output "Unknown / verify from Kaze".

Do not output these unless they are explicitly listed in kaze-component-catalog.md:
- KazeAvatar
- KazeSidebar
- KazeCard
- KazeIcon
- KazeLayout
- KazeText
- KazeTypography
- KazeFlex
- KazeBox
- KazeHeading
- KazeGreeting
- KazePromptBar

For avatar/profile badge, sidebar/navigation rail, typography, layout, card, icon wrapper, or prompt bar, output:
Unknown / verify from Kaze

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
- Do not shorten filenames.
- Do not infer alternate filenames.
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
- Output only the five markdown files.
- Do not include reasoning, chain-of-thought, analysis, citations, <details> blocks, commentary, explanation, or explanatory notes outside the file sections.
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
- Unknowns / Needs Confirmation section

pack-manifest.md must stay clean. Do not include:
- Kaze component verification
- confirmed Kaze components
- Kaze token details
- design token details
- color tokens
- spacing details
- component names
- implementation details
- implementation instructions
- API endpoint details
- route details
- route names
- URLs
- Storybook instructions
- CSS values
- px values
- exact pixel values

Do not write "Exact spacing and sizing tokens are not provided in the design specs." in pack-manifest.md. Write "Detailed layout measurements are not provided." or omit the note.

Do not write "Animation behavior for the Thinking selector and quick action buttons is unconfirmed." in pack-manifest.md. Write "Interaction behaviour for the Thinking selector and quick action buttons is unconfirmed."

If route details are unknown, write only:
Navigation behaviour is not confirmed.

Do not write route details, route names, URLs, API endpoints, or implementation assumptions in pack-manifest.md.

Unknown items in pack-manifest.md must be under this exact heading:
## Unknowns / Needs Confirmation

Do not leave unknowns as loose bullets after Main Visible Actions.

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

Icon wording rule for handoff.md:
- Write "Specific Font Awesome icons should be verified against the project icon setup."
- Do not write likely icon candidate lists such as "plus, microphone, image, pen, globe are likely candidates".

Interaction wording rule for handoff.md:
- Write "Interact with the visible \`Thinking\` selector. Exact options are unknown."
- Do not write "Select a mode from the dropdown selector".

3. kaze-component-mapping.md
Must include:
- Source files
- Rule section
- Screen-specific mapping table using exactly this column pattern:
  | UI Element | Intended Kaze Pattern | Exact Kaze Component | Confidence | Notes |
- Icon mapping table
- Confidence levels
- Unknown / verify from Kaze where needed

kaze-component-mapping.md rules:
- If component exists in catalog, use exact component.
- If not in catalog, use "Unknown / verify from Kaze".
- Do not use fake Kaze* names.
- For uncertain icons, use "Unknown / verify Font Awesome icon".
- Only high-confidence icons like plus, microphone, image, pen, and globe can be named.
- Prompt input can map to KazeInput if catalog confirms it.
- Buttons can map to KazeButton if catalog confirms it.
- Thinking selector can map to KazeSelect if catalog confirms it.
- Sidebar, avatar, typography, layout, and prompt bar must remain "Unknown / verify from Kaze" unless the catalog confirms them.

Icon table wording rules:
- Do not write "Known standard icon".
- For Plus / Attachment, write "Likely Font Awesome plus icon; verify project icon setup."
- For Microphone, write "Likely Font Awesome microphone icon; verify project icon setup."
- For Image, write "Likely Font Awesome image icon; verify project icon setup."
- For Pen / Edit, write "Likely Font Awesome pen/edit icon; verify project icon setup."
- For Globe, write "Likely Font Awesome globe icon; verify project icon setup."
- For Sidebar Nav Icons, write "Unknown / verify Font Awesome icon."

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
- Inspect existing Kaze usage examples
- Inspect Kaze package exports
- Inspect Storybook/docs if available
- Verify exact Kaze components and props
- Do not use guessed Kaze components
- Run typecheck/build if available

The Cline prompt must include this exact section:

## Critical First Step

Before writing code:

1. Inspect actual project structure.
2. Inspect existing pages/screens that already use Kaze.
3. Inspect Kaze package exports.
4. Inspect Kaze Storybook/docs if available.
5. Confirm exact Kaze component names and props.
6. Do not use guessed Kaze components.
7. If a suggested Kaze component does not exist, use the closest approved Kaze/project pattern and report it.

The exact phrase "Inspect actual project structure." must appear in cline-implementation-prompt.md.

The Cline prompt must include these implementation rules:
- Use Kaze components where available.
- Do not use raw input/button/select/table/modal/form controls if Kaze equivalents exist.
- Use raw HTML only for non-interactive layout wrappers.
- Do not use Ant Design directly if Kaze wraps it.
- Do not invent routes.
- Do not invent APIs.
- Do not invent dropdown values.
- Do not invent permission rules.
- Mark unknown behaviour as TODO.
- Run typecheck/build if available.
- Report unresolved unknowns and fallback choices.
- Do not write "Use KazeInput or similar text component for the greeting if supported, otherwise use raw HTML with verified typography styles."
- Instead write "Use the existing project typography/heading pattern for the greeting. If Kaze has a confirmed typography component, use it; otherwise use the approved project text pattern."
- Do not write "Use KazeInput or similar for the sidebar if it's interactive, otherwise verify sidebar pattern."
- Instead write "Use the existing project sidebar/navigation pattern if available. Do not use KazeInput for sidebar/navigation. If no approved pattern exists, document the fallback and keep raw HTML limited to non-interactive layout wrappers."

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
- Write "Sidebar navigation is implemented or marked as TODO." instead of "Sidebar links navigate correctly."
- Write "Avatar interaction is implemented or marked as TODO." instead of "Avatar click opens profile/account menu."
- Write "Avatar interaction is implemented or marked as TODO." instead of "Avatar opens profile menu."
- Write "Voice button behaviour is implemented or marked as TODO." instead of "Voice button triggers expected input state."
- Write "Voice button behaviour is implemented or marked as TODO." instead of "Voice button triggers expected audio UI."
- Write "Voice button behaviour is implemented or marked as TODO." instead of "Voice button toggles between idle and recording states."
- Write "Microphone button behaviour is implemented or marked as TODO." instead of "Microphone button triggers audio input."
- Write "Thinking selector behaviour is implemented or marked as TODO." instead of "Thinking dropdown opens and allows selection."
- Write '"Thinking" selector behaviour is implemented or marked as TODO.' instead of '"Thinking" selector opens and allows selection.'
- Write "Thinking selector behaviour is implemented or marked as TODO." instead of "Thinking selector displays options and updates on change."
- Write "Quick action button behaviour is implemented or marked as TODO." instead of "Quick action buttons trigger appropriate flows."
- Write "Quick action behaviour is implemented or marked as TODO." instead of "Quick action buttons navigate to or trigger their respective flows."
- Write "White action button behaviour is implemented or marked as TODO." instead of "White action button triggers submission."

Now generate the five markdown files.

PACK INPUT:
${params.packInputMarkdown}

KAZE COMPONENT CATALOG:
${params.kazeComponentCatalog}

FILE MAP:
${params.fileMapText}`;
}
