import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PackFormState } from "../types";

interface AdvancedSettingsCardProps {
  form: PackFormState;
  availableModels: string[];
  isLoadingModels: boolean;
  modelListError: string;
  onChange: (field: keyof PackFormState, value: string) => void;
  onLoadModels: () => void;
}

export function AdvancedSettingsCard({
  form,
  availableModels,
  isLoadingModels,
  modelListError,
  onChange,
  onLoadModels
}: AdvancedSettingsCardProps) {
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
    <details className="card advanced-settings">
      <summary>
        <div>
          <h2>Advanced AI Settings</h2>
          <p>{getSettingsSummary(form.aiEndpointUrl, form.modelName)}</p>
        </div>
        <ChevronDown aria-hidden="true" size={18} />
      </summary>

      <div className="advanced-settings__body">
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
              placeholder="qwen3.6:35b"
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
    </details>
  );
}

function getSettingsSummary(endpointUrl: string, modelName: string): string {
  const model = modelName.trim() || "model not set";

  try {
    const endpoint = new URL(endpointUrl);
    return `Using ${model} at ${endpoint.hostname} endpoint`;
  } catch {
    return `Using ${model} at configured endpoint`;
  }
}
