# Kaze Component Catalog

## Purpose

This catalog lists confirmed exports from `@pcs-security/kaze-ui-library` v3.1.8.

The generator and coding agents must use only these confirmed exports when naming exact Kaze exports.

This catalog is also a visual detection dictionary for screenshot-to-pack generation. A weak/on-prem vision model may describe the same component using different words. The generator must map those visual descriptions back to the correct Kaze export.

If a UI pattern does not clearly map to a confirmed export, output:

```txt
Unknown / verify from Kaze
```

Do not invent Kaze component names.

---

## Package

Package:

```txt
@pcs-security/kaze-ui-library
```

Version:

```txt
3.1.8
```

Main entry:

```txt
dist/index.cjs
```

Module entry:

```txt
dist/index.mjs
```

Types:

```txt
dist/index.d.ts
```

---

## Import Rule

Use named imports from the package.

Correct:

```ts
import {
  Button,
  TextField,
  Dropdown,
  Avatar,
  Typography,
} from "@pcs-security/kaze-ui-library";
```

Wrong:

```ts
// WRONG — these fake Kaze-prefixed exports do not exist
import {
  KazeButton,
  KazeInput,
  KazeSelect,
  KazeAvatar,
  KazeTypography,
} from "@pcs-security/kaze-ui-library";
```

Do not invent Kaze-prefixed imports.

---

## Style Exports

Known style exports:

```txt
@pcs-security/kaze-ui-library/styles.css
@pcs-security/kaze-ui-library/theme-pcss.css
@pcs-security/kaze-ui-library/theme-blue.css
@pcs-security/kaze-ui-library/theme-purple.css
@pcs-security/kaze-ui-library/colors.scss
```

Use the project’s existing Kaze CSS import pattern.

Do not duplicate global CSS imports if the project already imports Kaze styles globally.

---

## Confirmed Exports

Only these names are confirmed exports from `@pcs-security/kaze-ui-library`.

```txt
AgGridTable
Alert
Avatar
Badge
Breadcrumb
Button
Checkbox
CheckboxDropdown
Collapse
ContextMenu
Datepicker
Dropdown
Lozenge
Modal
Notification
Pagination
Pills
Progress
Radio
RadioGroup
Segmented
Slider
Steps
Swatch
Table
Tabs
Tag
TextArea
TextField
Timepicker
Toast
Toggle
Tooltip
Typography
Upload
notification
useNotification
```

Do not use any Kaze component name that is not in this list unless the installed package typings prove the export exists.

---

## Visual Components

These are visual UI components:

```txt
AgGridTable
Alert
Avatar
Badge
Breadcrumb
Button
Checkbox
CheckboxDropdown
Collapse
ContextMenu
Datepicker
Dropdown
Lozenge
Modal
Notification
Pagination
Pills
Progress
Radio
RadioGroup
Segmented
Slider
Steps
Swatch
Table
Tabs
Tag
TextArea
TextField
Timepicker
Toast
Toggle
Tooltip
Typography
Upload
```

---

## Utility / Hook Exports

These are not visual components:

```txt
notification
useNotification
```

Use them only when notification service behaviour is needed.

Do not treat them as screen components.

---

## Internal Export Aliases

The package exports some public names through internal aliases.

| Public export | Internal source name |
| --- | --- |
| `Swatch` | `ColourSwatch` |
| `TextArea` | `TextAreaField` |

This means agents should still import the **public export name**, not the internal source name.

Correct:

```ts
import { Swatch, TextArea } from "@pcs-security/kaze-ui-library";
```

Do not import `ColourSwatch` or `TextAreaField`. They are internal/source declaration names, not the public component names used in generated implementation guidance.

---

## Confirmed Type Exports

These are confirmed TypeScript type exports. Use them only for typing.

```txt
AgGridTableEdition
AgGridTableProps
AlertProps
AvatarProps
BadgeProps
BreadcrumbProps
ButtonProps
CheckboxDropdownProps
CheckboxProps
CollapseProps
ColourSwatchProps
ContextMenuProps
DatepickerProps
DropdownProps
LozengeProps
ModalProps
NotificationInstance
NotificationProps
PaginationProps
PillsProps
ProgressProps
RadioGroupProps
RadioProps
SegmentedProps
SliderProps
StepsProps
TableProps
TabsProps
TagProps
TextAreaProps
TextFieldProps
TimepickerProps
ToastProps
ToggleProps
TooltipProps
TypographyProps
TypographyTextProps
TypographyTitleLevel
TypographyTitleProps
UploadProps
UseNotificationConfig
UseNotificationReturn
```

---

## Confirmed Export Table

