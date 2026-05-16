# AI Prompt Contract for Kaze Screen Pack Generator

## Overview

This document describes how prompts are constructed for AI model calls. Understanding the prompt contract helps maintain output quality while optimizing for speed.

## Runtime Prompts Use Compact Context

**Documentation files (README.md, AGENTS.md, USER_GUIDE.md, DEVELOPER_GUIDE.md, OUTPUT_SPEC.md, TROUBLESHOOTING.md) are NOT injected into model calls.** These docs are for developers and coding agents only.

Runtime generation uses:

- Generated `pack-input.md` (project metadata + parsed filenames)
- File Map (maps filenames to attached images)
- Screenshot images in Stage 2 only (compressed when >50KB)
- Sanitized previous stage output (for multi-stage generation)
- Compact Kaze component catalog JSON (not full markdown)
- Stage-specific rules

## Fast Mode (Default)

Fast Mode is enabled by default and provides:

- **Compact prompts**: ~45-60% smaller than the original prompts
- **Image compression**: Max width 1280px, quality 70 for images >50KB
- **Compact catalog JSON**: Only `confirmedExports`, `patternMappings`, `unconfirmedPatterns`, `forbiddenFakeNames`, `wrongNameRepairs`

## Strict Mode

Strict Mode can be enabled via the Fast Mode toggle (uncheck it). It uses:

- Longer prompts with more context
- Image max width 1600px, quality 80

## Stage Breakdown

### Stage 1: Local Manifest Generation

- **Input**: form fields + File Map + parsed filenames
- **No Kaze catalog injection**
- **No documentation injection**
- **No AI call**
- **Generated locally**: `pack-manifest.md`, including `## Pack Contents`

This removes one model call and one duplicated vision pass.

### Stage 2: Handoff + Component Mapping

- **Input**: compact pack context + sanitized manifest + **compact catalog JSON** + File Map + screenshots
- **Uses**: compact JSON (not full markdown catalog)
- **Only vision model call**

**Approximate size**: 3,000-5,000 chars (vs ~15,000+ before)

### Stage 3: Cline Prompt + QA Checklist

- **Input**: sanitized manifest + handoff + mapping
- **No screenshots**
- **No AI call**
- **Generated locally**: `cline-implementation-prompt.md` and `qa-checklist.md`

The Cline prompt is reference-based. It points to the generated files instead
of embedding full manifest or handoff content.

## Prompt Size Logging

Each stage logs its prompt size to the server console:

```
[generatePack] Stage 1 manifest local: 0.001s
[aiClient] Prompt: 4200 chars, Images: 245KB (2 screenshots)
[generatePack] Stage 2 handoff-mapping: 2.567s
[aiClient] Prompt: 3900 chars, Images: 0KB (0 screenshots)
[generatePack] Stage 3 cline-qa: 1.890s
```

## Output Quality Guarantees

Despite smaller prompts, all five output files are still generated:

1. `pack-manifest.md` - Screen overview
2. `handoff.md` - Design handoff
3. `kaze-component-mapping.md` - Component mapping
4. `cline-implementation-prompt.md` - Implementation instructions
5. `qa-checklist.md` - QA checklist

Filename parsing, File Map behavior, Kaze export validation, QA TODO-safe wording, and ZIP output remain fully functional.

The downloaded Cline-ready ZIP contains:

- `README_FOR_CLINE.md`
- `validate-pack.mjs`
- `cline-readiness-standard.md`
- The five generated markdown files
- `screenshots/` with the original uploaded files

`cline-implementation-prompt.md` must include these Cline safety sections:

- `## Placement Rule`
- `## Screenshot Usage Rule`
- `## Implementation Sequence`
- `## Anti-Hallucination Rules`
- `## Kaze Setup Rule`
- `## Final Response Format`

## Sanitizer and Validator

The sanitizer in `responseParser.ts` handles deterministic output issues:

- Removes outer markdown fences
- Repairs invalid screen headings
- Replaces unconfirmed Kaze-prefixed names
- Fixes state labels
- Normalizes QA checklist wording
- Ensures Cline prompt includes verification rules
- Validates manifest pack inventory and Cline-ready prompt sections
- Repairs and flags contradictory mapping lines that list real exports such as `Button`, `TextField`, `Dropdown`, `Avatar`, or `Typography` as forbidden
- Normalizes quick action mappings away from `Pills` unless interactive behavior is confirmed
- Adds a generated `validate-pack.mjs` script so exported ZIPs can self-check before use

**Do not solve repeated output problems by adding huge prompt text.** Use deterministic repair rules in `responseParser.ts`.

## Maintenance Guidelines

When modifying prompts:

1. Keep prompts compact and stage-specific
2. Prefer sanitizer/validator rules over prompt text for fixing output issues
3. Update the remote catalog JSON and `config/kaze-component-catalog.local.json` for component changes
4. Update this doc when changing prompt contracts
5. Test with `HomeGreeting_Default_Desktop.png` scenario
6. Run `npm run test:run` and `npm run build` before committing
