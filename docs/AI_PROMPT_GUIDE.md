# AI Prompt Guide

This guide explains the prompt strategy used by the backend.

Prompt construction is implemented in:

```text
server/src/services/promptBuilder.ts
```

## Full Prompt Strategy

The backend sends one combined prompt to the AI endpoint. The prompt includes:

- A role: Kaze UI Screen Pack Generator.
- Workflow context: screenshots exported from Figma/Sketch.
- Generated `pack-input.md`.
- `kaze-component-catalog.md`.
- File Map.
- Filename parsing rules.
- Kaze component restrictions.
- Visual accuracy rules.
- Output file marker contract.
- Required content for each generated markdown file.
- Safe QA and Cline prompt rules.

The backend does not split generation into multiple model calls.

## Filename Handling Rules

The model is told:

- Use only filenames from the File Map.
- Do not invent filenames.
- Do not rename screenshots.
- Do not shorten filenames.
- Do not infer alternate filenames.
- Derive ScreenName, State, and Viewport from parsed screenshot names.

Filename parsing:

1. Remove extension.
2. Split basename by `_`.
3. First part is ScreenName.
4. Last part is Viewport.
5. Middle part or parts are State.

Example:

```text
HomeGreeting_Default_Desktop.png
```

Parses as:

- ScreenName: `HomeGreeting`
- State: `Default`
- Viewport: `Desktop`

Manifest heading must be:

```md
### HomeGreeting
```

Not:

```md
### Screen: HomeGreeting
### HomeGreeting_Default
```

## pack-manifest.md Scope Rules

`pack-manifest.md` is intentionally high-level. It should include:

- Project / feature name
- Short description
- Design source
- Screens grouped by screen name
- Screenshot list
- Detected state
- Detected viewport
- Inferred screen purpose
- Main visible actions
- `## Unknowns / Needs Confirmation`

It must not include:

- Kaze token details
- Design token details
- Color token details
- Spacing details
- CSS values
- px values
- Route details or route names
- API endpoint details
- Component names
- Implementation instructions
- Storybook instructions
- Component verification details

If navigation behavior is unknown, use:

```text
Navigation behaviour is not confirmed.
```

## Kaze Component Usage Rules

Allowed exact Kaze components are only those listed under Confirmed Kaze Components in `config/kaze-component-catalog.md`.

If a UI pattern is not confirmed, output:

```text
Unknown / verify from Kaze
```

Do not invent Kaze component names or props.

## Forbidden Fake Kaze Components

Do not output these unless they are explicitly listed in the catalog:

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

For sidebar, avatar, typography, layout, card, icon wrapper, or prompt bar, use:

```text
Unknown / verify from Kaze
```

unless the catalog explicitly confirms the component.

## QA Safe Wording Rules

QA must not assume unconfirmed behavior works.

Use:

```md
- [ ] Sidebar navigation is implemented or marked as TODO.
- [ ] Avatar interaction is implemented or marked as TODO.
- [ ] Voice button behaviour is implemented or marked as TODO.
- [ ] Microphone button behaviour is implemented or marked as TODO.
- [ ] Thinking selector behaviour is implemented or marked as TODO.
- [ ] Quick action behaviour is implemented or marked as TODO.
- [ ] White action button behaviour is implemented or marked as TODO.
```

Avoid:

```md
- Sidebar navigation routes to correct sections.
- Avatar opens profile menu.
- Voice button toggles between idle and recording states.
- Thinking selector opens and allows selection.
- Quick action buttons trigger appropriate flows.
- Microphone button triggers audio input.
- White action button triggers submission.
```

## Cline Prompt Required Verification Rules

`cline-implementation-prompt.md` must include:

```md
## Critical First Step

Before writing code:

1. Inspect actual project structure.
2. Inspect existing pages/screens that already use Kaze.
3. Inspect Kaze package exports.
4. Inspect Kaze Storybook/docs if available.
5. Confirm exact Kaze component names and props.
6. Do not use guessed Kaze components.
7. If a suggested Kaze component does not exist, use the closest approved Kaze/project pattern and report it.
```

The exact phrase must appear:

```text
Inspect actual project structure.
```

Implementation prompt rules also require:

- Do not invent routes.
- Do not invent APIs.
- Do not invent dropdown values.
- Do not invent permission rules.
- Use Kaze components where available.
- Use raw HTML only for non-interactive layout wrappers.
- Run typecheck/build if available.
- Report unresolved unknowns and fallback choices.

## Output File Marker Format

The model must output only the five markdown files using exact markers:

```text
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
```

No reasoning, citations, commentary, `<details>` blocks, or analysis text should appear outside the file sections.
