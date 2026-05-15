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
  "3. Inspect Kaze package exports.",
  "4. Inspect Kaze Storybook/docs if available.",
  "5. Confirm exact Kaze component names and props.",
  "6. Do not use guessed Kaze components.",
  "7. If a suggested Kaze component does not exist, use the closest approved Kaze/project pattern and report it."
].join("\n");

const CLINE_FINAL_REPORT_SECTION = [
  "After implementation, report:",
  "- Files created or modified",
  "- Confirmed Kaze components used",
  "- Fallbacks used",
  "- TODOs left unresolved",
  "- Typecheck/build result"
].join("\n");

const HOME_GREETING_MANIFEST_UNKNOWNS = [
  "- Navigation behaviour is not confirmed.",
  "- Avatar interaction is not confirmed.",
  "- Thinking selector options are not visible.",
  "- White circular action button behaviour is not confirmed.",
  "- Quick action behaviours are not confirmed.",
  "- Voice input behaviour is not confirmed."
];

export function parseAiResponse(params: {
  responseText: string;
  allowedFilenames: string[];
  kazeComponentCatalog: string;
  parsedFilenames?: ParsedFilenameContext[];
}): ParsedAiResponse {
  return parseGeneratedResponse({
    ...params,
    expectedFileNames: EXPECTED_FILE_NAMES
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
    expectedFileNames: ["pack-manifest.md"]
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
    expectedFileNames: ["handoff.md", "kaze-component-mapping.md"]
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
    expectedFileNames: ["cline-implementation-prompt.md", "qa-checklist.md"]
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
      params.kazeComponentCatalog
    ),
    params.kazeComponentCatalog
  );
  const finalValidation = validateFinalOutput({
    text: Object.values(sanitizedFiles).filter(Boolean).join("\n\n"),
    files: sanitizedFiles,
    allowedFilenames: params.allowedFilenames,
    parsedFilenames: params.parsedFilenames ?? []
  });
  const missingFiles = EXPECTED_FILE_NAMES.filter(
    (filename) => !sanitizedFiles[filename]
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
    reviewIssues: finalValidation.reviewIssues
  });

  return {
    files: sanitizedFiles,
    rawResponse: params.rawResponse,
    warnings: dedupedWarnings,
    quality
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
    params.parsedFilenames ?? []
  );
  const stateRepaired = repairUnsafeStateLabels(headingRepaired.text);
  const qaAndFallbackRepaired = repairUnsafeQaAndFallbackText(stateRepaired.text);

  const unavailableFilenameRepaired = qaAndFallbackRepaired.text.replace(
    /\bFilename unavailable\b/gi,
    "Filename missing from File Map"
  );

  const componentSanitized = replaceUnconfirmedKazeComponents(
    unavailableFilenameRepaired,
    params.kazeComponentCatalog
  );

  const filenameSanitized = replaceInventedFilenames(
    componentSanitized.text,
    params.allowedFilenames
  );

  const files = parseFiles(filenameSanitized.text);
  const sanitizedFiles = sanitizeParsedFiles(files, params.kazeComponentCatalog);
  const missingFiles = params.expectedFileNames.filter(
    (filename) => !sanitizedFiles[filename]
  );
  const finalValidation = validateFinalOutput({
    text: filenameSanitized.text,
    files: sanitizedFiles,
    allowedFilenames: params.allowedFilenames,
    parsedFilenames: params.parsedFilenames ?? []
  });

  warnings.push(...finalValidation.warnings);

  if (missingFiles.length > 0) {
    warnings.push(
      `Could not parse all expected files. Showing raw response. Missing: ${missingFiles.join(", ")}.`
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
    reviewIssues: finalValidation.reviewIssues
  });

  return {
    files: sanitizedFiles,
    rawResponse: params.responseText,
    warnings: dedupedWarnings,
    quality
  };
}

function stripReasoningBlocks(text: string): { text: string; changed: boolean } {
  const stripped = text
    .replace(/<details\b[^>]*>[\s\S]*?<\/details>/gi, "")
    .replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking\b[^>]*>[\s\S]*?<\/thinking>/gi, "")
    .trim();
  return {
    text: stripped,
    changed: stripped !== text.trim()
  };
}

