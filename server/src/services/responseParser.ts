import { EXPECTED_FILE_NAMES } from "./responseParserConstants.js";

export type GeneratedFileName = (typeof EXPECTED_FILE_NAMES)[number];

export type GenerationQualityStatus = "ready" | "needs_review" | "failed";

export interface GenerationQuality {
  status: GenerationQualityStatus;
  label: string;
  score: number;
  issues: string[];
}

export interface ParsedAiResponse {
  files: Partial<Record<GeneratedFileName, string>>;
  rawResponse: string;
  warnings: string[];
  quality: GenerationQuality;
}

export interface ParsedFilenameContext {
  filename: string;
  screenName: string | null;
  state: string | null;
  viewport: string | null;
}

interface FinalValidationResult {
  warnings: string[];
  failureIssues: string[];
  reviewIssues: string[];
}

const CRITICAL_FIRST_STEP_SECTION = [
  "## Critical First Step",
  "",
  "Before writing code:",
  "",
  "1. Inspect actual project structure.",
  "2. Inspect existing pages/screens that already use Kaze.",
  "3. Inspect @pcs-security/kaze-ui-library package exports.",
  "4. Inspect Kaze Storybook/docs if available.",
  "5. Confirm exact Kaze export names and props.",
  "6. Do not use guessed Kaze exports.",
  "7. If a suggested Kaze export does not work, use the closest approved Kaze/project pattern and report it.",
].join("\n");

const CLINE_FINAL_REPORT_SECTION = [
  "After implementation, report:",
  "- Files created or modified",
  "- Confirmed Kaze exports used",
  "- Fallbacks used",
  "- TODOs left unresolved",
  "- Typecheck/build result",
].join("\n");

const KAZE_IMPORT_RULE_SECTION = [
  "## Kaze Import Rule",
  "",
  "Kaze UI package uses unprefixed named exports from @pcs-security/kaze-ui-library. Do not use fake Kaze-prefixed names.",
  "",
  "Correct:",
  "```ts",
  'import { Button, TextField, Dropdown, Avatar, Typography } from "@pcs-security/kaze-ui-library";',
  "```",
  "",
  "Incorrect:",
  "```ts",
  'import { KazeButton, KazeInput, KazeSelect, KazeAvatar, KazeTypography } from "@pcs-security/kaze-ui-library";',
  "```",
].join("\n");

const WRONG_KAZE_NAME_REPAIRS: Record<string, string> = {
  KazeButton: "Button",
  KazeInput: "TextField",
  KazeSelect: "Dropdown",
  KazeAvatar: "Avatar",
  KazeTypography: "Typography",
  KazeModal: "Modal",
  KazeBadge: "Badge",
  KazeTabs: "Tabs",
  KazeAlert: "Alert",
  KazeDatePicker: "Datepicker",
};

const CONFIRMED_KAZE_EXPORTS = new Set([
  "AgGridTable",
  "Alert",
  "Avatar",
  "Badge",
  "Breadcrumb",
  "Button",
  "Checkbox",
  "CheckboxDropdown",
  "Collapse",
  "ContextMenu",
  "Datepicker",
  "Dropdown",
  "Lozenge",
  "Modal",
  "Notification",
  "Pagination",
  "Pills",
  "Progress",
  "Radio",
  "RadioGroup",
  "Segmented",
  "Slider",
  "Steps",
  "Swatch",
  "Table",
  "Tabs",
  "Tag",
  "TextArea",
  "TextField",
  "Timepicker",
  "Toast",
  "Toggle",
  "Tooltip",
  "Typography",
  "Upload",
  "notification",
  "useNotification",
]);

const CORE_KAZE_EXPORTS_THAT_MUST_NOT_BE_FORBIDDEN = [
  "Button",
  "TextField",
  "Dropdown",
  "Avatar",
  "Typography",
];

const FAKE_KAZE_PREFIXED_EXPORT_WARNING =
  "Do NOT use fake Kaze-prefixed names such as `KazeButton`, `KazeInput`, `KazeSelect`, `KazeAvatar`, or `KazeTypography`.";

const HOME_GREETING_MANIFEST_UNKNOWNS = [
  "- Navigation behaviour is not confirmed.",
  "- Avatar interaction is not confirmed.",
  "- Thinking selector options are not visible.",
  "- White circular action button behaviour is not confirmed.",
  "- Quick action behaviours are not confirmed.",
  "- Voice input behaviour is not confirmed.",
];
const AI_ASSISTANT_HOME_VISIBLE_ACTION_LINES = [
  "- Type a prompt in the input field.",
  "- Add attachments using the plus icon.",
  "- Interact with the visible Thinking selector.",
  "- Use microphone/voice controls.",
  "- Use the white circular action button.",
  "- Select quick actions: Create an image, Write or edit, Look something up.",
  "- Use sidebar navigation icons.",
  "- Use the avatar/profile area.",
];
const PACK_CONTENT_FILES = [
  "README_FOR_CLINE.md",
  "pack-manifest.md",
  "handoff.md",
  "kaze-component-mapping.md",
  "cline-implementation-prompt.md",
  "qa-checklist.md",
  "validate-pack.mjs",
  "cline-readiness-standard.md",
];

export function parseAiResponse(params: {
  responseText: string;
  allowedFilenames: string[];
  kazeComponentCatalog: string;
  parsedFilenames?: ParsedFilenameContext[];
}): ParsedAiResponse {
  return parseGeneratedResponse({
    ...params,
    expectedFileNames: EXPECTED_FILE_NAMES,
  });
}

export function parseManifestResponse(params: {
  responseText: string;
  allowedFilenames: string[];
  kazeComponentCatalog: string;
  parsedFilenames?: ParsedFilenameContext[];
}): ParsedAiResponse {
  return parseGeneratedResponse({
    ...params,
    expectedFileNames: ["pack-manifest.md"],
  });
}

export function parseHandoffMappingResponse(params: {
  responseText: string;
  allowedFilenames: string[];
  kazeComponentCatalog: string;
  parsedFilenames?: ParsedFilenameContext[];
}): ParsedAiResponse {
  return parseGeneratedResponse({
    ...params,
    expectedFileNames: ["handoff.md", "kaze-component-mapping.md"],
  });
}

export function parseClineQaResponse(params: {
  responseText: string;
  allowedFilenames: string[];
  kazeComponentCatalog: string;
  parsedFilenames?: ParsedFilenameContext[];
}): ParsedAiResponse {
  return parseGeneratedResponse({
    ...params,
    expectedFileNames: ["cline-implementation-prompt.md", "qa-checklist.md"],
  });
}

export function parseAllGeneratedFiles(params: {
  files: Partial<Record<GeneratedFileName, string>>;
  rawResponse: string;
  allowedFilenames: string[];
  kazeComponentCatalog: string;
  parsedFilenames?: ParsedFilenameContext[];
}): ParsedAiResponse {
  const sanitizedFiles = sanitizeParsedFiles(
    replaceUnconfirmedKazeComponentsInFiles(
      replaceInventedFilenamesInFiles(params.files, params.allowedFilenames),
      params.kazeComponentCatalog,
    ),
    params.kazeComponentCatalog,
  );
  const finalValidation = validateFinalOutput({
    text: Object.values(sanitizedFiles).filter(Boolean).join("\n\n"),
    files: sanitizedFiles,
    allowedFilenames: params.allowedFilenames,
    parsedFilenames: params.parsedFilenames ?? [],
  });
  const missingFiles = EXPECTED_FILE_NAMES.filter(
    (filename) => !sanitizedFiles[filename],
  );
  const warnings = [...finalValidation.warnings];
  const failureIssues = [...finalValidation.failureIssues];

  if (missingFiles.length > 0) {
    const message = `Could not parse all expected files. Showing raw response. Missing: ${missingFiles.join(", ")}.`;
    warnings.push(message);
    failureIssues.push(`Missing expected files: ${missingFiles.join(", ")}.`);
  }

  const dedupedWarnings = uniqueStrings(warnings);
  const quality = computeQuality({
    warnings: dedupedWarnings,
    failureIssues,
    reviewIssues: finalValidation.reviewIssues,
  });

  return {
    files: sanitizedFiles,
    rawResponse: params.rawResponse,
    warnings: dedupedWarnings,
    quality,
  };
}

function parseGeneratedResponse(params: {
  responseText: string;
  expectedFileNames: readonly GeneratedFileName[];
  allowedFilenames: string[];
  kazeComponentCatalog: string;
  parsedFilenames?: ParsedFilenameContext[];
}): ParsedAiResponse {
  const warnings: string[] = [];
  const fenceStripped = stripOuterMarkdownFence(params.responseText);
  const stripped = stripReasoningBlocks(fenceStripped.text);

  const headingRepaired = repairScreenHeadings(
    stripped.text,
    params.parsedFilenames ?? [],
  );
  const stateRepaired = repairUnsafeStateLabels(headingRepaired.text);
  const qaAndFallbackRepaired = repairUnsafeQaAndFallbackText(
    stateRepaired.text,
  );

  const unavailableFilenameRepaired = qaAndFallbackRepaired.text.replace(
    /\bFilename unavailable\b/gi,
    "Filename missing from File Map",
  );

  const componentSanitized = replaceUnconfirmedKazeComponents(
    unavailableFilenameRepaired,
    params.kazeComponentCatalog,
  );

  const filenameSanitized = replaceInventedFilenames(
    componentSanitized.text,
    params.allowedFilenames,
  );

  const files = parseFiles(filenameSanitized.text);
  const sanitizedFiles = sanitizeParsedFiles(
    files,
    params.kazeComponentCatalog,
  );
  const missingFiles = params.expectedFileNames.filter(
    (filename) => !sanitizedFiles[filename],
  );
  const finalValidation = validateFinalOutput({
    text: filenameSanitized.text,
    files: sanitizedFiles,
    allowedFilenames: params.allowedFilenames,
    parsedFilenames: params.parsedFilenames ?? [],
  });

  warnings.push(...finalValidation.warnings);

  if (missingFiles.length > 0) {
    warnings.push(
      `Could not parse all expected files. Showing raw response. Missing: ${missingFiles.join(", ")}.`,
    );
  }

  const failureIssues = [...finalValidation.failureIssues];
  if (missingFiles.length > 0) {
    failureIssues.push(`Missing expected files: ${missingFiles.join(", ")}.`);
  }

  const dedupedWarnings = uniqueStrings(warnings);
  const quality = computeQuality({
    warnings: dedupedWarnings,
    failureIssues,
    reviewIssues: finalValidation.reviewIssues,
  });

  return {
    files: sanitizedFiles,
    rawResponse: params.responseText,
    warnings: dedupedWarnings,
    quality,
  };
}

