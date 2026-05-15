export const EXPECTED_FILES = [
  "pack-manifest.md",
  "handoff.md",
  "kaze-component-mapping.md",
  "cline-implementation-prompt.md",
  "qa-checklist.md"
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
  quality: GenerationQuality;
}

export interface PackFormState {
  projectName: string;
  shortDescription: string;
  designSource: string;
  iconSystem: string;
  additionalNotes: string;
  aiEndpointUrl: string;
  modelName: string;
}