function stripOuterMarkdownFence(text: string): { text: string; changed: boolean } {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);

  if (!match) {
    return {
      text,
      changed: false
    };
  }

  return {
    text: match[1].trim(),
    changed: true
  };
}

function repairScreenHeadings(
  text: string,
  parsedFilenames: ParsedFilenameContext[]
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
        "gim"
      );

      repairedText = repairedText.replace(headingPattern, (match, hashes: string) => {
        const replacement = `${hashes} ${entry.screenName}`;
        if (match.trim() !== replacement.trim()) {
          repaired.add(match.trim());
        }
        return replacement;
      });
    });
  });

  return {
    text: repairedText,
    repaired: [...repaired].sort()
  };
}

function repairUnsafeStateLabels(text: string): { text: string; repaired: string[] } {
  const repaired = new Set<string>();
  const replacements: Array<{ pattern: RegExp; replacement: string; label: string }> = [
    { pattern: /Default\s*\/\s*Empty/gi, replacement: "Default", label: "Default / Empty" },
    { pattern: /Initial\s*\/\s*Empty/gi, replacement: "Initial", label: "Initial / Empty" },
    { pattern: /Empty no history/gi, replacement: "Default", label: "Empty no history" }
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
    repaired: [...repaired].sort()
  };
}

function repairUnsafeQaAndFallbackText(
  text: string,
  dedupeChecklistLines = false
): { text: string; repaired: string[] } {
  const repaired = new Set<string>();
  const fallbackRule = [
    "If a Kaze component is not verified:",
    "1. First search existing project patterns.",
    "2. Use the closest approved existing project pattern.",
    "3. Use raw HTML only for non-interactive layout wrappers.",
    "4. Do not use raw input/button/select if Kaze equivalents exist.",
    "5. Document the fallback clearly."
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
        /routes to correct sections/i
      ],
      replacement: "- [ ] Sidebar navigation is implemented or marked as TODO.",
      label: "unsafe sidebar navigation QA line"
    },
    {
      patterns: [/Avatar opens/i, /Avatar click opens/i],
      replacement: "- [ ] Avatar interaction is implemented or marked as TODO.",
      label: "unsafe avatar QA line"
    },
    {
      patterns: [/Microphone button triggers audio input/i, /triggers audio input/i],
      replacement: "- [ ] Microphone button behaviour is implemented or marked as TODO.",
      label: "unsafe microphone button QA line"
    },
    {
      patterns: [
        /Voice button toggles/i,
        /recording states?/i,
        /audio UI state/i,
        /Voice button triggers expected audio UI/i,
        /Voice button triggers expected input state/i
      ],
      replacement: "- [ ] Voice button behaviour is implemented or marked as TODO.",
      label: "unsafe voice button QA line"
    },
    {
      patterns: [
        /opens and allows selection/i,
        /displays options and updates on change/i,
        /dropdown opens/i,
        /updates on change/i
      ],
      replacement: "- [ ] Thinking selector behaviour is implemented or marked as TODO.",
      label: "unsafe thinking selector QA line"
    },
    {
      patterns: [
        /Quick action buttons trigger/i,
        /navigate to or trigger/i,
        /trigger appropriate flows/i
      ],
      replacement: "- [ ] Quick action behaviour is implemented or marked as TODO.",
      label: "unsafe quick action QA line"
    },
    {
      patterns: [/White action button triggers submission/i, /triggers submission/i],
      replacement: "- [ ] White action button behaviour is implemented or marked as TODO.",
      label: "unsafe submission button QA line"
    },
    {
      patterns: [
        /Screen reader announces dynamic state changes or TODO placeholders correctly/i
      ],
      replacement: "- [ ] Screen reader behaviour is verified for implemented dynamic states.",
      label: "unsafe screen reader QA line"
    },
    {
      patterns: [/use a standard accessible fallback until confirmed/i],
      replacement: fallbackRule,
      label: "use a standard accessible fallback until confirmed"
    }
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
    repaired: [...repaired].sort()
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

