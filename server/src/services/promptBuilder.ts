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

export function buildManifestPrompt(params: {
  packInputMarkdown: string;
  fileMapText: string;
}): string {
  return `You are a Kaze UI Screen Pack Manifest Generator.

Generate only pack-manifest.md.

Input:
- pack-input.md
- File Map
- Attached screenshots

Context:
- Screenshots are exported from Figma/Sketch as images.
- Each screenshot represents one screen or one state of a screen.
- The manifest is used to organize screenshots before generating handoff and implementation documents.
- Do not generate React code.
- Do not mention Kaze components.
- Do not mention Kaze tokens.
- Do not mention CSS.
- Do not mention API endpoints.
- Do not mention route names or route details.
- Do not mention Storybook.
- Do not include implementation instructions.

Filename rules:
- Use only filenames from the File Map.
- Do not invent filenames.
- Do not rename filenames.
- Do not shorten filenames.
- Derive ScreenName, State, and Viewport strictly from the filename.

Filename parsing:
<ScreenName>_<State>_<Viewport>.png

Example:
HomeGreeting_Default_Desktop.png
ScreenName = HomeGreeting
State = Default
Viewport = Desktop

Screen heading rule:
Use ScreenName only.

Correct:
### HomeGreeting

Incorrect:
### Screen: HomeGreeting
### Screen Name: HomeGreeting
### HomeGreeting_Default

State rule:
Do not label landing/home screens as Empty state unless the filename state is Empty or the screenshot clearly shows an empty data/table/list state.

Required pack-manifest.md sections:
# Pack Manifest

## Project / Feature Name

## Short Description

## Design Source

## Screens

For each screen:
### <ScreenName>

Purpose:
...

Screenshots:
- \`<ExactFilename>\`
  - State: \`<State>\`
  - Viewport: \`<Viewport>\`

Main Visible Actions:
- ...

## Unknowns / Needs Confirmation
- ...

For the HomeGreeting screen, include these exact unknowns:
- Navigation behaviour is not confirmed.
- Avatar interaction is not confirmed.
- Thinking selector options are not visible.
- White circular action button behaviour is not confirmed.
- Quick action behaviours are not confirmed.
- Voice input behaviour is not confirmed.

Manifest scope:
pack-manifest.md must only include:
- Project / feature name
- Short description
- Design source
- Screens grouped by ScreenName
- Screenshot list
- Detected state
- Detected viewport
- Inferred screen purpose
- Main visible actions
- Unknowns / needs confirmation

pack-manifest.md must NOT include:
- Kaze component names
- Kaze component verification
- Kaze token details
- color token details
- spacing details
- CSS values
- px values
- route names
- route details
- API endpoints
- Storybook instructions
- implementation instructions

Output rules:
- Output only this file marker and content.
- Do not include reasoning, analysis, citations, <details> blocks, or commentary.

Use exact marker:

--- File: pack-manifest.md ---
[content]

PACK INPUT:
${params.packInputMarkdown}

FILE MAP:
${params.fileMapText}`;
}

export function buildHandoffMappingPrompt(params: {
  packInputMarkdown: string;
  packManifestMarkdown: string;
  kazeComponentCatalog: string;
  fileMapText: string;
}): string {
  return `You are a Kaze UI Handoff and Component Mapping Generator.

Generate only:
1. handoff.md
2. kaze-component-mapping.md

Input:
- pack-input.md
- sanitized pack-manifest.md
- kaze-component-catalog.md
- File Map
- Attached screenshots

Context:
- Designs follow Kaze UI.
- Icons use Font Awesome where available.
- Standard Kaze states such as loading, empty, error, disabled, validation, modal, and table states already exist unless screenshots show custom behaviour.
- Do not generate React code.

Critical Kaze component rules:
- Use kaze-component-catalog.md as the only trusted list of confirmed Kaze components.
- Allowed exact Kaze components are ONLY those listed under Confirmed Kaze Components.
- Do not invent Kaze component names or props.
- If a UI pattern is not confirmed in the catalog, output:
  Unknown / verify from Kaze
- Use "Intended Kaze Pattern" when exact component is not confirmed.

Do not output these unless explicitly listed in kaze-component-catalog.md:
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
- KazeGreeting
- KazePromptBar

For sidebar, avatar, typography, layout, card, icon wrapper, or prompt bar:
- Output Unknown / verify from Kaze unless the catalog confirms a component.

Visual accuracy rules:
- Do not output exact pixel measurements unless provided in pack-input.md or design specs.
- If estimating spacing, sizing, colours, or radius from screenshot, label them as approximate visual estimate.
- Prefer Kaze tokens and existing project styles over hardcoded pixel/hex values.
- Do not invent animation values such as scale, transition duration, hover lift, or custom focus effects.
- For unknown behaviours, write "Use standard Kaze behaviour" instead of inventing custom behaviour.
- For unknown icons, write "Unknown / verify Font Awesome icon".

handoff.md must include:
- Overview
- Screenshots
- Visible layout
- Main user actions
- Visual notes
- Required states
- Unknowns / needs confirmation

State rules:
For HomeGreeting_Default_Desktop.png or similar landing screens:
- Default: shown in screenshot
- Input focused: likely, use standard Kaze/project input behaviour
- Input with text: likely, implement only if existing project pattern supports action enable/disable behaviour
- Processing/loading: unknown, mark TODO unless confirmed
- Error: unknown, only if submit/search action is implemented
- Disabled: unknown, only if rules require it

Do not include:
- Empty
- Default / Empty
- Initial / Empty
- Empty no history

unless filename state is Empty or UI clearly shows an empty data/list/table state.

kaze-component-mapping.md must include:
- Source files
- Rule section
- Screen-specific mapping table
- Icon mapping table
- Confidence levels
- Unknown / verify from Kaze where needed

Mapping table format:
| UI Element | Intended Kaze Pattern | Exact Kaze Component | Confidence | Notes |

Exact Kaze Component cell rules:
- Each Exact Kaze Component cell must contain only one clear value.
- Use either a confirmed component from the catalog, OR Unknown / verify from Kaze.
- Do not write ambiguous values like Unknown / verify from Kaze / KazeButton.
- For the plus/attachment icon button, use:
  - Exact Kaze Component: KazeButton
  - Notes: Use as icon button if supported by KazeButton props; otherwise verify project pattern.

Icon wording:
- For high-confidence icons, write "Likely Font Awesome [icon type]; verify project icon setup."
- For uncertain icons, write "Unknown / verify Font Awesome icon."
- Do not use vague wording like "Known standard icon."

Output rules:
- Output only the two file sections.
- Do not include reasoning, analysis, citations, <details> blocks, or commentary.

Use exact markers:

--- File: handoff.md ---
[content]

--- File: kaze-component-mapping.md ---
[content]

PACK INPUT:
${params.packInputMarkdown}

PACK MANIFEST:
${params.packManifestMarkdown}

KAZE COMPONENT CATALOG:
${params.kazeComponentCatalog}

FILE MAP:
${params.fileMapText}`;
}

