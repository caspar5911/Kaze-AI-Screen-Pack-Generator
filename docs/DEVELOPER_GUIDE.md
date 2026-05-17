# Developer Guide

This guide explains how the Kaze Screen Pack Generator is structured and where to update core behavior.

For a narrative walkthrough of the full browser-to-ZIP path, see [End-To-End Flow](END_TO_END_FLOW.md).

## Frontend Architecture

Frontend code lives in:

```text
client/src
```

Main entry points:

- `App.tsx`: Overall state, theme, form data, screenshots, generation submit, model loading.
- `api/aiAssist.ts`: Sends screenshot-based AI assist requests to `POST /api/ai-assist`.
- `api/generatePack.ts`: Sends `multipart/form-data` to `POST /api/generate-pack`.
- `api/listModels.ts`: Calls `GET /api/models`.
- `components/PackDetailsCard.tsx`: Project details form and button-triggered AI assist actions.
- `components/ScreenshotUploadCard.tsx`: Upload area, file list, filename warnings, File Map Preview.
- `components/AdvancedSettingsCard.tsx`: Endpoint/model settings and model dropdown.
- `components/OutputPanel.tsx`: Empty state and generated output container.
- `components/OutputTabs.tsx`: Markdown tabs, warnings, quality status.
- `components/CopyButtons.tsx`: Copy current, copy all, download ZIP, regenerate.
- `styles.css`: Layout, dark/light themes, responsive styling.

Frontend state:

- Endpoint URL and model name are persisted in `localStorage`.
- Theme is persisted in `localStorage`.
- Screenshots are kept in browser state until generation.

## Backend Architecture

Backend code lives in:

```text
server/src
```

Main entry points:

- `index.ts`: Express app, CORS, API routes, static client hosting after build.
- `routes/aiAssist.ts`: `POST /api/ai-assist`.
- `routes/generatePack.ts`: `POST /api/generate-pack`.
- `routes/models.ts`: `GET /api/models`.
- `services/fileMap.ts`: Builds File Map from uploaded files.
- `services/promptBuilder.ts`: Builds `pack-input.md` and AI prompt.
- `services/aiClient.ts`: Calls Ollama or OpenAI-compatible endpoint.
- `services/aiAssist.ts`: Builds strict AI assist prompts and parses JSON responses.
- `services/kazeCatalog.ts`: Uses the loaded Kaze catalog, with `config/kaze-component-catalog.local.json` as the legacy local fallback, and centralizes confirmed exports, fake-name repairs, role-to-export mapping, and cross-file Kaze validation.
- `services/responseParser.ts`: Parses, sanitizes, validates, and scores AI output.
- `services/modelDiscovery.ts`: Lists available models for supported endpoint styles.
- `utils/filenameParser.ts`: Screenshot filename parsing and image extension checks.

## API Endpoints

### POST /api/ai-assist

Consumes:

```text
multipart/form-data
```

Fields:

- `aiEndpointUrl`
- `modelName`
- `targetField`: `screenName`, `shortDescription`, `additionalNotes`, or `all`
- `screenName`
- `shortDescription`
- `additionalNotes`
- `screenshots`

Returns:

```json
{
  "screenName": "AI Assistant Home Screen",
  "shortDescription": "Home screen for an AI assistant interface with a greeting section, prompt input area, and quick action shortcuts.",
  "additionalNotes": "Match the centered greeting layout, rounded prompt input container, shortcut action buttons, and clean spacing."
}
```

The route uses the configured on-prem/local AI endpoint through `aiClient.ts`.
It does not log base64 image data or full AI responses.

### POST /api/generate-pack

Consumes:

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

