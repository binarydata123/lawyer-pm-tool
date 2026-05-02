import {
  useEffect,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { Check, Copy } from "lucide-react";
import { supabase } from "./supabase";

export interface Mention {
  type: "user" | "channel" | "everyone";
  userId?: string;
  displayName: string;
}

const mentionRegex = /@\[([^\]]+)\]|@(\w+)/g;

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function CopyCodeButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timeout = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async (event) => {
        event.stopPropagation();

        try {
          await copyTextToClipboard(text);
          setCopied(true);
        } catch (error) {
          console.error("Failed to copy code snippet", error);
        }
      }}
      className="inline-flex whitespace-nowrap items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
      aria-label="Copy code snippet"
      title="Copy code snippet"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function extractFencedCodeLine(line: string) {
  const match = line.match(/^```(\w+)?\s*([\s\S]*?)\s*```$/);
  if (!match) return null;

  return {
    language: match[1] || "",
    code: match[2] ?? "",
  };
}

function renderCodeBlock({
  code,
  keyPrefix,
  language,
}: {
  code: string;
  keyPrefix: string;
  language?: string;
}) {
  return (
    <div
      key={`${keyPrefix}-block`}
      className="group relative my-1 min-w-0 max-w-full overflow-visible"
    >
      <div className="absolute -top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
        <CopyCodeButton text={code} />
      </div>
      <div className="min-w-0 max-w-full overflow-hidden rounded-lg bg-slate-900">
        {language ? (
          <div className="bg-slate-800 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
            {language}
          </div>
        ) : null}
        <pre className="max-w-full overflow-x-hidden whitespace-pre-wrap bg-transparent px-3 py-2 font-mono text-[13px] leading-relaxed text-slate-100 [overflow-wrap:anywhere] [word-break:break-word]">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

export function parseMentions(content: string): Mention[] {
  const mentions: Mention[] = [];
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(content)) !== null) {
    const rawMention = match[1] || match[2] || "";
    const mention = rawMention.toLowerCase();

    if (mention === "everyone") {
      mentions.push({ type: "everyone", displayName: "@everyone" });
    } else if (mention === "channel") {
      mentions.push({ type: "channel", displayName: "@channel" });
    } else {
      mentions.push({ type: "user", displayName: `@${rawMention}` });
    }
  }

  return mentions;
}

export async function saveMentions(
  messageId: string,
  content: string,
  channelId?: string,
): Promise<void> {
  const mentions = parseMentions(content);

  for (const mention of mentions) {
    if (mention.type === "user") {
      const username = mention.displayName.substring(1);

      const { data: user } = await supabase
        .from("profiles")
        .select("id")
        .ilike("full_name", username)
        .maybeSingle();

      if (user) {
        await supabase.from("message_mentions").insert({
          message_id: messageId,
          mentioned_user_id: (user as any).id,
          mention_type: "user",
        } as any);
      }
    } else if (mention.type === "channel" && channelId) {
      const { data: members } = await supabase
        .from("channel_members")
        .select("user_id")
        .eq("channel_id", channelId);

      if (members) {
        for (const member of members) {
          await supabase.from("message_mentions").insert({
            message_id: messageId,
            mentioned_user_id: (member as any).user_id,
            mention_type: "channel",
          } as any);
        }
      }
    } else if (mention.type === "everyone" && channelId) {
      const { data: members } = await supabase
        .from("channel_members")
        .select("user_id")
        .eq("channel_id", channelId);

      if (members) {
        for (const member of members) {
          await supabase.from("message_mentions").insert({
            message_id: messageId,
            mentioned_user_id: (member as any).user_id,
            mention_type: "everyone",
          } as any);
        }
      }
    }
  }
}

export function highlightMentions(content: string): string {
  return content.replace(
    /@\[([^\]]+)\]|@(\w+)/g,
    (_match, bracketedName, simpleName) =>
      `<span class="bg-primary-100 text-primary-700 px-1 rounded font-medium">@${bracketedName || simpleName}</span>`,
  );
}

