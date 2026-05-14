import { ChevronDown } from "lucide-react";

interface FileMapPreviewProps {
  screenshots: File[];
}

export function FileMapPreview({ screenshots }: FileMapPreviewProps) {
  if (screenshots.length === 0) {
    return null;
  }

  return (
    <details className="file-map-preview">
      <summary>
        <span>File Map Preview</span>
        <ChevronDown aria-hidden="true" size={16} />
      </summary>
      <ol>
        {screenshots.map((file, index) => (
          <li key={`${file.name}-${file.size}`}>
            <code>{file.name}</code> = attached image {index + 1}
          </li>
        ))}
      </ol>
    </details>
  );
}
