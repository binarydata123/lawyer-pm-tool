import {
  createTextFile,
  shouldConvertToFile,
  uploadFile,
  type UploadProgress,
} from "../../../lib/file-upload";
import { saveMentions } from "../../../lib/mentions";
import { supabase } from "../../../lib/supabase";

const CHANNEL_MESSAGE_SELECT =
  "id, content, created_at, updated_at, is_edited, user_id, attachment_url, attachment_name, attachment_size, attachment_type, parent_id, thread_id, reply_count, is_pinned, channel_id, workspace_id, profiles:profiles!messages_user_id_fkey(full_name, avatar_url)";

const DM_MESSAGE_SELECT =
  "id, content, created_at, updated_at, is_edited, user_id, attachment_url, attachment_name, attachment_size, attachment_type, parent_id, thread_id, reply_count, is_pinned, dm_id, workspace_id, profiles:profiles!direct_message_messages_user_id_fkey(full_name, avatar_url)";

const BROADCAST_MESSAGE_SELECT =
  "id, content, created_at, updated_at, is_edited, user_id, attachment_url, attachment_name, attachment_size, attachment_type, thread_id, reply_count, is_pinned, broadcast_id, workspace_id, profiles:profiles!broadcast_messages_user_id_fkey(full_name, avatar_url)";

interface SendMessageOptions {
  message: string;
  attachedFiles: File[];
  userId: string;
  channelId?: string;
  broadcastId?: string;
  dmId?: string;
  replyToMessageId?: string | null;
  workspaceId?: string | null;
  setUploadProgress: React.Dispatch<
    React.SetStateAction<UploadProgress | null>
  >;
}

export async function sendMessage({
  message,
  attachedFiles,
  userId,
  channelId,
  broadcastId,
  dmId,
  replyToMessageId,
  workspaceId,
  setUploadProgress,
}: SendMessageOptions) {
  const textContent = message.trim();
  const filesToUpload = [...attachedFiles];
  const shouldCreateCodeFile =
    shouldConvertToFile(textContent) && attachedFiles.length === 0;

  if (shouldCreateCodeFile) {
    const textFile = createTextFile(
      textContent,
      `code-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`,
    );
    filesToUpload.push(textFile);
  }

  if (filesToUpload.length > 0) {
    for (let index = 0; index < filesToUpload.length; index += 1) {
      const fileToUpload = filesToUpload[index];
      setUploadProgress({
        loaded: 0,
        total: fileToUpload.size,
        percentage: 0,
      });

      const uploadResult = await uploadFile(
        fileToUpload,
        "messages",
        (progress) => {
          setUploadProgress(progress);
        },
      );

      const messageData: any = {
        user_id: userId,
        content:
          index === 0
            ? shouldCreateCodeFile
              ? "Code snippet attached"
              : textContent || ""
            : "",
        attachment_url: uploadResult.url,
        attachment_name: uploadResult.name,
        attachment_size: uploadResult.size,
        attachment_type: uploadResult.type,
      };

      if (replyToMessageId) {
        messageData.parent_id = replyToMessageId;
      }

      const createdMessage = await createMessageRecord({
        channelId,
        broadcastId,
        dmId,
        workspaceId,
        messageData,
      });

      if (createdMessage?.id) {
        await saveMentions(
          createdMessage.id,
          messageData.content,
          channelId || broadcastId,
        );
      }

      window.dispatchEvent(
        new CustomEvent("message-created", {
          detail: createdMessage,
        }),
      );
    }

    return;
  }

  const messageData: any = {
    user_id: userId,
    content: textContent || "Sent a message",
  };

  if (replyToMessageId) {
    messageData.parent_id = replyToMessageId;
  }

  const createdMessage = await createMessageRecord({
    channelId,
    broadcastId,
    dmId,
    workspaceId,
    messageData,
  });

  if (createdMessage?.id) {
    await saveMentions(
      createdMessage.id,
      messageData.content,
      channelId || broadcastId,
    );
  }

  window.dispatchEvent(
    new CustomEvent("message-created", {
      detail: createdMessage,
    }),
  );
}

async function createMessageRecord({
  channelId,
  dmId,
  broadcastId,
  workspaceId,
  messageData,
}: {
  channelId?: string;
  dmId?: string;
  broadcastId?: string;
  workspaceId?: string | null;
  messageData: any;
}): Promise<any> {
  if (workspaceId) {
    messageData.workspace_id = workspaceId;
  }

  if (channelId) {
    messageData.channel_id = channelId;
    const { data, error } = await supabase
      .from("messages")
      .insert(messageData)
      .select(CHANNEL_MESSAGE_SELECT)
      .single();
    if (error) throw error;
    return data;
  }

  if (broadcastId) {
    messageData.broadcast_id = broadcastId;
    const { data, error } = await supabase
      .from("broadcast_messages")
      .insert(messageData)
      .select(BROADCAST_MESSAGE_SELECT)
      .single();
    if (error) throw error;
    return data;
  }

  if (dmId) {
    messageData.dm_id = dmId;
    const { data, error } = await supabase
      .from("direct_message_messages")
      .insert(messageData)
      .select(DM_MESSAGE_SELECT)
      .single();
    if (error) throw error;
    return data;
  }

  return null;
}