export function renderMentions(
  content: string,
  onUserMentionClick?: (
    mentionName: string,
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => void,
): ReactNode[] {
  const renderInline = (text: string, keyPrefix: string): ReactNode[] => {
    const parts: ReactNode[] = [];
    const regex =
      /(https?:\/\/[^\s]+)|@\[([^\]]+)\]|@(\w+)|\*\*([^*]+)\*\*|\*([^*]+)\*|~~([^~]+)~~|__([^_]+)__|`([^`]+)`/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const [
        rawMatch,
        urlMatch,
        bracketedName,
        simpleName,
        boldText,
        italicText,
        strikeText,
        underlineText,
        codeText,
      ] = match;
      const start = match.index;

      if (start > lastIndex) {
        parts.push(text.slice(lastIndex, start));
      }

      if (urlMatch) {
        const url = urlMatch.replace(/[),.!?]+$/, "");
        const trailingText = urlMatch.slice(url.length);

        parts.push(
          <a
            key={`${keyPrefix}-${start}-${url}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="font-medium text-current underline underline-offset-2 [overflow-wrap:anywhere] [word-break:break-word] hover:opacity-80"
          >
            {url}
          </a>,
        );

        if (trailingText) {
          parts.push(trailingText);
        }

        lastIndex = start + rawMatch.length;
        continue;
      }

      if (boldText) {
        parts.push(
          <strong
            key={`${keyPrefix}-${start}-${rawMatch}`}
            className="font-bold"
          >
            {boldText}
          </strong>,
        );
        lastIndex = start + rawMatch.length;
        continue;
      }

      if (italicText) {
        parts.push(
          <em key={`${keyPrefix}-${start}-${rawMatch}`} className="italic">
            {italicText}
          </em>,
        );
        lastIndex = start + rawMatch.length;
        continue;
      }

      if (strikeText) {
        parts.push(
          <del
            key={`${keyPrefix}-${start}-${rawMatch}`}
            className="line-through"
          >
            {strikeText}
          </del>,
        );
        lastIndex = start + rawMatch.length;
        continue;
      }

      if (underlineText) {
        parts.push(
          <u key={`${keyPrefix}-${start}-${rawMatch}`} className="underline">
            {underlineText}
          </u>,
        );
        lastIndex = start + rawMatch.length;
        continue;
      }

      if (codeText) {
        parts.push(
          <code
            key={`${keyPrefix}-${start}-${rawMatch}`}
            className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em] text-slate-800 [overflow-wrap:anywhere] [word-break:break-word]"
          >
            {codeText}
          </code>,
        );
        lastIndex = start + rawMatch.length;
        continue;
      }

      const mentionName = bracketedName || simpleName || "";
      const displayText = `@${mentionName}`;
      const lowerName = mentionName.toLowerCase();
      const isSpecialMention =
        lowerName === "everyone" || lowerName === "channel";

      if (isSpecialMention) {
        parts.push(
          <span
            key={`${keyPrefix}-${start}-${rawMatch}`}
            className="rounded bg-slate-100 px-1 font-medium text-slate-700"
          >
            {displayText}
          </span>,
        );
      } else if (onUserMentionClick) {
        parts.push(
          <button
            key={`${keyPrefix}-${start}-${rawMatch}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onUserMentionClick(mentionName, event);
            }}
            className="inline-flex items-center rounded bg-primary-100 px-1 font-medium text-primary-700 transition-colors hover:bg-primary-200"
          >
            {displayText}
          </button>,
        );
      } else {
        parts.push(
          <span
            key={`${keyPrefix}-${start}-${rawMatch}`}
            className="rounded bg-primary-100 px-1 font-medium text-primary-700"
          >
            {displayText}
          </span>,
        );
      }

      lastIndex = start + rawMatch.length;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  const parts: ReactNode[] = [];
  const lines = content.split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trimStart();
    const keyPrefix = `line-${index}`;

    if (trimmed.startsWith("```")) {
      const sameLineCode = extractFencedCodeLine(trimmed);
      if (sameLineCode) {
        parts.push(
          renderCodeBlock({
            code: sameLineCode.code,
            keyPrefix,
            language: sameLineCode.language || undefined,
          }),
        );

        index += 1;
        if (index < lines.length) {
          parts.push("\n");
        }

        continue;
      }

      const codeLines: string[] = [];
      const openingFence = trimmed.match(/^```(\w+)?\s*$/);
      const codeLanguage = openingFence?.[1] || "";
      index += 1;

      while (
        index < lines.length &&
        !lines[index].trimStart().startsWith("```")
      ) {
        codeLines.push(lines[index]);
        index += 1;
      }

      parts.push(
        renderCodeBlock({
          code: codeLines.join("\n"),
          keyPrefix,
          language: codeLanguage || undefined,
        }),
      );

      if (index < lines.length) {
        index += 1;
      }

      if (index < lines.length) {
        parts.push("\n");
      }

      continue;
    }

    if (trimmed.startsWith(">")) {
      const quoteText = trimmed.slice(1).trimStart();
      parts.push(
        <blockquote
          key={`${keyPrefix}-quote`}
          className="my-1 border-l-4 border-slate-300 pl-3 italic text-white"
        >
          {renderInline(quoteText, `${keyPrefix}-quote`)}
        </blockquote>,
      );
    } else {
      parts.push(...renderInline(line, keyPrefix));
    }

    index += 1;
    if (index < lines.length) {
      parts.push("\n");
    }
  }

  return parts;
}