| UI pattern / visual terms | Confirmed Kaze export | Notes |
| --- | --- | --- |
| avatar, profile image, profile photo, profile picture | `Avatar` | Use Avatar for user/profile/account identity display, circular profile images, user photos, account icons, or initials. |
| button, primary button, secondary button, tertiary button | `Button` | Use Button for clickable actions, including primary actions, secondary actions, icon actions, quick actions, submit actions, reset actions, and export actions. |
| text input, single-line input, input field, form field | `TextField` | Use TextField for single-line text inputs, search bars, prompt bars, chat inputs, filters, and short form fields. |
| textarea, text area, multi-line input, large input | `TextArea` | Use TextArea for large or multi-line text input areas, notes fields, descriptions, comments, and long prompt boxes. |
| dropdown, select, select field, option picker | `Dropdown` | Use Dropdown for single option selection, select fields, filters, and dropdown-style fields. |
| checkbox dropdown, multi-select dropdown, columns selected dropdown, dropdown with checkboxes | `CheckboxDropdown` | Use CheckboxDropdown for dropdown controls that allow multiple checkbox selections, column selection, or multi-select filtering. |
| checkbox, tick box, square checkbox, checked box | `Checkbox` | Use Checkbox for checkbox-style boolean inputs. |
| toggle, switch, toggle switch, on off switch | `Toggle` | Use Toggle for switch-style boolean settings. |
| radio, radio button, single radio option, circle option | `Radio` | Use Radio for a single radio option. |
| radio group, radio options, grouped radio buttons, single choice group | `RadioGroup` | Use RadioGroup for grouped radio options where only one option can be selected. |
| segmented, segmented control, button group selector, pill selector | `Segmented` | Use Segmented for compact selection between related modes or views. |
| slider, range slider, value slider, drag handle | `Slider` | Use Slider for selecting a value from a range. |
| typography, heading, title, subtitle | `Typography` | Use Typography for headings, titles, labels, paragraphs, helper text, descriptions, and captions. |
| tag, label chip, metadata chip, status pill | `Tag` | Use Tag for metadata labels, categories, and status pills. |
| badge, count badge, notification count, small count bubble | `Badge` | Use Badge for small counts, notification markers, or compact status indicators. |
| lozenge, status lozenge, rounded status label, soft status pill | `Lozenge` | Use Lozenge for compact status/state labels. |
| pills, pill group, pill options, filter pills | `Pills` | Use Pills for pill-style option groups or compact filter selections. |
| swatch, color swatch, colour swatch, color square | `Swatch` | Use Swatch for colour samples, theme colour selection, or visual colour indicators. |
| table, simple table, rows and columns, data table | `Table` | Use Table for simple tabular layouts and basic data tables. |
| ag grid, enterprise grid, complex table, sortable table | `AgGridTable` | Use AgGridTable for complex enterprise tables, sortable grids, filterable grids, or large admin data tables. |
| modal, dialog, popup, overlay dialog | `Modal` | Use Modal for dialogs, popups, and confirmation overlays. |
| alert, banner, warning message, error message | `Alert` | Use Alert for inline warning, error, success, and info messages. |
| toast, temporary message, success toast, floating feedback | `Toast` | Use Toast for temporary feedback messages. |
| notification, notification panel, notification message, system notification | `Notification` | Use Notification for notification display patterns. |
| tooltip, hover hint, help tooltip, small hover message | `Tooltip` | Use Tooltip for hover hints and short contextual help. |
| upload, file upload, dropzone, drag and drop upload | `Upload` | Use Upload for file upload and drag-and-drop upload areas. |
| tabs, tab navigation, tab bar, section tabs | `Tabs` | Use Tabs for switching between related sections. |
| breadcrumb, breadcrumb navigation, path navigation, home slash page path | `Breadcrumb` | Use Breadcrumb for hierarchical page navigation. |
| pagination, page selector, page numbers, next page | `Pagination` | Use Pagination for paginated lists and tables. |
| context menu, right click menu, action menu, dropdown action menu | `ContextMenu` | Use ContextMenu for contextual action menus. |
| collapse, accordion, expand collapse, collapsible panel | `Collapse` | Use Collapse for expandable/collapsible content sections. |
| progress, progress bar, loading progress, completion bar | `Progress` | Use Progress for progress bars and completion indicators. |
| steps, stepper, wizard steps, process steps | `Steps` | Use Steps for multi-step flows, wizards, and process indicators. |
| datepicker, date picker, date input, calendar input | `Datepicker` | Use Datepicker for date selection and date input fields. |
| timepicker, time picker, time input, time field | `Timepicker` | Use Timepicker for time selection and time input fields. |
| notification API / notification hook | `notification`, `useNotification` | Use for notification service/hook patterns only. Do not treat as visual screen components. |

---

# Mandatory Visual Mapping Rules

These rules are strict.

If the screenshot or user description matches the left side, the generated pack must mention the Kaze component on the right side.