Returns:

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
    "label": "Pack Ready",
    "score": 10,
    "issues": []
  }
}
```

Validation:

- At least one screenshot is required.
- Project name is required.
- Short description is required.
- AI endpoint URL is required and must be a valid URL.
- Model name is required.

## File Upload Handling

Uploads use Multer disk storage in:

```text
server/tmp/uploads
```

Temporary upload filenames are randomized for local storage safety, but the original uploaded filename is preserved and used for File Map generation.

Limits:

- Max file size: 15 MB
- Max files: 20
- Allowed extensions: `.png`, `.jpg`, `.jpeg`, `.webp`

Files are cleaned up in the route `finally` block after generation.

## File Map Generation

`buildFileMap` receives uploaded file metadata and returns:

- `entries`
- `text`
- `warnings`

Example:

```text
File Map:
1. HomeGreeting_Default_Desktop.png = attached image 1
```

The order of File Map entries matches the order images are attached to the AI endpoint.

## Filename Parsing

Implemented in:

```text
server/src/utils/filenameParser.ts
```

Rule:

1. Remove extension.
2. Split basename by `_`.
3. First part is `ScreenName`.
4. Last part is `Viewport`.
5. Middle part or parts are `State`.

`HomeGreeting_Default_Desktop.png` parses as:

- ScreenName: `HomeGreeting`
- State: `Default`
- Viewport: `Desktop`

Invalid filenames produce warnings but do not block generation.

## pack-input.md Generation

Implemented in:

```text
server/src/services/promptBuilder.ts
```

The backend builds `pack-input.md` internally from form fields, uploaded screenshots, parsed screenshot names, and File Map text. It is not written to disk.

## Kaze Package Catalog

The generator targets:

```text
@pcs-security/kaze-ui-library v3.1.8
```

The package uses unprefixed named exports. Use `Button`, `TextField`, `Dropdown`, `Avatar`, and `Typography`, not `KazeButton`, `KazeInput`, `KazeSelect`, `KazeAvatar`, or `KazeTypography`.

Source files:

```text
config/kaze-component-catalog.md
config/kaze-component-catalog.local.json
```

The Markdown catalog is injected into model prompts. The JSON catalog is for deterministic sanitizer and validator logic, including:

- `confirmedExports`
- `patternMappings`
- `forbiddenFakeNames`
- `wrongNameRepairs`

When package exports change, update both catalog files together.

## AI Prompt Construction

Prompt construction uses the 3-stage generation pipeline in `promptBuilder.ts`:

- Stage 1: generate `pack-manifest.md` locally from form fields, File Map, and parsed filenames.
- Stage 2: call the vision model to generate `handoff.md` and `kaze-component-mapping.md` using the sanitized manifest.
- Stage 3: call the text model path to generate `cline-implementation-prompt.md` and `qa-checklist.md` using sanitized previous outputs.

Prompts include:

- Compact pack context from generated `pack-input.md`
- Compact catalog JSON from the loaded Kaze catalog, falling back to `config/kaze-component-catalog.local.json`
- File Map
- Strict output and safety rules

The Stage 2 mapping table uses `Exact Kaze Export`, and that column may contain only one confirmed export from the catalog or `Unknown / verify from Kaze`.

## AI Endpoint Handling

Implemented in:

```text
server/src/services/aiClient.ts
```

Supported endpoint styles:

- Ollama: endpoint path ends with `/api/chat`
- OpenAI-compatible exact chat endpoint: `/v1/chat/completions`
- OpenAI-compatible base endpoint: `/v1`, normalized to `/v1/chat/completions`
- OpenAI-compatible host root: normalized to `/v1/chat/completions`

Model discovery derives the matching models endpoint. For OpenAI-compatible
servers, `/v1` and host root resolve to `/v1/models`, while
`/v1/chat/completions` resolves to `/v1/models`.

Ollama payload:

```json
{
  "model": "qwen3.6:35b",
  "stream": false,
  "messages": [
    {
      "role": "user",
      "content": "...",
      "images": ["base64"]
    }
  ]
}
```

OpenAI-compatible payload:

```json
{
  "model": "qwen3.6-vl",
  "stream": false,
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "..." },
        { "type": "image_url", "image_url": { "url": "data:image/png;base64,..." } }
      ]
    }
  ]
}
```

## Response Parsing

Implemented in:

```text
server/src/services/responseParser.ts
```

The parser expects these file markers:

```text
--- File: pack-manifest.md ---
--- File: handoff.md ---
--- File: kaze-component-mapping.md ---
--- File: cline-implementation-prompt.md ---
--- File: qa-checklist.md ---
```

If parsing misses files, the response includes warnings and the frontend can show Raw Response for review.

## Sanitizer Rules

The sanitizer repairs common unsafe AI output:

- Removes reasoning blocks and outer markdown fences.
- Repairs screen headings to use ScreenName only.
- Replaces unsafe state labels like `Default / Empty`.
- Repairs known fake `Kaze*` names to real exports when deterministic, for example `KazeButton` to `Button`, `KazeInput` to `TextField`, and `KazeSelect` to `Dropdown`.
- Replaces unconfirmed fake `Kaze*` names with `Unknown / verify from Kaze`.
- Replaces invented mobile/tablet filenames with `Mobile/tablet layouts are not provided.`.
- Replaces other invented filenames with `Screenshot not provided in uploaded File Map.`.
- Cleans `pack-manifest.md` so implementation details do not leak into the manifest.
- Repairs manifest visible-action placeholders into concrete action bullets where deterministic.
- Moves unknown manifest bullets into `## Unknowns / Needs Confirmation`.
- Inserts the required Cline `## Critical First Step` section if missing.
- Requires `pack-manifest.md` to include `## Pack Contents` with `README_FOR_CLINE.md`, all five markdown files, and exact screenshot paths.
- Requires `cline-implementation-prompt.md` to include placement, screenshot usage, implementation sequence, anti-hallucination, Kaze setup, and final response format sections.
- Repairs contradictory mapping lines that put real exports such as `Button`, `TextField`, `Dropdown`, `Avatar`, or `Typography` under forbidden names.
- Normalizes clickable quick action component mappings to `Button` unless interactive `Pills` behaviour is confirmed.
- Rewrites unsafe QA checklist assumptions as TODO-safe checklist items.
- Deduplicates repaired QA checklist items.

