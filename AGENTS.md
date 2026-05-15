# AGENTS.md

AI coding agents working in this repository must follow this guide. This project is an internal on-prem tool for generating implementation documents from screenshots. It is not a target application implementation repo.

## Project Purpose

Kaze Screen Pack Generator converts Kaze-based Figma/Sketch screenshot exports into a five-file markdown pack for developers and coding agents.

The app accepts:

- Project / Feature Name
- Short Description
- Design Source
- Icon System
- Additional Notes
- Screenshot uploads
- Advanced AI endpoint/model settings

The app outputs:

- `pack-manifest.md`
- `handoff.md`
- `kaze-component-mapping.md`
- `cline-implementation-prompt.md`
- `qa-checklist.md`

The app must not directly modify target React projects. It only generates documents.

## High-Level Architecture

```text
client/   React + TypeScript + Vite UI
server/   Express + TypeScript API
config/   Editable Kaze component catalog
docs/     Human and maintainer documentation
```

## Kaze Package Truth

The real Kaze package for generated implementation guidance is:

```text
@pcs-security/kaze-ui-library v3.1.8
```

It uses unprefixed named exports. Correct export names include:

- `Button`
- `TextField`
- `Dropdown`
- `Avatar`
- `Typography`

Do not generate fake prefixed names such as:

- `KazeButton`
- `KazeInput`
- `KazeSelect`
- `KazeAvatar`
- `KazeTypography`

Use `Exact Kaze Export` terminology in generated mapping tables. The source of truth is `config/kaze-component-catalog.md` plus `config/kaze-component-catalog.json`.

Sidebar/navigation rail, layout containers, prompt bar wrappers, icon wrappers, and card/panel patterns remain `Unknown / verify from Kaze` unless actual project usage confirms an approved pattern.

Frontend responsibilities:

- Render the form and upload workflow.
- Show uploaded filenames and filename warnings.
- Show File Map Preview.
- Manage endpoint/model fields and model discovery UI.
- Submit `multipart/form-data` to the backend.
- Display generated files in tabs.
- Show Generation Warnings and quality status.
- Copy current file, copy all, download ZIP, regenerate.

Backend responsibilities:

- Validate required fields.
- Accept screenshot uploads.
- Preserve original uploaded filenames.
- Parse filenames into ScreenName, State, Viewport.
- Build File Map.
- Build `pack-input.md` internally.
- Load `config/kaze-component-catalog.md`.
- Build strict staged AI prompts.
- Send prompts and images to the configured AI endpoint.
- Parse model responses into the five output files.
- Sanitize unsafe AI output.
- Validate final sanitized output.
- Return files, warnings, raw response, and quality status.

## End-To-End Workflow

1. User fills the form in the frontend.
2. User uploads one or more screenshots.
3. Frontend shows uploaded filenames and File Map Preview.
4. Frontend sends `POST /api/generate-pack`.
5. Backend validates fields and uploaded screenshots.
6. Backend stores uploads temporarily under `server/tmp/uploads`.
7. Backend reads original filenames from Multer metadata.
8. Backend builds File Map in upload order.
9. Backend generates internal `pack-input.md`.
10. Backend loads `config/kaze-component-catalog.md`.
11. Backend runs the strict 3-stage generation pipeline.
12. Stage 1 locally generates `pack-manifest.md` from form fields, File Map, and parsed filenames.
13. Stage 2 uses the sanitized manifest and screenshots to generate `handoff.md` and `kaze-component-mapping.md`.
14. Stage 3 uses sanitized prior outputs, without screenshots, to generate `cline-implementation-prompt.md` and `qa-checklist.md`.
15. Backend parses each stage response by file markers.
16. Backend sanitizes and validates output files.
17. Backend returns generated files, raw AI responses, warnings, and quality.
18. Frontend renders output tabs and warning/quality UI.

## Important Files And Folders

Root:

- `package.json`: workspace scripts.
- `README.md`: human project overview.
- `AGENTS.md`: this AI coding agent guide.
- `config/kaze-component-catalog.md`: confirmed Kaze exports and unconfirmed patterns.
- `config/kaze-component-catalog.json`: machine-readable package exports, pattern mappings, forbidden fake names, and deterministic repairs.

Client:

