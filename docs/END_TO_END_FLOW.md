# End-To-End Flow

This guide explains how the Kaze Screen Pack Generator works from browser input to Cline-ready ZIP output.

The project is an internal on-prem generator. It does not implement target React screens and does not modify target application repositories. Its contract is:

```text
project brief + screenshot uploads + File Map + Kaze catalog
-> markdown implementation pack
-> validated Cline-ready ZIP
```

## System Overview

The repository has four main areas:

- `client/`: React + TypeScript + Vite UI for form input, upload workflow, output review, copy actions, ZIP creation, and local ZIP validation.
- `server/`: Express + TypeScript API for uploads, File Map creation, prompt generation, AI endpoint calls, parsing, sanitization, validation, and quality scoring.
- `config/`: editable Kaze component catalog files used as the source of truth for confirmed exports and forbidden fake names.
- `docs/`: maintainer, user, prompt, output, troubleshooting, and flow documentation.

The generator keeps the uploaded screenshot filenames important because local vision models receive image bytes, not filename-aware file objects. The File Map connects uploaded filenames to attached image order so generated markdown can reference the right screenshot paths.

## End-To-End Sequence

```text
Browser form
  -> POST /api/generate-pack
  -> Multer upload
  -> File Map
  -> Stage 1 manifest
  -> Stage 2 AI handoff/mapping
  -> Stage 3 local Cline/QA
  -> parse/sanitize/validate
  -> JSON response
  -> frontend tabs
  -> ZIP validation/download
```

Data flow:

```text
Form fields + screenshots + File Map + Kaze catalog
-> prompts/local templates
-> generated markdown files
-> sanitizer/validator
-> quality status
-> Cline-ready ZIP
```

## Frontend Flow

The main frontend coordinator is `client/src/App.tsx`.

It owns:

- pack form state: project name, short description, design source, icon system, additional notes, endpoint URL, model name, and Fast Mode;
- screenshot state;
- parsed filename previews;
- AI assist loading/error state;
- model discovery state;
- generation loading/progress state;
- generated response, warnings, and quality state.

Important frontend components:

- `components/PackDetailsCard.tsx`: renders project fields, Fast Mode, and button-triggered AI assist controls.
- `components/ScreenshotUploadCard.tsx`: handles screenshot selection, filename warnings, and File Map Preview.
- `components/AdvancedSettingsCard.tsx`: renders endpoint and model settings, including model loading.
- `components/OutputPanel.tsx`: wraps the empty and generated output states.
- `components/OutputTabs.tsx`: displays generated markdown files, warnings, and quality status.
- `components/CopyButtons.tsx`: copies current/all files, downloads ZIP, and triggers regenerate.

Generation starts when `App.tsx` calls `client/src/api/generatePack.ts`. That API helper builds a `FormData` payload with the current form values, `fastMode`, and uploaded screenshots, then posts it to `/api/generate-pack`.

The frontend keeps manual editing primary. AI assist only runs when the user clicks a field-level or combined assist button. When AI assist returns improved values, `App.tsx` writes them back into the same form state used for generation, so the generated pack uses the final reviewed values.

## Backend Generation Flow

The main generation route is `server/src/routes/generatePack.ts`.

The route:

1. Accepts `multipart/form-data` with Multer.
2. Validates required fields.
3. Preserves original screenshot filenames from Multer metadata.
4. Builds an ordered File Map with `services/fileMap.ts`.
5. Builds internal pack context with `services/promptBuilder.ts`.
6. Loads compact Kaze catalog JSON.
7. Runs the staged generation pipeline.
8. Parses, sanitizes, validates, and scores the final files.
9. Returns generated files or HTTP `422` with exact validation failures.
10. Cleans uploaded temp files in a `finally` block.

Temporary uploads are stored under:

```text
server/tmp/uploads
```

The route removes those files after the request completes.

## File Map And Filename Parsing

`services/fileMap.ts` converts uploaded files into File Map entries.

Example:

```text
File Map:
1. HomeGreeting_Default_Desktop.png = attached image 1
2. UserList_Empty_Desktop.png = attached image 2
```

The order must match the image attachment order sent to the AI endpoint.

Filename parsing uses `server/src/utils/filenameParser.ts`.

Expected format:

```text
<ScreenName>_<State>_<Viewport>.png
```

Example:

```text
HomeGreeting_Default_Desktop.png
```

parses to:

