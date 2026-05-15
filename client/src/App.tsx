import { Loader2, Moon, Sparkles, Sun } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { requestAiAssist } from "./api/aiAssist";
import { generatePack } from "./api/generatePack";
import { listModels } from "./api/listModels";
import { AdvancedSettingsCard } from "./components/AdvancedSettingsCard";
import { OutputPanel } from "./components/OutputPanel";
import { PackDetailsCard } from "./components/PackDetailsCard";
import { ScreenshotUploadCard } from "./components/ScreenshotUploadCard";
import type {
  AiAssistResponse,
  AiAssistTargetField,
  GeneratePackResponse,
  GenerationQuality,
  GeneratedFiles,
  PackFormState,
} from "./types";
import {
  getFilenameWarnings,
  parseScreenshotFilename,
} from "./utils/filenameParser";

const endpointStorageKey = "kaze-screen-pack-generator.aiEndpointUrl";
const modelStorageKey = "kaze-screen-pack-generator.modelName";
const themeStorageKey = "kaze-screen-pack-generator.theme";

type Theme = "dark" | "light";

const defaultForm: PackFormState = {
  projectName: "",
  shortDescription: "",
  designSource: "Screenshot export",
  iconSystem: "Font Awesome",
  additionalNotes: "",
  aiEndpointUrl: "http://localhost:11434/api/chat",
  modelName: "qwen3.6:35b",
  fastMode: false,
};

