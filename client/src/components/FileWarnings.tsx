import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface FileWarningsProps {
  warnings: string[];
}

export function FileWarnings({ warnings }: FileWarningsProps) {
  if (warnings.length === 0) {
    return (
      <div className="status-line status-line--ok">
        <CheckCircle2 aria-hidden="true" size={18} />
        <span>Uploaded filenames match the expected format.</span>
      </div>
    );
  }

  return (
    <div className="warning-box" role="status" aria-live="polite">
      <div className="warning-box__title">
        <AlertTriangle aria-hidden="true" size={18} />
        <span>Filename warnings</span>
      </div>
      <ul>
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </div>
  );
}
