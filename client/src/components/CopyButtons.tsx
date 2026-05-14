import { Check, Clipboard, Copy, Download, RefreshCw } from "lucide-react";

interface CopyButtonsProps {
  currentContent: string;
  allContent: string;
  canDownload: boolean;
  copiedLabel: string;
  isLoading: boolean;
  onCopy: (text: string, label: string) => void;
  onDownload: () => void;
  onRegenerate: () => void;
}

export function CopyButtons({
  currentContent,
  allContent,
  canDownload,
  copiedLabel,
  isLoading,
  onCopy,
  onDownload,
  onRegenerate
}: CopyButtonsProps) {
  return (
    <div className="button-row">
      <button
        type="button"
        className="secondary-button"
        onClick={() => onCopy(currentContent, "current")}
        disabled={!currentContent}
      >
        {copiedLabel === "current" ? (
          <Check aria-hidden="true" size={17} />
        ) : (
          <Copy aria-hidden="true" size={17} />
        )}
        Copy Current
      </button>
      <button
        type="button"
        className="secondary-button"
        onClick={() => onCopy(allContent, "all")}
        disabled={!allContent}
      >
        {copiedLabel === "all" ? (
          <Check aria-hidden="true" size={17} />
        ) : (
          <Clipboard aria-hidden="true" size={17} />
        )}
        Copy All
      </button>
      <button
        type="button"
        className="secondary-button"
        onClick={onDownload}
        disabled={!canDownload}
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
  );
}