function dedupeChecklistItems(lines: string[], repaired: Set<string>): string[] {
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

function sanitizeParsedFiles(
  files: Partial<Record<GeneratedFileName, string>>,
  kazeComponentCatalog: string
): Partial<Record<GeneratedFileName, string>> {
  return {
    ...files,
    "pack-manifest.md": sanitizeManifestContent(files["pack-manifest.md"]),
    "handoff.md": sanitizeHandoffContent(files["handoff.md"]),
    "kaze-component-mapping.md": sanitizeKazeComponentMappingContent(
      files["kaze-component-mapping.md"],
      kazeComponentCatalog
    ),
    "cline-implementation-prompt.md": sanitizeClinePrompt(
      files["cline-implementation-prompt.md"]
    ),
    "qa-checklist.md": files["qa-checklist.md"]
      ? repairUnsafeQaAndFallbackText(files["qa-checklist.md"], true).text
      : undefined
  };
}

function sanitizeManifestContent(manifest: string | undefined): string | undefined {
  if (!manifest) {
    return manifest;
  }

  const normalizedManifest = manifest
    .replace(
      /Exact spacing and sizing tokens are not provided in the design specs\.?/gi,
      "Detailed layout measurements are not provided."
    )
    .replace(
      /Animation behavior for the Thinking selector and quick action buttons is unconfirmed\.?/gi,
      "Interaction behaviour for the Thinking selector and quick action buttons is unconfirmed."
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
    /\bStorybook\b/i
  ];
  const routePattern = /\broute(?:s| names?| details?)?\b|\/[a-z0-9_-]+/i;

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
    ...uniqueUnknownLines
  ].join("\n").trim();
}

function isManifestUnknownLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    /^[-*]\s+/.test(trimmed) &&
    /\b(?:not confirmed|unconfirmed|unknown|needs confirmation)\b/i.test(trimmed)
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
  while (trimmedLines.length > 0 && trimmedLines[trimmedLines.length - 1].trim() === "") {
    trimmedLines.pop();
  }

  return trimmedLines;
}

function sanitizeHandoffContent(handoff: string | undefined): string | undefined {
  if (!handoff) {
    return handoff;
  }

  return handoff
    .replace(
      /Specific Font Awesome icons for the sidebar and quick actions\s*\([^)]*plus[^)]*microphone[^)]*image[^)]*pen[^)]*globe[^)]*\)\.?/gi,
      "Specific Font Awesome icons should be verified against the project icon setup."
    )
    .replace(
      /Select a mode from the dropdown selector\.?/gi,
      "Interact with the visible `Thinking` selector. Exact options are unknown."
    );
}

function sanitizeKazeComponentMappingContent(
  mapping: string | undefined,
  kazeComponentCatalog: string
): string | undefined {
  if (!mapping) {
    return mapping;
  }

  const allowedComponents = getAllowedKazeComponents(kazeComponentCatalog);

  return mapping
    .split("\n")
    .map((line) => {
      const normalizedComponentLine = normalizeMappingExactComponentCell(
        line,
        allowedComponents
      );

      if (!/Known standard icon/i.test(normalizedComponentLine)) {
        return normalizedComponentLine;
      }

      if (/sidebar\s+nav\s+icons?/i.test(normalizedComponentLine)) {
        return normalizedComponentLine.replace(
          /Known standard icon/gi,
          "Unknown / verify Font Awesome icon"
        );
      }

      const iconDescription = inferFontAwesomeIconDescription(normalizedComponentLine);
      return normalizedComponentLine.replace(
        /Known standard icon/gi,
        `Likely Font Awesome ${iconDescription}; verify project icon setup.`
      );
    })
    .join("\n");
}