## Validator Rules

Validation scans sanitized output for:

- Forbidden fake Kaze-prefixed names.
- Invalid `Exact Kaze Export` table cells.
- Invented or unavailable filenames.
- `Filename not in File Map` placeholder text.
- Reasoning or analysis text.
- Bad state labels like `Default / Empty`.
- Manifest visible-action placeholder text.
- Missing manifest pack inventory or `README_FOR_CLINE.md` reference.
- Manifest pollution: tokens, spacing, CSS, px, routes, APIs, Storybook, implementation details.
- Embedded full `pack-manifest.md` or `handoff.md` content inside `cline-implementation-prompt.md`.
- Missing Cline-ready prompt sections, including Kaze setup guidance.
- Contradictory Kaze import guidance such as describing `Button` as fake or listing real exports as forbidden.
- Quick action buttons mapped to `Pills` without confirmed interactive behaviour.
- Unsafe QA assumptions.
- Missing Cline verification rules.
- Missing screenshot filenames in `pack-manifest.md`.

The frontend ZIP validator fails download if the Cline-ready ZIP would miss
`screenshots/`, screenshot files, `README_FOR_CLINE.md`, `validate-pack.mjs`,
`cline-readiness-standard.md`, or any generated markdown file. The validation
script is generated per pack so it checks the exact uploaded screenshot paths.

Warnings are shown under Generation Warnings in the frontend.

## Quality Score

Quality is computed after parsing and sanitization.

Statuses:

- `Pack Ready`: All expected files are present and sanitized output has no warnings.
- `Needs Review`: Files are usable but warnings remain.
- `Failed`: Critical parsing or output issues remain, such as missing files or reasoning blocks.

Route-level filename warnings are merged with parser warnings before returning the response.

## Kaze Component Catalog

Update confirmed exports here:

```text
config/kaze-component-catalog.md
config/kaze-component-catalog.local.json
```

Do not add guessed exports. Only add a Kaze export after verifying it in `@pcs-security/kaze-ui-library`, real project usage, Storybook, or internal docs. Sidebar/navigation rail remains `Unknown / verify from Kaze` unless an approved project pattern exists.
