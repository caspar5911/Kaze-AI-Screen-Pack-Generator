import type { PackFormState } from "../types";

interface PackDetailsCardProps {
  form: PackFormState;
  onChange: (field: keyof PackFormState, value: string) => void;
}

export function PackDetailsCard({ form, onChange }: PackDetailsCardProps) {
  return (
    <section className="card" aria-labelledby="pack-details-heading">
      <h2 id="pack-details-heading">Pack Details</h2>

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
        <small>Keep this short. The AI will infer layout and actions from the screenshots.</small>
      </label>

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

      <label className="field">
        <span>Additional Notes</span>
        <textarea
          value={form.additionalNotes}
          onChange={(event) => onChange("additionalNotes", event.target.value)}
          placeholder="Use standard Kaze states unless custom states are shown."
          rows={3}
        />
      </label>
    </section>
  );
}
