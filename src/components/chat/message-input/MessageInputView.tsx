import type { RefObject } from "react";
import {
  CornerUpLeft,
  Send,
  Paperclip,
  Smile,
  X,
  Loader2,
  AlertCircle,
  Plus,
} from "lucide-react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import {
  formatFileSize,
  getFileIcon,
  type UploadProgress,
} from "../../../lib/file-upload";
import type { ChatMessage, MentionMatch, MentionOption } from "../chatTypes";

interface MessageInputViewProps {
  channelId?: string;
  currentUserId?: string;
  message: string;
  replyTarget: ChatMessage | null;
  isDragging: boolean;
  isSending: boolean;
  uploadError: string | null;
  attachedFiles: File[];
  uploadProgress: UploadProgress | null;
  showEmojiPicker: boolean;
  emojiTheme: "light" | "dark";
  mentionMatch: MentionMatch | null;
  filteredMentionOptions: MentionOption[];
  activeMentionIndex: number;
  inputRef: RefObject<HTMLTextAreaElement>;
  fileInputRef: RefObject<HTMLInputElement>;
  setMessage: (value: string) => void;
  setShowEmojiPicker: (
    value: boolean | ((current: boolean) => boolean),
  ) => void;
  clearUploadError: () => void;
  removeAttachedFile: (index: number) => void;
  onFileTrigger: () => void;
  onFileInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onMessageChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onTextareaClick: (event: React.MouseEvent<HTMLTextAreaElement>) => void;
  onTextareaKeyUp: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onTextareaSelect: (event: React.SyntheticEvent<HTMLTextAreaElement>) => void;
  onTextareaBlur: () => void;
  onPaste: (event: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancelReply: () => void;
  onApplyMention: (option: MentionOption) => void;
  onEmojiSelect: (emoji: any) => void;
}

export function MessageInputView({
  channelId,
  currentUserId,
  message,
  replyTarget,
  isDragging,
  isSending,
  uploadError,
  attachedFiles,
  uploadProgress,
  showEmojiPicker,
  emojiTheme,
  mentionMatch,
  filteredMentionOptions,
  activeMentionIndex,
  inputRef,
  fileInputRef,
  setShowEmojiPicker,
  clearUploadError,
  removeAttachedFile,
  onFileTrigger,
  onFileInputChange,
  onMessageChange,
  onKeyDown,
  onTextareaClick,
  onTextareaKeyUp,
  onTextareaSelect,
  onTextareaBlur,
  onPaste,
  onDragOver,
  onDragLeave,
  onDrop,
  onSubmit,
  onCancelReply,
  onApplyMention,
  onEmojiSelect,
}: MessageInputViewProps) {
  const replyTargetName =
    replyTarget?.user_id && currentUserId && replyTarget.user_id === currentUserId
      ? "You"
      : replyTarget?.profiles?.full_name || "Unknown user";

  return (
    <div
      className={`relative bg-white px-4 pb-6 transition-colors dark:bg-slate-900 ${
        isDragging ? "bg-slate-50 dark:bg-slate-800" : ""
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-50 m-2 flex items-center justify-center rounded-xl border-2 border-dashed border-[#3178C6] bg-[#3178C6]/10">
          <div className="text-center">
            <Paperclip size={32} className="mx-auto mb-2 text-[#3178C6]" />
            <p className="text-sm font-bold text-[#3178C6]">
              Upload to channel
            </p>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="mx-auto w-full">
        {replyTarget && (
          <div className="mb-2 flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-3 py-2.5 dark:border-emerald-900/60 dark:bg-emerald-950/35">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-300">
                <CornerUpLeft size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  Replying to {replyTargetName}
                </p>
                <p className="line-clamp-2 text-sm leading-snug text-slate-700 dark:text-slate-200">
                  {replyTarget.content || replyTarget.attachment_name || "Attachment"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              className="rounded-full p-1 text-slate-400 transition-colors hover:bg-white/80 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {uploadError && (
          <div className="mb-2 flex items-center justify-between rounded-md border border-red-100 bg-red-50 p-2 text-xs font-medium text-red-600">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} />
              {uploadError}
            </div>
            <button type="button" onClick={clearUploadError}>
              <X size={14} />
            </button>
          </div>
        )}

        {attachedFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachedFiles.map((file, index) => (
              <div
                key={`${file.name}-${file.size}-${index}`}
                className="group relative inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200 text-xl dark:bg-slate-700">
                  {getFileIcon(file.type)}
                </div>
                <div className="pr-8">
                  <p className="max-w-[150px] truncate text-[11px] font-bold text-slate-800 dark:text-slate-100">
                    {file.name}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachedFile(index)}
                  className="absolute -right-1.5 -top-1.5 rounded-full border border-slate-200 bg-white p-0.5 text-slate-400 shadow-sm hover:text-red-500 dark:border-slate-700 dark:bg-slate-900"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative flex items-end rounded-lg bg-slate-100/80 px-2 py-1 transition-colors hover:bg-slate-100 dark:border dark:border-slate-700 dark:bg-slate-800/90 dark:hover:bg-slate-800">
          <button
            type="button"
            onClick={onFileTrigger}
            disabled={isSending || !!uploadProgress}
            className="mb-1 shrink-0 p-2 text-slate-500 transition-colors hover:text-slate-800"
          >
            {uploadProgress ? (
              <Loader2 size={20} className="animate-spin text-[#3178C6]" />
            ) : (
              <div className="rounded-full bg-slate-300 p-0.5 dark:bg-slate-600 dark:group-hover:bg-slate-500">
                <Plus size={16} className="text-white" />
              </div>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={onFileInputChange}
            className="hidden"
          />

          <textarea
            ref={inputRef}
            value={message}
            onChange={onMessageChange}
            onKeyDown={onKeyDown}
            onClick={onTextareaClick}
            onKeyUp={onTextareaKeyUp}
            onSelect={onTextareaSelect}
            onBlur={onTextareaBlur}
            onPaste={onPaste}
            placeholder={`${channelId ? "Message #channel" : "Enter Message"}`}
            className="min-h-[44px] max-h-[400px] w-full resize-none bg-transparent px-2 py-2.5 text-[15px] text-slate-700 outline-none placeholder:text-sm placeholder:text-slate-500 dark:text-slate-100 overflow-ellipsis dark:placeholder-slate-400"
            rows={1}
            disabled={isSending || !!uploadProgress}
          />

          {mentionMatch && filteredMentionOptions.length > 0 && (
            <div className="absolute bottom-full left-12 right-14 z-40 mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="max-h-56 overflow-y-auto py-1">
                {filteredMentionOptions.map((option, index) => (
                  <button
                    key={option.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onApplyMention(option);
                    }}
                    className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors ${
                      index === activeMentionIndex
                        ? "bg-primary-50 text-primary-700"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    @{option.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-1 flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((current) => !current)}
              className="p-2 text-slate-500 transition-colors hover:text-amber-500"
            >
              <Smile size={22} strokeWidth={1.5} />
            </button>

            <button
              type="submit"
              disabled={
                isSending ||
                (!message.trim() && attachedFiles.length === 0) ||
                !!uploadProgress
              }
              className="scale-100 p-2 text-[#3178C6] transition-all disabled:scale-90 disabled:text-slate-400 disabled:opacity-50"
            >
              <Send size={22} strokeWidth={1.5} />
            </button>
          </div>

          {showEmojiPicker && (
            <div className="absolute bottom-full right-0 z-50 mb-4">
              <div
                className="fixed inset-0"
                onClick={() => setShowEmojiPicker(false)}
              />
              <div className="relative overflow-hidden rounded-xl border border-slate-200 shadow-2xl dark:border-slate-700">
                <Picker
                  data={data}
                  onEmojiSelect={onEmojiSelect}
                  theme={emojiTheme}
                  previewPosition="none"
                  skinTonePosition="none"
                />
              </div>
            </div>
          )}
        </div>

        {uploadProgress && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#3178C6]">
              {uploadProgress.percentage}%
            </span>
            <div className="h-1 w-24 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-[#3178C6] transition-all"
                style={{ width: `${uploadProgress.percentage}%` }}
              />
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