- `client/src/App.tsx`: top-level app state, form submit, model loading, theme.
- `client/src/api/generatePack.ts`: submits `multipart/form-data`.
- `client/src/api/aiAssist.ts`: submits screenshot-based on-prem AI assist requests.
- `client/src/api/listModels.ts`: loads available models from `/api/models`.
- `client/src/components/PackDetailsCard.tsx`: project details fields and AI assist buttons.
- `client/src/components/ScreenshotUploadCard.tsx`: drag/drop upload, file list, warnings, File Map Preview.
- `client/src/components/AdvancedSettingsCard.tsx`: endpoint and model controls.
- `client/src/components/OutputPanel.tsx`: empty state and output container.
- `client/src/components/OutputTabs.tsx`: generated file tabs, warnings, quality status.
- `client/src/components/CopyButtons.tsx`: copy/download/regenerate controls.
- `client/src/utils/filenameParser.ts`: client-side filename warning logic.
- `client/src/styles.css`: layout, themes, responsive UI.

Server:

- `server/src/index.ts`: Express server, route mounting, static client hosting.
- `server/src/routes/generatePack.ts`: generation endpoint.
- `server/src/routes/aiAssist.ts`: on-prem AI assist endpoint.
- `server/src/routes/models.ts`: model discovery endpoint.
- `server/src/services/fileMap.ts`: File Map creation.
- `server/src/services/promptBuilder.ts`: `pack-input.md` and AI prompt construction.
- `server/src/services/aiClient.ts`: Ollama/OpenAI-compatible AI calls.
- `server/src/services/aiAssist.ts`: AI assist prompt construction and JSON response parsing.
- `server/src/services/modelDiscovery.ts`: model list discovery.
- `server/src/services/responseParser.ts`: response parsing, sanitizer, validator, quality score.
- `server/src/utils/filenameParser.ts`: backend filename parser.

Docs:

- `docs/USER_GUIDE.md`: internal user workflow.
- `docs/DEVELOPER_GUIDE.md`: maintainer architecture.
- `docs/AI_PROMPT_GUIDE.md`: prompt contract.
- `docs/OUTPUT_SPEC.md`: generated file expectations.
- `docs/TROUBLESHOOTING.md`: common failure modes.

## Local Commands

Install:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

Default URLs:

- Frontend: `http://127.0.0.1:5179`
- Backend: `http://127.0.0.1:3971`

Typecheck:

```bash
npm run test:run
```

Build:

```bash
npm run build
```

## API Contract

### POST /api/ai-assist

Request type:

```text
multipart/form-data
```

Fields:

- `aiEndpointUrl`
- `modelName`
- `targetField`
- `screenName`
- `shortDescription`
- `additionalNotes`
- `screenshots`

Response:

```json
{
  "screenName": "...",
  "shortDescription": "...",
  "additionalNotes": "..."
}
```

This endpoint is for button-triggered on-prem screenshot-based AI assist only. It must not call public cloud model providers directly.

### POST /api/generate-pack

Request type:

```text
multipart/form-data
```

Fields:

- `projectName`
- `shortDescription`
- `designSource`
- `iconSystem`
- `additionalNotes`
- `aiEndpointUrl`
- `modelName`
- `screenshots`

Response:

```json
{
  "files": {
    "pack-manifest.md": "...",
    "handoff.md": "...",
    "kaze-component-mapping.md": "...",
    "cline-implementation-prompt.md": "...",
    "qa-checklist.md": "..."
  },
  "warnings": [],
  "rawResponse": "...",
  "quality": {
    "status": "ready",
    "label": "10/10 Ready",
    "score": 10,
    "issues": []
  }
}
```

### GET /api/models

Query:

```text
endpointUrl=<AI endpoint URL>
```

Discovers models from:

- Ollama `/api/tags`
- OpenAI-compatible `/models`

## File Map Rules

The File Map is critical. Local AI models receive image data, not filename-aware file objects.

Example:

```text
File Map:
1. HomeGreeting_Default_Desktop.png = attached image 1
2. UserList_Empty_Desktop.png = attached image 2
```

Rules:

- File Map order must match image attachment order.
- Use original uploaded filenames, not temporary storage filenames.
- Never rely on the model to infer filenames from screenshots.
- The prompt must include the File Map.
- Output must use only filenames from the File Map.

## Filename Parsing Rules

Expected format:

```text
<ScreenName>_<State>_<Viewport>.png
```

Allowed extensions:

- `.png`
- `.jpg`
- `.jpeg`
- `.webp`

Allowed viewports:

- `Desktop`
- `Tablet`
- `Mobile`
- `Unknown`

Parser rule:

1. Remove extension.
2. Split basename by `_`.
3. First part is `ScreenName`.
4. Last part is `Viewport`.
5. Middle part or parts joined with `_` are `State`.

Example:

```text
HomeGreeting_Default_Desktop.png
```

