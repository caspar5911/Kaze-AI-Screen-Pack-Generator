import type { PackFormState } from "../types";

interface SettingsPanelProps {
  form: PackFormState;
  onChange: (field: keyof PackFormState, value: string) => void;
}

export function SettingsPanel({ form, onChange }: SettingsPanelProps) {
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

        <label className="field">
          <span>Model Name</span>
          <input
            value={form.modelName}
            onChange={(event) => onChange("modelName", event.target.value)}
            placeholder="qwen3.5-vl"
            required
          />
        </label>
      </div>
    </section>
  );
}
