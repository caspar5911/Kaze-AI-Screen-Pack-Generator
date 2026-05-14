import { Loader2, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { generatePack } from "./api/generatePack";
import { OutputTabs } from "./components/OutputTabs";
import { SettingsPanel } from "./components/SettingsPanel";
import { UploadPanel } from "./components/UploadPanel";
import type { GeneratePackResponse, PackFormState } from "./types";
import { getFilenameWarnings } from "./utils/filenameParser";

const endpointStorageKey = "kaze-screen-pack-generator.aiEndpointUrl";
const modelStorageKey = "kaze-screen-pack-generator.modelName";

const defaultForm: PackFormState = {
  projectName: "",
  shortDescription: "",
  designSource: "Screenshot export from Figma/Sketch",
  iconSystem: "Font Awesome",
  additionalNotes: "",
  aiEndpointUrl: "http://localhost:11434/api/chat",
  modelName: "qwen3.5-vl"
};

export default function App() {
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
    window.localStorage.setItem(endpointStorageKey, form.aiEndpointUrl);
  }, [form.aiEndpointUrl]);

  useEffect(() => {
    window.localStorage.setItem(modelStorageKey, form.modelName);
  }, [form.modelName]);

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

    try {
      const payload = await generatePack(form, screenshots);
      setResponse(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Internal Kaze Tool</p>
          <h1>Kaze Screen Pack Generator</h1>
        </div>
      </header>

      <main className="workspace">
        <form className="input-column" onSubmit={submit}>
          <SettingsPanel form={form} onChange={updateForm} />
          <UploadPanel
            screenshots={screenshots}
            warnings={filenameWarnings}
            onChange={setScreenshots}
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
            Generate Pack
          </button>
        </form>

        <div className="output-column">
          {response ? (
            <OutputTabs
              files={response.files}
              rawResponse={response.rawResponse}
              warnings={response.warnings}
              projectName={form.projectName}
              onRegenerate={() => submit()}
              isLoading={isLoading}
            />
          ) : (
            <section className="empty-output" aria-label="Generated output">
              <h2>Generated files will appear here.</h2>
              <p>
                The pack will be returned as five markdown files with the exact
                filenames required by the implementation workflow.
              </p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
