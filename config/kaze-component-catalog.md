# Kaze Component Catalog

## Purpose

This catalog lists confirmed exports from `@pcs-security/kaze-ui-library` v3.1.8.

The generator and coding agents must use only these confirmed exports when naming exact Kaze exports.

If a UI pattern does not clearly map to a confirmed export, output:

Unknown / verify from Kaze

## Package

`@pcs-security/kaze-ui-library`

Version: `3.1.8`

Main entry: `dist/index.cjs`

Module entry: `dist/index.mjs`

Types: `dist/index.d.ts`

## Import Rule

Use named imports from the package:

```ts
import { Button, TextField, Dropdown } from "@pcs-security/kaze-ui-library";
```

Do not invent Kaze-prefixed imports such as `KazeButton`, `KazeInput`, or `KazeSelect`.

## Style Exports

- `@pcs-security/kaze-ui-library/styles.css`
- `@pcs-security/kaze-ui-library/theme-pcss.css`
- `@pcs-security/kaze-ui-library/theme-blue.css`
- `@pcs-security/kaze-ui-library/theme-purple.css`
- `@pcs-security/kaze-ui-library/colors.scss`

## Confirmed Exports

| UI Pattern | Confirmed Kaze Export | Notes |
|---|---|---|
| Button / action / icon button | Button | Use for primary, secondary, danger, text, rounded, icon actions where supported |
| Text input | TextField | Use for text input fields |
| Text area | TextArea | Use for multiline input |
| Select / dropdown | Dropdown | Use for select/dropdown options |
| Checkbox dropdown | CheckboxDropdown | Use for multi-select/dropdown filter patterns |
| Date picker | Datepicker | Use for single/range date selection |
| Time picker | Timepicker | Use for time selection |
| Checkbox | Checkbox | Use for checkbox inputs |
| Radio | Radio | Use for single radio option |
| Radio group | RadioGroup | Use for grouped single-choice inputs |
| Modal / dialog | Modal | Use for confirmation/dialog flows |
| Alert / inline message | Alert | Use for warning/error/success/info messages |
| Toast | Toast | Use for temporary toast feedback |
| Notification | Notification | Use for notification display |
| Notification API | notification, useNotification | Use for notification hook/API patterns |
| Badge / count | Badge | Use for count/status badge where suitable |
| Tag | Tag | Use for metadata labels |
| Lozenge | Lozenge | Use for status label pattern |
| Avatar / profile badge | Avatar | Confirmed export |
| Upload / file upload | Upload | Use for upload controls |
| Pagination | Pagination | Use for pagination controls |
| Tooltip | Tooltip | Use for helper hover/focus text |
| Segmented control | Segmented | Use for segmented choice controls |
| Collapse / accordion | Collapse | Use for collapsible content |
| Tabs | Tabs | Use for tab navigation |
| Steps | Steps | Use for stepper/wizard flow |
| Progress | Progress | Use for progress indicators |
| Slider | Slider | Use for slider input |
| Table | Table | Use for standard table pattern |
| AG Grid table | AgGridTable | Use for AG Grid-based enterprise table pattern |
| Breadcrumb | Breadcrumb | Use for breadcrumb navigation |
| Context menu | ContextMenu | Use for context menu actions |
| Toggle / switch | Toggle | Use for switch/toggle input |
| Typography / text / heading | Typography | Use for text/title patterns |
| Pills / pill item | Pills | Use for pill/tag-like item patterns |
| Colour swatch | Swatch | Use for color swatch display |

## Unconfirmed Patterns

| UI Pattern | Status |
|---|---|
| Sidebar / Navigation Rail | Unknown / verify from Kaze |
| Layout Container / Flex / Grid | Unknown / verify from Kaze |
| Chat Input / Prompt Bar | Unknown / verify from Kaze |
| Icon Wrapper | Unknown / verify from Kaze |
| Card / Panel | Unknown / verify from Kaze |

## Forbidden Fake Names

Do not output these unless they are later confirmed by the package exports:

- KazeButton
- KazeInput
- KazeSelect
- KazeAvatar
- KazeTypography
- KazeSidebar
- KazeCard
- KazeIcon
- KazeLayout
- KazeText
- KazeFlex
- KazeBox
- KazeHeading
- KazeGreeting
- KazePromptBar
- KazeModal
- KazeTable
- KazeDataTable
- KazeBadge
- KazeTabs
- KazeAlert
- KazeDatePicker
