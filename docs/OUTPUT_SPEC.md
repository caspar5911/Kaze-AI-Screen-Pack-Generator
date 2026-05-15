# Output Spec

The generator returns five markdown files. Each file has a distinct purpose and should not duplicate responsibilities unnecessarily.

## pack-manifest.md

Purpose: High-level inventory of the generated pack.

Expected content:

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

Example:

```md
# Pack Manifest

## Project / Feature Name
AI Assistant Home Screen

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

Purpose: Map visible UI elements to known Kaze components or verification tasks.

Required table pattern:

```md
| UI Element | Intended Kaze Pattern | Exact Kaze Component | Confidence | Notes |
|---|---|---|---|---|
```

Rules:

- If the component is confirmed in the catalog, exact component may be used.
- If not confirmed, use `Unknown / verify from Kaze`.
- Do not invent `Kaze*` component names.
- For uncertain icons, use `Unknown / verify Font Awesome icon`.

## cline-implementation-prompt.md

Purpose: A prompt for Cline/Codex or another coding agent implementing the screen in a target project.

Must include:

- Inputs
- Critical first step
- Implementation rules
- Screen requirements
- State requirements
- Validation steps

Required critical first step:

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

- Kaze component names
- Kaze component verification
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

Bad Kaze component:

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
- `pack-manifest.md` is high-level and clean.
- Unknowns are grouped under `## Unknowns / Needs Confirmation`.
- No fake Kaze components remain.
- No invented filenames remain.
- No reasoning, analysis, citations, or `<details>` blocks remain.
- QA wording does not assume unconfirmed behavior.
- Cline prompt includes the required project inspection steps.
