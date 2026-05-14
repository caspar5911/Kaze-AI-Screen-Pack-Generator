import { CheckCircle2, ImagePlus, Trash2, TriangleAlert } from "lucide-react";
import { DragEvent, useState } from "react";
import { FilenameWarnings } from "./FilenameWarnings";
import { FileMapPreview } from "./FileMapPreview";
import { parseScreenshotFilename } from "../utils/filenameParser";

const supportedImageTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp"
]);

const supportedExtensions = [".png", ".jpg", ".jpeg", ".webp"];

interface ScreenshotUploadCardProps {
  screenshots: File[];
  warnings: string[];
  onChange: (files: File[]) => void;
}

export function ScreenshotUploadCard({
  screenshots,
  warnings,
  onChange
}: ScreenshotUploadCardProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) {
      return;
    }

    onChange(toSupportedFiles(fileList));
  }

  function removeFile(filename: string) {
    onChange(screenshots.filter((file) => file.name !== filename));
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDraggingOver(true);
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDraggingOver(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDraggingOver(false);
    handleFiles(event.dataTransfer.files);
  }

  return (
    <section className="card" aria-labelledby="screenshots-heading">
      <h2 id="screenshots-heading">Screenshots</h2>

      <label
        className={
          isDraggingOver ? "upload-target upload-target--dragging" : "upload-target"
        }
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <ImagePlus aria-hidden="true" size={24} />
        <span>Drop screenshots here or choose files.</span>
        <small>PNG, JPG, JPEG, or WEBP only.</small>
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          multiple
          onChange={(event) => handleFiles(event.target.files)}
        />
      </label>

      {screenshots.length > 0 && (
        <div className="uploaded-files">
          <h3>Uploaded files</h3>
          <div className="uploaded-files__list">
            {screenshots.map((file) => {
              const parsed = parseScreenshotFilename(file.name);

              return (
                <div
                  className={
                    parsed.isValid
                      ? "uploaded-file uploaded-file--valid"
                      : "uploaded-file uploaded-file--warning"
                  }
                  key={`${file.name}-${file.size}`}
                >
                  {parsed.isValid ? (
                    <CheckCircle2 aria-hidden="true" size={17} />
                  ) : (
                    <TriangleAlert aria-hidden="true" size={17} />
                  )}
                  <span>{file.name}</span>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => removeFile(file.name)}
                    aria-label={`Remove ${file.name}`}
                    title={`Remove ${file.name}`}
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <FilenameWarnings warnings={warnings} />
      <FileMapPreview screenshots={screenshots} />
    </section>
  );
}

function toSupportedFiles(fileList: FileList): File[] {
  return Array.from(fileList).filter((file) => {
    if (supportedImageTypes.has(file.type)) {
      return true;
    }

    const lowerName = file.name.toLowerCase();
    return supportedExtensions.some((extension) => lowerName.endsWith(extension));
  });
}