function stripReasoningBlocks(text: string): {
  text: string;
  changed: boolean;
} {
  const stripped = text
    .replace(/<details\b[^>]*>[\s\S]*?<\/details>/gi, "")
    .replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking\b[^>]*>[\s\S]*?<\/thinking>/gi, "")
    .trim();
  return {
    text: stripped,
    changed: stripped !== text.trim(),
  };
}

function stripOuterMarkdownFence(text: string): {
  text: string;
  changed: boolean;
} {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);

  if (!match) {
    return {
      text,
      changed: false,
    };
  }

  return {
    text: match[1].trim(),
    changed: true,
  };
}

function repairScreenHeadings(
  text: string,
  parsedFilenames: ParsedFilenameContext[],
): { text: string; repaired: string[] } {
  const repaired = new Set<string>();
  let repairedText = text;

  parsedFilenames.forEach((entry) => {
    if (!entry.screenName) {
      return;
    }

    const headingNames = new Set<string>([entry.screenName]);
    if (entry.state) {
      headingNames.add(`${entry.screenName}_${entry.state}`);
    }
    if (entry.state && entry.viewport) {
      headingNames.add(`${entry.screenName}_${entry.state}_${entry.viewport}`);
    }

    headingNames.forEach((headingName) => {
      const headingPattern = new RegExp(
        `^(#{1,6})\\s*(?:(?:Screen|Screen Name):\\s*)?${escapeRegExp(headingName)}\\s*$`,
        "gim",
      );

      repairedText = repairedText.replace(
        headingPattern,
        (match, hashes: string) => {
          const replacement = `${hashes} ${entry.screenName}`;
          if (match.trim() !== replacement.trim()) {
            repaired.add(match.trim());
          }
          return replacement;
        },
      );
    });
  });

  return {
    text: repairedText,
    repaired: [...repaired].sort(),
  };
}

function repairUnsafeStateLabels(text: string): {
  text: string;
  repaired: string[];
} {
  const repaired = new Set<string>();
  const replacements: Array<{
    pattern: RegExp;
    replacement: string;
    label: string;
  }> = [
    {
      pattern: /Default\s*\/\s*Empty/gi,
      replacement: "Default",
      label: "Default / Empty",
    },
    {
      pattern: /Initial\s*\/\s*Empty/gi,
      replacement: "Initial",
      label: "Initial / Empty",
    },
    {
      pattern: /Empty no history/gi,
      replacement: "Default",
      label: "Empty no history",
    },
  ];

  let repairedText = text;
  replacements.forEach(({ pattern, replacement, label }) => {
    if (pattern.test(repairedText)) {
      repaired.add(label);
      repairedText = repairedText.replace(pattern, replacement);
    }
  });

  return {
    text: repairedText,
    repaired: [...repaired].sort(),
  };
}

function repairUnsafeQaAndFallbackText(
  text: string,
  dedupeChecklistLines = false,
): { text: string; repaired: string[] } {
  const repaired = new Set<string>();
  const fallbackRule = [
    "If a Kaze export is not verified:",
    "1. First search existing project patterns.",
    "2. Use the closest approved existing project pattern.",
    "3. Use raw HTML only for non-interactive layout wrappers.",
    "4. Do not use raw input/button/select if Kaze equivalents exist.",
    "5. Document the fallback clearly.",
  ].join("\n");
  const unsafeLineRules: Array<{
    patterns: RegExp[];
    replacement: string;
    label: string;
  }> = [
    {
      patterns: [
        /Sidebar links navigate/i,
        /Sidebar navigation routes/i,
        /routes to correct sections/i,
      ],
      replacement: "- [ ] Sidebar navigation is implemented or marked as TODO.",
      label: "unsafe sidebar navigation QA line",
    },
    {
      patterns: [/Avatar opens/i, /Avatar click opens/i],
      replacement: "- [ ] Avatar interaction is implemented or marked as TODO.",
      label: "unsafe avatar QA line",
    },
    {
      patterns: [
        /Microphone button triggers audio input/i,
        /triggers audio input/i,
      ],
      replacement:
        "- [ ] Microphone button behaviour is implemented or marked as TODO.",
      label: "unsafe microphone button QA line",
    },
    {
      patterns: [
        /Voice button toggles/i,
        /recording states?/i,
        /audio UI state/i,
        /Voice button triggers expected audio UI/i,
        /Voice button triggers expected input state/i,
      ],
      replacement:
        "- [ ] Voice button behaviour is implemented or marked as TODO.",
      label: "unsafe voice button QA line",
    },
    {
      patterns: [
        /opens and allows selection/i,
        /displays options and updates on change/i,
        /dropdown opens/i,
        /updates on change/i,
      ],
      replacement:
        "- [ ] Thinking selector behaviour is implemented or marked as TODO.",
      label: "unsafe thinking selector QA line",
    },
    {
      patterns: [
        /Quick action buttons trigger/i,
        /navigate to or trigger/i,
        /trigger appropriate flows/i,
      ],
      replacement:
        "- [ ] Quick action behaviour is implemented or marked as TODO.",
      label: "unsafe quick action QA line",
    },
    {
      patterns: [
        /White action button triggers submission/i,
        /triggers submission/i,
      ],
      replacement:
        "- [ ] White action button behaviour is implemented or marked as TODO.",
      label: "unsafe submission button QA line",
    },
    {
      patterns: [
        /Screen reader announces dynamic state changes or TODO placeholders correctly/i,
      ],
      replacement:
        "- [ ] Screen reader behaviour is verified for implemented dynamic states.",
      label: "unsafe screen reader QA line",
    },
    {
      patterns: [/use a standard accessible fallback until confirmed/i],
      replacement: fallbackRule,
      label: "use a standard accessible fallback until confirmed",
    },
  ];

  const repairedLines = text.split("\n").map((line) => {
    const cleanedLine = removeBrokenTodoSuffixes(line);

    for (const rule of unsafeLineRules) {
      if (rule.patterns.some((pattern) => pattern.test(cleanedLine))) {
        repaired.add(rule.label);
        return preserveLineIndent(cleanedLine, rule.replacement);
      }
    }

    return cleanedLine;
  });

  const repairedText = dedupeChecklistLines
    ? dedupeChecklistItems(repairedLines, repaired).join("\n")
    : repairedLines.join("\n");

  return {
    text: repairedText,
    repaired: [...repaired].sort(),
  };
}

function removeBrokenTodoSuffixes(line: string): string {
  return line
    .replace(/\s*or is marked as TODO\. or is marked as TODO\./gi, "")
    .replace(/\s*or are marked as TODO\./gi, "")
    .replace(/\s*or is marked as TODO\./gi, "");
}

function preserveLineIndent(originalLine: string, replacement: string): string {
  const indent = originalLine.match(/^\s*/)?.[0] ?? "";
  return `${indent}${replacement}`;
}

function dedupeChecklistItems(
  lines: string[],
  repaired: Set<string>,
): string[] {
  const seenChecklistItems = new Set<string>();
  const dedupedLines: string[] = [];

  lines.forEach((line) => {
    const checklistKey = getChecklistDeduplicationKey(line);
    if (checklistKey) {
      if (seenChecklistItems.has(checklistKey)) {
        repaired.add("duplicate checklist lines");
        return;
      }

      seenChecklistItems.add(checklistKey);
    }

    dedupedLines.push(line);
  });

  return dedupedLines;
}

function getChecklistDeduplicationKey(line: string): string | null {
  const trimmed = line.trim();
  if (!/^[-*]\s+(?:\[[ x]\]\s*)?/i.test(trimmed)) {
    return null;
  }

  return trimmed
    .replace(/^[-*]\s+(?:\[[ x]\]\s*)?/i, "")
    .trim()
    .toLowerCase();
}

function sanitizeQaChecklist(
  checklist: string | undefined,
): string | undefined {
  if (!checklist) {
    return checklist;
  }

  const typographySafeChecklist = checklist.replace(
    /matches typography specs/gi,
    "matches the screenshot and existing Kaze/project typography pattern",
  );
  const repaired = repairUnsafeQaAndFallbackText(
    typographySafeChecklist,
    false,
  );
  const checkboxLines = normalizeQaChecklistCheckboxes(
    repaired.text.split("\n"),
  );
  return dedupeChecklistItems(checkboxLines, new Set()).join("\n");
}

function normalizeQaChecklistCheckboxes(lines: string[]): string[] {
  return lines.map((line) => {
    const bulletMatch = line.match(/^(\s*)[-*]\s+(?!\[[ x]\]\s*)(.+)$/i);
    if (!bulletMatch) {
      return line;
    }

    return `${bulletMatch[1]}- [ ] ${bulletMatch[2].trim()}`;
  });
}