export function buildClineQaPrompt(params: {
  packInputMarkdown: string;
  packManifestMarkdown: string;
  handoffMarkdown: string;
  kazeComponentMappingMarkdown: string;
  kazeComponentCatalog: string;
}): string {
  return `You are a Kaze UI Cline Prompt and QA Checklist Generator.

Generate only:
1. cline-implementation-prompt.md
2. qa-checklist.md

Input:
- pack-input.md
- sanitized pack-manifest.md
- sanitized handoff.md
- sanitized kaze-component-mapping.md
- kaze-component-catalog.md

Context:
- This is for an existing React TypeScript project using Kaze UI.
- The generated Cline prompt must be safe for a coding agent.
- Do not generate final React code.
- Do not invent target project structure.

cline-implementation-prompt.md must include this exact section:

## Critical First Step

Before writing code:

1. Inspect actual project structure.
2. Inspect existing pages/screens that already use Kaze.
3. Inspect Kaze package exports.
4. Inspect Kaze Storybook/docs if available.
5. Confirm exact Kaze component names and props.
6. Do not use guessed Kaze components.
7. If a suggested Kaze component does not exist, use the closest approved Kaze/project pattern and report it.

Implementation rules must include:
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

Fallback rule must include:
If a Kaze component is not verified:
1. First search existing project patterns.
2. Use the closest approved existing project pattern.
3. Use raw HTML only for non-interactive layout wrappers.
4. Do not use raw input/button/select if Kaze equivalents exist.
5. Document the fallback clearly.

Final reporting must include:
After implementation, report:
- Files created or modified
- Confirmed Kaze components used
- Fallbacks used
- TODOs left unresolved
- Typecheck/build result

State requirements must not assume unknown behaviour:
- Default: shown in screenshot.
- Input focused: use standard Kaze/project input focus behaviour.
- Input with text: implement only if existing project pattern supports action enable/disable behaviour.
- Processing/loading: mark as TODO unless behaviour is confirmed.
- Error: mark as TODO unless validation or submit behaviour is confirmed.

qa-checklist.md must not assume unconfirmed behaviour works.

Bad QA wording:
- Sidebar navigation routes to correct sections.
- Avatar click opens profile menu.
- Voice button triggers expected audio state.
- Thinking dropdown opens and allows selection.
- Thinking selector displays options and updates on change.
- Quick action buttons trigger appropriate flows.
- Microphone button triggers audio input.
- White action button triggers submission.
- Screen reader announces dynamic state changes or TODO placeholders correctly.

Good QA wording:
- Sidebar navigation is implemented or marked as TODO.
- Avatar interaction is implemented or marked as TODO.
- Voice button behaviour is implemented or marked as TODO.
- Thinking selector behaviour is implemented or marked as TODO.
- Quick action behaviour is implemented or marked as TODO.
- Microphone button behaviour is implemented or marked as TODO.
- White action button behaviour is implemented or marked as TODO.
- Screen reader behaviour is verified for implemented dynamic states.

qa-checklist.md must include:
- Visual checks
- Functional checks
- Kaze compliance checks
- Code quality checks
- Accessibility checks

Output rules:
- Output only the two file sections.
- Do not include reasoning, analysis, citations, <details> blocks, or commentary.

Use exact markers:

--- File: cline-implementation-prompt.md ---
[content]

--- File: qa-checklist.md ---
[content]

PACK INPUT:
${params.packInputMarkdown}

PACK MANIFEST:
${params.packManifestMarkdown}

HANDOFF:
${params.handoffMarkdown}

KAZE COMPONENT MAPPING:
${params.kazeComponentMappingMarkdown}

KAZE COMPONENT CATALOG:
${params.kazeComponentCatalog}`;
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
