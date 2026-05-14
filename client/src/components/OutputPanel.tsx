import type { GeneratePackResponse } from "../types";
import { OutputTabs } from "./OutputTabs";

interface OutputPanelProps {
  response: GeneratePackResponse | null;
  projectName: string;
  isLoading: boolean;
  onRegenerate: () => void;
}

export function OutputPanel({
  response,
  projectName,
  isLoading,
  onRegenerate
}: OutputPanelProps) {
  if (!response) {
    return (
      <section className="output-panel output-panel--empty" aria-label="Generated output">
        <h2>Generated pack files will appear here.</h2>
        <p>The tool will generate:</p>
        <ul>
          <li>pack-manifest.md</li>
          <li>handoff.md</li>
          <li>kaze-component-mapping.md</li>
          <li>cline-implementation-prompt.md</li>
          <li>qa-checklist.md</li>
        </ul>
        <p>Upload screenshots and click Generate Implementation Pack to begin.</p>
      </section>
    );
  }

  return (
    <OutputTabs
      files={response.files}
      rawResponse={response.rawResponse}
      warnings={response.warnings}
      projectName={projectName}
      onRegenerate={onRegenerate}
      isLoading={isLoading}
    />
  );
}
