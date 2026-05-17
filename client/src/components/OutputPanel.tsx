import type {
  GeneratePackResponse,
  GenerationQuality,
  GeneratedFiles,
} from "../types";
import { OutputTabs } from "./OutputTabs";

interface ParsedFilename {
  filename: string;
  screenName: string;
  state: string;
  viewport: string;
}

interface OutputPanelProps {
  response: GeneratePackResponse | null;
  projectName: string;
  screenshots: File[];
  isLoading: boolean;
  onRegenerate: () => void;
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

export function OutputPanel({
  response,
  projectName,
  screenshots,
  isLoading,
  onRegenerate,
  aiEndpointUrl,
  modelName,
  onPackUpdated,
  allowedFilenames,
  parsedFilenames,
}: OutputPanelProps) {
  if (!response) {
    return (
      <section
        className="output-panel output-panel--empty"
        aria-label="Generated output"
      >
        <h2>Generated pack files will appear here.</h2>
        <p>The tool will generate:</p>
        <ul>
          <li>pack-manifest.md</li>
          <li>handoff.md</li>
          <li>kaze-component-mapping.md</li>
          <li>cline-implementation-prompt.md</li>
          <li>qa-checklist.md</li>
        </ul>
        <p>
          Upload screenshots and click Generate Implementation Pack to begin.
        </p>
      </section>
    );
  }

  return (
    <OutputTabs
      files={response.files}
      rawResponse={response.rawResponse}
      warnings={response.warnings}
      quality={response.quality}
      projectName={projectName}
      screenshots={screenshots}
      onRegenerate={onRegenerate}
      isLoading={isLoading}
      aiEndpointUrl={aiEndpointUrl}
      modelName={modelName}
      onPackUpdated={onPackUpdated}
      allowedFilenames={allowedFilenames}
      parsedFilenames={parsedFilenames}
    />
  );
}
