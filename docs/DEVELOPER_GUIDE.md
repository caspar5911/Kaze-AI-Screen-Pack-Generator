# Developer Guide

This guide explains how the Kaze Screen Pack Generator is structured and where to update core behavior.

## Frontend Architecture

Frontend code lives in:

```text
client/src
```

Main entry points:

- `App.tsx`: Overall state, theme, form data, screenshots, generation submit, model loading.
- `api/generatePack.ts`: Sends `multipart/form-data` to `POST /api/generate-pack`.
- `api/listModels.ts`: Calls `GET /api/models`.
- `components/PackDetailsCard.tsx`: Project details form.
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
- `routes/generatePack.ts`: `POST /api/generate-pack`.
- `routes/models.ts`: `GET /api/models`.
- `services/fileMap.ts`: Builds File Map from uploaded files.
- `services/promptBuilder.ts`: Builds `pack-input.md` and AI prompt.
- `services/aiClient.ts`: Calls Ollama or OpenAI-compatible endpoint.
- `services/responseParser.ts`: Parses, sanitizes, validates, and scores AI output.
- `services/modelDiscovery.ts`: Lists available models for supported endpoint styles.
- `utils/filenameParser.ts`: Screenshot filename parsing and image extension checks.

## API Endpoint

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
    "label": "10/10 Ready",
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

## AI Prompt Construction

`buildAiPrompt` combines:

- Generated `pack-input.md`
- `config/kaze-component-catalog.md`
- File Map
- Strict output and safety rules

The prompt tells the model to return exactly five markdown files separated by file markers.

## AI Endpoint Handling

Implemented in:

```text
server/src/services/aiClient.ts
```

Supported endpoint styles:

- Ollama: endpoint path ends with `/api/chat`
- OpenAI-compatible: all other endpoint URLs are treated as chat completions style

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
- Replaces unconfirmed `Kaze*` components with `Unknown / verify from Kaze`.
- Replaces invented filenames with `Filename not in File Map`.
- Cleans `pack-manifest.md` so implementation details do not leak into the manifest.
- Moves unknown manifest bullets into `## Unknowns / Needs Confirmation`.
- Inserts the required Cline `## Critical First Step` section if missing.
- Rewrites unsafe QA checklist assumptions as TODO-safe checklist items.
- Deduplicates repaired QA checklist items.

## Validator Rules

Validation scans sanitized output for:

- Forbidden Kaze components.
- Invented or unavailable filenames.
- Reasoning or analysis text.
- Bad state labels like `Default / Empty`.
- Manifest pollution: tokens, spacing, CSS, px, routes, APIs, Storybook, implementation details.
- Unsafe QA assumptions.
- Missing Cline verification rules.
- Missing screenshot filenames in `pack-manifest.md`.

Warnings are shown under Generation Warnings in the frontend.

## Quality Score

Quality is computed after parsing and sanitization.

Statuses:

- `10/10 Ready`: All expected files are present and sanitized output has no warnings.
- `Needs Review`: Files are usable but warnings remain.
- `Failed`: Critical parsing or output issues remain, such as missing files or reasoning blocks.

Route-level filename warnings are merged with parser warnings before returning the response.

## Kaze Component Catalog

Update confirmed components here:

```text
config/kaze-component-catalog.md
```

Do not add guessed components. Only add a Kaze component after verifying it in the real project, package exports, Storybook, or internal docs.
