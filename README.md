# Kaze Screen Pack Generator

Internal on-prem tool that converts Kaze-based Figma/Sketch screenshot exports into implementation-ready markdown packs. Users upload screen images and a short description, then the app generates:

- `pack-manifest.md`
- `handoff.md`
- `kaze-component-mapping.md`
- `cline-implementation-prompt.md`
- `qa-checklist.md`

The app does not modify target React projects. It only generates documents.

## Requirements

- Node.js 22+
- An OpenAI-compatible vision endpoint or Ollama vision model endpoint

## Setup

```bash
npm install
npm run dev
```

Frontend: `http://127.0.0.1:5173`

Backend: `http://127.0.0.1:3001`

## AI Endpoints

Ollama chat endpoint example:

```text
http://localhost:11434/api/chat
```

OpenAI-compatible chat completions endpoint example:

```text
http://internal-ai-server:8000/v1/chat/completions
```

The endpoint URL and model name are configured in the web app and persisted in browser local storage.

## Screenshot Filename Format

Recommended format:

```text
<ScreenName>_<State>_<Viewport>.png
```

Examples:

```text
HomeGreeting_Default_Desktop.png
UserList_Empty_Desktop.png
CreateUser_Validation_Error_Desktop.png
```

The app warns on bad filenames but does not block generation.

## Kaze Catalog

The editable component catalog lives at:

```text
config/kaze-component-catalog.md
```

The backend injects this catalog into the AI prompt and post-processes AI output to replace unconfirmed `Kaze*` component names with `Unknown / verify from Kaze`.
