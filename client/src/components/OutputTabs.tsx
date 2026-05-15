import { useEffect, useMemo, useState } from "react";
import { downloadMarkdownZip } from "../utils/downloadZip";
import {
  EXPECTED_FILES,
  type GeneratedFiles,
  type GenerationQuality,
  type OutputTabName
} from "../types";
import { CopyButtons } from "./CopyButtons";

interface OutputTabsProps {
  files: GeneratedFiles;
  rawResponse: string;
  warnings: string[];
  quality: GenerationQuality;
  projectName: string;
  onRegenerate: () => void;
  isLoading: boolean;
}

export function OutputTabs({
  files,
  rawResponse,
  warnings,
  quality,
  projectName,
  onRegenerate,
  isLoading
}: OutputTabsProps) {
  const [activeFile, setActiveFile] = useState<OutputTabName>(
    EXPECTED_FILES[0]
  );
  const [copiedLabel, setCopiedLabel] = useState("");
  const tabs = useMemo<OutputTabName[]>(
    () => [...EXPECTED_FILES, "Raw Response"],
    []
  );
  const hasParseWarning = warnings.some((warning) =>
    warning.toLowerCase().includes("could not parse all expected files")
  );

  useEffect(() => {
    if (hasParseWarning) {
      setActiveFile("Raw Response");
    }
  }, [hasParseWarning]);

  const currentContent =
    activeFile === "Raw Response" ? rawResponse : files[activeFile] ?? "";
  const allContent = useMemo(() => formatAllFiles(files, rawResponse), [
    files,
    rawResponse
  ]);
  const zipReadyFiles = useMemo(
    () =>
      Object.fromEntries(
        EXPECTED_FILES.map((filename) => [filename, files[filename] ?? ""])
      ),
    [files]
  );

  async function copyText(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    window.setTimeout(() => setCopiedLabel(""), 1800);
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
              {warnings.length} warning{warnings.length === 1 ? "" : "s"} need review.
            </p>
          )}
        </div>

        <CopyButtons
          currentContent={currentContent}
          allContent={allContent}
          canDownload={!Object.values(files).every((content) => !content)}
          copiedLabel={copiedLabel}
          isLoading={isLoading}
          onCopy={copyText}
          onDownload={() =>
            downloadMarkdownZip(zipReadyFiles, `${slugify(projectName)}-pack.zip`)
          }
          onRegenerate={onRegenerate}
        />
      </div>

      {warnings.length > 0 && (
        <div className="warning-box warning-box--compact">
          <div className="warning-box__title">Generation Warnings</div>
          <ul>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

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

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "kaze-screen-pack"
  );
}
