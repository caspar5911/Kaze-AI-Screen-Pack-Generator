# Kaze Screen Pack Generator

Internal on-prem web app for turning Kaze-based Figma/Sketch screenshot exports into implementation-ready markdown packs for developers and coding agents.

The app does not modify target React projects. It only generates documentation from screenshots, filename metadata, the Kaze component catalog, and a short project brief.

## Problem Solved

Screenshot exports usually lose important context:

- The AI model receives image bytes, not original filenames.
- Developers need screen/state/viewport mapping before implementation.
- Coding agents can invent component names, routes, APIs, states, or behavior.
- Kaze component usage must be verified against known catalog entries.

Kaze Screen Pack Generator creates a structured handoff pack that preserves screenshot filenames, maps images to screen states, injects confirmed Kaze component guidance, and sanitizes risky AI output before it is copied into implementation workflows.

## Tech Stack

- Frontend: React, TypeScript, Vite
- Backend: Node.js, Express, TypeScript
- Uploads: `multipart/form-data` handled by Multer
- AI endpoint support: Ollama `/api/chat` and OpenAI-compatible `/v1/chat/completions`
- Storage: local temporary upload folder for MVP
- Output: markdown text returned to the frontend

## Run Locally

Install dependencies:

```bash
npm install
```

Start the frontend and backend together:

```bash
npm run dev
```

Default local URLs:

- Frontend: `http://127.0.0.1:5179`
- Backend API: `http://127.0.0.1:3971`

Build both workspaces:

```bash
npm run build
```

Run TypeScript checks:

```bash
npm run test:run
```

Start the built backend:

```bash
npm run start
```

## Required Configuration

No `.env` file is required for basic local development.

Optional environment variable:

```text
PORT=3971
```

AI settings are entered in the web app under Advanced AI Settings:

- AI Endpoint URL, for example `http://localhost:11434/api/chat`
- Model Name, for example `qwen3.6:35b`

The frontend persists the endpoint URL and model name in browser local storage.

The editable Kaze component catalog is:

```text
config/kaze-component-catalog.md
```

## Basic Workflow

1. Open the app.
2. Fill in Project / Feature Name and Short Description.
3. Choose Design Source and Icon System.
4. Upload screenshot files.
5. Confirm filename warnings and File Map Preview.
6. Expand Advanced AI Settings if the endpoint or model needs changing.
7. Click Generate Implementation Pack.
8. Review generated tabs and Generation Warnings.
9. Copy one file, copy all files, or download the ZIP.

Generated files:

- `pack-manifest.md`
- `handoff.md`
- `kaze-component-mapping.md`
- `cline-implementation-prompt.md`
- `qa-checklist.md`

## Folder Structure

```text
kaze-screen-pack-generator/
├─ client/
│  ├─ src/
│  │  ├─ api/
│  │  ├─ components/
│  │  ├─ utils/
│  │  ├─ App.tsx
│  │  └─ styles.css
│  └─ package.json
├─ server/
│  ├─ src/
│  │  ├─ routes/
│  │  ├─ services/
│  │  ├─ utils/
│  │  └─ index.ts
│  └─ package.json
├─ config/
│  └─ kaze-component-catalog.md
├─ docs/
└─ package.json
```

## Test With HomeGreeting_Default_Desktop.png

Use this example:

- Project / Feature Name: `AI Assistant Home Screen`
- Short Description: `Default landing screen for an AI assistant. Users can type a prompt, add attachments, select thinking mode, use voice input, and choose quick actions for image creation, writing, or searching.`
- Screenshot: `HomeGreeting_Default_Desktop.png`

Expected filename parse:

- ScreenName: `HomeGreeting`
- State: `Default`
- Viewport: `Desktop`

Expected manifest heading:

```md
### HomeGreeting
```

The output should not include fake Kaze components, invented filenames, reasoning blocks, or implementation details in `pack-manifest.md`.

## Documentation

- [User Guide](docs/USER_GUIDE.md)
- [Developer Guide](docs/DEVELOPER_GUIDE.md)
- [AI Prompt Guide](docs/AI_PROMPT_GUIDE.md)
- [Output Spec](docs/OUTPUT_SPEC.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
