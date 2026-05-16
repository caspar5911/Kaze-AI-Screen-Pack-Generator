import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { downloadClineReadyZip } from "../utils/downloadZip";
import {
  EXPECTED_FILES,
  type GeneratedFiles,
  type GenerationQuality,
  type OutputTabName,
} from "../types";
import { CopyButtons } from "./CopyButtons";
import {
  filesToBase64Images,
  resolveUnknowns,
  validatePack,
  type ResolvedCell,
  type ValidatePackResponse,
} from "../api/generatePack";

interface ParsedFilename {
  filename: string;
  screenName: string;
  state: string;
  viewport: string;
}

interface UnknownMappingRow {
  uiElement: string;
}

interface OutputTabsProps {
  files: GeneratedFiles;
  rawResponse: string;
  warnings: string[];
  quality: GenerationQuality;
  projectName: string;
  screenshots: File[];
  onRegenerate: () => void;
  isLoading: boolean;
  aiEndpointUrl: string;
  modelName: string;
  onPackUpdated?: (update: {
    files: GeneratedFiles;
    warnings: string[];
    quality: GenerationQuality;
  }) => void;
  allowedFilenames: string[];
  parsedFilenames: ParsedFilename[];
}

export function OutputTabs({
  files,
  rawResponse,
  warnings,
  quality,
  projectName,
  screenshots,
  onRegenerate,
  isLoading,
  aiEndpointUrl,
  modelName,
  onPackUpdated,
  allowedFilenames,
  parsedFilenames,
}: OutputTabsProps) {
  const [resolvingUnknowns, setResolvingUnknowns] = useState(false);
  const [resolveError, setResolveError] = useState("");
  const [resolvedCount, setResolvedCount] = useState(0);
  const [revalidating, setRevalidating] = useState(false);

  const unknownCells = useMemo(() => {
    const mapping = files["kaze-component-mapping.md"];
    if (!mapping) return [];
    return extractUnknownRows(mapping);
  }, [files]);
  const unknownCount = unknownCells.length;
  const hasUnknownCells = unknownCount > 0;

  const canResolve =
    hasUnknownCells &&
    aiEndpointUrl.trim().length > 0 &&
    modelName.trim().length > 0;

  const handleResolveUnknowns = useCallback(async () => {
    if (!canResolve) return;
    setResolvingUnknowns(true);
    setResolveError("");
    setResolvedCount(0);

    try {
      const base64Images = await filesToBase64Images(screenshots);

      const result = await resolveUnknowns({
        aiEndpointUrl: aiEndpointUrl.trim(),
        modelName: modelName.trim(),
        kazeComponentMapping: files["kaze-component-mapping.md"] ?? "",
        screenshots: base64Images,
        fastMode: false,
      });

      if (result.success && result.resolved.length > 0) {
        setResolvedCount(result.resolved.length);
        const updatedMapping = replaceUnknownsWithResolved(
          files["kaze-component-mapping.md"] ?? "",
          result.resolved,
        );

        const updatedFiles = {
          ...files,
          "kaze-component-mapping.md": updatedMapping,
        };

        // Re-validate the pack after resolving
        setRevalidating(true);
        try {
          const validationResult: ValidatePackResponse = await validatePack({
            files: updatedFiles,
            allowedFilenames,
            parsedFilenames,
          });

          if (onPackUpdated) {
            onPackUpdated({
              files: updatedFiles,
              warnings: validationResult.warnings,
              quality: validationResult.quality,
            });
          }
        } catch (err) {
          if (onPackUpdated) {
            onPackUpdated({
              files: updatedFiles,
              warnings: ["Re-validation failed"],
              quality,
            });
          }
        } finally {
          setRevalidating(false);
        }
      }

      if (result.failed && result.failed.length > 0) {
        setResolveError(
          `${result.failed.length} element(s) could not be resolved: ${result.failed.join(", ")}`,
        );
      }

      if (!result.success) {
        setResolveError(result.error || "AI resolution failed.");
      }
    } catch (err) {
      setResolveError(
        err instanceof Error ? err.message : "Resolve unknowns failed.",
      );
    } finally {
      setResolvingUnknowns(false);
    }
  }, [
    canResolve,
    aiEndpointUrl,
    modelName,
    screenshots,
    files,
    allowedFilenames,
    parsedFilenames,
    onPackUpdated,
    quality,
  ]);

  function replaceUnknownsWithResolved(
    mapping: string,
    resolved: ResolvedCell[],
  ): string {
    let updated = mapping;
    for (const r of resolved) {
      // Match any table row where the UI Element column matches the resolved element
      // and the Exact Kaze Export column is "Unknown / verify from Kaze"
      const lines = updated.split("\n");
      const result = lines.map((line) => {
        const cells = parseTableRow(line);
        if (!cells || cells.length < 5) return line;
        if (
          cells[0].trim() === r.uiElement.trim() &&
          /Unknown\s*\/\s*verify from Kaze/i.test(cells[2]?.trim() ?? "")
        ) {
          return `| ${r.uiElement} | ${cells[1]} | ${r.resolvedExport} | ${cells[3]} | ${cells[4] ?? ""} |`;
        }
        return line;
      });
      updated = result.join("\n");
    }
    return updated;
  }

  function parseTableRow(line: string): string[] | null {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
    return trimmed
      .slice(1, -1)
      .split("|")
      .map((c) => c.trim());
  }

  const [activeFile, setActiveFile] = useState<OutputTabName>(
    EXPECTED_FILES[0],
  );
  const [copiedLabel, setCopiedLabel] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const tabs = useMemo<OutputTabName[]>(
    () => [...EXPECTED_FILES, "Raw Response"],
    [],
  );
  const hasParseWarning = warnings.some((warning) =>
    warning.toLowerCase().includes("could not parse all expected files"),
  );

  useEffect(() => {
    if (hasParseWarning) {
      setActiveFile("Raw Response");
    }
  }, [hasParseWarning]);

  const currentContent =
    activeFile === "Raw Response" ? rawResponse : (files[activeFile] ?? "");
  const allContent = useMemo(
    () => formatAllFiles(files, rawResponse),
    [files, rawResponse],
  );
  const zipReadyFiles = useMemo(
    () =>
      Object.fromEntries(
        EXPECTED_FILES.map((filename) => [filename, files[filename] ?? ""]),
      ),
    [files],
  );

  useEffect(() => {
    setDownloadError("");
  }, [files, screenshots]);

  async function copyText(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    window.setTimeout(() => setCopiedLabel(""), 1800);
  }

  const isQualityReady = quality.status === "ready";

  async function downloadZip() {
    setDownloadError("");

    if (!isQualityReady) {
      setDownloadError(
        "Pack validation failed. Fix issues before downloading ZIP.",
      );
      return;
    }

    try {
      await downloadClineReadyZip({
        files: zipReadyFiles,
        screenshots,
        projectName,
        zipFilename: `${slugify(projectName)}-pack.zip`,
      });
    } catch (caught) {
      setDownloadError(
        caught instanceof Error ? caught.message : "ZIP validation failed.",
      );
    }
  }

  return (
    <section className="output-panel" aria-labelledby="output-heading">
      <div className="output-toolbar">
        <div>
          <h2 id="output-heading">Generated Pack</h2>
          <div className={`quality-pill quality-pill--${quality.status}`}>
            {quality.label}
          </div>
          {hasParseWarning && (
            <p className="output-warning">
              Could not parse all expected files. Showing raw response.
            </p>
          )}
          {warnings.length > 0 && (
            <p className="output-warning">
              {warnings.length} warning{warnings.length === 1 ? "" : "s"} need
              review.
            </p>
          )}
        </div>

        <CopyButtons
          currentContent={currentContent}
          allContent={allContent}
          canDownload={
            isQualityReady && !Object.values(files).every((content) => !content)
          }
          copiedLabel={copiedLabel}
          isLoading={isLoading}
          onCopy={copyText}
          onDownload={downloadZip}
          onRegenerate={onRegenerate}
        />
      </div>

      {(warnings.length > 0 || downloadError) && (
        <div className="warning-box warning-box--compact">
          <div className="warning-box__title">Generation Warnings</div>
          <ul>
            {downloadError && <li>{downloadError}</li>}
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="resolve-unknowns-section">
        <div className="resolve-summary">
          <strong>
            {unknownCount === 0
              ? "No unresolved Kaze mappings"
              : `${unknownCount} unresolved Kaze mapping${unknownCount === 1 ? "" : "s"}`}
          </strong>
          <span>
            {unknownCount === 0
              ? "All mapping rows currently use confirmed Kaze exports."
              : formatUnknownSummary(unknownCells)}
          </span>
        </div>
        {hasUnknownCells && (
          <>
            {resolvedCount > 0 && (
              <div className="resolve-success">
                Resolved {resolvedCount} unknown component
                {resolvedCount === 1 ? "" : "s"}
              </div>
            )}
            {resolveError && (
              <div className="resolve-error">{resolveError}</div>
            )}
          </>
        )}
        <button
          type="button"
          className="secondary-button"
          disabled={!canResolve || resolvingUnknowns || revalidating}
          onClick={handleResolveUnknowns}
        >
          {resolvingUnknowns || revalidating ? (
            <>
              <Loader2 className="spin" aria-hidden="true" size={16} />
              {revalidating ? "Re-validating..." : "Resolving..."}
            </>
          ) : (
            "Resolve Unknowns"
          )}
        </button>
        <span className="resolve-hint">
          {hasUnknownCells
            ? "Ask the configured model to choose confirmed Kaze exports for unresolved rows."
            : "Resolve is available only when the mapping contains Unknown / verify from Kaze rows."}
        </span>
      </div>

      <div className="tabs" role="tablist" aria-label="Generated files">
        {tabs.map((filename) => (
          <button
            key={filename}
            type="button"
            role="tab"
            aria-selected={activeFile === filename}
            className={activeFile === filename ? "tab tab--active" : "tab"}
            onClick={() => setActiveFile(filename)}
          >
            {filename}
          </button>
        ))}
      </div>

      <pre className="markdown-viewer" tabIndex={0}>
        <code>{currentContent || "No content returned for this file."}</code>
      </pre>
    </section>
  );
}

function formatAllFiles(files: GeneratedFiles, rawResponse: string): string {
  const parsedContent = EXPECTED_FILES.map((filename) => {
    const content = files[filename];
    return content ? `--- File: ${filename} ---\n${content}` : "";
  })
    .filter(Boolean)
    .join("\n\n");

  return parsedContent || rawResponse;
}

function extractUnknownRows(mapping: string): UnknownMappingRow[] {
  const rows: UnknownMappingRow[] = [];

  mapping.split("\n").forEach((line) => {
    const cells = parseMappingTableRow(line);
    if (!cells || cells.length < 5) {
      return;
    }

    const [uiElement, , exactExport] = cells;
    if (
      /^UI Element$/i.test(uiElement) ||
      isTableSeparator(cells) ||
      !/Unknown\s*\/\s*verify from Kaze/i.test(exactExport)
    ) {
      return;
    }

    rows.push({
      uiElement,
    });
  });

  return rows;
}

function parseMappingTableRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
    return null;
  }

  return trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

function isTableSeparator(cells: string[]): boolean {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function formatUnknownSummary(rows: UnknownMappingRow[]): string {
  const names = rows
    .map((row) => row.uiElement)
    .filter(Boolean)
    .slice(0, 3);
  const remaining = rows.length - names.length;
  const examples = names.length > 0 ? names.join(", ") : "Unlabeled rows";

  return remaining > 0
    ? `${examples}, and ${remaining} more need verification.`
    : `${examples} need verification.`;
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "kaze-screen-pack"
  );
}
