import { ImagePlus, Trash2 } from "lucide-react";
import { FileWarnings } from "./FileWarnings";

interface UploadPanelProps {
  screenshots: File[];
  warnings: string[];
  onChange: (files: File[]) => void;
}

export function UploadPanel({
  screenshots,
  warnings,
  onChange
}: UploadPanelProps) {
  function handleFiles(fileList: FileList | null) {
    if (!fileList) {
      return;
    }

    onChange(Array.from(fileList));
  }

  function removeFile(filename: string) {
    onChange(screenshots.filter((file) => file.name !== filename));
  }

  return (
    <section className="panel" aria-labelledby="screenshots-heading">
      <div className="section-heading">
        <h2 id="screenshots-heading">Screenshots</h2>
      </div>

      <label className="upload-target">
        <ImagePlus aria-hidden="true" size={24} />
        <span>Upload screenshot PNG, JPG, JPEG, or WEBP files</span>
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          multiple
          onChange={(event) => handleFiles(event.target.files)}
        />
      </label>

      {screenshots.length > 0 && (
        <div className="file-list" aria-label="Uploaded files">
          {screenshots.map((file, index) => (
            <div className="file-row" key={`${file.name}-${file.size}`}>
              <span className="file-row__index">{index + 1}</span>
              <span className="file-row__name">{file.name}</span>
              <button
                className="icon-button"
                type="button"
                onClick={() => removeFile(file.name)}
                aria-label={`Remove ${file.name}`}
                title={`Remove ${file.name}`}
              >
                <Trash2 aria-hidden="true" size={17} />
              </button>
            </div>
          ))}
        </div>
      )}

      {screenshots.length > 0 && <FileWarnings warnings={warnings} />}
    </section>
  );
}
