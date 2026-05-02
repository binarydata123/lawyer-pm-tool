import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspaces } from "../../contexts/WorkspaceContext";
import { type UploadProgress } from "../../lib/file-upload";
import type {
  MentionOption,
  MentionMatch,
  MessageInputProps,
} from "./chatTypes";
import { MessageInputView } from "./message-input/MessageInputView";
import {
  addFilesToComposer,
  handlePasteEvent,
} from "./message-input/attachments";
import { sendMessage } from "./message-input/sendMessage";
import { useTypingIndicator } from "./message-input/useTypingIndicator";
import {
  filterMentionOptions,
  getMentionMatch,
  loadMentionOptions,
} from "./message-input/utils";

export function MessageInput({
  channelId,
  dmId,
  focusToken,
  replyTarget,
  onCancelReply,
  broadcastId,
  onMessageSent,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiTheme, setEmojiTheme] = useState<"light" | "dark">("light");
  const [mentionOptions, setMentionOptions] = useState<MentionOption[]>([]);
  const [mentionMatch, setMentionMatch] = useState<MentionMatch | null>(null);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSendingRef = useRef(false);
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspaces();
  const { clearTypingIndicator, handleTyping } = useTypingIndicator({
    userId: user?.id,
    channelId,
    broadcastId,
    dmId,
    workspaceId: activeWorkspaceId,
  });

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      const textarea = inputRef.current;
      if (!textarea || textarea.disabled) return;

      textarea.focus();
    });
  }, []);

  const shouldRestoreComposerFocus = useCallback(() => {
    if (typeof document === "undefined") return false;

    const activeElement = document.activeElement;
    if (!activeElement || activeElement === document.body) return true;
    if (activeElement === inputRef.current) return false;

    if (activeElement instanceof HTMLElement) {
      const tagName = activeElement.tagName;
      const isEditableElement =
        activeElement.isContentEditable ||
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT";

      if (isEditableElement || activeElement.closest('[role="dialog"]')) {
        return false;
      }
    }

    return true;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = window.document.documentElement;
    const syncEmojiTheme = () => {
      setEmojiTheme(root.classList.contains("dark") ? "dark" : "light");
    };

    syncEmojiTheme();

    const observer = new MutationObserver(syncEmojiTheme);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    void loadMentionOptions({
      userId: user?.id,
      channelId,
      broadcastId,
      dmId,
    }).then(setMentionOptions);
  }, [channelId, dmId, broadcastId, user?.id]);

  useEffect(() => {
    focusInput();
  }, [focusInput, channelId, dmId, broadcastId, user?.id]);

  useEffect(() => {
    if (!focusToken) return;

    focusInput();
  }, [focusInput, focusToken]);

  useEffect(() => {
    if (!replyTarget) return;

    focusInput();
  }, [focusInput, replyTarget]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      addFilesToComposer({
        files,
        attachedFiles,
        setAttachedFiles,
        setUploadError,
      });
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }

    e.target.value = "";
  };
  const handlePaste = async (e: React.ClipboardEvent) => {
    await handlePasteEvent(
      e,
      (files) =>
        addFilesToComposer({
          files,
          attachedFiles,
          setAttachedFiles,
          setUploadError,
        }),
      () =>
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        }),
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length > 0) {
      addFilesToComposer({
        files,
        attachedFiles,
        setAttachedFiles,
        setUploadError,
      });
    }
  };

  const updateMentionState = (
    value: string,
    cursorPosition: number = value.length,
  ) => {
    const nextMatch = getMentionMatch(value, cursorPosition);
    setMentionMatch(nextMatch);
    setActiveMentionIndex(0);
  };

  const filteredMentionOptions = filterMentionOptions(
    mentionOptions,
    mentionMatch,
  );

  const applyMention = (option: MentionOption) => {
    const textarea = inputRef.current;
    const activeMatch = mentionMatch;

    if (!textarea || !activeMatch) return;

    const mentionText = `@[${option.name}] `;
    const nextMessage =
      message.slice(0, activeMatch.start) +
      mentionText +
      message.slice(activeMatch.end);

    setMessage(nextMessage);
    setMentionMatch(null);
    setActiveMentionIndex(0);

    requestAnimationFrame(() => {
      textarea.focus();
      const nextCursor = activeMatch.start + mentionText.length;
      textarea.setSelectionRange(nextCursor, nextCursor);
      adjustTextareaHeight();
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      isSendingRef.current ||
      (!message.trim() && attachedFiles.length === 0) ||
      !user
    ) {
      return;
    }

    isSendingRef.current = true;
    setIsSending(true);
    setUploadError(null);
    try {
      await sendMessage({
        message,
        attachedFiles,
        userId: user.id,
        channelId,
        broadcastId,
        dmId,
        replyToMessageId: replyTarget?.id ?? null,
        workspaceId: activeWorkspaceId,
        setUploadProgress,
      });

      await clearTypingIndicator();

      setMessage("");
      setMentionMatch(null);
      setActiveMentionIndex(0);
      setAttachedFiles([]);
      setUploadProgress(null);
      onCancelReply?.();

      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      onMessageSent?.();
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Failed to send message",
      );
      setUploadProgress(null);
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
      focusInput();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.shiftKey) {
      return;
    }

    if (mentionMatch && filteredMentionOptions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveMentionIndex(
          (current) => (current + 1) % filteredMentionOptions.length,
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveMentionIndex((current) =>
          current === 0 ? filteredMentionOptions.length - 1 : current - 1,
        );
        return;
      }

      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        applyMention(filteredMentionOptions[activeMentionIndex]);
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setMentionMatch(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + "px";
    }
  };

  const insertEmoji = (emoji: any) => {
    const emojiChar = emoji.native;
    const textarea = inputRef.current;

    if (!textarea) {
      setMessage((current) => `${current}${emojiChar}`);
      setShowEmojiPicker(false);
      return;
    }

    const selectionStart = textarea.selectionStart ?? message.length;
    const selectionEnd = textarea.selectionEnd ?? message.length;

    const nextMessage =
      message.slice(0, selectionStart) +
      emojiChar +
      message.slice(selectionEnd);

    setMessage(nextMessage);
    setShowEmojiPicker(false);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursorPosition = selectionStart + emojiChar.length;
      textarea.setSelectionRange(cursorPosition, cursorPosition);
      adjustTextareaHeight();
    });
  };

  return (
    <MessageInputView
      channelId={channelId}
      currentUserId={user?.id}
      message={message}
      replyTarget={replyTarget ?? null}
      isDragging={isDragging}
      isSending={isSending}
      uploadError={uploadError}
      attachedFiles={attachedFiles}
      uploadProgress={uploadProgress}
      showEmojiPicker={showEmojiPicker}
      emojiTheme={emojiTheme}
      mentionMatch={mentionMatch}
      filteredMentionOptions={filteredMentionOptions}
      activeMentionIndex={activeMentionIndex}
      inputRef={inputRef}
      fileInputRef={fileInputRef}
      setMessage={setMessage}
      setShowEmojiPicker={setShowEmojiPicker}
      clearUploadError={() => setUploadError(null)}
      removeAttachedFile={(index) =>
        setAttachedFiles((current) =>
          current.filter((_, currentIndex) => currentIndex !== index),
        )
      }
      onFileTrigger={() => fileInputRef.current?.click()}
      onFileInputChange={handleFileInputChange}
      onMessageChange={(e) => {
        setMessage(e.target.value);
        updateMentionState(
          e.target.value,
          e.target.selectionStart ?? e.target.value.length,
        );
        adjustTextareaHeight();
        if (e.target.value.trim()) void handleTyping();
      }}
      onKeyDown={handleKeyDown}
      onTextareaClick={(e) =>
        updateMentionState(
          message,
          e.currentTarget.selectionStart ?? message.length,
        )
      }
      onTextareaKeyUp={(e) => {
        if (
          mentionMatch &&
          ["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(e.key)
        ) {
          return;
        }
        updateMentionState(
          message,
          e.currentTarget.selectionStart ?? message.length,
        );
      }}
      onTextareaSelect={(e) =>
        updateMentionState(
          message,
          e.currentTarget.selectionStart ?? message.length,
        )
      }
      onTextareaBlur={() => {
        requestAnimationFrame(() => {
          if (shouldRestoreComposerFocus()) {
            focusInput();
          }
        });
      }}
      onPaste={handlePaste}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onSubmit={handleSubmit}
      onCancelReply={onCancelReply ?? (() => undefined)}
      onApplyMention={applyMention}
      onEmojiSelect={insertEmoji}
    />
  );
}