- ScreenName: `HomeGreeting`
- State: `Default`
- Viewport: `Desktop`

Filename warnings do not block generation. They warn the user and give the parser/sanitizer more context for safe output repair.

## Three-Stage Pack Generation

The generator uses a controlled staged pipeline.

### Stage 1: Local Manifest

`buildLocalPackManifestMarkdown` in `promptBuilder.ts` creates `pack-manifest.md` locally from:

- form fields;
- parsed filenames;
- File Map entries.

This stage does not call the AI model. The manifest stays high-level and should not contain component mapping, CSS, route, API, or implementation details.

### Stage 2: AI Handoff And Mapping

`buildHandoffMappingPrompt` creates the Stage 2 prompt. The server sends that prompt plus screenshots to the configured on-prem AI endpoint using `services/aiClient.ts`.

Stage 2 asks for:

- `handoff.md`
- `kaze-component-mapping.md`

The AI can describe visible layout and generic UI elements, but the sanitizer and validator remain the authority. For known pack types such as Kaze UI component galleries, `responseParser.ts` deterministically renders the final Kaze mapping instead of trusting model-authored rows.

### Stage 3: Local Cline And QA

Stage 3 is deterministic. `promptBuilder.ts` creates:

- `cline-implementation-prompt.md`
- `qa-checklist.md`

These files reference the manifest, handoff, mapping, and checklist instead of embedding full copies of earlier files.

## AI Endpoint Handling

AI calls go through `server/src/services/aiClient.ts`.

Supported endpoint styles:

- Ollama `/api/chat`
- OpenAI-compatible `/v1/chat/completions`
- OpenAI-compatible `/v1`, normalized to `/v1/chat/completions`
- OpenAI-compatible host root, normalized to `/v1/chat/completions`

OpenAI-compatible requests include image data as `image_url` data URLs. Ollama requests include base64 images in the Ollama chat payload.

The configured endpoint and model come from the frontend form. Endpoint URL and model name are persisted in browser `localStorage`.

## Parser, Sanitizer, Validator

`server/src/services/responseParser.ts` owns final output safety.

It parses file sections marked like:

```text
--- File: pack-manifest.md ---
--- File: handoff.md ---
--- File: kaze-component-mapping.md ---
--- File: cline-implementation-prompt.md ---
--- File: qa-checklist.md ---
```

The sanitizer repairs deterministic model mistakes, including:

- reasoning blocks such as `<details>`, `<think>`, and `<thinking>`;
- outer markdown fences;
- unsafe screen headings;
- unsafe state labels;
- invented filenames;
- missing mobile/tablet screenshot placeholders;
- fake or unconfirmed `Kaze*` component names;
- contradictory Kaze guidance that calls real exports fake;
- manifest implementation pollution;
- unsafe QA wording;
- missing Cline prompt rules.

The validator blocks unsafe output that remains after sanitization, including:

- missing expected files;
- reasoning/details blocks;
- invented screenshot filenames;
- `Filename not in File Map`;
- fake Kaze-prefixed imports treated as valid;
- real Kaze exports described as fake, invalid, wrong, or forbidden;
- invalid `Exact Kaze Export` cells;
- manifest route/API/CSS/component pollution;
- missing Cline-ready sections;
- weak or inconsistent component gallery mapping.

The design is intentional: deterministic repairs clean known repeat issues, while validation fails anything still unsafe.

## Quality Scoring

The parser computes one of three statuses:

- `ready`: label `Pack Ready`, score `10`
- `needs_review`: label `Needs Review`, score `7`
- `failed`: label `Failed`, score `0`

The route merges parser warnings with File Map warnings before returning the response. If final quality is `failed`, `/api/generate-pack` returns HTTP `422` with:

- exact validation errors;
- generated files;
- warnings;
- raw stage responses;
- timing and endpoint metadata.

This lets the frontend show useful failure details without allowing a broken ZIP download.

## Kaze Catalog Flow

The Kaze package source of truth lives in:

```text
config/kaze-component-catalog.md
config/kaze-component-catalog.local.json
```

`config/kaze-component-catalog.md` is human-readable maintainer documentation.

`config/kaze-component-catalog.local.json` is the committed local fallback for the machine-readable catalog. Normal generation uses the remote/catalog cache/local loading order from `server/src/services/kazeCatalogFetcher.ts`.

`kazeCatalog.ts` provides:

