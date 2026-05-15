# User Guide

This guide is for designers and internal users generating screen packs from screenshot exports.

## What The Tool Does

Kaze Screen Pack Generator converts screenshot exports into a markdown handoff pack for developers and coding agents. It uses your project description, uploaded screenshot filenames, the Kaze component catalog, and an on-prem AI model.

It does not update code, connect to Figma, or modify target projects.

## Form Fields

### Project / Feature Name

Name of the screen or feature being handed off.

Example:

```text
AI Assistant Home Screen
```

### Short Description

A short summary of the workflow shown in the screenshots. Keep this practical and concise.

Example:

```text
Default landing screen for an AI assistant. Users can type a prompt, add attachments, select thinking mode, use voice input, and choose quick actions for image creation, writing, or searching.
```

### Design Source

Where the screenshots came from.

- Screenshot export: Use this for normal PNG/JPG/WEBP exports.
- Figma: Use this if screenshots came directly from Figma.
- Sketch: Use this if screenshots came directly from Sketch.
- Unknown: Use this if the source is not known.

### Icon System

The icon source expected by the implementation.

- Font Awesome: Default for Kaze-based screens.
- Custom assets: Use this if icons are exported images or custom SVGs.
- Unknown: Use this if icon source must be confirmed later.

### Additional Notes

Optional constraints or context for the generated handoff.

Example:

```text
Use standard Kaze states unless custom states are shown.
```

### Advanced AI Settings

These are usually set once and left alone.

- AI Endpoint URL: On-prem Ollama or OpenAI-compatible endpoint.
- Model Name: Vision-capable model served by that endpoint.

## Screenshot Naming Convention

Use this format:

```text
<ScreenName>_<State>_<Viewport>.png
```

The parser reads:

- First part: ScreenName
- Last part: Viewport
- Middle part or parts: State

Example:

```text
HomeGreeting_Default_Desktop.png
```

Parses as:

- ScreenName: `HomeGreeting`
- State: `Default`
- Viewport: `Desktop`

Valid viewports:

- `Desktop`
- `Tablet`
- `Mobile`
- `Unknown`

## Good Filename Examples

```text
HomeGreeting_Default_Desktop.png
UserList_Empty_Desktop.png
CreateUser_ValidationError_Desktop.png
CreateUser_Validation_Error_Desktop.png
```

For `CreateUser_Validation_Error_Desktop.png`:

- ScreenName: `CreateUser`
- State: `Validation_Error`
- Viewport: `Desktop`

## Bad Filename Examples

```text
final.png
screen1.png
latest.png
whole-board.png
```

Bad filenames do not block generation, but they create warnings and reduce output quality.

## Uploading Screenshots

You can:

- Click the upload area and choose files.
- Drag and drop files onto the screenshot upload area.

Supported formats:

- `.png`
- `.jpg`
- `.jpeg`
- `.webp`

Uploaded filenames are shown in the Screenshots card. Files with naming issues are marked with warnings.

## File Map Preview

The File Map Preview shows how uploaded screenshots will be referenced by the AI model.

Example:

```text
1. HomeGreeting_Default_Desktop.png = attached image 1
2. UserList_Empty_Desktop.png = attached image 2
```

This matters because local AI endpoints receive image data, not file objects with original filenames. The File Map tells the model which image belongs to which filename.

## Generated Markdown Files

### pack-manifest.md

High-level inventory of the feature:

- Project name
- Description
- Screen groups
- Screenshot filenames
- Detected state and viewport
- Main visible actions
- Unknowns that need confirmation

### handoff.md

Human-readable implementation handoff:

- Layout notes
- Visible actions
- Required states
- Visual notes
- Unknown behavior

### kaze-component-mapping.md

Mapping between visible UI patterns and confirmed Kaze components.

Unconfirmed patterns are marked:

```text
Unknown / verify from Kaze
```

### cline-implementation-prompt.md

Prompt for Cline/Codex or another coding agent. It tells the agent to inspect the actual project before coding and verify Kaze components, props, routes, APIs, and build steps.

### qa-checklist.md

Checklist for visual, functional, Kaze compliance, code quality, and accessibility review.

## Generation Warnings

Warnings mean the AI output needed review or repair.

Common examples:

- Filename does not match the expected format.
- AI invented a filename.
- AI invented an unconfirmed `Kaze*` component.
- Manifest included details that belong elsewhere.
- QA wording assumed behavior that has not been confirmed.
- AI returned reasoning or `<details>` blocks.

Warnings do not always mean the pack is unusable. Review the generated files before handing them to developers or coding agents.

## Recommended Workflow

1. Export screenshots from Figma or Sketch.
2. Rename files using `<ScreenName>_<State>_<Viewport>.png`.
3. Upload the screenshots.
4. Check the uploaded filename list and File Map Preview.
5. Generate the pack.
6. Review Generation Warnings.
7. Open each output tab.
8. Confirm filenames, screen names, and states are correct.
9. Copy all files or download the ZIP.
10. Give the pack to the developer or coding agent.