function normalizeMappingExactComponentCell(
  line: string,
  allowedComponents: Set<string>
): string {
  const cells = parseMarkdownTableRow(line);
  if (!cells || cells.length < 5 || isMarkdownTableSeparator(cells)) {
    return line;
  }

  const [uiElement, intendedPattern, exactComponent, confidence, notes, ...rest] =
    cells;
  const exactCell = exactComponent.trim();
  const mentionedAllowedComponents = [...allowedComponents].filter((component) =>
    new RegExp(`\\b${escapeRegExp(component)}\\b`).test(exactCell)
  );
  const mentionsUnknown = /Unknown\s*\/\s*verify from Kaze/i.test(exactCell);

  if (
    /plus|attachment/i.test(uiElement) &&
    mentionedAllowedComponents.includes("KazeButton")
  ) {
    return formatMarkdownTableRow([
      uiElement,
      intendedPattern,
      "KazeButton",
      confidence,
      "Use as icon button if supported by KazeButton props; otherwise verify project pattern.",
      ...rest
    ]);
  }

  if (mentionsUnknown && mentionedAllowedComponents.length > 0) {
    return formatMarkdownTableRow([
      uiElement,
      intendedPattern,
      mentionedAllowedComponents[0],
      confidence,
      notes,
      ...rest
    ]);
  }

  if (/\/\s*Kaze[A-Z][A-Za-z0-9]*/.test(exactCell) && mentionedAllowedComponents.length > 0) {
    return formatMarkdownTableRow([
      uiElement,
      intendedPattern,
      mentionedAllowedComponents[0],
      confidence,
      notes,
      ...rest
    ]);
  }

  if (mentionsUnknown) {
    return formatMarkdownTableRow([
      uiElement,
      intendedPattern,
      "Unknown / verify from Kaze",
      confidence,
      notes,
      ...rest
    ]);
  }

  return line;
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

  const sanitizedPrompt = prompt
    .replace(
      /Use KazeInput or similar text component for the greeting if supported, otherwise use raw HTML with verified typography styles\.?/gi,
      "Use the existing project typography/heading pattern for the greeting. If Kaze has a confirmed typography component, use it; otherwise use the approved project text pattern."
    )
    .replace(
      /Use KazeInput or similar for the sidebar if it(?:'|’)?s interactive, otherwise verify sidebar pattern\.?/gi,
      "Use the existing project sidebar/navigation pattern if available. Do not use KazeInput for sidebar/navigation. If no approved pattern exists, document the fallback and keep raw HTML limited to non-interactive layout wrappers."
    );

  return ensureClineFinalReportSection(
    ensureClineCriticalFirstStep(sanitizedPrompt)
  );
}

function ensureClineCriticalFirstStep(prompt: string | undefined): string | undefined {
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
    "Inspect Kaze package exports.",
    "Inspect Kaze Storybook/docs if available.",
    "Confirm exact Kaze component names and props.",
    "Do not use guessed Kaze components.",
    "If a suggested Kaze component does not exist, use the closest approved Kaze/project pattern and report it."
  ].every((requiredText) => prompt.includes(requiredText));
}

function ensureClineFinalReportSection(prompt: string | undefined): string | undefined {
  if (!prompt) {
    return prompt;
  }

  if (hasRequiredFinalReportSection(prompt)) {
    return prompt;
  }

  const cleanedPrompt = prompt
    .replace(/After implementation,\s*report (?:what changed|the result|your work)\.?/gi, "")
    .replace(/Summari[sz]e the implementation result\.?/gi, "")
    .trim();

  return [cleanedPrompt, "", CLINE_FINAL_REPORT_SECTION].join("\n").trim();
}