| Visual pattern | Required Kaze component |
| --- | --- |
| circular profile image, profile photo, user icon, account icon, initials in circle | `Avatar` |
| clickable action, primary button, secondary button, icon button, quick action | `Button` |
| single-line input, search bar, prompt input, input with placeholder | `TextField` |
| large input, multi-line input, notes field, comment box, description field | `TextArea` |
| dropdown, select field, option picker, field with down arrow | `Dropdown` |
| dropdown with checkboxes, multi-select dropdown, columns selected dropdown, column picker | `CheckboxDropdown` |
| heading, title, label, paragraph, caption | `Typography` |
| radio option, radio button, circle option | `Radio` |
| radio group, grouped radio buttons, single choice group | `RadioGroup` |
| segmented control, mode selector, view switcher | `Segmented` |
| slider, range slider, value slider | `Slider` |
| status pill, category label, metadata chip, status chip | `Tag` |
| count bubble, notification count, number badge, unread count | `Badge` |
| status lozenge, state label, approval state | `Lozenge` |
| pill group, filter pills, pill options | `Pills` |
| colour swatch, color swatch, colour square, theme colour block | `Swatch` |
| simple table, basic rows and columns, record table | `Table` |
| complex enterprise grid, sortable grid, filterable grid, admin data grid | `AgGridTable` |
| modal, dialog, popup, confirmation overlay | `Modal` |
| alert, inline message, warning banner, success message, error message, info message | `Alert` |
| toast, temporary feedback message, snackbar | `Toast` |
| notification message, notification panel, system notification | `Notification` |
| tooltip, hover hint, help hint | `Tooltip` |
| file upload area, dropzone, drag-and-drop upload, screenshot upload | `Upload` |
| tabs, tab navigation, active tab, tab strip | `Tabs` |
| breadcrumb, breadcrumb navigation, path navigation | `Breadcrumb` |
| pagination, page numbers, next page, previous page | `Pagination` |
| context menu, action menu, overflow menu, three dot menu, kebab menu | `ContextMenu` |
| collapse, accordion, expandable panel, collapsible panel | `Collapse` |
| progress bar, completion indicator, loading progress | `Progress` |
| stepper, wizard steps, process steps | `Steps` |
| date input, calendar input, date picker, date range picker | `Datepicker` |
| time input, hour minute input, time picker, time range picker | `Timepicker` |

Do not describe obvious visual elements only in generic words.

Bad:

```txt
profile control
```

Good:

```txt
Use `Avatar` for the circular profile/account image.
```

Bad:

```txt
action control
```

Good:

```txt
Use `Button` for clickable actions.
```

Bad:

```txt
prompt area
```

Good:

```txt
Use `TextField` for a single-line prompt input or `TextArea` for a large multi-line prompt input.
```

---

# Component Detection Rules

## Avatar

Use `Avatar` when the screenshot or description contains:

```txt
avatar
profile image
profile photo
profile picture
user image
user photo
account image
account icon
user icon
round image
circular image
circle image
initials in circle
profile badge
user badge
header profile icon
profile avatar
user avatar
member avatar
assignee avatar
owner avatar
user portrait
profile circle
round profile
```

Visual hints:

```txt
circular user image
profile photo in header
round account icon
user initials inside circle
small circular identity image
round/circular image in a header or user row
```

Use when:

```txt
Use Avatar for user/profile/account identity display, circular profile images, user photos, account icons, or initials.
```
---## Button

Use `Button` when the screenshot or description contains:

```txt
button
primary button
secondary button
tertiary button
action button
clickable action
cta
call to action
icon button
quick action
quick action button
card action
submit button
reset button
preview button
generate button
refresh button
export button
link button
close button
cancel button
save button
delete button
download button
copy button
apply button
clear button
back button
next button
continue button
login button
sign in button
menu trigger button
```

Visual hints:

```txt
clickable rectangle
rounded action control
primary blue action
secondary bordered action
small action control
visible label/action that can be clicked
```

Use when:

```txt
Use Button for clickable actions, including primary actions, secondary actions, icon actions, quick actions, submit actions, reset actions, and export actions.
```
---## TextField

Use `TextField` when the screenshot or description contains:

```txt
text input
single-line input
input field
form field
search bar
search input
prompt input
chat input
input with placeholder
short text field
project feature screen field
screen name field
filter input
email field
password field
username field
name field
keyword input
query input
search field
compact input
```

Visual hints:

```txt
single-line input box
placeholder inside a short field
search-style input
prompt bar
short form control
short field with one line of typed text
```

Use when:

```txt
Use TextField for single-line text inputs, search bars, prompt bars, chat inputs, filters, and short form fields.
```
---## TextArea

Use `TextArea` when the screenshot or description contains:

```txt
textarea
text area
multi-line input
large input
long text field
notes field
additional notes
comment box
description field
large prompt box
multi-line prompt
implementation notes field
remarks field
message box
feedback field
long description
free text area
multi line text box
```

Visual hints:

```txt
large rectangular text input
multi-line field
notes area
description box
large prompt input area
taller input with space for multiple lines
```

Use when:

```txt
Use TextArea for large or multi-line text input areas, notes fields, descriptions, comments, and long prompt boxes.
```
---## Dropdown

Use `Dropdown` when the screenshot or description contains:

```txt
dropdown
select
select field
option picker
combo box
combobox
field with down arrow
screen type selector
filter dropdown
single select
menu select
dropdown menu
select menu
picker
filter select
status selector
type selector
role selector
sort dropdown
```

Visual hints:

```txt
select field with arrow
dropdown field
single option picker
closed menu control
closed selector with chevron/down arrow
```

Use when:

```txt
Use Dropdown for single option selection, select fields, filters, and dropdown-style fields.
```
---## CheckboxDropdown

Use `CheckboxDropdown` when the screenshot or description contains:

```txt
checkbox dropdown
multi-select dropdown
columns selected dropdown
dropdown with checkboxes
multi-select filter
column picker
multiple selection dropdown
checked options dropdown
multi select
multi-select
checkbox select
dropdown checkbox list
column visibility selector
```

Visual hints:

```txt
dropdown with multiple selected options
column selector
multi-select filter
checkbox list inside dropdown
selector that shows checked items or multiple selected values
```