Must parse as:

- ScreenName: `HomeGreeting`
- State: `Default`
- Viewport: `Desktop`

Manifest heading must be:

```md
### HomeGreeting
```

Never:

```md
### Screen: HomeGreeting

### Screen Name: HomeGreeting

### HomeGreeting_Default
```

Filename warnings do not block generation.

## Kaze Component Catalog Rules

The source of truth is:

```text
config/kaze-component-catalog.md
```

Allowed exact Kaze exports are only those listed under Confirmed Exports in the catalog.

If a pattern is not confirmed, output:

```text
Unknown / verify from Kaze
```

Do not invent Kaze export names or props. Do not prefix real exports with `Kaze`.

Use these real mappings:

- `KazeButton` is wrong; use `Button`.
- `KazeInput` is wrong; use `TextField`.
- `KazeSelect` is wrong; use `Dropdown`.
- `KazeAvatar` is wrong; use `Avatar`.
- `KazeTypography` is wrong; use `Typography`.

Forbidden unless explicitly confirmed in the catalog:

- `KazeButton`
- `KazeInput`
- `KazeSelect`
- `KazeSidebar`
- `KazeAvatar`
- `KazeCard`
- `KazeIcon`
- `KazeLayout`
- `KazeText`
- `KazeTypography`
- `KazeFlex`
- `KazeBox`
- `KazeHeading`
- `KazeGreeting`
- `KazePromptBar`

For sidebar, layout, card, icon wrapper, or prompt bar, use `Unknown / verify from Kaze` unless actual project usage confirms an approved pattern. Avatar and Typography are confirmed exports, but exact props must still be verified in the target project.

## AI Prompt Responsibilities

The prompt builder must:

- Include generated `pack-input.md`.
- Include `config/kaze-component-catalog.md`.
- Include File Map.
- Include filename parsing rules.
- Include strict Kaze export rules.
- Include `pack-manifest.md` scope limits.
- Include safe QA wording rules.
- Include Cline/Codex verification rules.
- Require exact output file markers.
- Forbid reasoning, analysis, citations, `<details>` blocks, and commentary outside file sections.

Do not split generation into five independent AI calls unless the product direction changes. Keep the controlled 3-stage pipeline.

## Output File Rules

The AI response must use these exact markers:

```text
--- File: pack-manifest.md ---
--- File: handoff.md ---
--- File: kaze-component-mapping.md ---
--- File: cline-implementation-prompt.md ---
--- File: qa-checklist.md ---
```

`pack-manifest.md` must stay high-level:

- Project / feature name
- Short description
- Design source
- Screens grouped by ScreenName
- Screenshot list
- Detected state
- Detected viewport
- Inferred screen purpose
- Main visible actions
- `## Unknowns / Needs Confirmation`

`pack-manifest.md` must not include:

- Kaze export names
- Kaze export verification
- Token details
- Spacing details
- CSS values
- px values
- API endpoints
- Route names or route details
- Storybook instructions
- Implementation instructions

Unknown manifest bullets must be under:

```md
## Unknowns / Needs Confirmation
```

## Sanitizer And Validator Rules

Core file:

```text
server/src/services/responseParser.ts
```

Sanitizer should repair deterministic problems:

- Remove outer markdown fences.
- Remove known reasoning blocks.
- Repair invalid screen headings.
- Repair unsafe state labels.
- Replace `Filename unavailable`.
- Replace unconfirmed `Kaze*` components.
- Replace invented filenames.
- Clean manifest pollution.
- Move unknown bullets into the manifest unknowns section.
- Insert required Cline `## Critical First Step` section.
- Rewrite unsafe QA assumptions as TODO-safe checklist items.
- Deduplicate repaired QA checklist lines.

Validator should warn if unsafe content remains after sanitization:

- Forbidden fake Kaze-prefixed names.
- Invented filenames.
- `Default / Empty`, `Initial / Empty`, `Empty no history`.
- Reasoning, analysis, or `<details>`.
- Manifest token/spacing/CSS/API/route/Storybook/implementation pollution.
- Unsafe QA assumptions.
- Missing Cline verification rules.
- Missing screenshot list entries in `pack-manifest.md`.

Do not add warnings for raw-model mistakes that the sanitizer fully repaired unless the final sanitized output remains unsafe.

## Generation Warning Rules

Warnings shown in the UI should be actionable.

Good warnings:

- `pack-manifest.md is missing screenshot list entry: HomeGreeting_Default_Desktop.png.`
- `Generated output contains risky phrase after repair: KazeSidebar.`
- `cline-implementation-prompt.md is missing required verification rule: Inspect actual project structure.`