function hasRequiredFinalReportSection(prompt: string): boolean {
  return [
    "After implementation, report:",
    "Files created or modified",
    "Confirmed Kaze components used",
    "Fallbacks used",
    "TODOs left unresolved",
    "Typecheck/build result"
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
  const finalText = Object.values(params.files).filter(Boolean).join("\n\n") || params.text;

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
    { label: "Filename unavailable", pattern: /Filename unavailable/i, failure: true },
    { label: "Chatgpt_default_Desktop.png", pattern: /Chatgpt_default_Desktop\.png/i },
    { label: "Home_Default_Desktop.png", pattern: /Home_Default_Desktop\.png/i },
    { label: "Default / Empty", pattern: /Default\s*\/\s*Empty/i },
    { label: "Initial / Empty", pattern: /Initial\s*\/\s*Empty/i },
    { label: "Empty no history", pattern: /Empty no history/i },
    { label: "<details", pattern: /<details/i, failure: true },
    { label: "reasoning", pattern: /\breasoning\b/i },
    { label: "Thought for", pattern: /Thought for/i, failure: true },
    { label: "analysis", pattern: /\banalysis\b/i, failure: true },
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
      pattern: /Use KazeInput or similar text component for the greeting/i
    },
    {
      label: "Use KazeInput or similar for the sidebar",
      pattern: /Use KazeInput or similar for the sidebar/i
    },
    {
      label: "opens and allows selection",
      pattern: /opens and allows selection/i
    },
    {
      label: "displays options and updates on change",
      pattern: /displays options and updates on change/i
    },
    {
      label: "toggles between idle and recording states",
      pattern: /toggles between idle and recording states/i
    },
    {
      label: "triggers audio input",
      pattern: /triggers audio input/i
    },
    {
      label: "triggers submission",
      pattern: /triggers submission/i
    },
    {
      label: "navigate to or trigger their respective flows",
      pattern: /navigate to or trigger their respective flows/i
    },
    {
      label: "trigger appropriate flows",
      pattern: /trigger appropriate flows/i
    },
    {
      label: "routes to correct sections",
      pattern: /routes to correct sections/i
    },
    {
      label: "Select a mode from the dropdown selector",
      pattern: /Select a mode from the dropdown selector/i
    },
    {
      label: "Known standard icon",
      pattern: /Known standard icon/i
    },
    {
      label: "spacing and sizing tokens",
      pattern: /spacing and sizing tokens/i
    },
    {
      label: "exact spacing",
      pattern: /exact spacing/i
    },
    {
      label: "route names",
      pattern: /route names/i
    },
    {
      label: "API endpoints",
      pattern: /API endpoints/i
    },
    {
      label: "ambiguous Kaze mapping cell",
      pattern:
        /Unknown\s*\/\s*verify from Kaze\s*\/\s*Kaze[A-Z][A-Za-z0-9]*|Kaze[A-Z][A-Za-z0-9]*\s*\/\s*Unknown\s*\/\s*verify from Kaze/i
    },
    {
      label: "Screen reader announces dynamic state changes or TODO placeholders correctly",
      pattern: /Screen reader announces dynamic state changes or TODO placeholders correctly/i
    }
  ];

  riskyFinalPatterns.forEach(({ label, pattern, failure }) => {
    if (!pattern.test(finalText)) {
      return;
    }

    const message = `Generated output contains risky phrase after repair: ${label}.`;
    if (failure) {
      addFailure(message, `Output still contains blocked reasoning/filename content: ${label}.`);
      return;
    }

    addWarning(message);
  });

  const hasExplicitEmptyFilenameState = params.parsedFilenames.some(
    (entry) => entry.state?.toLowerCase() === "empty"
  );
  if (
    !hasExplicitEmptyFilenameState &&
    /^(?:#{1,6}|[-*])\s*Empty(?:\s|:|$)/im.test(finalText)
  ) {
    addWarning(
      "Generated output includes an Empty state even though no uploaded filename state is Empty."
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
        pattern: new RegExp(`^#{1,6}\\s*Screen:\\s*${screenName}\\s*$`, "im")
      },
      {
        label: `Screen Name: ${entry.screenName}`,
        pattern: new RegExp(`^#{1,6}\\s*Screen Name:\\s*${screenName}\\s*$`, "im")
      }
    ];

    if (entry.state) {
      const screenAndState = `${entry.screenName}_${entry.state}`;
      invalidHeadingPatterns.push({
        label: screenAndState,
        pattern: new RegExp(
          `^#{1,6}\\s*(?:(?:Screen|Screen Name):\\s*)?${escapeRegExp(screenAndState)}\\s*$`,
          "im"
        )
      });
    }

    if (entry.state && entry.viewport) {
      const fullParsedName = `${entry.screenName}_${entry.state}_${entry.viewport}`;
      invalidHeadingPatterns.push({
        label: fullParsedName,
        pattern: new RegExp(
          `^#{1,6}\\s*(?:(?:Screen|Screen Name):\\s*)?${escapeRegExp(fullParsedName)}\\s*$`,
          "im"
        )
      });
    }

    invalidHeadingPatterns.forEach(({ label, pattern }) => {
      if (pattern.test(finalText)) {
        addWarning(`Generated output still contains invalid screen heading: ${label}.`);
      }
    });
  });

  const manifestWarnings = validateManifestCleanliness(params.files);
  warnings.push(...manifestWarnings);
  reviewIssues.push(...manifestWarnings);

  const manifest = params.files["pack-manifest.md"];
  if (manifest) {
    params.allowedFilenames.forEach((filename) => {
      if (!manifest.includes(filename)) {
        const message = `pack-manifest.md is missing screenshot list entry: ${filename}.`;
        addFailure(message, message);
      }
    });
  }

  const clineWarnings = validateClinePrompt(
    params.files["cline-implementation-prompt.md"]
  );
  warnings.push(...clineWarnings);
  reviewIssues.push(...clineWarnings);

  const qaWarnings = validateQaChecklist(params.files["qa-checklist.md"]);
  warnings.push(...qaWarnings);
  reviewIssues.push(...qaWarnings);

  return {
    warnings: uniqueStrings(warnings),
    failureIssues: uniqueStrings(failureIssues),
    reviewIssues: uniqueStrings(reviewIssues)
  };
}