Use when:

```txt
Use CheckboxDropdown for dropdown controls that allow multiple checkbox selections, column selection, or multi-select filtering.
```
---## Checkbox

Use `Checkbox` when the screenshot or description contains:

```txt
checkbox
tick box
square checkbox
checked box
unchecked box
boolean checkbox
standard mode checkbox
agree checkbox
check box
selection checkbox
row checkbox
```

Visual hints:

```txt
square tick control
checked square
unchecked square
boolean selection box
```

Use when:

```txt
Use Checkbox for checkbox-style boolean inputs.
```
---## Toggle

Use `Toggle` when the screenshot or description contains:

```txt
toggle
switch
toggle switch
on off switch
enable disable switch
fast mode switch
standard mode switch
boolean switch
switch control
toggle control
enabled switch
disabled switch
```

Visual hints:

```txt
pill-shaped switch
blue on/off control
sliding toggle
enable disable control
```

Use when:

```txt
Use Toggle for switch-style boolean settings.
```
---## Radio

Use `Radio` when the screenshot or description contains:

```txt
radio
radio button
single radio option
circle option
radio control
single choice radio
```

Visual hints:

```txt
circular selection control
single radio item
round selected option
```

Use when:

```txt
Use Radio for a single radio option.
```
---## RadioGroup

Use `RadioGroup` when the screenshot or description contains:

```txt
radio group
radio options
grouped radio buttons
single choice group
choice group
option group
single select radio group
```

Visual hints:

```txt
multiple radio options
group of circular choices
single-choice option group
```

Use when:

```txt
Use RadioGroup for grouped radio options where only one option can be selected.
```
---## Segmented

Use `Segmented` when the screenshot or description contains:

```txt
segmented
segmented control
button group selector
pill selector
mode selector
design code qa selector
segmented buttons
view switcher
mode switcher
```

Visual hints:

```txt
grouped pill buttons
connected option buttons
selected segment
horizontal segmented options
```

Use when:

```txt
Use Segmented for compact selection between related modes or views.
```
---## Slider

Use `Slider` when the screenshot or description contains:

```txt
slider
range slider
value slider
drag handle
horizontal slider
range control
value range
drag slider
```

Visual hints:

```txt
horizontal track
draggable knob
range control
value control
```

Use when:

```txt
Use Slider for selecting a value from a range.
```
---## Typography

Use `Typography` when the screenshot or description contains:

```txt
typography
heading
title
subtitle
paragraph
body text
label
caption
helper text
description text
section title
page title
small label
field label
text
copy
form label
page heading
card title
table text
empty state text
instruction text
```

Visual hints:

```txt
large heading text
body copy
small helper label
section heading
caption text
```

Use when:

```txt
Use Typography for headings, titles, labels, paragraphs, helper text, descriptions, and captions.
```
---## Tag

Use `Tag` when the screenshot or description contains:

```txt
tag
label chip
metadata chip
status pill
category label
small pill label
status tag
category chip
chip
status chip
filter chip
pill label
```

Visual hints:

```txt
small pill label
status category
metadata chip
colored label
```

Use when:

```txt
Use Tag for metadata labels, categories, and status pills.
```
---## Badge

Use `Badge` when the screenshot or description contains:

```txt
badge
count badge
notification count
small count bubble
status badge
number bubble
compact count
unread count
counter badge
count bubble
```

Visual hints:

```txt
small count bubble
notification marker
compact status bubble
number badge
```

Use when:

```txt
Use Badge for small counts, notification markers, or compact status indicators.
```
---## Lozenge

Use `Lozenge` when the screenshot or description contains:

```txt
lozenge
status lozenge
rounded status label
soft status pill
state label
state lozenge
status state
approval state
```

Visual hints:

```txt
rounded status label
soft colored pill
state indicator
```

Use when:

```txt
Use Lozenge for compact status/state labels.
```
---## Pills

Use `Pills` when the screenshot or description contains:

```txt
pills
pill group
pill options
filter pills
selection pills
pill tabs
pill filters
selected pills
```

Visual hints:

```txt
group of pill controls
rounded option labels
filter chips
```

Use when:

```txt
Use Pills for pill-style option groups or compact filter selections.
```
---## Swatch

Use `Swatch` when the screenshot or description contains:

```txt
swatch
color swatch
colour swatch
color square
theme color
color picker item
colour square
color token
theme swatch
palette swatch
```

Visual hints:

```txt
small color square
theme color block
color sample
```

Use when:

```txt
Use Swatch for colour samples, theme colour selection, or visual colour indicators.
```
---## Table

Use `Table` when the screenshot or description contains:

```txt
table
simple table
rows and columns
data table
basic table
small table
static table
record table
list table
basic data grid
```

Visual hints:

```txt
rows and columns
table header
grid of text values
simple data layout
```

Use when:

```txt
Use Table for simple tabular layouts and basic data tables.
```
---## AgGridTable

Use `AgGridTable` when the screenshot or description contains:

```txt
ag grid
enterprise grid
complex table
sortable table
filterable table
large data grid
admin data grid
enterprise data table
stable enterprise data grid
ag-grid
ag grid table
data grid
server side grid
paginated grid
grid table
```

