import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PackFormState } from "../types";

interface SettingsPanelProps {
  form: PackFormState;
  availableModels: string[];
  isLoadingModels: boolean;
  modelListError: string;
  onChange: (field: keyof PackFormState, value: string) => void;
  onLoadModels: () => void;
}

export function SettingsPanel({
  form,
  availableModels,
  isLoadingModels,
  modelListError,
  onChange,
  onLoadModels
}: SettingsPanelProps) {
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const modelComboboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!modelComboboxRef.current?.contains(event.target as Node)) {
        setIsModelMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", closeOnOutsideClick);

    return () => {
      window.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, []);

  function openModelMenu() {
    setIsModelMenuOpen(true);
    onLoadModels();
  }

  function selectModel(modelName: string) {
    onChange("modelName", modelName);
    setIsModelMenuOpen(false);
  }

  return (
    <section className="panel" aria-labelledby="settings-heading">
      <div className="section-heading">
        <h2 id="settings-heading">Pack Settings</h2>
      </div>

      <label className="field">
        <span>Project / Feature Name</span>
        <input
          value={form.projectName}
          onChange={(event) => onChange("projectName", event.target.value)}
          placeholder="AI Assistant Home Screen"
          required
        />
      </label>

      <label className="field">
        <span>Short Description</span>
        <textarea
          value={form.shortDescription}
          onChange={(event) => onChange("shortDescription", event.target.value)}
          placeholder="Default landing screen where users can type a prompt, add attachments, select thinking mode, use voice input, and choose quick actions."
          rows={5}
          required
        />
      </label>

      <div className="field-grid">
        <label className="field">
          <span>Design Source</span>
          <select
            value={form.designSource}
            onChange={(event) => onChange("designSource", event.target.value)}
          >
            <option>Screenshot export from Figma/Sketch</option>
            <option>Figma</option>
            <option>Sketch</option>
            <option>Unknown</option>
          </select>
        </label>

        <label className="field">
          <span>Icon System</span>
          <select
            value={form.iconSystem}
            onChange={(event) => onChange("iconSystem", event.target.value)}
          >
            <option>Font Awesome</option>
            <option>Custom assets</option>
            <option>Unknown</option>
          </select>
        </label>
      </div>

      <label className="field">
        <span>Additional Notes</span>
        <textarea
          value={form.additionalNotes}
          onChange={(event) => onChange("additionalNotes", event.target.value)}
          placeholder="Use standard Kaze states unless custom states are shown."
          rows={4}
        />
      </label>

      <div className="field-grid">
        <label className="field">
          <span>AI Endpoint URL</span>
          <input
            value={form.aiEndpointUrl}
            onChange={(event) => onChange("aiEndpointUrl", event.target.value)}
            placeholder="http://localhost:11434/api/chat"
            required
          />
        </label>

        <div className="field">
          <label htmlFor="model-name">Model Name</label>
          <div className="model-combobox" ref={modelComboboxRef}>
            <input
              id="model-name"
              value={form.modelName}
              onChange={(event) => onChange("modelName", event.target.value)}
              onFocus={openModelMenu}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setIsModelMenuOpen(false);
                }

                if (event.key === "ArrowDown") {
                  openModelMenu();
                }
              }}
              aria-autocomplete="none"
              aria-expanded={isModelMenuOpen}
              aria-controls="model-name-options"
              aria-haspopup="listbox"
              placeholder="qwen3.5-vl"
              required
            />
            <button
              className="model-combobox__button"
              type="button"
              onClick={openModelMenu}
              aria-label="Show model options"
              title="Show model options"
            >
              <ChevronDown aria-hidden="true" size={17} />
            </button>

            {isModelMenuOpen && (
              <div
                className="model-combobox__menu"
                id="model-name-options"
                role="listbox"
              >
                {isLoadingModels ? (
                  <div className="model-combobox__empty">Loading models...</div>
                ) : modelListError ? (
                  <div className="model-combobox__empty model-combobox__empty--error">
                    {modelListError}
                  </div>
                ) : availableModels.length > 0 ? (
                  availableModels.map((model) => (
                    <button
                      className="model-combobox__option"
                      type="button"
                      key={model}
                      role="option"
                      aria-selected={form.modelName === model}
                      onClick={() => selectModel(model)}
                    >
                      {model}
                    </button>
                  ))
                ) : (
                  <div className="model-combobox__empty">
                    No models loaded from this endpoint.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
