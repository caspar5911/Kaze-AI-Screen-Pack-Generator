# Output Spec

The generator returns five markdown files. Each file has a distinct purpose and should not duplicate responsibilities unnecessarily.

The downloaded Cline-ready ZIP also includes:

- `screenshots/` with the original uploaded screenshot files.
- `README_FOR_CLINE.md` with deterministic usage instructions.
- `validate-pack.mjs` for local pack validation before Cline/Codex use.
- `cline-readiness-standard.md` with 10/10 readiness and automatic-fail rules.

## pack-manifest.md

Purpose: High-level inventory of the generated pack.

Expected content:

- Project / feature name
- Short description
- Design source
- `## Pack Contents` with `README_FOR_CLINE.md`, all five markdown files, and exact screenshot paths
- Screens grouped by ScreenName
- Screenshot list
- Detected state
- Detected viewport
- Inferred screen purpose
- Main visible actions
- `## Unknowns / Needs Confirmation`

Example:

```md
# Pack Manifest

## Project / Feature Name
AI Assistant Home Screen

## Pack Contents
- `README_FOR_CLINE.md`
- `validate-pack.mjs`
- `cline-readiness-standard.md`
- `pack-manifest.md`
- `handoff.md`
- `kaze-component-mapping.md`
- `cline-implementation-prompt.md`
- `qa-checklist.md`
- `screenshots/HomeGreeting_Default_Desktop.png`

## Screens

### HomeGreeting
- Screenshot: HomeGreeting_Default_Desktop.png
- Detected state: Default
- Detected viewport: Desktop

## Unknowns / Needs Confirmation
- Navigation behaviour is not confirmed.
- Avatar interaction is not confirmed.
```

## handoff.md

Purpose: Practical implementation handoff for humans.

Expected content:

- Overview
- Screenshots
- Visible layout
- Main user actions
- Visual notes
- Required states
- Unknowns / needs confirmation

State guidance must be careful. For `HomeGreeting_Default_Desktop.png`, default state is `Default`, not `Default / Empty`.

Safe required states for a default input screen:

```md
- Default: shown in screenshot
- Input focused: likely, use standard Kaze input behaviour
- Input with text: likely, enable action if supported
- Processing/loading: unknown, mark TODO unless confirmed
- Error: unknown, only if submit/search action is implemented
- Disabled: unknown, only if rules require it
```

## kaze-component-mapping.md

Purpose: Map visible UI elements to confirmed Kaze exports or verification tasks.

Required table pattern:

```md
| UI Element | Intended Kaze Pattern | Exact Kaze Export | Confidence | Notes |
|---|---|---|---|---|
```

Rules:

- If the export is confirmed in the catalog, the exact export may be used.
- If not confirmed, use `Unknown / verify from Kaze`.
- Do not invent `Kaze*` prefixed names.
- Do not list real exports such as `Button`, `TextField`, `Dropdown`, `Avatar`, or `Typography` under forbidden names.
- Do not put Font Awesome icon names, notes, or mixed values in `Exact Kaze Export`.
- For uncertain icons, use `Unknown / verify Font Awesome icon`.

The real package is `@pcs-security/kaze-ui-library` v3.1.8 and it uses unprefixed named exports. Examples:

- Button: `Button`, not `KazeButton`
- Text input: `TextField`, not `KazeInput`
- Dropdown/select: `Dropdown`, not `KazeSelect`
- Avatar/profile badge: `Avatar`, not `KazeAvatar`
- Typography/heading: `Typography`, not `KazeTypography`

Sidebar/navigation rail, layout container, and prompt bar wrapper should stay `Unknown / verify from Kaze` unless actual project usage confirms an approved pattern.

## cline-implementation-prompt.md

Purpose: A prompt for Cline/Codex or another coding agent implementing the screen in a target project.

Must include:

- Inputs
- Critical first step
- Implementation rules
- Screen requirements
- State requirements
- Validation steps

It must state that Kaze UI uses unprefixed named exports from `@pcs-security/kaze-ui-library`.

Correct:

```ts
import { Button, TextField, Dropdown, Avatar, Typography } from "@pcs-security/kaze-ui-library";
```

Incorrect:

```ts
import { KazeButton, KazeInput, KazeSelect, KazeAvatar, KazeTypography } from "@pcs-security/kaze-ui-library";
```

Required critical first step:

```md
## Critical First Step

Before writing code:

1. Inspect actual project structure.
2. Inspect existing pages/screens that already use Kaze.
3. Inspect @pcs-security/kaze-ui-library package exports.
4. Inspect Kaze Storybook/docs if available.
5. Confirm exact Kaze export names and props.
6. Do not use guessed Kaze components.
7. If a suggested Kaze export does not work, use the closest approved Kaze/project pattern and report it.
```

## qa-checklist.md

Purpose: Checklist for reviewing the implementation after coding.

Must include:

- Visual checks
- Functional checks
- Kaze compliance checks
- Code quality checks
- Accessibility checks

Functional checks must use TODO-safe wording when behavior is not confirmed.

Example:

```md
- [ ] Thinking selector behaviour is implemented or marked as TODO.
- [ ] Voice button behaviour is implemented or marked as TODO.
- [ ] Quick action behaviour is implemented or marked as TODO.
```

## What Belongs In pack-manifest.md

Keep it high-level:

- Names
- Filenames
- Parsed state and viewport
- Screen purpose
- Visible actions
- Unknowns

## What Must Not Belong In pack-manifest.md

Do not include:

- Kaze export names
- Kaze export verification
- Kaze token details
- Design token details
- Color or spacing details
- CSS values
- px values
- API endpoint details
- Route names or route details
- Storybook instructions
- Implementation instructions

## Bad Output Examples

Bad manifest heading:

```md
### Screen: HomeGreeting_Default
```

Correct:

```md
### HomeGreeting
```

Bad state:

```md
- State: Default / Empty
```

Correct:

```md
- State: Default
```

Bad fake Kaze name:

```md
KazeButton
```

Correct:

```md
Button
```

Bad unconfirmed pattern:

```md
KazeSidebar
```

Correct:

```md
Unknown / verify from Kaze
```

Bad QA assumption:

```md
- [ ] Thinking selector opens and allows selection.
```

Correct:

```md
- [ ] Thinking selector behaviour is implemented or marked as TODO.
```

## 10/10 Readiness Checklist

The pack is ready when:

- All five expected files are present.
- Every screenshot filename matches the File Map.
- Screen headings use ScreenName only.
- States match filenames and screenshots.
- `pack-manifest.md` includes `## Pack Contents` and `README_FOR_CLINE.md`.
- `pack-manifest.md` is high-level and clean.
- Unknowns are grouped under `## Unknowns / Needs Confirmation`.
- No fake Kaze-prefixed names remain.
- No invented filenames remain.
- No `Filename not in File Map` placeholder text remains.
- No reasoning, analysis, citations, or `<details>` blocks remain.
- QA wording does not assume unconfirmed behavior.
- Cline prompt includes placement, screenshot usage, implementation sequence, anti-hallucination, Kaze setup, and final response format sections.
- The downloaded ZIP includes `screenshots/`, `README_FOR_CLINE.md`, `validate-pack.mjs`, and `cline-readiness-standard.md`.
- `node validate-pack.mjs` passes from the extracted ZIP root.
