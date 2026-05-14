import { AlertTriangle } from "lucide-react";

interface FilenameWarningsProps {
  warnings: string[];
}

export function FilenameWarnings({ warnings }: FilenameWarningsProps) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="filename-warnings" role="status" aria-live="polite">
      <div className="filename-warnings__title">
        <AlertTriangle aria-hidden="true" size={17} />
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