function validateManifestCleanliness(
  files: Partial<Record<GeneratedFileName, string>>
): string[] {
  const manifest = files["pack-manifest.md"];
  if (!manifest) {
    return [];
  }

  const warningPatterns: Array<{ label: string; pattern: RegExp }> = [
    { label: "Kaze component details", pattern: /\bKaze[A-Z][A-Za-z0-9]*\b/ },
    { label: "component verification", pattern: /component verification/i },
    { label: "confirmed Kaze components", pattern: /confirmed Kaze components?/i },
    { label: "token details", pattern: /\btokens?\b/i },
    { label: "color tokens", pattern: /color tokens?|colour tokens?/i },
    { label: "spacing and sizing tokens", pattern: /spacing and sizing tokens?/i },
    { label: "sizing tokens", pattern: /sizing tokens?/i },
    { label: "exact spacing", pattern: /exact spacing/i },
    { label: "spacing details", pattern: /\bspacing\b/i },
    { label: "design specs", pattern: /design specs?/i },
    { label: "component names", pattern: /component names?/i },
    { label: "implementation details", pattern: /implementation details/i },
    { label: "implementation instructions", pattern: /implementation instructions?/i },
    { label: "API endpoint details", pattern: /API endpoints?|\/api\/|http:\/\/|https:\/\//i },
    { label: "route details", pattern: /route names?|route details?|routes?:\s|\/[a-z0-9_-]+/i },
    { label: "Storybook instructions", pattern: /Storybook/i },
    { label: "CSS values", pattern: /\bCSS\b|#[0-9a-f]{3,8}\b/i },
    { label: "exact pixel values", pattern: /\b\d+px\b/i }
  ];

  return warningPatterns
    .filter(({ pattern }) => pattern.test(manifest))
    .map(
      ({ label }) =>
        `pack-manifest.md may include content that belongs outside the manifest: ${label}.`
    );
}

function validateClinePrompt(prompt: string | undefined): string[] {
  if (!prompt) {
    return [];
  }

  const requiredRules: Array<{ label: string; pattern: RegExp }> = [
    { label: "Critical First Step section", pattern: /## Critical First Step/i },
    { label: "Before writing code", pattern: /Before writing code:/i },
    { label: "Inspect actual project structure.", pattern: /Inspect actual project structure\./ },
    {
      label: "Inspect existing pages/screens that already use Kaze",
      pattern: /Inspect existing pages\/screens that already use Kaze/i
    },
    { label: "Inspect Kaze package exports", pattern: /Inspect Kaze package exports|package exports/i },
    { label: "Inspect Kaze Storybook/docs if available", pattern: /Inspect Kaze Storybook\/docs if available/i },
    { label: "Confirm exact Kaze component names and props", pattern: /Confirm exact Kaze component names and props|Verify exact Kaze components and props/i },
    { label: "Do not use guessed Kaze components", pattern: /Do not use guessed Kaze components|Avoid guessed Kaze components/i },
    {
      label: "Report missing suggested Kaze components",
      pattern: /If a suggested Kaze component does not exist, use the closest approved Kaze\/project pattern and report it/i
    },
    { label: "Do not invent routes", pattern: /Do not invent routes/i },
    { label: "Do not invent APIs", pattern: /Do not invent APIs/i },
    { label: "Do not invent dropdown values", pattern: /Do not invent dropdown values/i },
    { label: "Do not invent permission rules", pattern: /Do not invent permission rules/i },
    { label: "Use Kaze components where available", pattern: /Use Kaze components where available/i },
    {
      label: "Do not use raw controls if Kaze equivalents exist",
      pattern: /Do not use raw input\/button\/select\/table\/modal\/form controls if Kaze equivalents exist|Do not use raw input\/button\/select/i
    },
    {
      label: "Use raw HTML only for non-interactive layout wrappers",
      pattern: /Use raw HTML only for non-interactive layout wrappers/i
    },
    {
      label: "Do not use Ant Design directly if Kaze wraps it",
      pattern: /Do not use Ant Design directly if Kaze wraps it/i
    },
    { label: "Mark unknown behaviour as TODO", pattern: /Mark unknown behaviour as TODO/i },
    {
      label: "Report unresolved unknowns and fallback choices",
      pattern: /Report unresolved unknowns and fallback choices/i
    },
    {
      label: "Fallback rule for unverified Kaze components",
      pattern: /If a Kaze component is not verified:[\s\S]*First search existing project patterns[\s\S]*Document the fallback clearly/i
    },
    {
      label: "After implementation report section",
      pattern: /After implementation, report:/i
    },
    {
      label: "Files created or modified",
      pattern: /Files created or modified/i
    },
    {
      label: "Confirmed Kaze components used",
      pattern: /Confirmed Kaze components used/i
    },
    { label: "Fallbacks used", pattern: /Fallbacks used/i },
    { label: "TODOs left unresolved", pattern: /TODOs left unresolved/i },
    { label: "Typecheck/build result", pattern: /Typecheck\/build result/i },
    { label: "Run typecheck/build if available", pattern: /Run typecheck\/build if available|typecheck.*build/i }
  ];

  return requiredRules
    .filter(({ pattern }) => !pattern.test(prompt))
    .map(
      ({ label }) =>
        `cline-implementation-prompt.md is missing required verification rule: ${label}.`
    );
}

function validateQaChecklist(checklist: string | undefined): string[] {
  if (!checklist) {
    return [];
  }

  const unsafePatterns: Array<{ label: string; pattern: RegExp }> = [
    {
      label: "Sidebar navigation routes to correct sections",
      pattern: /Sidebar navigation routes to correct sections\.?/i
    },
    {
      label: "Sidebar links navigate correctly",
      pattern: /Sidebar links navigate correctly\.?/i
    },
    {
      label: "Avatar click opens profile/account menu",
      pattern: /Avatar click opens profile\/account menu\.?/i
    },
    {
      label: "Avatar opens profile menu",
      pattern: /Avatar opens profile menu\.?/i
    },
    {
      label: "Voice button triggers expected audio/input state",
      pattern: /Voice button triggers expected (?:audio|input) state\.?/i
    },
    {
      label: "Voice button triggers expected audio UI",
      pattern: /Voice button triggers expected audio UI\.?/i
    },
    {
      label: "Voice button toggles between idle and recording states",
      pattern: /Voice button toggles between idle and recording states\.?/i
    },
    {
      label: "triggers audio input",
      pattern: /triggers audio input/i
    },
    {
      label: "triggers submission",
      pattern: /triggers submission/i
    },
    {
      label: "Thinking dropdown opens and allows selection",
      pattern: /Thinking dropdown opens and allows selection\.?/i
    },
    {
      label: "Thinking selector displays options and updates on change",
      pattern: /Thinking selector displays options and updates on change\.?/i
    },
    {
      label: '"Thinking" selector opens and allows selection',
      pattern: /"?Thinking"? selector opens and allows selection\.?/i
    },
    {
      label: "opens and allows selection",
      pattern: /opens and allows selection/i
    },
    {
      label: "Quick action buttons trigger appropriate flows",
      pattern: /Quick action buttons trigger appropriate flows\.?/i
    },
    {
      label: "Quick action buttons navigate to or trigger their respective flows",
      pattern: /Quick action buttons navigate to or trigger their respective flows\.?/i
    },
    {
      label: "navigate to or trigger their respective flows",
      pattern: /navigate to or trigger their respective flows/i
    },
    {
      label: "displays options and updates on change",
      pattern: /displays options and updates on change/i
    },
    {
      label: "toggles between idle and recording states",
      pattern: /toggles between idle and recording states/i
    },
    {
      label: "Screen reader announces dynamic state changes or TODO placeholders correctly",
      pattern: /Screen reader announces dynamic state changes or TODO placeholders correctly/i
    }
  ];

  return unsafePatterns
    .filter(({ pattern }) => pattern.test(checklist))
    .map(({ label }) => `qa-checklist.md assumes unconfirmed behaviour: ${label}.`);
}

function computeQuality(params: {
  warnings: string[];
  failureIssues: string[];
  reviewIssues: string[];
}): GenerationQuality {
  const failureIssues = uniqueStrings(params.failureIssues);
  const reviewIssues = uniqueStrings([...params.reviewIssues, ...params.warnings]);

  if (failureIssues.length > 0) {
    return {
      status: "failed",
      label: "Failed",
      score: 0,
      issues: uniqueStrings([...failureIssues, ...reviewIssues])
    };
  }

  if (reviewIssues.length > 0) {
    return {
      status: "needs_review",
      label: "Needs Review",
      score: 7,
      issues: reviewIssues
    };
  }

  return {
    status: "ready",
    label: "10/10 Ready",
    score: 10,
    issues: []
  };
}

export function applyGenerationWarningsToQuality(
  quality: GenerationQuality,
  warnings: string[]
): GenerationQuality {
  const issues = uniqueStrings([...quality.issues, ...warnings]);

  if (quality.status === "failed") {
    return {
      ...quality,
      issues
    };
  }

  if (warnings.length > 0) {
    return {
      status: "needs_review",
      label: "Needs Review",
      score: Math.min(quality.score, 7),
      issues
    };
  }

  return quality;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].filter(Boolean);
}

function getAllowedKazeComponents(catalog: string): Set<string> {
  return new Set(catalog.match(/\bKaze[A-Z][A-Za-z0-9]*\b/g) ?? []);
}

function replaceUnconfirmedKazeComponents(
  text: string,
  catalog: string
): { text: string; replaced: string[] } {
  const allowedComponents = getAllowedKazeComponents(catalog);
  const replaced = new Set<string>();

  const sanitized = text.replace(/\bKaze[A-Z][A-Za-z0-9]*\b/g, (component) => {
    if (allowedComponents.has(component)) {
      return component;
    }

    replaced.add(component);
    return "Unknown / verify from Kaze";
  });

  return {
    text: sanitized,
    replaced: [...replaced].sort()
  };
}

function replaceUnconfirmedKazeComponentsInFiles(
  files: Partial<Record<GeneratedFileName, string>>,
  catalog: string
): Partial<Record<GeneratedFileName, string>> {
  return Object.fromEntries(
    Object.entries(files).map(([filename, content]) => [
      filename,
      content ? replaceUnconfirmedKazeComponents(content, catalog).text : content
    ])
  ) as Partial<Record<GeneratedFileName, string>>;
}

function replaceInventedFilenames(
  text: string,
  allowedFilenames: string[]
): { text: string; replaced: string[] } {
  const allowed = new Set(allowedFilenames);
  const replaced = new Set<string>();
  const screenshotPattern =
    /(?<![\w.-])([A-Za-z0-9][A-Za-z0-9_.-]*\.(?:png|jpg|jpeg|webp))(?![\w.-])/gi;

  const sanitized = text.replace(screenshotPattern, (match) => {
    if (allowed.has(match)) {
      return match;
    }

    replaced.add(match);
    return "Filename not in File Map";
  });

  return {
    text: sanitized,
    replaced: [...replaced].sort()
  };
}

function replaceInventedFilenamesInFiles(
  files: Partial<Record<GeneratedFileName, string>>,
  allowedFilenames: string[]
): Partial<Record<GeneratedFileName, string>> {
  return Object.fromEntries(
    Object.entries(files).map(([filename, content]) => [
      filename,
      content ? replaceInventedFilenames(content, allowedFilenames).text : content
    ])
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
