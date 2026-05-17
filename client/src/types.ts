export const EXPECTED_FILES = [
  "pack-manifest.md",
  "handoff.md",
  "kaze-component-mapping.md",
  "cline-implementation-prompt.md",
  "qa-checklist.md",
] as const;

export type GeneratedFileName = (typeof EXPECTED_FILES)[number];

export type GeneratedFiles = Partial<Record<GeneratedFileName, string>>;

export type OutputTabName = GeneratedFileName | "Raw Response";

export type GenerationQualityStatus = "ready" | "needs_review" | "failed";

export interface GenerationQuality {
  status: GenerationQualityStatus;
  label: string;
  score: number;
  issues: string[];
}

export interface GeneratePackResponse {
  files: GeneratedFiles;
  warnings: string[];
  rawResponse: string;
  rawResponses?: Record<string, string>;
  quality: GenerationQuality;
  meta?: {
    mode?: string;
    fastMode?: boolean;
    timingsMs?: {
      stage1ManifestLocal?: number;
      stage2HandoffMapping?: number;
      stage3ClineQa?: number;
      validation?: number;
    };
    promptSizes?: {
      stage2HandoffMapping?: number;
      stage3ClineQa?: number;
    };
    imagePayloadKb?: number;
    ai?: {
      timeoutMs?: number;
      endpointMode?: "ollama" | "openai-compatible";
      modelName?: string;
    };
  };
}

export interface PackFormState {
  projectName: string;
  shortDescription: string;
  designSource: string;
  iconSystem: string;
  additionalNotes: string;
  aiEndpointUrl: string;
  modelName: string;
  fastMode: boolean;
}

export type AiAssistTargetField =
  | "screenName"
  | "shortDescription"
  | "additionalNotes"
  | "all";

export type AiAssistLoadingState = AiAssistTargetField | null;

export interface AiAssistRequest {
  screenshots: File[];
  currentValues: {
    screenName?: string;
    shortDescription?: string;
    additionalNotes?: string;
  };
  targetField: AiAssistTargetField;
  aiEndpointUrl: string;
  modelName: string;
}

export interface AiAssistResponse {
  screenName?: string;
  shortDescription?: string;
  additionalNotes?: string;
}