function sanitizeParsedFiles(
  files: Partial<Record<GeneratedFileName, string>>,
  kazeComponentCatalog: string,
): Partial<Record<GeneratedFileName, string>> {
  const missingFilenameRepairedFiles = repairMissingFilenamePlaceholdersInFiles(
    files,
  );

  return {
    ...missingFilenameRepairedFiles,
    "pack-manifest.md": sanitizeManifestContent(
      missingFilenameRepairedFiles["pack-manifest.md"],
    ),
    "handoff.md": sanitizeHandoffContent(
      missingFilenameRepairedFiles["handoff.md"],
    ),
    "kaze-component-mapping.md": sanitizeKazeComponentMappingContent(
      missingFilenameRepairedFiles["kaze-component-mapping.md"],
      kazeComponentCatalog,
    ),
    "cline-implementation-prompt.md": sanitizeClinePrompt(
      missingFilenameRepairedFiles["cline-implementation-prompt.md"],
    ),
    "qa-checklist.md": sanitizeQaChecklist(
      missingFilenameRepairedFiles["qa-checklist.md"],
    ),
  };
}

function repairMissingFilenamePlaceholdersInFiles(
  files: Partial<Record<GeneratedFileName, string>>,
): Partial<Record<GeneratedFileName, string>> {
  return Object.fromEntries(
    Object.entries(files).map(([filename, content]) => [
      filename,
      content ? repairMissingFilenamePlaceholders(content) : content,
    ]),
  ) as Partial<Record<GeneratedFileName, string>>;
}

function repairMissingFilenamePlaceholders(text: string): string {
  const normalizedText = text.replace(
    /Mobile\/tablet layouts are not provided\.\s*\([^)]*\b(?:Mobile|Tablet)\b[^)]*\)/gi,
    "Mobile/tablet layouts are not provided.",
  );

  return normalizedText
    .split("\n")
    .map((line) => {
      if (!/Filename not in File Map/i.test(line)) {
        return line;
      }

      if (/mobile|tablet/i.test(line)) {
        const prefix =
          line.match(/^(\s*(?:[-*]\s+(?:\[[ x]\]\s*)?)?)/i)?.[0] ?? "";
        return `${prefix}Mobile/tablet layouts are not provided.`;
      }

      return line.replace(
        /Filename not in File Map/gi,
        "Screenshot not provided in uploaded File Map",
      );
    })
    .join("\n");
}

function sanitizeManifestContent(
  manifest: string | undefined,
): string | undefined {
  if (!manifest) {
    return manifest;
  }

  const normalizedManifest = manifest
    .replace(
      /Exact spacing and sizing tokens are not provided in the design specs\.?/gi,
      "Detailed layout measurements are not provided.",
    )
    .replace(
      /^\s*[-*]\s*Visible actions should be confirmed from the referenced screenshots in handoff\.md\.?\s*$/gim,
      AI_ASSISTANT_HOME_VISIBLE_ACTION_LINES.join("\n"),
    )
    .replace(
      /Animation behavior for the Thinking selector and quick action buttons is unconfirmed\.?/gi,
      "Interaction behaviour for the Thinking selector and quick action buttons is unconfirmed.",
    );
  let insertedNavigationUnknown = false;
  const unsafeManifestPatterns = [
    /\bKaze[A-Z][A-Za-z0-9]*\b/i,
    /\b(?:Kaze|design|color|colour)?\s*tokens?\b/i,
    /\bsizing tokens?\b/i,
    /\bspacing and sizing tokens?\b/i,
    /\bexact spacing\b/i,
    /\bspacing\b/i,
    /\bdesign specs?\b/i,
    /\bcomponent (?:names?|verification)\b/i,
    /\bimplementation (?:details?|instructions?|assumptions?)\b/i,
    /\bCSS\b/i,
    /\b\d+px\b/i,
    /\bAPI endpoints?\b|\/api\/|https?:\/\//i,
    /\bStorybook\b/i,
  ];
  const routePattern =
    /\broute(?:s| names?| details?)?\b|(?:^|[\s(])\/[a-z0-9_-]+(?:\s|$)/i;

  const cleanedManifest = normalizedManifest
    .split("\n")
    .map((line) => {
      if (routePattern.test(line)) {
        if (insertedNavigationUnknown) {
          return "";
        }

        insertedNavigationUnknown = true;
        return "- Navigation behaviour is not confirmed.";
      }

      if (unsafeManifestPatterns.some((pattern) => pattern.test(line))) {
        return "";
      }

      return line;
    })
    .filter((line, index, lines) => {
      if (line.trim() !== "") {
        return true;
      }

      return index > 0 && lines[index - 1].trim() !== "";
    })
    .join("\n")
    .trim();

  return normalizeManifestUnknowns(cleanedManifest);
}

function normalizeManifestUnknowns(manifest: string): string {
  const lines = manifest.split("\n");
  const remainingLines: string[] = [];
  const unknownLines: string[] = [];
  let inUnknownsSection = false;

  lines.forEach((line) => {
    if (/^#{1,6}\s*Unknowns\s*\/\s*Needs Confirmation\s*$/i.test(line.trim())) {
      inUnknownsSection = true;
      return;
    }

    if (/^#{1,6}\s+/.test(line.trim())) {
      inUnknownsSection = false;
    }

    if (isManifestUnknownLine(line)) {
      unknownLines.push(normalizeManifestUnknownLine(line));
      return;
    }

    if (!inUnknownsSection) {
      remainingLines.push(line);
    }
  });

  if (/\bHomeGreeting\b|HomeGreeting_Default_Desktop\.png/i.test(manifest)) {
    unknownLines.push(...HOME_GREETING_MANIFEST_UNKNOWNS);
  }

  const uniqueUnknownLines = uniqueStrings(unknownLines);
  if (uniqueUnknownLines.length === 0) {
    return remainingLines.join("\n").trim();
  }

  return [
    ...trimTrailingBlankLines(remainingLines),
    "",
    "## Unknowns / Needs Confirmation",
    ...uniqueUnknownLines,
  ]
    .join("\n")
    .trim();
}

function isManifestUnknownLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    /^[-*]\s+/.test(trimmed) &&
    /\b(?:not confirmed|unconfirmed|unknown|needs confirmation)\b/i.test(
      trimmed,
    )
  );
}

function normalizeManifestUnknownLine(line: string): string {
  const content = line
    .trim()
    .replace(/^[-*]\s+/, "")
    .replace(/^Unknowns?\s*\/?\s*needs confirmation:\s*/i, "")
    .trim();

  return `- ${content}`;
}

function trimTrailingBlankLines(lines: string[]): string[] {
  const trimmedLines = [...lines];
  while (
    trimmedLines.length > 0 &&
    trimmedLines[trimmedLines.length - 1].trim() === ""
  ) {
    trimmedLines.pop();
  }

  return trimmedLines;
}

function replaceUnsafeExactDarkVisualLines(
  text: string,
  replacement: string,
): string {
  return text
    .split("\n")
    .map((line) => {
      if (!/#000000/i.test(line)) {
        return line;
      }

      const prefix =
        line.match(/^(\s*(?:[-*]\s+(?:\[[ x]\]\s*)?)?)/i)?.[0] ?? "";
      return `${prefix}${replacement}`;
    })
    .join("\n");
}

function sanitizeHandoffContent(
  handoff: string | undefined,
): string | undefined {
  if (!handoff) {
    return handoff;
  }

  const sanitizedHandoff = handoff
    .replace(
      /Background is pure black\s*\(#000000\)\.?/gi,
      "Dark themed background. Exact colour should follow Kaze/project tokens or existing project styles.",
    )
    .replace(
      /pure black\s*\(#000000\)/gi,
      "dark themed background using existing Kaze/project tokens or styles",
    )
    .replace(
      /Specific Font Awesome icons for the sidebar and quick actions\s*\([^)]*plus[^)]*microphone[^)]*image[^)]*pen[^)]*globe[^)]*\)\.?/gi,
      "Specific Font Awesome icons should be verified against the project icon setup.",
    )
    .replace(
      /Select a mode from the dropdown selector\.?/gi,
      "Interact with the visible `Thinking` selector. Exact options are unknown.",
    );

  return replaceUnsafeExactDarkVisualLines(
    sanitizedHandoff,
    "Dark themed background. Exact colour should follow Kaze/project tokens or existing project styles.",
  );
}

function sanitizeKazeComponentMappingContent(
  mapping: string | undefined,
  kazeComponentCatalog: string,
): string | undefined {
  if (!mapping) {
    return mapping;
  }

  const allowedComponents = getAllowedKazeComponents(kazeComponentCatalog);

  const cleanedMapping = repairContradictoryForbiddenKazeExportLines(mapping)
    .replace(/Exact Kaze Component/gi, "Exact Kaze Export")
    .replace(
      /^(\s*[-*]\s*)?Do not use fake Kaze-prefixed names\s*\((?:e\.g\.|for example),?\s*Button\)\.?\s*$/gim,
      "- Do not use fake Kaze-prefixed names such as KazeButton, KazeInput, KazeSelect, KazeAvatar, or KazeTypography.",
    )
    .replace(
      /Use Unknown \/ verify from Kaze or Unknown \/ verify from Kaze if available, otherwise standard HTML\/Text\.?/gi,
      "Use existing project typography/heading pattern. If Kaze has a confirmed Typography export, use it; otherwise document fallback.",
    )
    .replace(
      /Unknown \/ verify from Kaze or Unknown \/ verify from Kaze/gi,
      "Unknown / verify from Kaze",
    );

  let inComponentMappingTable = false;

  return ensureKazeComponentMappingRuleText(cleanedMapping
    .split("\n")
    .map((line) => {
      const cells = parseMarkdownTableRow(line);
      if (!cells) {
        inComponentMappingTable = false;
      } else if (cells.some((cell) => /^Exact Kaze Export$/i.test(cell))) {
        inComponentMappingTable = true;
      } else if (
        !isMarkdownTableSeparator(cells) &&
        /^UI Element$/i.test(cells[0])
      ) {
        inComponentMappingTable = false;
      }

      const normalizedComponentLine = inComponentMappingTable
        ? normalizeMappingExactComponentCell(line, allowedComponents)
        : line;

      if (!/Known standard icon/i.test(normalizedComponentLine)) {
        return normalizedComponentLine;
      }

      if (/sidebar\s+nav\s+icons?/i.test(normalizedComponentLine)) {
        return normalizedComponentLine.replace(
          /Known standard icon/gi,
          "Unknown / verify Font Awesome icon",
        );
      }

      const iconDescription = inferFontAwesomeIconDescription(
        normalizedComponentLine,
      );
      return normalizedComponentLine.replace(
        /Known standard icon/gi,
        `Likely Font Awesome ${iconDescription}; verify project icon setup.`,
      );
    })
    .join("\n"));
}

