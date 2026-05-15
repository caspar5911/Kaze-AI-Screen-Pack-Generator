# Troubleshooting

This guide lists common generation issues and how to fix them.

## Filename unavailable

Cause:

- The model referenced an image without using the File Map.

Fix:

- Confirm uploaded files have clear names.
- Use `<ScreenName>_<State>_<Viewport>.png`.
- Regenerate.

The sanitizer replaces `Filename unavailable` with `Filename missing from File Map`, but the output should still be reviewed.

## AI invents filenames

Example:

```text
Home_Default_Desktop.png
Chatgpt_default_Desktop.png
```

Cause:

- The model inferred filenames from the screenshot instead of using the File Map.

Fix:

- Check the File Map Preview before generating.
- Ensure the prompt includes the File Map.
- Regenerate.

The sanitizer replaces filenames not present in the File Map with `Filename not in File Map`.

## AI invents Kaze components

Examples:

```text
KazeSidebar
KazeAvatar
KazePromptBar
```

Cause:

- The model guessed Kaze component names based on visible UI patterns.

Fix:

- Update `config/kaze-component-catalog.md` only if the component is truly verified.
- Keep unconfirmed patterns as `Unknown / verify from Kaze`.
- Regenerate.

The sanitizer replaces unconfirmed `Kaze*` names with `Unknown / verify from Kaze`.

## Manifest includes token, spacing, route, or API details

Cause:

- The model placed implementation-level notes in `pack-manifest.md`.

Fix:

- Review `pack-manifest.md`.
- Move detailed implementation notes to `handoff.md`, `kaze-component-mapping.md`, or `cline-implementation-prompt.md`.
- Regenerate if needed.

The manifest should not mention:

- Tokens
- Spacing details
- CSS
- px values
- Route names
- API endpoints
- Component verification
- Storybook

## QA assumes unconfirmed behavior

Bad examples:

```md
- [ ] Thinking selector opens and allows selection.
- [ ] Voice button toggles between idle and recording states.
- [ ] Quick action buttons trigger appropriate flows.
```

Safe examples:

```md
- [ ] Thinking selector behaviour is implemented or marked as TODO.
- [ ] Voice button behaviour is implemented or marked as TODO.
- [ ] Quick action behaviour is implemented or marked as TODO.
```

Fix:

- Use TODO-safe wording for unconfirmed behavior.
- Regenerate or manually edit the generated checklist before using it.

## AI returns reasoning or details blocks

Examples:

```html
<details type="reasoning">
```

Cause:

- The model returned analysis or chain-of-thought text.

Fix:

- Regenerate.
- Check Raw Response.
- Use a model or endpoint configuration that respects the output-only prompt.

The sanitizer strips known reasoning blocks, but a remaining reasoning block causes the quality status to fail.

## Missing output files

Cause:

- The model did not use the required file markers.
- The model stopped early.
- Endpoint timed out.

Fix:

- Open the Raw Response tab.
- Regenerate.
- Use a more reliable model or increase endpoint timeout if available.

Required markers:

```text
--- File: pack-manifest.md ---
--- File: handoff.md ---
--- File: kaze-component-mapping.md ---
--- File: cline-implementation-prompt.md ---
--- File: qa-checklist.md ---
```

## Ollama endpoint errors

Expected endpoint:

```text
http://localhost:11434/api/chat
```

Common fixes:

- Confirm Ollama is running.
- Confirm the model is installed.
- Confirm the model supports vision input.
- Try the model discovery dropdown in Advanced AI Settings.

## OpenAI-compatible endpoint errors

Expected endpoint style:

```text
http://internal-ai-server:8000/v1/chat/completions
```

Common fixes:

- Confirm the endpoint supports chat completions.
- Confirm it accepts image content in OpenAI-compatible format.
- Confirm the model name is valid.
- Check server logs for the returned endpoint status.

## Model timeout or bad response

Cause:

- Too many screenshots.
- Images are too large.
- Model is not vision-capable.
- Endpoint is overloaded.

Fix:

- Try one screenshot first, for example `HomeGreeting_Default_Desktop.png`.
- Reduce image dimensions or file size.
- Use fewer screenshots.
- Use a vision-capable model.
- Regenerate.

## Generation Warnings remain after sanitization

Cause:

- The final sanitized output still contains risky wording or missing required content.

Fix:

- Review the warning text.
- Check the relevant generated file tab.
- Update `promptBuilder.ts` if the AI needs clearer instructions.
- Update `responseParser.ts` if a safe deterministic repair is possible.
- Regenerate and verify the quality status.