Visual hints:

```txt
complex data grid
many columns
admin-style table
sortable or filterable grid
enterprise table
enterprise grid with sorting/filtering/large row set
```

Use when:

```txt
Use AgGridTable for complex enterprise tables, sortable grids, filterable grids, or large admin data tables.
```
---## Modal

Use `Modal` when the screenshot or description contains:

```txt
modal
dialog
popup
overlay dialog
confirmation dialog
centered dialog
modal window
drawer-like modal
confirmation popup
dialog window
```

Visual hints:

```txt
dialog box
floating panel
confirmation window
overlay panel
```

Use when:

```txt
Use Modal for dialogs, popups, and confirmation overlays.
```
---## Alert

Use `Alert` when the screenshot or description contains:

```txt
alert
banner
warning message
error message
success message
info message
inline message
validation message
status message
notice
inline alert
error alert
success alert
info alert
warning alert
```

Visual hints:

```txt
inline feedback message
blue info banner
red error banner
green success banner
warning strip
```

Use when:

```txt
Use Alert for inline warning, error, success, and info messages.
```
---## Toast

Use `Toast` when the screenshot or description contains:

```txt
toast
temporary message
success toast
floating feedback
short feedback message
snackbar
toast notification
snack bar
snackbar notification
```

Visual hints:

```txt
temporary notification
floating feedback
short success message
```

Use when:

```txt
Use Toast for temporary feedback messages.
```
---## Notification

Use `Notification` when the screenshot or description contains:

```txt
notification
notification panel
notification message
system notification
persistent notification
notification card
notification toast
system message panel
```

Visual hints:

```txt
notification message
system message
feedback panel
```

Use when:

```txt
Use Notification for notification display patterns.
```
---## Tooltip

Use `Tooltip` when the screenshot or description contains:

```txt
tooltip
hover hint
help tooltip
small hover message
inline hint
info tooltip
question mark hint
help bubble
```

Visual hints:

```txt
small hint bubble
hover message
tooltip label
```

Use when:

```txt
Use Tooltip for hover hints and short contextual help.
```
---## Upload

Use `Upload` when the screenshot or description contains:

```txt
upload
file upload
dropzone
drag and drop upload
upload area
drop screenshots here
attachment upload
image upload
screenshot upload
file picker
attachment dropzone
drag drop area
```

Visual hints:

```txt
drop area
upload box
drag and drop zone
file input area
drop files/images/screenshots area
```

Use when:

```txt
Use Upload for file upload and drag-and-drop upload areas.
```
---## Tabs

Use `Tabs` when the screenshot or description contains:

```txt
tabs
tab navigation
tab bar
section tabs
active tab
horizontal tabs
navigation tabs
tab strip
tabbed navigation
```

Visual hints:

```txt
horizontal tab labels
active tab underline
section switcher
```

Use when:

```txt
Use Tabs for switching between related sections.
```
---## Breadcrumb

Use `Breadcrumb` when the screenshot or description contains:

```txt
breadcrumb
breadcrumb navigation
path navigation
home slash page path
page hierarchy
page path
hierarchy path
breadcrumb trail
```

Visual hints:

```txt
Home slash page path
hierarchical navigation
breadcrumb trail
```

Use when:

```txt
Use Breadcrumb for hierarchical page navigation.
```
---## Pagination

Use `Pagination` when the screenshot or description contains:

```txt
pagination
page selector
page numbers
next page
previous page
pager
pager control
paging control
table pagination
```

Visual hints:

```txt
page number buttons
next previous controls
pagination row
```

Use when:

```txt
Use Pagination for paginated lists and tables.
```
---## ContextMenu

Use `ContextMenu` when the screenshot or description contains:

```txt
context menu
right click menu
action menu
dropdown action menu
menu list
three dot menu
overflow menu
kebab menu
ellipsis menu
more actions menu
overflow actions
right-click menu
```

Visual hints:

```txt
small action menu
vertical menu list
contextual options
overflow actions
three dots or menu trigger that opens action list
```

Use when:

```txt
Use ContextMenu for contextual action menus.
```
---## Collapse

Use `Collapse` when the screenshot or description contains:

```txt
collapse
accordion
expand collapse
collapsible panel
advanced rules panel
disclosure panel
accordion panel
expandable section
disclosure
```

Visual hints:

```txt
expandable section
collapsed panel
accordion row
disclosure header
```

Use when:

```txt
Use Collapse for expandable/collapsible content sections.
```
---## Progress

Use `Progress` when the screenshot or description contains:

```txt
progress
progress bar
loading progress
completion bar
status progress
loading bar
completion indicator
percentage bar
```

Visual hints:

```txt
horizontal progress bar
completion indicator
loading bar
```

Use when:

```txt
Use Progress for progress bars and completion indicators.
```
---## Steps

Use `Steps` when the screenshot or description contains:

```txt
steps
stepper
wizard steps
process steps
multi-step flow
step indicator
wizard progress
process indicator
```

Visual hints:

```txt
numbered steps
step indicators
wizard progress
```

Use when:

```txt
Use Steps for multi-step flows, wizards, and process indicators.
```
---## Datepicker

Use `Datepicker` when the screenshot or description contains:

```txt
datepicker
date picker
date input
calendar input
date field
date selector
calendar picker
date range picker
range date picker
```