function repairContradictoryForbiddenKazeExportLines(mapping: string): string {
  return mapping
    .split("\n")
    .map((line) => {
      if (!lineForbidsConfirmedCoreKazeExports(line)) {
        return line;
      }

      const labelMatch = line.match(
        /^(\s*[-*]\s*(?:\*\*)?(?:Forbidden Names|Forbidden Exports|Invalid)(?:\*\*)?\s*:?\s*).*/i,
      );

      if (!labelMatch) {
        return `- **Forbidden Names:** ${FAKE_KAZE_PREFIXED_EXPORT_WARNING}`;
      }

      return `${labelMatch[1]}${FAKE_KAZE_PREFIXED_EXPORT_WARNING}`;
    })
    .join("\n");
}

function lineForbidsConfirmedCoreKazeExports(line: string): boolean {
  if (
    !/(forbidden names|forbidden exports|invalid|do\s+not\s+use|do\s+NOT\s+use|don't\s+use|never\s+use)/i.test(
      line,
    )
  ) {
    return false;
  }

  if (/fake\s+Kaze-prefixed|fake\s+prefixed\s+aliases/i.test(line)) {
    return false;
  }

  const forbiddenRealExportCount =
    CORE_KAZE_EXPORTS_THAT_MUST_NOT_BE_FORBIDDEN.filter((exportName) =>
      new RegExp(`(^|[^A-Za-z0-9_])${exportName}([^A-Za-z0-9_]|$)`).test(
        line,
      ),
    ).length;

  return forbiddenRealExportCount >= 2;
}

function ensureKazeComponentMappingRuleText(mapping: string): string {
  if (
    /## Real Export Rule/i.test(mapping) &&
    /Button[\s,\n]+TextField[\s,\n]+Dropdown/i.test(mapping) &&
    /KazeButton[\s,\n]+KazeInput[\s,\n]+KazeSelect/i.test(mapping)
  ) {
    return mapping;
  }

  return [
    mapping.trim(),
    "",
    "## Real Export Rule",
    "",
    "Only import components that are actually exported by `@pcs-security/kaze-ui-library`.",
    "",
    "Known valid exports include:",
    "",
    ...getConfirmedKazeExportList().map((component) => `- ${component}`),
    "",
    "Do not use names that are not in this list unless the installed package typings prove the export exists.",
    "",
    "Never use fake prefixed aliases such as `KazeButton`, `KazeInput`, `KazeSelect`, `KazeAvatar`, or `KazeTypography`.",
    "",
    "## Kaze Import Rule",
    "- `Button`, `TextField`, `Dropdown`, `Avatar`, and `Typography` are real unprefixed exports from `@pcs-security/kaze-ui-library`.",
    "- Do not use fake Kaze-prefixed names such as `KazeButton`, `KazeInput`, `KazeSelect`, `KazeAvatar`, or `KazeTypography`.",
    "",
    "Correct:",
    "```ts",
    "import {",
    "  Button,",
    "  TextField,",
    "  Dropdown,",
    "  Avatar,",
    "  Typography,",
    '} from "@pcs-security/kaze-ui-library";',
    "```",
    "",
    "Incorrect:",
    "```ts",
    "// WRONG - do not use fake Kaze-prefixed exports",
    "import {",
    "  KazeButton,",
    "  KazeInput,",
    "  KazeSelect,",
    "  KazeAvatar,",
    "  KazeTypography,",
    '} from "@pcs-security/kaze-ui-library";',
    "```",
  ].join("\n");
}

function getConfirmedKazeExportList(): string[] {
  return [...CONFIRMED_KAZE_EXPORTS];
}

function normalizeMappingExactComponentCell(
  line: string,
  allowedComponents: Set<string>,
): string {
  const cells = parseMarkdownTableRow(line);
  if (!cells || cells.length < 5 || isMarkdownTableSeparator(cells)) {
    return line;
  }

  const [
    uiElement,
    intendedPattern,
    exactComponent,
    confidence,
    notes,
    ...rest
  ] = cells;
  const originalExactCell = exactComponent.trim();
  const exactCell = repairFakeKazeNames(originalExactCell);
  const noteCell = repairFakeKazeNames(notes)
    .replace(
      /Use Unknown \/ verify from Kaze or Unknown \/ verify from Kaze if available, otherwise standard HTML\/Text\.?/gi,
      "Use existing project typography/heading pattern. If Kaze has a confirmed Typography export, use it; otherwise document fallback.",
    )
    .replace(
      /Unknown \/ verify from Kaze or Unknown \/ verify from Kaze/gi,
      "Unknown / verify from Kaze",
    );
  const rowText = `${uiElement} ${intendedPattern} ${exactCell} ${noteCell}`;
  const mentionedAllowedComponents = [...allowedComponents].filter(
    (component) =>
      new RegExp(`\\b${escapeRegExp(component)}\\b`).test(exactCell),
  );
  const mentionsUnknown = /Unknown\s*\/\s*verify from Kaze/i.test(exactCell);

  if (
    /quick action|create an image|write or edit|look something up/i.test(
      rowText,
    )
  ) {
    return formatMarkdownTableRow([
      "Quick Action Buttons",
      "Button / rounded action button",
      allowedComponents.has("Button")
        ? "Button"
        : "Unknown / verify from Kaze",
      allowedComponents.has("Button") ? "Medium" : "Low",
      "Use rounded/button variant if supported; verify existing project pattern.",
      ...rest,
    ]);
  }

  if (/microphone/i.test(rowText)) {
    return formatMarkdownTableRow([
      "Microphone Button",
      "Button / icon button",
      allowedComponents.has("Button")
        ? "Button"
        : "Unknown / verify from Kaze",
      allowedComponents.has("Button") ? "High" : "Low",
      "Use Font Awesome microphone icon if project setup supports it.",
      ...rest,
    ]);
  }

  if (/sidebar.*icons?|sidebar icon buttons?/i.test(uiElement)) {
    return formatMarkdownTableRow([
      "Sidebar Icon Buttons",
      "Navigation / icon button pattern",
      "Unknown / verify from Kaze",
      "Low",
      "Verify existing project sidebar/navigation pattern.",
      ...rest,
    ]);
  }

  if (/close.*icon|top-right close/i.test(`${uiElement} ${exactCell}`)) {
    return formatMarkdownTableRow([
      "Top-right Close/Icon Button",
      "Icon button pattern",
      "Unknown / verify from Kaze",
      "Medium",
      "Exact icon and behaviour unknown.",
      ...rest,
    ]);
  }

  if (
    /plus|attachment/i.test(uiElement) &&
    allowedComponents.has("Button")
  ) {
    return formatMarkdownTableRow([
      uiElement,
      intendedPattern,
      "Button",
      confidence,
      "Use as icon button if supported by Button props; otherwise verify project pattern.",
      ...rest,
    ]);
  }

  if (exactCellContainsIconDescription(exactCell)) {
    return formatMarkdownTableRow([
      uiElement,
      intendedPattern,
      mentionedAllowedComponents[0] ?? "Unknown / verify from Kaze",
      confidence,
      noteCell,
      ...rest,
    ]);
  }

  if (mentionsUnknown && mentionedAllowedComponents.length > 0) {
    return formatMarkdownTableRow([
      uiElement,
      intendedPattern,
      mentionedAllowedComponents[0],
      confidence,
      noteCell,
      ...rest,
    ]);
  }

  if (
    /\/\s*Kaze[A-Z][A-Za-z0-9]*/.test(exactCell) &&
    mentionedAllowedComponents.length > 0
  ) {
    return formatMarkdownTableRow([
      uiElement,
      intendedPattern,
      mentionedAllowedComponents[0],
      confidence,
      noteCell,
      ...rest,
    ]);
  }

  if (
    mentionedAllowedComponents.length > 0 &&
    exactCell !== mentionedAllowedComponents[0]
  ) {
    return formatMarkdownTableRow([
      uiElement,
      intendedPattern,
      mentionedAllowedComponents[0],
      confidence,
      noteCell,
      ...rest,
    ]);
  }

  if (mentionsUnknown) {
    return formatMarkdownTableRow([
      uiElement,
      intendedPattern,
      "Unknown / verify from Kaze",
      confidence,
      noteCell,
      ...rest,
    ]);
  }

  if (noteCell !== notes) {
    return formatMarkdownTableRow([
      uiElement,
      intendedPattern,
      exactCell,
      confidence,
      noteCell,
      ...rest,
    ]);
  }

  if (exactCell !== originalExactCell) {
    return formatMarkdownTableRow([
      uiElement,
      intendedPattern,
      exactCell,
      confidence,
      noteCell,
      ...rest,
    ]);
  }

  return line;
}

function exactCellContainsIconDescription(exactCell: string): boolean {
  return (
    /Font Awesome/i.test(exactCell) ||
    /\b(?:plus|microphone|image|pen|edit|globe|close)\s+icons?\b/i.test(
      exactCell,
    ) ||
    /\bicons?\s*(?:name|description)?\b/i.test(exactCell)
  );
}

function parseMarkdownTableRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
    return null;
  }

  return trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

function formatMarkdownTableRow(cells: string[]): string {
  return `| ${cells.join(" | ")} |`;
}

