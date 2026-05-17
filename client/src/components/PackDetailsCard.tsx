import type {
  AiAssistLoadingState,
  AiAssistTargetField,
  PackFormState,
} from "../types";

interface PackDetailsCardProps {
  form: PackFormState;
  aiAssistLoading: AiAssistLoadingState;
  aiAssistError: string;
  isAiAssistDisabled: boolean;
  onAiAssist: (targetField: AiAssistTargetField) => void;
  onChange: (field: keyof PackFormState, value: string | boolean) => void;
}

export function PackDetailsCard({
  form,
  aiAssistLoading,
  aiAssistError,
  isAiAssistDisabled,
  onAiAssist,
  onChange,
}: PackDetailsCardProps) {
  return (
    <section className="card" aria-labelledby="pack-details-heading">
      <div className="card-heading-row">
        <div>
          <h2 id="pack-details-heading">Pack Details</h2>
          <p className="section-hint">
            Manual edits stay in control. AI assist only runs when clicked.
          </p>
        </div>
        <button
          className="ai-assist-button"
          type="button"
          disabled={isAiAssistDisabled}
          onClick={() => onAiAssist("all")}
        >
          {aiAssistLoading === "all"
            ? "Auto-filling..."
            : "Auto-fill from screenshots"}
        </button>
      </div>

      {aiAssistError && (
        <div className="ai-assist-error" role="alert">
          {aiAssistError}
        </div>
      )}

      <div className="field">
        <div className="field-header">
          <label htmlFor="project-name">Project / Feature Screen</label>
          <button
            className="ai-assist-button"
            type="button"
            disabled={isAiAssistDisabled}
            onClick={() => onAiAssist("screenName")}
          >
            {aiAssistLoading === "screenName" ? "Auto-filling..." : "Auto-fill"}
          </button>
        </div>
        <input
          id="project-name"
          value={form.projectName}
          onChange={(event) => onChange("projectName", event.target.value)}
          placeholder="AI Assistant Home Screen"
          required
        />
      </div>

      <div className="field">
        <div className="field-header">
          <label htmlFor="short-description">Short Description</label>
          <button
            className="ai-assist-button"
            type="button"
            disabled={isAiAssistDisabled}
            onClick={() => onAiAssist("shortDescription")}
          >
            {aiAssistLoading === "shortDescription" ? "Improving..." : "Improve"}
          </button>
        </div>
        <textarea
          id="short-description"
          value={form.shortDescription}
          onChange={(event) => onChange("shortDescription", event.target.value)}
          placeholder="Default landing screen where users can type a prompt, add attachments, select thinking mode, use voice input, and choose quick actions."
          rows={5}
          required
        />
        <small>
          Keep this short. The generator will infer layout and actions from the
          screenshots.
        </small>
      </div>

      <div className="field-grid">
        <label className="field">
          <span>Design Source</span>
          <select
            value={form.designSource}
            onChange={(event) => onChange("designSource", event.target.value)}
          >
            <option>Screenshot export</option>
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

      <div className="field">
        <div className="field-header">
          <label htmlFor="additional-notes">Additional Notes</label>
          <button
            className="ai-assist-button"
            type="button"
            disabled={isAiAssistDisabled}
            onClick={() => onAiAssist("additionalNotes")}
          >
            {aiAssistLoading === "additionalNotes" ? "Improving..." : "Improve"}
          </button>
        </div>
        <textarea
          id="additional-notes"
          value={form.additionalNotes}
          onChange={(event) => onChange("additionalNotes", event.target.value)}
          placeholder="Use standard Kaze states unless custom states are shown."
          rows={3}
        />
      </div>
    </section>
  );
}