Visual hints:

```txt
date value
calendar field
date selection input
```

Use when:

```txt
Use Datepicker for date selection and date input fields.
```
---## Timepicker

Use `Timepicker` when the screenshot or description contains:

```txt
timepicker
time picker
time input
time field
hour minute input
time selector
clock input
time range picker
```

Visual hints:

```txt
time value
hour minute field
time selection input
```

Use when:

```txt
Use Timepicker for time selection and time input fields.
```


---

# Pattern Mappings

The JSON catalog contains a full `patternMappings` dictionary. The important rule is:

```txt
visual role / synonym -> confirmed Kaze export
```

Examples:

| Detected text | Mapped Kaze export |
| --- | --- |
| `accordion` | `Collapse` |
| `accordion panel` | `Collapse` |
| `account icon` | `Avatar` |
| `account image` | `Avatar` |
| `action button` | `Button` |
| `action menu` | `ContextMenu` |
| `active tab` | `Tabs` |
| `additional notes` | `TextArea` |
| `admin data grid` | `AgGridTable` |
| `advanced rules panel` | `Collapse` |
| `ag grid` | `AgGridTable` |
| `ag grid table` | `AgGridTable` |
| `ag-grid` | `AgGridTable` |
| `agree checkbox` | `Checkbox` |
| `alert` | `Alert` |
| `apply button` | `Button` |
| `approval state` | `Lozenge` |
| `assignee avatar` | `Avatar` |
| `attachment dropzone` | `Upload` |
| `attachment upload` | `Upload` |
| `avatar` | `Avatar` |
| `back button` | `Button` |
| `badge` | `Badge` |
| `banner` | `Alert` |
| `basic data grid` | `Table` |
| `basic table` | `Table` |
| `body text` | `Typography` |
| `boolean checkbox` | `Checkbox` |
| `boolean switch` | `Toggle` |
| `breadcrumb` | `Breadcrumb` |
| `breadcrumb navigation` | `Breadcrumb` |
| `breadcrumb trail` | `Breadcrumb` |
| `button` | `Button` |
| `button group selector` | `Segmented` |
| `calendar input` | `Datepicker` |
| `calendar picker` | `Datepicker` |
| `call to action` | `Button` |
| `cancel button` | `Button` |
| `caption` | `Typography` |
| `card action` | `Button` |
| `card title` | `Typography` |
| `category chip` | `Tag` |
| `category label` | `Tag` |
| `centered dialog` | `Modal` |
| `chat input` | `TextField` |
| `check box` | `Checkbox` |
| `checkbox` | `Checkbox` |
| `checkbox dropdown` | `CheckboxDropdown` |
| `checkbox select` | `CheckboxDropdown` |
| `checked box` | `Checkbox` |
| `checked options dropdown` | `CheckboxDropdown` |
| `chip` | `Tag` |
| `choice group` | `RadioGroup` |
| `circle image` | `Avatar` |
| `circle option` | `Radio` |
| `circular image` | `Avatar` |
| `clear button` | `Button` |
| `clickable action` | `Button` |
| `clock input` | `Timepicker` |
| `close button` | `Button` |
| `collapse` | `Collapse` |
| `collapsible panel` | `Collapse` |
| `color picker item` | `Swatch` |
| `color square` | `Swatch` |
| `color swatch` | `Swatch` |
| `color token` | `Swatch` |
| `colour square` | `Swatch` |
| `colour swatch` | `Swatch` |
| `column picker` | `CheckboxDropdown` |
| `column visibility selector` | `CheckboxDropdown` |
| `columns selected dropdown` | `CheckboxDropdown` |
| `combo box` | `Dropdown` |
| `combobox` | `Dropdown` |
| `comment box` | `TextArea` |
| `compact count` | `Badge` |
| `compact input` | `TextField` |
| `completion bar` | `Progress` |
| `completion indicator` | `Progress` |
| `complex table` | `AgGridTable` |
| `confirmation dialog` | `Modal` |

The downloadable JSON file contains the complete machine-readable mapping.

---

# Ambiguity Rules

| Case | Use | When |
| --- | --- | --- |
| TextField vs TextArea | `TextField` | The input appears single-line, compact, search-like, or prompt-bar-like. |
| TextField vs TextArea | `TextArea` | The input is visibly large, multi-line, notes-like, comment-like, or description-like. |
| Table vs AgGridTable | `Table` | The table is simple, static, or has only basic rows and columns. |
| Table vs AgGridTable | `AgGridTable` | The grid is complex, enterprise-style, sortable, filterable, or has many columns. |
| Tag vs Badge | `Tag` | The visual element is a category, status label, metadata chip, or pill label. |
| Tag vs Badge | `Badge` | The visual element is a number, count bubble, notification marker, or compact count indicator. |

---

# Unconfirmed Patterns

These visual patterns do not currently have confirmed Kaze exports.

Do not invent components for them.