function isMarkdownTableSeparator(cells: string[]): boolean {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function inferFontAwesomeIconDescription(line: string): string {
  if (/plus|attachment/i.test(line)) {
    return "plus icon";
  }

  if (/microphone|voice/i.test(line)) {
    return "microphone icon";
  }

  if (/image/i.test(line)) {
    return "image icon";
  }

  if (/pen|edit|write/i.test(line)) {
    return "pen/edit icon";
  }

  if (/globe|search|web/i.test(line)) {
    return "globe icon";
  }

  return "icon";
}

function sanitizeClinePrompt(prompt: string | undefined): string | undefined {
  if (!prompt) {
    return prompt;
  }

  const sanitizedPrompt = replaceUnsafeExactDarkVisualLines(
    prompt,
    "Dark mode using existing Kaze/project tokens or styles.",
  )
    .replace(
      /Dark mode\s*\(#000000 background,\s*light text\)\.?/gi,
      "Dark mode using existing Kaze/project tokens or styles.",
    )
    .replace(
      /Use KazeInput or similar text component for the greeting if supported, otherwise use raw HTML with verified typography styles\.?/gi,
      "Use the existing project typography/heading pattern for the greeting. If Kaze has a confirmed Typography export, use it; otherwise use the approved project text pattern.",
    )
    .replace(
      /Use KazeInput or similar for the sidebar if it(?:'|’)?s interactive, otherwise verify sidebar pattern\.?/gi,
      "Use the existing project sidebar/navigation pattern if available. Do not use TextField for sidebar/navigation. If no approved pattern exists, document the fallback and keep raw HTML limited to non-interactive layout wrappers.",
    );

  return ensureClineFinalReportSection(
    ensureKazeImportRuleSection(ensureClineCriticalFirstStep(sanitizedPrompt)),
  );
}

function ensureClineCriticalFirstStep(
  prompt: string | undefined,
): string | undefined {
  if (!prompt) {
    return prompt;
  }

  if (hasRequiredCriticalFirstStep(prompt)) {
    return prompt;
  }

  return [prompt.trim(), "", CRITICAL_FIRST_STEP_SECTION].join("\n").trim();
}

function hasRequiredCriticalFirstStep(prompt: string): boolean {
  return [
    "## Critical First Step",
    "Before writing code:",
    "Inspect actual project structure.",
    "Inspect existing pages/screens that already use Kaze.",
    "Inspect @pcs-security/kaze-ui-library package exports.",
    "Inspect Kaze Storybook/docs if available.",
    "Confirm exact Kaze export names and props.",
    "Do not use guessed Kaze exports.",
    "If a suggested Kaze export does not work, use the closest approved Kaze/project pattern and report it.",
  ].every((requiredText) => prompt.includes(requiredText));
}

function ensureKazeImportRuleSection(
  prompt: string | undefined,
): string | undefined {
  if (!prompt) {
    return prompt;
  }

  if (
    prompt.includes("@pcs-security/kaze-ui-library") &&
    prompt.includes("Button, TextField, Dropdown") &&
    prompt.includes("KazeButton")
  ) {
    return prompt;
  }

  return [prompt.trim(), "", KAZE_IMPORT_RULE_SECTION].join("\n").trim();
}

function ensureClineFinalReportSection(
  prompt: string | undefined,
): string | undefined {
  if (!prompt) {
    return prompt;
  }

  if (hasRequiredFinalReportSection(prompt)) {
    return prompt;
  }

  const cleanedPrompt = prompt
    .replace(
      /After implementation,\s*report (?:what changed|the result|your work)\.?/gi,
      "",
    )
    .replace(/Summari[sz]e the implementation result\.?/gi, "")
    .trim();

  return [cleanedPrompt, "", CLINE_FINAL_REPORT_SECTION].join("\n").trim();
}

function hasRequiredFinalReportSection(prompt: string): boolean {
  return [
    "After implementation, report:",
    "Files created or modified",
    "Confirmed Kaze exports used",
    "Fallbacks used",
    "TODOs left unresolved",
    "Typecheck/build result",
  ].every((requiredText) => prompt.includes(requiredText));
}

function validateFinalOutput(params: {
  text: string;
  files: Partial<Record<GeneratedFileName, string>>;
  allowedFilenames: string[];
  parsedFilenames: ParsedFilenameContext[];
}): FinalValidationResult {
  const warnings: string[] = [];
  const failureIssues: string[] = [];
  const reviewIssues: string[] = [];
  const finalText =
    Object.values(params.files).filter(Boolean).join("\n\n") || params.text;
  const finalTextForRiskScan = stripAllowedIncorrectKazeExamples(finalText);

  const addWarning = (message: string, issue = message) => {
    warnings.push(message);
    reviewIssues.push(issue);
  };
  const addFailure = (message: string, issue = message) => {
    warnings.push(message);
    failureIssues.push(issue);
  };

  const riskyFinalPatterns: Array<{
    label: string;
    pattern: RegExp;
    failure?: boolean;
  }> = [
    {
      label: "Filename unavailable",
      pattern: /Filename unavailable/i,
      failure: true,
    },
    {
      label: "Filename not in File Map",
      pattern: /Filename not in File Map/i,
      failure: true,
    },
    {
      label:
        "Visible actions should be confirmed from the referenced screenshots in handoff.md",
      pattern:
        /Visible actions should be confirmed from the referenced screenshots in handoff\.md/i,
    },
    {
      label: "Chatgpt_default_Desktop.png",
      pattern: /Chatgpt_default_Desktop\.png/i,
    },
    {
      label: "Home_Default_Desktop.png",
      pattern: /Home_Default_Desktop\.png/i,
    },
    { label: "Default / Empty", pattern: /Default\s*\/\s*Empty/i },
    { label: "Initial / Empty", pattern: /Initial\s*\/\s*Empty/i },
    { label: "Empty no history", pattern: /Empty no history/i },
    { label: "<details", pattern: /<details/i, failure: true },
    { label: "reasoning", pattern: /\breasoning\b/i },
    { label: "Thought for", pattern: /Thought for/i, failure: true },
    { label: "analysis", pattern: /\banalysis\b/i, failure: true },
    { label: "KazeButton", pattern: /\bKazeButton\b/ },
    { label: "KazeInput", pattern: /\bKazeInput\b/ },
    { label: "KazeSelect", pattern: /\bKazeSelect\b/ },
    { label: "KazeSidebar", pattern: /\bKazeSidebar\b/ },
    { label: "KazeAvatar", pattern: /\bKazeAvatar\b/ },
    { label: "KazeCard", pattern: /\bKazeCard\b/ },
    { label: "KazeIcon", pattern: /\bKazeIcon\b/ },
    { label: "KazeLayout", pattern: /\bKazeLayout\b/ },
    { label: "KazeText", pattern: /\bKazeText\b/ },
    { label: "KazeTypography", pattern: /\bKazeTypography\b/ },
    { label: "KazeFlex", pattern: /\bKazeFlex\b/ },
    { label: "KazeBox", pattern: /\bKazeBox\b/ },
    { label: "KazeHeading", pattern: /\bKazeHeading\b/ },
    { label: "KazeGreeting", pattern: /\bKazeGreeting\b/ },
    { label: "KazePromptBar", pattern: /\bKazePromptBar\b/ },
    {
      label: "Use KazeInput or similar text component for the greeting",
      pattern: /Use KazeInput or similar text component for the greeting/i,
    },
    {
      label: "Use KazeInput or similar for the sidebar",
      pattern: /Use KazeInput or similar for the sidebar/i,
    },
    {
      label: "opens and allows selection",
      pattern: /opens and allows selection/i,
    },
    {
      label: "displays options and updates on change",
      pattern: /displays options and updates on change/i,
    },
    {
      label: "toggles between idle and recording states",
      pattern: /toggles between idle and recording states/i,
    },
    {
      label: "triggers audio input",
      pattern: /triggers audio input/i,
    },
    {
      label: "triggers submission",
      pattern: /triggers submission/i,
    },
    {
      label: "navigate to or trigger their respective flows",
      pattern: /navigate to or trigger their respective flows/i,
    },
    {
      label: "trigger appropriate flows",
      pattern: /trigger appropriate flows/i,
    },
    {
      label: "routes to correct sections",
      pattern: /routes to correct sections/i,
    },
    {
      label: "Select a mode from the dropdown selector",
      pattern: /Select a mode from the dropdown selector/i,
    },
    {
      label: "Known standard icon",
      pattern: /Known standard icon/i,
    },
    {
      label: "spacing and sizing tokens",
      pattern: /spacing and sizing tokens/i,
    },
    {
      label: "exact spacing",
      pattern: /exact spacing/i,
    },
    {
      label: "route names",
      pattern: /route names/i,
    },
    {
      label: "API endpoints",
      pattern: /\b(?:GET|POST|PUT|PATCH|DELETE)\s+\/|\/api\/|https?:\/\//i,
    },
    {
      label: "ambiguous Kaze mapping cell",
      pattern:
        /Unknown\s*\/\s*verify from Kaze\s*\/\s*Kaze[A-Z][A-Za-z0-9]*|Kaze[A-Z][A-Za-z0-9]*\s*\/\s*Unknown\s*\/\s*verify from Kaze/i,
    },
    {
      label:
        "Screen reader announces dynamic state changes or TODO placeholders correctly",
      pattern:
        /Screen reader announces dynamic state changes or TODO placeholders correctly/i,
    },
    {
      label: "Unknown / verify from Kaze or Unknown / verify from Kaze",
      pattern: /Unknown \/ verify from Kaze or Unknown \/ verify from Kaze/i,
    },
    {
      label: "typography specs",
      pattern: /typography specs/i,
    },
  ];

  riskyFinalPatterns.forEach(({ label, pattern, failure }) => {
    if (!pattern.test(finalTextForRiskScan)) {
      return;
    }

    const message = `Generated output contains risky phrase after repair: ${label}.`;
    if (failure) {
      addFailure(
        message,
        `Output still contains blocked reasoning/filename content: ${label}.`,
      );
      return;
    }

    addWarning(message);
  });

  const hasExplicitEmptyFilenameState = params.parsedFilenames.some(
    (entry) => entry.state?.toLowerCase() === "empty",
  );
  if (
    !hasExplicitEmptyFilenameState &&
    /^(?:#{1,6}|[-*])\s*Empty(?:\s|:|$)/im.test(finalText)
  ) {
    addWarning(
      "Generated output includes an Empty state even though no uploaded filename state is Empty.",
    );
  }

  params.parsedFilenames.forEach((entry) => {
    if (!entry.screenName) {
      return;
    }

    const screenName = escapeRegExp(entry.screenName);
    const invalidHeadingPatterns: Array<{ label: string; pattern: RegExp }> = [
      {
        label: `Screen: ${entry.screenName}`,
        pattern: new RegExp(`^#{1,6}\\s*Screen:\\s*${screenName}\\s*$`, "im"),
      },
      {
        label: `Screen Name: ${entry.screenName}`,
        pattern: new RegExp(
          `^#{1,6}\\s*Screen Name:\\s*${screenName}\\s*$`,
          "im",
        ),
      },
    ];

    if (entry.state) {
      const screenAndState = `${entry.screenName}_${entry.state}`;
      invalidHeadingPatterns.push({
        label: screenAndState,
        pattern: new RegExp(
          `^#{1,6}\\s*(?:(?:Screen|Screen Name):\\s*)?${escapeRegExp(screenAndState)}\\s*$`,
          "im",
        ),
      });
    }

    if (entry.state && entry.viewport) {
      const fullParsedName = `${entry.screenName}_${entry.state}_${entry.viewport}`;
      invalidHeadingPatterns.push({
        label: fullParsedName,
        pattern: new RegExp(
          `^#{1,6}\\s*(?:(?:Screen|Screen Name):\\s*)?${escapeRegExp(fullParsedName)}\\s*$`,
          "im",
        ),
      });
    }

    invalidHeadingPatterns.forEach(({ label, pattern }) => {
      if (pattern.test(finalText)) {
        addWarning(
          `Generated output still contains invalid screen heading: ${label}.`,
        );
      }
    });
  });

  const manifestWarnings = validateManifestCleanliness(params.files);
  warnings.push(...manifestWarnings);
  reviewIssues.push(...manifestWarnings);

  const visualWarnings = validateHandoffAndClineVisualSafety(params.files);
  warnings.push(...visualWarnings);
  reviewIssues.push(...visualWarnings);

  const mappingWarnings = validateKazeComponentMapping(
    params.files["kaze-component-mapping.md"],
  );
  warnings.push(...mappingWarnings);
  reviewIssues.push(...mappingWarnings);

  const manifest = params.files["pack-manifest.md"];
  if (manifest) {
    const packContentWarnings = validateManifestPackContents(
      manifest,
      params.allowedFilenames,
    );
    packContentWarnings.forEach((message) => addFailure(message, message));

    params.allowedFilenames.forEach((filename) => {
      if (
        !manifest.includes(filename) &&
        !manifest.includes(`screenshots/${filename}`)
      ) {
        const message = `pack-manifest.md is missing screenshot list entry: ${filename}.`;
        addFailure(message, message);
      }
    });
  }

  const clineWarnings = validateClinePrompt(
    params.files["cline-implementation-prompt.md"],
  );
  warnings.push(...clineWarnings);
  reviewIssues.push(...clineWarnings);

  const qaWarnings = validateQaChecklist(params.files["qa-checklist.md"]);
  warnings.push(...qaWarnings);
  reviewIssues.push(...qaWarnings);

  return {
    warnings: uniqueStrings(warnings),
    failureIssues: uniqueStrings(failureIssues),
    reviewIssues: uniqueStrings(reviewIssues),
  };
}

function validateManifestPackContents(
  manifest: string,
  allowedFilenames: string[],
): string[] {
  const warnings: string[] = [];
  const packContentsSection = readMarkdownSection(manifest, "Pack Contents");

  if (!packContentsSection) {
    warnings.push("pack-manifest.md is missing required Pack Contents section.");
    return warnings;
  }

  PACK_CONTENT_FILES.forEach((filename) => {
    if (!packContentsSection.includes(filename)) {
      warnings.push(
        `pack-manifest.md Pack Contents is missing required file: ${filename}.`,
      );
    }
  });

  allowedFilenames.forEach((filename) => {
    const screenshotPath = `screenshots/${filename}`;
    if (!packContentsSection.includes(screenshotPath)) {
      warnings.push(
        `pack-manifest.md Pack Contents is missing screenshot path: ${screenshotPath}.`,
      );
    }
  });

  return warnings;
}

function readMarkdownSection(markdown: string, sectionName: string): string {
  const pattern = new RegExp(
    `(?:^|\\n)## ${escapeRegExp(sectionName)}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`,
  );
  return markdown.match(pattern)?.[1]?.trim() ?? "";
}

function validateManifestCleanliness(
  files: Partial<Record<GeneratedFileName, string>>,
): string[] {
  const manifest = files["pack-manifest.md"];
  if (!manifest) {
    return [];
  }

  const warningPatterns: Array<{ label: string; pattern: RegExp }> = [
    { label: "Kaze component details", pattern: /\bKaze[A-Z][A-Za-z0-9]*\b/ },
    { label: "component verification", pattern: /component verification/i },
    {
      label: "confirmed Kaze exports",
      pattern: /confirmed Kaze (?:components?|exports?)/i,
    },
    { label: "token details", pattern: /\btokens?\b/i },
    { label: "color tokens", pattern: /color tokens?|colour tokens?/i },
    {
      label: "spacing and sizing tokens",
      pattern: /spacing and sizing tokens?/i,
    },
    { label: "sizing tokens", pattern: /sizing tokens?/i },
    { label: "exact spacing", pattern: /exact spacing/i },
    { label: "spacing details", pattern: /\bspacing\b/i },
    { label: "design specs", pattern: /design specs?/i },
    { label: "component names", pattern: /component names?/i },
    { label: "implementation details", pattern: /implementation details/i },
    {
      label: "implementation instructions",
      pattern: /implementation instructions?/i,
    },
    {
      label: "API endpoint details",
      pattern: /API endpoints?|\/api\/|http:\/\/|https:\/\//i,
    },
    {
      label: "route details",
      pattern:
        /route names?|route details?|routes?:\s|(?:^|[\s(])\/[a-z0-9_-]+(?:\s|$)/i,
    },
    { label: "Storybook instructions", pattern: /Storybook/i },
    { label: "CSS values", pattern: /\bCSS\b|#[0-9a-f]{3,8}\b/i },
    { label: "exact pixel values", pattern: /\b\d+px\b/i },
  ];

  return warningPatterns
    .filter(({ pattern }) => pattern.test(manifest))
    .map(
      ({ label }) =>
        `pack-manifest.md may include content that belongs outside the manifest: ${label}.`,
    );
}

function validateHandoffAndClineVisualSafety(
  files: Partial<Record<GeneratedFileName, string>>,
): string[] {
  const warnings: string[] = [];

  if (/#000000/i.test(files["handoff.md"] ?? "")) {
    warnings.push(
      "handoff.md contains exact #000000 visual value; use Kaze/project tokens or styles instead.",
    );
  }

  if (/#000000/i.test(files["cline-implementation-prompt.md"] ?? "")) {
    warnings.push(
      "cline-implementation-prompt.md contains exact #000000 visual value; use Kaze/project tokens or styles instead.",
    );
  }

  return warnings;
}

function validateKazeComponentMapping(mapping: string | undefined): string[] {
  if (!mapping) {
    return [];
  }

  const warnings: string[] = [];

  if (
    /Do not use fake Kaze-prefixed names\s*\((?:e\.g\.|for example),?\s*Button\)/i.test(
      mapping,
    )
  ) {
    warnings.push(
      "kaze-component-mapping.md incorrectly describes Button as a fake Kaze-prefixed name.",
    );
  }

  if (mapping.split("\n").some(lineForbidsConfirmedCoreKazeExports)) {
    warnings.push(
      "kaze-component-mapping.md incorrectly lists real Kaze exports such as Button, TextField, Dropdown, Avatar, or Typography as forbidden.",
    );
  }

  if (
    !/## Real Export Rule/i.test(mapping) ||
    !/Button[\s,\n]+TextField[\s,\n]+Dropdown/i.test(mapping) ||
    !/KazeButton[\s,\n]+KazeInput[\s,\n]+KazeSelect/i.test(mapping)
  ) {
    warnings.push(
      "kaze-component-mapping.md is missing clear Real Export Rule and fake-export Kaze import guidance.",
    );
  }

  let inComponentMappingTable = false;
  mapping.split("\n").forEach((line) => {
    const cells = parseMarkdownTableRow(line);
    if (!cells) {
      inComponentMappingTable = false;
      return;
    }

    if (cells.some((cell) => /^Exact Kaze Export$/i.test(cell))) {
      inComponentMappingTable = true;
      return;
    }

    if (!isMarkdownTableSeparator(cells) && /^UI Element$/i.test(cells[0])) {
      inComponentMappingTable = false;
    }

    if (
      !inComponentMappingTable ||
      cells.length < 5 ||
      isMarkdownTableSeparator(cells)
    ) {
      return;
    }

    const exactComponent = cells[2];
    const rowText = `${cells[0]} ${cells[1]} ${cells[4] ?? ""}`;
    if (exactCellContainsIconDescription(exactComponent)) {
      warnings.push(
        "kaze-component-mapping.md Exact Kaze Export column contains Font Awesome/icon wording.",
      );
    }

    if (
      /quick action|create an image|write or edit|look something up/i.test(
        rowText,
      ) &&
      /^Pills$/i.test(exactComponent.trim()) &&
      !/interactive action behaviour|supports interactive action/i.test(
        cells[4] ?? "",
      )
    ) {
      warnings.push(
        "kaze-component-mapping.md maps clickable quick action buttons to Pills without confirming interactive action behaviour.",
      );
    }

    if (
      /Unknown \/ verify from Kaze\s*(?:or|\/)\s*(?:Unknown \/ verify from Kaze|[A-Za-z][A-Za-z0-9]*)/i.test(
        exactComponent,
      )
    ) {
      warnings.push(
        "kaze-component-mapping.md Exact Kaze Export column contains ambiguous mixed export values.",
      );
    }

    if (
      exactComponent.trim() &&
      !/^Unknown \/ verify from Kaze$/.test(exactComponent.trim()) &&
      !CONFIRMED_KAZE_EXPORTS.has(exactComponent.trim())
    ) {
      warnings.push(
        "kaze-component-mapping.md Exact Kaze Export column must contain one confirmed Kaze export or Unknown / verify from Kaze.",
      );
    }
  });

  return uniqueStrings(warnings);
}

function validateClinePrompt(prompt: string | undefined): string[] {
  if (!prompt) {
    return [];
  }

  const requiredRules: Array<{ label: string; pattern: RegExp }> = [
    {
      label: "Critical First Step section",
      pattern: /## Critical First Step/i,
    },
    { label: "Before writing code", pattern: /Before writing code:/i },
    {
      label: "Inspect actual project structure.",
      pattern: /Inspect actual project structure\./,
    },
    {
      label: "Inspect existing pages/screens that already use Kaze",
      pattern: /Inspect existing pages\/screens that already use Kaze/i,
    },
    {
      label: "Inspect @pcs-security/kaze-ui-library package exports",
      pattern: /Inspect @pcs-security\/kaze-ui-library package exports|package exports/i,
    },
    {
      label: "Inspect Kaze Storybook/docs if available",
      pattern: /Inspect Kaze Storybook\/docs if available/i,
    },
    {
      label: "Confirm exact Kaze export names and props",
      pattern:
        /Confirm exact Kaze export names and props|Verify exact Kaze exports and props/i,
    },
    {
      label: "Do not use guessed Kaze exports",
      pattern:
        /Do not use guessed Kaze exports|Do not use guessed Kaze components|Avoid guessed Kaze/i,
    },
    {
      label: "Report missing suggested Kaze exports",
      pattern:
        /If a suggested Kaze export does not work, use the closest approved Kaze\/project pattern and report it|If a suggested Kaze component does not exist, use the closest approved Kaze\/project pattern and report it/i,
    },
    { label: "Do not invent routes", pattern: /Do not invent routes/i },
    { label: "Do not invent APIs", pattern: /Do not invent APIs/i },
    {
      label: "Do not invent dropdown values",
      pattern: /Do not invent dropdown values/i,
    },
    {
      label: "Do not invent permission rules",
      pattern: /Do not invent permission rules/i,
    },
    {
      label: "Use confirmed Kaze exports where available",
      pattern: /Use confirmed Kaze exports where available|Use Kaze components where available/i,
    },
    {
      label: "Do not use raw controls if Kaze equivalents exist",
      pattern:
        /Do not use raw input\/button\/select\/table\/modal\/form controls if Kaze equivalents exist|Do not use raw input\/button\/select/i,
    },
    {
      label: "Use raw HTML only for non-interactive layout wrappers",
      pattern: /Use raw HTML only for non-interactive layout wrappers/i,
    },
    {
      label: "Do not use Ant Design directly if Kaze wraps it",
      pattern: /Do not use Ant Design directly if Kaze wraps it/i,
    },
    {
      label: "Mark unknown behaviour as TODO",
      pattern: /Mark unknown behaviour as TODO/i,
    },
    {
      label: "Report unresolved unknowns and fallback choices",
      pattern: /Report unresolved unknowns and fallback choices/i,
    },
    {
      label: "Fallback rule for unverified Kaze exports",
      pattern:
        /If a Kaze export is not verified:[\s\S]*First search existing project patterns[\s\S]*Document the fallback clearly|If a Kaze component is not verified:[\s\S]*First search existing project patterns[\s\S]*Document the fallback clearly/i,
    },
    {
      label: "Placement Rule section",
      pattern: /## Placement Rule/i,
    },
    {
      label: "Inspect project structure before creating files",
      pattern: /Before creating files, inspect the actual project structure\./i,
    },
    {
      label: "Screenshot Usage Rule section",
      pattern: /## Screenshot Usage Rule/i,
    },
    {
      label: "Screenshot is visual reference only",
      pattern: /screenshot is a visual reference only/i,
    },
    {
      label: "Screenshot does not infer backend or route behavior",
      pattern: /Do not infer:[\s\S]*backend APIs[\s\S]*route paths[\s\S]*authentication logic/i,
    },
    {
      label: "Unclear screenshot behavior stays static unless specified",
      pattern: /implement only static frontend behaviour unless explicitly specified in `?handoff\.md`?/i,
    },
    {
      label: "Implementation Sequence section",
      pattern: /## Implementation Sequence/i,
    },
    {
      label: "Read README_FOR_CLINE.md first",
      pattern: /Read `?README_FOR_CLINE\.md`?/i,
    },
    {
      label: "Anti-Hallucination Rules section",
      pattern: /## Anti-Hallucination Rules/i,
    },
    {
      label: "Do not invent new dependencies",
      pattern: /new dependencies/i,
    },
    {
      label: "Do not install new UI libraries",
      pattern: /Do not install new UI libraries unless explicitly instructed/i,
    },
    {
      label: "Kaze Setup Rule section",
      pattern: /## Kaze Setup Rule/i,
    },
    {
      label: "Inspect existing Kaze CSS/import setup",
      pattern: /existing CSS import[\s\S]*available package version[\s\S]*existing component usage patterns/i,
    },
    {
      label: "Do not guess Kaze API props",
      pattern: /Do not guess Kaze API props/i,
    },
    {
      label: "Final Response Format section",
      pattern: /## Final Response Format/i,
    },
    {
      label: "Validation performed final response format",
      pattern: /Validation performed:/i,
    },
    {
      label: "After implementation report section",
      pattern: /After implementation, report:/i,
    },
    {
      label: "Files created or modified",
      pattern: /Files created or modified/i,
    },
    {
      label: "Confirmed Kaze exports used",
      pattern: /Confirmed Kaze exports used/i,
    },
    { label: "Fallbacks used", pattern: /Fallbacks used/i },
    { label: "TODOs left unresolved", pattern: /TODOs left unresolved/i },
    { label: "Typecheck/build result", pattern: /Typecheck\/build result/i },
    {
      label: "Run typecheck/build if available",
      pattern: /Run typecheck\/build if available|typecheck.*build/i,
    },
  ];

  const warnings = requiredRules
    .filter(({ pattern }) => !pattern.test(prompt))
    .map(
      ({ label }) =>
        `cline-implementation-prompt.md is missing required verification rule: ${label}.`,
    );

  if (clinePromptEmbedsPackManifest(prompt)) {
    warnings.push(
      "cline-implementation-prompt.md embeds pack-manifest.md content instead of referencing pack-manifest.md.",
    );
  }

  if (clinePromptEmbedsHandoff(prompt)) {
    warnings.push(
      "cline-implementation-prompt.md embeds handoff.md content instead of referencing handoff.md.",
    );
  }

  return uniqueStrings(warnings);
}

function clinePromptEmbedsPackManifest(prompt: string): boolean {
  return (
    /# Pack Manifest/i.test(prompt) ||
    /## Screen Requirements/i.test(prompt) ||
    (/## Project \/ Feature Name/i.test(prompt) && /## Screens/i.test(prompt))
  );
}

function clinePromptEmbedsHandoff(prompt: string): boolean {
  return (
    /# Handoff/i.test(prompt) ||
    /## Handoff Summary/i.test(prompt) ||
    (/## Visible layout/i.test(prompt) && /## Main actions/i.test(prompt))
  );
}

function validateQaChecklist(checklist: string | undefined): string[] {
  if (!checklist) {
    return [];
  }

  const warnings: string[] = [];
  const requiredSections: Array<{ label: string; pattern: RegExp }> = [
    { label: "Pack Integrity", pattern: /##\s+(?:\d+\.\s*)?Pack Integrity/i },
    { label: "Kaze Usage", pattern: /##\s+(?:\d+\.\s*)?Kaze Usage/i },
    { label: "Visual", pattern: /##\s+(?:\d+\.\s*)?Visual/i },
    {
      label: "Implementation Safety",
      pattern: /##\s+(?:\d+\.\s*)?Implementation Safety/i,
    },
    { label: "Code Quality", pattern: /##\s+(?:\d+\.\s*)?Code Quality/i },
    { label: "Final Response", pattern: /##\s+(?:\d+\.\s*)?Final Response/i },
  ];

  requiredSections.forEach(({ label, pattern }) => {
    if (!pattern.test(checklist)) {
      warnings.push(`qa-checklist.md is missing required section: ${label}.`);
    }
  });

  const unsafePatterns: Array<{ label: string; pattern: RegExp }> = [
    {
      label: "Sidebar navigation routes to correct sections",
      pattern: /Sidebar navigation routes to correct sections\.?/i,
    },
    {
      label: "Sidebar links navigate correctly",
      pattern: /Sidebar links navigate correctly\.?/i,
    },
    {
      label: "Avatar click opens profile/account menu",
      pattern: /Avatar click opens profile\/account menu\.?/i,
    },
    {
      label: "Avatar opens profile menu",
      pattern: /Avatar opens profile menu\.?/i,
    },
    {
      label: "Voice button triggers expected audio/input state",
      pattern: /Voice button triggers expected (?:audio|input) state\.?/i,
    },
    {
      label: "Voice button triggers expected audio UI",
      pattern: /Voice button triggers expected audio UI\.?/i,
    },
    {
      label: "Voice button toggles between idle and recording states",
      pattern: /Voice button toggles between idle and recording states\.?/i,
    },
    {
      label: "triggers audio input",
      pattern: /triggers audio input/i,
    },
    {
      label: "triggers submission",
      pattern: /triggers submission/i,
    },
    {
      label: "Thinking dropdown opens and allows selection",
      pattern: /Thinking dropdown opens and allows selection\.?/i,
    },
    {
      label: "Thinking selector displays options and updates on change",
      pattern: /Thinking selector displays options and updates on change\.?/i,
    },
    {
      label: '"Thinking" selector opens and allows selection',
      pattern: /"?Thinking"? selector opens and allows selection\.?/i,
    },
    {
      label: "opens and allows selection",
      pattern: /opens and allows selection/i,
    },
    {
      label: "Quick action buttons trigger appropriate flows",
      pattern: /Quick action buttons trigger appropriate flows\.?/i,
    },
    {
      label:
        "Quick action buttons navigate to or trigger their respective flows",
      pattern:
        /Quick action buttons navigate to or trigger their respective flows\.?/i,
    },
    {
      label: "navigate to or trigger their respective flows",
      pattern: /navigate to or trigger their respective flows/i,
    },
    {
      label: "displays options and updates on change",
      pattern: /displays options and updates on change/i,
    },
    {
      label: "toggles between idle and recording states",
      pattern: /toggles between idle and recording states/i,
    },
    {
      label:
        "Screen reader announces dynamic state changes or TODO placeholders correctly",
      pattern:
        /Screen reader announces dynamic state changes or TODO placeholders correctly/i,
    },
    {
      label: "typography specs",
      pattern: /typography specs/i,
    },
  ];

  warnings.push(...unsafePatterns
    .filter(({ pattern }) => pattern.test(checklist))
    .map(
      ({ label }) => `qa-checklist.md assumes unconfirmed behaviour: ${label}.`,
    ));

  const hasPlainBulletChecklistItem = checklist
    .split("\n")
    .some((line) => /^\s*[-*]\s+(?!\[[ x]\]\s*)/i.test(line));

  if (hasPlainBulletChecklistItem) {
    warnings.push(
      'qa-checklist.md contains checklist bullets that do not start with "- [ ]".',
    );
  }

  return uniqueStrings(warnings);
}

function computeQuality(params: {
  warnings: string[];
  failureIssues: string[];
  reviewIssues: string[];
}): GenerationQuality {
  const failureIssues = uniqueStrings(params.failureIssues);
  const reviewIssues = uniqueStrings([
    ...params.reviewIssues,
    ...params.warnings,
  ]);

  if (failureIssues.length > 0) {
    return {
      status: "failed",
      label: "Failed",
      score: 0,
      issues: uniqueStrings([...failureIssues, ...reviewIssues]),
    };
  }

  if (reviewIssues.length > 0) {
    return {
      status: "needs_review",
      label: "Needs Review",
      score: 7,
      issues: reviewIssues,
    };
  }

  return {
    status: "ready",
    label: "10/10 Ready",
    score: 10,
    issues: [],
  };
}

export function applyGenerationWarningsToQuality(
  quality: GenerationQuality,
  warnings: string[],
): GenerationQuality {
  const issues = uniqueStrings([...quality.issues, ...warnings]);

  if (quality.status === "failed") {
    return {
      ...quality,
      issues,
    };
  }

  if (warnings.length > 0) {
    return {
      status: "needs_review",
      label: "Needs Review",
      score: Math.min(quality.score, 7),
      issues,
    };
  }

  return quality;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].filter(Boolean);
}

function repairFakeKazeNames(text: string): string {
  return text.replace(/\bKaze[A-Z][A-Za-z0-9]*\b/g, (name) => {
    return WRONG_KAZE_NAME_REPAIRS[name] ?? "Unknown / verify from Kaze";
  });
}

function protectAllowedIncorrectKazeExamples(text: string): {
  text: string;
  restore: (value: string) => string;
} {
  const protectedSegments: string[] = [];
  const protect = (match: string) => {
    const index = protectedSegments.push(match) - 1;
    return `__ALLOWED_FAKE_KAZE_EXAMPLE_${index}__`;
  };

  const protectedText = text
    .replace(/Incorrect:\s*```[\s\S]*?```/gi, protect)
    .replace(
      /^.*Do not use fake Kaze-prefixed names such as .*$/gim,
      protect,
    )
    .replace(
      /^.*Never use fake prefixed aliases such as .*$/gim,
      protect,
    );

  return {
    text: protectedText,
    restore: (value: string) =>
      protectedSegments.reduce(
        (restored, segment, index) =>
          restored.replace(`__ALLOWED_FAKE_KAZE_EXAMPLE_${index}__`, segment),
        value,
      ),
  };
}

function stripAllowedIncorrectKazeExamples(text: string): string {
  return text
    .replace(
      /Incorrect:\s*```[\s\S]*?```/gi,
      "Incorrect: [fake Kaze import example omitted for validation]",
    )
    .replace(
      /^.*Do not use fake Kaze-prefixed names such as .*$/gim,
      "Do not use fake Kaze-prefixed names such as [examples omitted for validation].",
    )
    .replace(
      /^.*Never use fake prefixed aliases such as .*$/gim,
      "Never use fake prefixed aliases such as [examples omitted for validation].",
    );
}

function getAllowedKazeComponents(catalog: string): Set<string> {
  // Detect if catalog is compact JSON format
  const trimmed = catalog.trim();
  if (trimmed.startsWith("{")) {
    try {
      const json = JSON.parse(catalog);
      if (json.confirmedExports && Array.isArray(json.confirmedExports)) {
        return new Set(json.confirmedExports);
      }
    } catch {
      // Fall through to markdown parsing
    }
  }
  return new Set(
    catalog.match(
      /\b(?:AgGridTable|Alert|Avatar|Badge|Breadcrumb|Button|Checkbox|CheckboxDropdown|Collapse|ContextMenu|Datepicker|Dropdown|Lozenge|Modal|Notification|Pagination|Pills|Progress|Radio|RadioGroup|Segmented|Slider|Steps|Swatch|Table|Tabs|Tag|TextArea|TextField|Timepicker|Toast|Toggle|Tooltip|Typography|Upload|notification|useNotification)\b/g,
    ) ?? [],
  );
}

function replaceUnconfirmedKazeComponents(
  text: string,
  catalog: string,
): { text: string; replaced: string[] } {
  const allowedComponents = getAllowedKazeComponents(catalog);
  const replaced = new Set<string>();
  const protectedExamples = protectAllowedIncorrectKazeExamples(text);

  const sanitized = protectedExamples.text.replace(
    /\bKaze[A-Z][A-Za-z0-9]*\b/g,
    (component) => {
      if (allowedComponents.has(component)) {
        return component;
      }

      replaced.add(component);
      return WRONG_KAZE_NAME_REPAIRS[component] ?? "Unknown / verify from Kaze";
    },
  );

  return {
    text: protectedExamples.restore(sanitized),
    replaced: [...replaced].sort(),
  };
}

function replaceUnconfirmedKazeComponentsInFiles(
  files: Partial<Record<GeneratedFileName, string>>,
  catalog: string,
): Partial<Record<GeneratedFileName, string>> {
  return Object.fromEntries(
    Object.entries(files).map(([filename, content]) => [
      filename,
      content
        ? replaceUnconfirmedKazeComponents(content, catalog).text
        : content,
    ]),
  ) as Partial<Record<GeneratedFileName, string>>;
}

function replaceInventedFilenames(
  text: string,
  allowedFilenames: string[],
): { text: string; replaced: string[] } {
  const allowed = new Set(allowedFilenames);
  const allowedScreenshotPaths = new Set(
    allowedFilenames.map((filename) => `screenshots/${filename}`),
  );
  const replaced = new Set<string>();
  const screenshotPattern =
    /(?<![\w.-])((?:screenshots\/)?[A-Za-z0-9][A-Za-z0-9_.-]*\.(?:png|jpg|jpeg|webp))(?![\w.-])/gi;

  const sanitized = text.replace(screenshotPattern, (match) => {
    if (allowed.has(match) || allowedScreenshotPaths.has(match)) {
      return match;
    }

    replaced.add(match);
    return getMissingScreenshotReplacement(match);
  });

  return {
    text: sanitized,
    replaced: [...replaced].sort(),
  };
}

function getMissingScreenshotReplacement(filename: string): string {
  return /mobile|tablet/i.test(filename)
    ? "Mobile/tablet layouts are not provided."
    : "Screenshot not provided in uploaded File Map.";
}

function replaceInventedFilenamesInFiles(
  files: Partial<Record<GeneratedFileName, string>>,
  allowedFilenames: string[],
): Partial<Record<GeneratedFileName, string>> {
  return Object.fromEntries(
    Object.entries(files).map(([filename, content]) => [
      filename,
      content
        ? replaceInventedFilenames(content, allowedFilenames).text
        : content,
    ]),
  ) as Partial<Record<GeneratedFileName, string>>;
}

function parseFiles(text: string): Partial<Record<GeneratedFileName, string>> {
  const files: Partial<Record<GeneratedFileName, string>> = {};
  const markerPattern = /^--- File:\s*(.+?)\s*---\s*$/gm;
  const markers = [...text.matchAll(markerPattern)];

  markers.forEach((marker, index) => {
    const filename = marker[1].trim();
    if (!isExpectedFileName(filename)) {
      return;
    }

    const contentStart = marker.index! + marker[0].length;
    const nextMarker = markers[index + 1];
    const contentEnd = nextMarker?.index ?? text.length;
    files[filename] = text.slice(contentStart, contentEnd).trim();
  });

  return files;
}

function isExpectedFileName(filename: string): filename is GeneratedFileName {
  return EXPECTED_FILE_NAMES.includes(filename as GeneratedFileName);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
