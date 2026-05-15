import { Loader2, Moon, Sparkles, Sun } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { generatePack } from "./api/generatePack";
import { listModels } from "./api/listModels";
import { AdvancedSettingsCard } from "./components/AdvancedSettingsCard";
import { OutputPanel } from "./components/OutputPanel";
import { PackDetailsCard } from "./components/PackDetailsCard";
import { ScreenshotUploadCard } from "./components/ScreenshotUploadCard";
import type { GeneratePackResponse, PackFormState } from "./types";
import { getFilenameWarnings } from "./utils/filenameParser";

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
  modelName: "qwen3.6:35b"
};

export default function App() {
  const [theme, setTheme] = useState<Theme>(() =>
    window.localStorage.getItem(themeStorageKey) === "light" ? "light" : "dark"
  );
  const [form, setForm] = useState<PackFormState>(() => ({
    ...defaultForm,
    aiEndpointUrl:
      window.localStorage.getItem(endpointStorageKey) ??
      defaultForm.aiEndpointUrl,
    modelName:
      window.localStorage.getItem(modelStorageKey) ?? defaultForm.modelName
  }));
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [response, setResponse] = useState<GeneratePackResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelListError, setModelListError] = useState("");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [generationProgress, setGenerationProgress] = useState("");
  const generationProgressTimers = useRef<number[]>([]);

  const filenameWarnings = useMemo(
    () => getFilenameWarnings(screenshots),
    [screenshots]
  );
  const canGenerate =
    form.projectName.trim().length > 0 &&
    form.shortDescription.trim().length > 0 &&
    form.aiEndpointUrl.trim().length > 0 &&
    form.modelName.trim().length > 0 &&
    screenshots.length > 0 &&
    !isLoading;

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

  function updateForm(field: keyof PackFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
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
      { delay: 1200, label: "Stage 2/3: Generating handoff and mapping..." },
      { delay: 2400, label: "Stage 3/3: Generating Cline prompt and QA checklist..." },
      { delay: 3600, label: "Validating generated pack..." }
    ];

    generationProgressTimers.current = progressSteps.map((step) =>
      window.setTimeout(() => setGenerationProgress(step.label), step.delay)
    );
  }

  function clearGenerationProgress(resetLabel: boolean) {
    generationProgressTimers.current.forEach((timer) => window.clearTimeout(timer));
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
        caught instanceof Error ? caught.message : "Could not load models."
      );
    } finally {
      setIsLoadingModels(false);
    }
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
              currentTheme === "dark" ? "light" : "dark"
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
          <PackDetailsCard form={form} onChange={updateForm} />
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

          <button className="primary-button" type="submit" disabled={!canGenerate}>
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
            onChange={setScreenshots}
          />
          <OutputPanel
            response={response}
            projectName={form.projectName}
            isLoading={isLoading}
            onRegenerate={() => submit()}
          />
        </div>
      </main>
    </div>
  );
}