| Pattern | Recommended fallback |
| --- | --- |
| Sidebar / Navigation Rail | Use existing project layout/navigation pattern. Do not invent a Kaze Sidebar component. |
| Layout Container / Flex / Grid | Use project layout wrappers or semantic HTML layout. Do not invent KazeBox, KazeFlex, or KazeLayout. |
| Chat Input / Prompt Bar | Use TextField for single-line prompt input or TextArea for large multi-line prompt input. |
| Icon Wrapper | Use existing project icon pattern. Do not invent KazeIcon. |
| Card / Panel | Use existing project card/panel pattern or semantic layout wrappers. Do not invent KazeCard unless package exports prove it exists. |

---

# Forbidden Fake Names

Do not output these unless they are later confirmed by the package exports:

```txt
KazeButton
KazeInput
KazeSelect
KazeAvatar
KazeTypography
KazeSidebar
KazeCard
KazeIcon
KazeLayout
KazeText
KazeFlex
KazeBox
KazeHeading
KazeGreeting
KazePromptBar
KazeModal
KazeTable
KazeDataTable
KazeBadge
KazeTabs
KazeAlert
KazeDatePicker
KazeTimePicker
KazeDropdown
KazeUpload
KazeTooltip
KazeRadio
KazeRadioGroup
KazeCheckbox
KazeCheckboxDropdown
KazeToggle
KazeTextArea
KazeInputText
KazeNotification
KazeToast
KazePagination
KazeBreadcrumb
KazeContextMenu
KazeCollapse
KazeProgress
KazeSteps
KazeSlider
KazePills
KazeSwatch
KazeLozenge
```

If any of these appear in generated code or generated markdown as valid imports, the pack is not ready.

---

# Wrong Name Repairs

Use these automatic repairs when fake Kaze names appear.

| Wrong name | Correct export |
| --- | --- |
| `KazeButton` | `Button` |
| `KazeInput` | `TextField` |
| `KazeSelect` | `Dropdown` |
| `KazeAvatar` | `Avatar` |
| `KazeTypography` | `Typography` |
| `KazeModal` | `Modal` |
| `KazeTable` | `Table` |
| `KazeDataTable` | `AgGridTable` |
| `KazeBadge` | `Badge` |
| `KazeTabs` | `Tabs` |
| `KazeAlert` | `Alert` |
| `KazeDatePicker` | `Datepicker` |
| `KazeTimePicker` | `Timepicker` |
| `KazeDropdown` | `Dropdown` |
| `KazeUpload` | `Upload` |
| `KazeTooltip` | `Tooltip` |
| `KazeRadio` | `Radio` |
| `KazeRadioGroup` | `RadioGroup` |
| `KazeCheckbox` | `Checkbox` |
| `KazeCheckboxDropdown` | `CheckboxDropdown` |
| `KazeToggle` | `Toggle` |
| `KazeTextArea` | `TextArea` |
| `KazeInputText` | `TextField` |
| `KazeNotification` | `Notification` |
| `KazeToast` | `Toast` |
| `KazePagination` | `Pagination` |
| `KazeBreadcrumb` | `Breadcrumb` |
| `KazeContextMenu` | `ContextMenu` |
| `KazeCollapse` | `Collapse` |
| `KazeProgress` | `Progress` |
| `KazeSteps` | `Steps` |
| `KazeSlider` | `Slider` |
| `KazePills` | `Pills` |
| `KazeSwatch` | `Swatch` |
| `KazeLozenge` | `Lozenge` |

---

# Generator Rules

1. Use this catalog as the source of truth for Kaze exports.
2. Do not let the model invent Kaze component names.
3. Ask the vision model to detect generic UI roles first.
4. Map detected visual roles to Kaze exports using componentDetectionRules and patternMappings.
5. If a detected visual role matches a mandatoryMappingRules entry, the mapped Kaze component must appear in handoff.md and kaze-component-mapping.md.
6. If a component is not in confirmedExports, do not present it as a valid Kaze export.
7. If an unknown visual pattern appears, document it as a fallback instead of inventing a component.

Additional strict rules:

- Use exact Kaze export names from confirmedExports only.
- Detect visible UI roles first, then map roles through patternMappings.
- If a visual role appears in mandatoryMappingRules, the mapped export is mandatory.
- Return compact tables or JSON. Do not invent APIs, routes, auth, database logic, permissions, or fake components.
- Do not describe avatar/button/input/text only generically; include Avatar/Button/TextField/TextArea/Typography when applicable.

---

# Validator Rules

The validator should fail or warn when obvious visual terms appear without the correct Kaze mapping.

| Rule | If any term appears | Required export | Severity |
| --- | --- | --- | --- |
| Avatar required for profile imagery | avatar, profile image, profile photo, user image, user icon, account icon, circular image, initials in circle | `Avatar` | fail |
| Button required for clickable actions | button, clickable action, primary action, secondary action, quick action, cta | `Button` | fail |
| TextField or TextArea required for text input | input, search bar, prompt input, text field, notes field, comment box | `TextField / TextArea` | fail |
| Dropdown required for select controls | dropdown, select field, option picker, field with down arrow | `Dropdown` | fail |
| CheckboxDropdown required for multi-select dropdown controls | checkbox dropdown, multi-select dropdown, columns selected dropdown, column picker | `CheckboxDropdown` | fail |
| Typography required for visible text | heading, title, label, paragraph, caption, helper text, body text | `Typography` | warn |
| Upload required for upload/dropzone | upload, file upload, dropzone, drop screenshots here, screenshot upload | `Upload` | fail |
| Tabs required for tab navigation | tabs, tab navigation, tab bar, active tab | `Tabs` | fail |
| Table or AgGridTable required for tables/grids | table, rows and columns, data grid, enterprise grid, ag grid | `Table / AgGridTable` | fail |
| ContextMenu required for overflow/action menus | context menu, three dot menu, kebab menu, overflow menu, action menu | `ContextMenu` | fail |
| Modal required for dialogs | modal, dialog, popup, confirmation overlay | `Modal` | fail |
| Alert required for inline status messages | alert, warning message, error message, success message, info message, inline message | `Alert` | fail |
| Toggle required for switch controls | toggle, switch, on off switch, enable disable switch | `Toggle` | fail |
| Datepicker required for date input | date input, date picker, calendar input | `Datepicker` | fail |
| Timepicker required for time input | time input, time picker, hour minute input | `Timepicker` | fail |

