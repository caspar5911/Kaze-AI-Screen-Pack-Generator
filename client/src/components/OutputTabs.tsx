import { Check, Clipboard, Copy, Download, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { downloadMarkdownZip } from "../utils/downloadZip";
import { EXPECTED_FILES, type GeneratedFileName, type GeneratedFiles } from "../types";

interface OutputTabsProps {
  files: GeneratedFiles;
  rawResponse: string;
  warnings: string[];
  projectName: string;
  onRegenerate: () => void;
  isLoading: boolean;
}

export function OutputTabs({
  files,
  rawResponse,
  warnings,
  projectName,
  onRegenerate,
  isLoading
}: OutputTabsProps) {
  const [activeFile, setActiveFile] = useState<GeneratedFileName>(
    EXPECTED_FILES[0]
  );
  const [copiedLabel, setCopiedLabel] = useState("");

  const currentContent = files[activeFile] ?? rawResponse;
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
          {warnings.length > 0 && (
            <p className="output-warning">
              {warnings.length} warning{warnings.length === 1 ? "" : "s"} need review.
            </p>
          )}
        </div>

        <div className="button-row">
          <button
            type="button"
            className="secondary-button"
            onClick={() => copyText(currentContent, "current")}
            disabled={!currentContent}
          >
            {copiedLabel === "current" ? (
              <Check aria-hidden="true" size={17} />
            ) : (
              <Copy aria-hidden="true" size={17} />
            )}
            Copy current file
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => copyText(allContent, "all")}
            disabled={!allContent}
          >
            {copiedLabel === "all" ? (
              <Check aria-hidden="true" size={17} />
            ) : (
              <Clipboard aria-hidden="true" size={17} />
            )}
            Copy all
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              downloadMarkdownZip(zipReadyFiles, `${slugify(projectName)}-pack.zip`)
            }
            disabled={Object.values(files).every((content) => !content)}
          >
            <Download aria-hidden="true" size={17} />
            Download ZIP
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={onRegenerate}
            disabled={isLoading}
          >
            <RefreshCw aria-hidden="true" size={17} />
            Regenerate
          </button>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="warning-box warning-box--compact">
          <ul>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="tabs" role="tablist" aria-label="Generated files">
        {EXPECTED_FILES.map((filename) => (
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
