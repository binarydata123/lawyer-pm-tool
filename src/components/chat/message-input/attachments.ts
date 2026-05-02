import {
  createTextFile,
  pasteImageFromClipboard,
  shouldConvertToFile,
  validateFile,
} from "../../../lib/file-upload";
import { MAX_ATTACHMENTS } from "./utils";

interface AddFilesToComposerOptions {
  files: File[];
  attachedFiles: File[];
  setAttachedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  setUploadError: React.Dispatch<React.SetStateAction<string | null>>;
}

export function addFilesToComposer({
  files,
  attachedFiles,
  setAttachedFiles,
  setUploadError,
}: AddFilesToComposerOptions) {
  if (!files.length) return;

  if (files.length > MAX_ATTACHMENTS) {
    setUploadError(`You can attach up to ${MAX_ATTACHMENTS} files at a time.`);
    return;
  }

  if (attachedFiles.length + files.length > MAX_ATTACHMENTS) {
    setUploadError(`You can attach up to ${MAX_ATTACHMENTS} files in total.`);
    return;
  }

  for (const file of files) {
    const validation = validateFile(file);
    if (validation) {
      setUploadError(validation.message);
      return;
    }
  }

  setAttachedFiles((current) => [...current, ...files]);
  setUploadError(null);
}

export async function handlePasteEvent(
  event: React.ClipboardEvent,
  onFiles: (files: File[]) => void,
  focusInput: () => void,
) {
  const imageFile = await pasteImageFromClipboard(event.nativeEvent);

  if (imageFile) {
    event.preventDefault();
    onFiles([imageFile]);
    return;
  }

  const pastedText = event.clipboardData.getData("text");

  if (!pastedText?.trim()) return;

  if (shouldConvertToFile(pastedText)) {
    event.preventDefault();

    const textFile = createTextFile(
      pastedText,
      `code-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`,
    );

    onFiles([textFile]);
    focusInput();
  }
}