- confirmed Kaze exports;
- forbidden fake names;
- primary fake-name examples;
- fake-name repair mapping;
- visual role to export mapping;
- cross-file Kaze contradiction validation.

Core Kaze rule:

```text
Use real unprefixed named exports.
Do not invent Kaze-prefixed aliases.
```

Correct:

```ts
import { Button, TextField, Dropdown, Avatar, Typography } from "@pcs-security/kaze-ui-library";
```

Wrong:

```ts
import { KazeButton, KazeInput, KazeSelect, KazeAvatar, KazeTypography } from "@pcs-security/kaze-ui-library";
```

## Kaze Gallery Special Case

Kaze UI component gallery packs are known reference packs. They are too important to leave to model-authored mapping rows.

When `responseParser.ts` detects a Kaze component gallery from the manifest, mapping, or parsed filename context, it replaces the final `kaze-component-mapping.md` with deterministic mapping content. This prevents random rows such as generator form fields, AI assistant controls, icon internals, or weak coverage sections from entering the final pack.

The deterministic gallery mapping still runs through normal source-file repair and final validation.

## AI Assist Flow

AI assist is separate from pack generation.

Frontend:

- `client/src/api/aiAssist.ts` sends a field-level or combined assist request.
- `App.tsx` applies returned values to the same form state used for generation.
- Assist runs only when the user clicks a button.

Backend:

- `server/src/routes/aiAssist.ts` receives screenshots and current field values.
- `server/src/services/aiAssist.ts` builds a strict JSON-only prompt and parses a defensive JSON response.
- The route uses the configured on-prem/local AI endpoint through `aiClient.ts`.

AI assist does not use external writing services and does not run in the background while typing.

## Response Back To The Frontend

On success, `/api/generate-pack` returns:

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
  "rawResponses": {
    "stage-1-manifest-local": "...",
    "stage-2-handoff-mapping": "...",
    "stage-3-cline-qa-local": "..."
  },
  "quality": {
    "status": "ready",
    "label": "Pack Ready",
    "score": 10,
    "issues": []
  },
  "meta": {
    "mode": "local-manifest-local-cline-qa-staged"
  }
}
```

The frontend stores the returned files and screenshots used for the pack. Output tabs render the markdown files, warnings, and quality status.

## ZIP And Cline-Ready Contract

ZIP creation happens in `client/src/utils/downloadZip.ts`.

The ZIP archive root is derived from the project name. The archive contains:

```text
<ProjectArchiveRoot>/
├─ screenshots/
│  └─ <original uploaded screenshots>
├─ README_FOR_CLINE.md
├─ validate-pack.mjs
├─ cline-readiness-standard.md
├─ pack-manifest.md
├─ handoff.md
├─ kaze-component-mapping.md
├─ cline-implementation-prompt.md
└─ qa-checklist.md
```

Before download starts, the client validates:

- required markdown files exist;
- screenshot folder and files exist;
- `README_FOR_CLINE.md`, `validate-pack.mjs`, and `cline-readiness-standard.md` exist;
- Kaze contradiction patterns are absent;
- fake Kaze imports appear only as wrong examples.

The generated `validate-pack.mjs` lets the exported pack validate itself before it is given to Cline.

## Operational Notes

- Fast Mode defaults to `false` and is sent as `fastMode`.
- Endpoint URL and model name are stored in browser `localStorage`.
- Uploaded files are temporary and cleaned after generation.
- Failed final validation returns HTTP `422`; broken packs should not be downloaded.
- Raw model responses are kept in API responses for debugging, but generated files are sanitized before display and ZIP export.
- This repo generates implementation documents only. It never writes target app code.

## Where To Change Behavior

- Change frontend form or flow: `client/src/App.tsx` and `client/src/components/*`.
- Change API payloads: `client/src/api/*` and matching `server/src/routes/*`.
- Change prompt text or local generated files: `server/src/services/promptBuilder.ts`.
- Change model call behavior: `server/src/services/aiClient.ts`.
- Change filename parsing: `server/src/utils/filenameParser.ts` and client filename parser.
- Change File Map behavior: `server/src/services/fileMap.ts`.
- Change sanitizer, validation, quality scoring, or deterministic gallery mapping: `server/src/services/responseParser.ts`.
- Change Kaze export truth: the remote catalog JSON source, `config/kaze-component-catalog.local.json`, and `server/src/services/kazeCatalog.ts`.
- Change ZIP contents or ZIP validation: `client/src/utils/downloadZip.ts`.
