import { EXPECTED_FILE_NAMES } from "./responseParserConstants.js";

export type GeneratedFileName = (typeof EXPECTED_FILE_NAMES)[number];

export interface ParsedAiResponse {
  files: Partial<Record<GeneratedFileName, string>>;
  rawResponse: string;
  warnings: string[];
}

export interface ParsedFilenameContext {
  filename: string;
  screenName: string | null;
  state: string | null;
  viewport: string | null;
}

export function parseAiResponse(params: {
  responseText: string;
  allowedFilenames: string[];
  kazeComponentCatalog: string;
  parsedFilenames?: ParsedFilenameContext[];
}): ParsedAiResponse {
  const warnings: string[] = [];
  const fenceStripped = stripOuterMarkdownFence(params.responseText);
  const stripped = stripReasoningBlocks(fenceStripped.text);
  const riskyPhraseWarnings = findRiskyOutputPhrases(params.responseText);

  warnings.push(...riskyPhraseWarnings);

  if (fenceStripped.changed) {
    warnings.push("Removed outer markdown code fence from the AI response.");
  }

  if (stripped.changed) {
    warnings.push("Removed reasoning blocks from the AI response.");
  }

  const headingRepaired = repairScreenHeadings(
    stripped.text,
    params.parsedFilenames ?? []
  );
  if (headingRepaired.repaired.length > 0) {
    warnings.push(
      `Original AI response used invalid screen headings; repaired to ScreenName-only headings. Affected headings: ${headingRepaired.repaired.join(", ")}.`
    );
  }

  const stateRepaired = repairUnsafeStateLabels(headingRepaired.text);
  if (stateRepaired.repaired.length > 0) {
    warnings.push(
      `Original AI response used unsafe state labels; repaired them. Affected labels: ${stateRepaired.repaired.join(", ")}.`
    );
  }

  const qaAndFallbackRepaired = repairUnsafeQaAndFallbackText(stateRepaired.text);
  if (qaAndFallbackRepaired.repaired.length > 0) {
    warnings.push(
      `Original AI response used unsafe QA/fallback wording; repaired it. Affected wording: ${qaAndFallbackRepaired.repaired.join(", ")}.`
    );
  }

  const unavailableFilenameRepaired = qaAndFallbackRepaired.text.replace(
    /\bFilename unavailable\b/gi,
    "Filename missing from File Map"
  );
  if (unavailableFilenameRepaired !== qaAndFallbackRepaired.text) {
    warnings.push(
      'Replaced "Filename unavailable" with "Filename missing from File Map".'
    );
  }

  const componentSanitized = replaceUnconfirmedKazeComponents(
    unavailableFilenameRepaired,
    params.kazeComponentCatalog
  );
  if (componentSanitized.replaced.length > 0) {
    warnings.push(
      `Original AI response used unconfirmed Kaze component names; replaced with "Unknown / verify from Kaze": ${componentSanitized.replaced.join(", ")}.`
    );
  }

  const filenameSanitized = replaceInventedFilenames(
    componentSanitized.text,
    params.allowedFilenames
  );
  if (filenameSanitized.replaced.length > 0) {
    warnings.push(
      `Original AI response used filenames not present in the File Map; replaced them: ${filenameSanitized.replaced.join(", ")}.`
    );
  }

  const files = parseFiles(filenameSanitized.text);
  const missingFiles = EXPECTED_FILE_NAMES.filter((filename) => !files[filename]);

  warnings.push(...validateManifestCleanliness(files));

  if (missingFiles.length > 0) {
    warnings.push(
      `Could not parse all expected files. Showing raw response. Missing: ${missingFiles.join(", ")}.`
    );
  }

  return {
    files,
    rawResponse: filenameSanitized.text,
    warnings
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

function findRiskyOutputPhrases(text: string): string[] {
  const riskyPatterns: Array<{ label: string; pattern: RegExp }> = [
    { label: "Screen: HomeGreeting_Default", pattern: /Screen:\s*HomeGreeting_Default/i },
    { label: "Default / Empty", pattern: /Default\s*\/\s*Empty/i },
    { label: "Initial / Empty", pattern: /Initial\s*\/\s*Empty/i },
    { label: "Filename unavailable", pattern: /Filename unavailable/i },
    { label: "Chatgpt_default_Desktop.png", pattern: /Chatgpt_default_Desktop\.png/i },
    { label: "Home_Default_Desktop.png", pattern: /Home_Default_Desktop\.png/i },
    { label: "<details", pattern: /<details/i },
    { label: "reasoning", pattern: /\breasoning\b/i },
    { label: "KazeGreeting", pattern: /\bKazeGreeting\b/ },
    { label: "KazePromptBar", pattern: /\bKazePromptBar\b/ },
    { label: "KazeSidebar", pattern: /\bKazeSidebar\b/ },
    { label: "KazeAvatar", pattern: /\bKazeAvatar\b/ },
    { label: "KazeCard", pattern: /\bKazeCard\b/ },
    { label: "KazeIcon", pattern: /\bKazeIcon\b/ },
    { label: "KazeLayout", pattern: /\bKazeLayout\b/ },
    { label: "KazeText", pattern: /\bKazeText\b/ },
    { label: "KazeTypography", pattern: /\bKazeTypography\b/ },
    { label: "KazeFlex", pattern: /\bKazeFlex\b/ },
    { label: "KazeBox", pattern: /\bKazeBox\b/ },
    { label: "KazeHeading", pattern: /\bKazeHeading\b/ }
  ];

  return riskyPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ label }) => `Original AI response contained risky phrase: ${label}.`);
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
  text: string
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
  const replacements: Array<{ pattern: RegExp; replacement: string; label: string }> = [
    {
      pattern: /Sidebar navigation routes to correct sections\.?/gi,
      replacement: "Sidebar navigation is implemented or marked as TODO.",
      label: "Sidebar navigation routes to correct sections"
    },
    {
      pattern: /Avatar click opens profile\/account menu\.?/gi,
      replacement: "Avatar interaction is implemented or marked as TODO.",
      label: "Avatar click opens profile/account menu"
    },
    {
      pattern: /Voice button triggers expected input state\.?/gi,
      replacement: "Voice button behaviour is implemented or marked as TODO.",
      label: "Voice button triggers expected input state"
    },
    {
      pattern: /Quick action buttons trigger appropriate flows\.?/gi,
      replacement: "Quick action button behaviour is implemented or marked as TODO.",
      label: "Quick action buttons trigger appropriate flows"
    },
    {
      pattern: /use a standard accessible fallback until confirmed\.?/gi,
      replacement: fallbackRule,
      label: "use a standard accessible fallback until confirmed"
    }
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
    { label: "Kaze token details", pattern: /\bKaze tokens?\b|\btokens?\b/i },
    { label: "color tokens", pattern: /color tokens?|colour tokens?/i },
    { label: "spacing tokens", pattern: /spacing tokens?/i },
    { label: "component names", pattern: /component names?/i },
    { label: "implementation details", pattern: /implementation details/i },
    { label: "implementation instructions", pattern: /implementation instructions?/i },
    { label: "API endpoint details", pattern: /API endpoint|\/api\/|http:\/\/|https:\/\//i },
    { label: "route details", pattern: /route details?|routes?:\s|\/[a-z0-9_-]+/i },
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

function replaceUnconfirmedKazeComponents(
  text: string,
  catalog: string
): { text: string; replaced: string[] } {
  const allowedComponents = new Set(
    catalog.match(/\bKaze[A-Z][A-Za-z0-9]*\b/g) ?? []
  );
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