Avoid noisy warnings that only say the raw AI response was imperfect if the sanitized final output is clean.

Warnings should degrade quality to `Needs Review` unless the issue is critical enough for `Failed`.

## Quality Status Rules

Quality values:

- `ready`: label `10/10 Ready`, score `10`
- `needs_review`: label `Needs Review`, score `7`
- `failed`: label `Failed`, score `0`

Only show `10/10 Ready` when:

- All five files are present.
- File references match the File Map.
- ScreenName parsing is correct.
- No forbidden fake Kaze-prefixed name remains.
- No reasoning/details block remains.
- Manifest is clean.
- State is not incorrectly labeled Empty.
- QA wording does not assume unconfirmed behavior.
- Cline prompt includes verification rules.

Use `Failed` when:

- Expected files are missing.
- Reasoning/details blocks remain.
- `Filename unavailable` remains.
- `pack-manifest.md` is missing screenshot list entries.
- AI response cannot be parsed into usable files.

Use `Needs Review` when:

- Files are usable but warnings remain.

## Do-Not-Invent Rules

Do not invent:

- Kaze export names.
- Kaze props.
- Screenshot filenames.
- Routes.
- APIs.
- Dropdown values.
- Permission rules.
- Animation values.
- Pixel-perfect measurements.
- Design tokens.
- Target project structure.

When unknown, write TODO-safe wording:

```text
Unknown / verify from Kaze
```

or:

```text
... is implemented or marked as TODO.
```

## Test With HomeGreeting_Default_Desktop.png

Use this acceptance scenario for prompt/parser changes.

Input:

- Project / Feature Name: `AI Assistant Home Screen`
- Short Description: `Default landing screen for an AI assistant. Users can type a prompt, add attachments, select thinking mode, use voice input, and choose quick actions for image creation, writing, or searching.`
- Screenshot filename: `HomeGreeting_Default_Desktop.png`

Expected parse:

- ScreenName: `HomeGreeting`
- State: `Default`
- Viewport: `Desktop`

Expected `pack-manifest.md`:

- Heading: `### HomeGreeting`
- Screenshot: `HomeGreeting_Default_Desktop.png`
- State: `Default`
- Viewport: `Desktop`
- No component details.
- No token/spacing/API/route details.
- Unknowns grouped under `## Unknowns / Needs Confirmation`.

Expected component mapping:

- Greeting text maps to `Typography`.
- Prompt input maps to `TextField`.
- Buttons and icon buttons map to `Button` where supported.
- Thinking selector maps to `Dropdown`.
- Avatar/profile badge maps to `Avatar`.
- Sidebar/navigation rail, layout container, and prompt bar wrapper remain `Unknown / verify from Kaze` unless actual project usage confirms a pattern.

Expected Cline prompt:

- Includes `## Critical First Step`.
- Includes `Inspect actual project structure.`
- Requires `@pcs-security/kaze-ui-library` package export, Storybook/docs, and existing project pattern checks.
- Forbids guessed Kaze exports, routes, APIs, dropdown values, and permission rules.

Expected QA:

- Uses TODO-safe wording.
- Does not say behavior works unless confirmed.

Run checks after code changes:

```bash
npm run test:run
npm run build
```

For response parser changes, also run a focused parser sample that includes the risky phrase being fixed.

## Safe Modification Rules

When modifying this repo:

- Keep changes scoped to the requested behavior.
- Preserve the five output file contract.
- Preserve File Map ordering.
- Preserve original uploaded filenames.
- Do not remove sanitizer checks without adding equivalent coverage.
- Do not loosen Kaze export validation.
- Do not put implementation details back into `pack-manifest.md`.
- Add prompt rules and sanitizer/validator rules together when fixing recurring AI wording.
- Prefer deterministic sanitizer repairs for known repeated issues.
- Keep Raw Response available for debugging.
- Update docs when changing prompt contracts, output structure, API behavior, or quality scoring.
- Run `npm run test:run` after TypeScript changes.
- Run `npm run build` before handing off substantial code changes.

## Non-Goals

Do not add these unless explicitly requested:

- Figma API integration.
- Sketch file parsing.
- Direct project code generation.
- Direct Cline automation.
- Database.
- Authentication.
- Advanced approval workflow.
- Manual screen-state editor.
- Route/API configuration.
- Permission matrix.
- Design token extraction.

This tool is only:

```text
screenshots + short description + Kaze catalog
-> markdown implementation pack
```