export default function App() {
  const [theme, setTheme] = useState<Theme>(() =>
    window.localStorage.getItem(themeStorageKey) === "light" ? "light" : "dark",
  );
  const [form, setForm] = useState<PackFormState>(() => ({
    ...defaultForm,
    aiEndpointUrl:
      window.localStorage.getItem(endpointStorageKey) ??
      defaultForm.aiEndpointUrl,
    modelName:
      window.localStorage.getItem(modelStorageKey) ?? defaultForm.modelName,
  }));
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [packScreenshots, setPackScreenshots] = useState<File[]>([]);
  const [packProjectName, setPackProjectName] = useState("");
  const [response, setResponse] = useState<GeneratePackResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelListError, setModelListError] = useState("");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [generationProgress, setGenerationProgress] = useState("");
  const [aiAssistLoading, setAiAssistLoading] =
    useState<AiAssistTargetField | null>(null);
  const [aiAssistError, setAiAssistError] = useState("");
  const generationProgressTimers = useRef<number[]>([]);

  const filenameWarnings = useMemo(
    () => getFilenameWarnings(screenshots),
    [screenshots],
  );

  const parsedFilenames = useMemo(
    () =>
      packScreenshots.map((f) => {
        const parsed = parseScreenshotFilename(f.name);
        return {
          filename: f.name,
          screenName: parsed.screenName || "",
          state: parsed.state || "",
          viewport: parsed.viewport || "",
        };
      }),
    [packScreenshots],
  );

  const allowedFilenames = useMemo(
    () => packScreenshots.map((f) => f.name),
    [packScreenshots],
  );

  const canGenerate =
    form.projectName.trim().length > 0 &&
    form.shortDescription.trim().length > 0 &&
    form.aiEndpointUrl.trim().length > 0 &&
    form.modelName.trim().length > 0 &&
    screenshots.length > 0 &&
    !isLoading &&
    aiAssistLoading === null;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(endpointStorageKey, form.aiEndpointUrl);
    setAvailableModels([]);
    setModelListError("");
  }, [form.aiEndpointUrl]);

  useEffect(() => {
    window.localStorage.setItem(modelStorageKey, form.modelName);
  }, [form.modelName]);

  useEffect(() => () => clearGenerationProgress(false), []);

  function updateForm(field: keyof PackFormState, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateScreenshots(files: File[]) {
    setScreenshots(files);
    if (
      files.length > 0 &&
      aiAssistError === "Upload at least one screenshot before using AI assist."
    ) {
      setAiAssistError("");
    }
  }

  async function runAiAssist(targetField: AiAssistTargetField) {
    if (screenshots.length === 0) {
      setAiAssistError(
        "Upload at least one screenshot before using AI assist.",
      );
      return;
    }

    if (!form.aiEndpointUrl.trim() || !form.modelName.trim()) {
      setAiAssistError(
        "AI endpoint URL and model name are required before using AI assist.",
      );
      return;
    }

    if (aiAssistLoading) {
      return;
    }

    setAiAssistLoading(targetField);
    setAiAssistError("");

    try {
      const result = await requestAiAssist({
        screenshots,
        currentValues: {
          screenName: form.projectName,
          shortDescription: form.shortDescription,
          additionalNotes: form.additionalNotes,
        },
        targetField,
        aiEndpointUrl: form.aiEndpointUrl,
        modelName: form.modelName,
      });

      applyAiAssistResult(targetField, result);
    } catch (caught) {
      setAiAssistError(
        caught instanceof Error
          ? caught.message
          : "AI assist failed. Check the on-prem model endpoint and try again.",
      );
    } finally {
      setAiAssistLoading(null);
    }
  }

  function applyAiAssistResult(
    targetField: AiAssistTargetField,
    result: AiAssistResponse,
  ) {
    setForm((current) => {
      const next = { ...current };

      if (
        (targetField === "screenName" || targetField === "all") &&
        result.screenName?.trim()
      ) {
        next.projectName = result.screenName.trim();
      }

      if (
        (targetField === "shortDescription" || targetField === "all") &&
        result.shortDescription?.trim()
      ) {
        next.shortDescription = result.shortDescription.trim();
      }

      if (
        (targetField === "additionalNotes" || targetField === "all") &&
        result.additionalNotes?.trim()
      ) {
        next.additionalNotes = result.additionalNotes.trim();
      }

      return next;
    });
  }

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!canGenerate) {
      return;
    }

    setIsLoading(true);
    setError("");
    startGenerationProgress();

    try {
      const payload = await generatePack(form, screenshots);
      setResponse(payload);
      setPackScreenshots([...screenshots]);
      setPackProjectName(form.projectName);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation failed.");
    } finally {
      clearGenerationProgress(true);
      setIsLoading(false);
    }
  }

  function startGenerationProgress() {
    clearGenerationProgress(true);
    const progressSteps = [
      { delay: 0, label: "Stage 1/3: Generating manifest..." },
      {
        delay: 1200,
        label:
          "Generating handoff and mapping. Vision models can take 1-2 minutes.",
      },
      {
        delay: 120000,
        label:
          "Still generating handoff and mapping. Vision models can take 1-2 minutes.",
      },
    ];

    generationProgressTimers.current = progressSteps.map((step) =>
      window.setTimeout(() => setGenerationProgress(step.label), step.delay),
    );
  }

  function clearGenerationProgress(resetLabel: boolean) {
    generationProgressTimers.current.forEach((timer) =>
      window.clearTimeout(timer),
    );
    generationProgressTimers.current = [];
    if (resetLabel) {
      setGenerationProgress("");
    }
  }

  async function loadAvailableModels() {
    const endpointUrl = form.aiEndpointUrl.trim();
    if (!endpointUrl) {
      setModelListError("AI endpoint URL is required before loading models.");
      return;
    }

    if (isLoadingModels || availableModels.length > 0) {
      return;
    }

    setIsLoadingModels(true);
    setModelListError("");

    try {
      const payload = await listModels(endpointUrl);
      setAvailableModels(payload.models);

      if (payload.models.length === 0) {
        setModelListError("No models were returned by this endpoint.");
      }
    } catch (caught) {
      setAvailableModels([]);
      setModelListError(
        caught instanceof Error ? caught.message : "Could not load models.",
      );
    } finally {
      setIsLoadingModels(false);
    }
  }

  // Callback for OutputTabs to update the pack after resolving unknowns
  function handlePackUpdated(update: {
    files: GeneratedFiles;
    warnings: string[];
    quality: GenerationQuality;
  }) {
    if (!response) return;
    setResponse({
      ...response,
      files: update.files,
      warnings: update.warnings,
      quality: update.quality,
    });
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Internal Kaze Tool</p>
          <h1>Kaze Screen Pack Generator</h1>
          <p className="header-subtitle">
            Generate implementation-ready markdown packs from Kaze-based
            Figma/Sketch screen exports.
          </p>
        </div>
        <button
          className="theme-toggle"
          type="button"
          onClick={() =>
            setTheme((currentTheme) =>
              currentTheme === "dark" ? "light" : "dark",
            )
          }
          aria-label={
            theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
          }
          title={
            theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
          }
        >
          {theme === "dark" ? (
            <Sun aria-hidden="true" size={18} />
          ) : (
            <Moon aria-hidden="true" size={18} />
          )}
          <span>{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
      </header>

      <main className="workspace">
        <form className="input-column" onSubmit={submit}>
          <PackDetailsCard
            form={form}
            aiAssistLoading={aiAssistLoading}
            aiAssistError={aiAssistError}
            isAiAssistDisabled={isLoading || aiAssistLoading !== null}
            onAiAssist={runAiAssist}
            onChange={updateForm}
          />
          <AdvancedSettingsCard
            form={form}
            availableModels={availableModels}
            isLoadingModels={isLoadingModels}
            modelListError={modelListError}
            onChange={updateForm}
            onLoadModels={loadAvailableModels}
          />

          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}

          <button
            className="primary-button"
            type="submit"
            disabled={!canGenerate}
          >
            {isLoading ? (
              <Loader2 className="spin" aria-hidden="true" size={18} />
            ) : (
              <Sparkles aria-hidden="true" size={18} />
            )}
            {isLoading
              ? generationProgress || "Generating..."
              : "Generate Implementation Pack"}
          </button>
        </form>

        <div className="output-column">
          <ScreenshotUploadCard
            screenshots={screenshots}
            warnings={filenameWarnings}
            onChange={updateScreenshots}
          />
          <OutputPanel
            response={response}
            projectName={packProjectName || form.projectName}
            screenshots={packScreenshots}
            isLoading={isLoading}
            onRegenerate={() => submit()}
            aiEndpointUrl={form.aiEndpointUrl}
            modelName={form.modelName}
            onPackUpdated={handlePackUpdated}
            allowedFilenames={allowedFilenames}
            parsedFilenames={parsedFilenames}
          />
        </div>
      </main>
    </div>
  );
}