---

# Required Generated Pack Sections

Generated `handoff.md` should include a table like this:

```md
## Detected UI Elements

| Detected element       | Visual evidence                    | Recommended Kaze component | Confidence |
| ---------------------- | ---------------------------------- | -------------------------- | ---------- |
| Circular profile image | User/account image in header       | `Avatar`                   | High       |
| Prompt input           | Single-line input with placeholder | `TextField`                | High       |
| Quick action controls  | Clickable action buttons           | `Button`                   | High       |
| Heading text           | Main page title or greeting        | `Typography`               | High       |
```

Generated `kaze-component-mapping.md` should include a table like this:

```md
## Visual Element To Kaze Component Mapping

| Visual pattern                      | Use Kaze component       | Notes                                                |
| ----------------------------------- | ------------------------ | ---------------------------------------------------- |
| Circular profile/user image         | `Avatar`                 | Use for profile/account identity display.            |
| Clickable action                    | `Button`                 | Use for primary, secondary, icon, and quick actions. |
| Single-line input/search/prompt bar | `TextField`              | Use unless the input is clearly multi-line.          |
| Multi-line notes/prompt area        | `TextArea`               | Use for larger free text input.                      |
| Select/dropdown control             | `Dropdown`               | Use for option selection.                            |
| Checkbox/tick option                | `Checkbox`               | Use for boolean options.                             |
| Tab navigation                      | `Tabs`                   | Use for switching sections.                          |
| Data table                          | `Table` or `AgGridTable` | Use `AgGridTable` for complex enterprise grids.      |
| Status pill/category label          | `Tag` or `Badge`         | Use based on visual style.                           |
| Headings/body text                  | `Typography`             | Use for consistent text styling.                     |
```

---

# On-Prem Prompt Block

Use this block inside the on-prem model prompt.

```txt
You are helping generate a Cline developer pack for a React screen that must use @pcs-security/kaze-ui-library.

Do not be creative.
Do not invent component names.
Do not invent route paths.
Do not invent APIs.
Do not invent backend logic.
Do not invent authentication logic.
Do not invent database logic.

Your job has only 2 steps:

1. Look at the screenshot and list visible UI elements.
2. Match each visible UI element to the closest real Kaze component using the catalog mapping rules.

Important examples:

- If you see a round profile image, use Avatar.
- If you see a user photo, use Avatar.
- If you see initials inside a circle, use Avatar.
- If you see a clickable action, use Button.
- If you see a search bar or prompt input, use TextField.
- If you see a large text box, use TextArea.
- If you see a dropdown/select, use Dropdown.
- If you see tabs, use Tabs.
- If you see a table, use Table.
- If you see a complex data grid, use AgGridTable.
- If you see headings, labels, or paragraphs, use Typography.

Do not call an avatar a generic profile control only.
If the screenshot has a profile image, you must mention Avatar.

Do not call a button a generic action control only.
If the screenshot has a clickable action, you must mention Button.

Do not call an input a generic prompt area only.
If the screenshot has a text input, you must mention TextField or TextArea.

Return a table with exact Kaze components.
```

---

# Detector Output Schema

The model or parser should produce data shaped like this:

```json
{
  "detectedElements": [
    {
      "role": "string",
      "description": "string",
      "visualEvidence": [
        "string"
      ],
      "recommendedKazeExport": "one of confirmedExports or Unknown / verify from Kaze",
      "confidence": "High | Medium | Low"
    }
  ],
  "unknowns": [
    "string"
  ],
  "fallbacks": [
    "string"
  ]
}
```

---

# Automatic Fail Conditions

The generated pack is not ready if:

- Uses fake Kaze-prefixed exports as valid imports.
- Incorrectly forbids valid unprefixed exports such as Button, TextField, Dropdown, Avatar, or Typography.
- Detects profile/avatar visual element but does not mention Avatar.
- Detects clickable actions but does not mention Button.
- Detects text input but does not mention TextField or TextArea.
- Detects dropdown/select controls but does not mention Dropdown.
- Invents a Kaze component not listed in confirmedExports.
- Invents route paths, backend APIs, authentication logic, permissions, or database logic.

---

# Notes

- Public import must use Swatch; ColourSwatch is an internal/source declaration name only.
- Public import must use TextArea; TextAreaField is an internal/source declaration name only.
- notification and useNotification are utility/hook exports, not visual components.
