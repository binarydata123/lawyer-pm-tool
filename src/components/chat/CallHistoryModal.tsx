import { ArrowLeft, CalendarClock, Phone, Video, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type CallLog = {
  id: string;
  call_type: "audio" | "video" | "screen";
  started_at: string;
  ended_at: string | null;
  participant_names: Record<string, string> | null;
  summary: string | null;
  summary_status: string;
  caller: { full_name: string | null } | null;
};

interface CallHistoryModalProps {
  isOpen: boolean;
  roomId?: string;
  roomType?: "channel" | "dm";
  onClose: () => void;
}

interface CallHistoryPageProps {
  roomId?: string;
  roomType?: "channel" | "dm";
  onBack: () => void;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(startedAt: string, endedAt: string | null) {
  if (!endedAt) return "In progress";

  const seconds = Math.max(
    1,
    Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000),
  );
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function getParticipantText(names: Record<string, string> | null) {
  const participants = Object.values(names ?? {}).filter(Boolean);
  if (!participants.length) return "No participants recorded";
  return participants.join(", ");
}

function useCallHistory({
  isOpen,
  roomId,
  roomType,
}: {
  isOpen: boolean;
  roomId?: string;
  roomType?: "channel" | "dm";
}) {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !roomId || !roomType) {
      setLogs([]);
      setErrorText(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const loadLogs = async () => {
      setIsLoading(true);
      setErrorText(null);
      setLogs([]);

      const { data, error } = await (supabase as any)
        .from("call_logs")
        .select(
          "id, call_type, started_at, ended_at, participant_names, summary, summary_status, caller:profiles!call_logs_caller_id_fkey(full_name)",
        )
        .eq(roomType === "channel" ? "channel_id" : "dm_id", roomId)
        .order("started_at", { ascending: false })
        .limit(50);

      if (!isMounted) return;

      if (error) {
        console.error("Failed to load call history", error);
        setErrorText("Call history could not be loaded.");
        setLogs([]);
      } else {
        setLogs((data ?? []) as CallLog[]);
      }

      setIsLoading(false);
    };

    void loadLogs();

    return () => {
      isMounted = false;
    };
  }, [isOpen, roomId, roomType]);

  const title = useMemo(
    () => (roomType === "channel" ? "Channel call history" : "Call history"),
    [roomType],
  );

  return { logs, isLoading, errorText, title };
}

function CallHistoryContent({
  logs,
  isLoading,
  errorText,
}: {
  logs: CallLog[];
  isLoading: boolean;
  errorText: string | null;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : errorText ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
          {errorText}
        </div>
      ) : logs.length ? (
        <div className="space-y-3">
          {logs.map((log) => {
            const isVideo = log.call_type === "video" || log.call_type === "screen";
            const Icon = isVideo ? Video : Phone;

            return (
              <article
                key={log.id}
                className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="text-sm font-semibold capitalize text-slate-900 dark:text-white">
                        {log.call_type} call
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDateTime(log.started_at)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDuration(log.started_at, log.ended_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Started by {log.caller?.full_name ?? "Unknown"}
                    </p>
                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                      {getParticipantText(log.participant_names)}
                    </p>
                    {log.summary ? (
                      <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {log.summary}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                        {log.summary_status === "failed"
                          ? "Summary could not be generated."
                          : "No summary available."}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700">
          <CalendarClock className="mb-3 text-slate-400" size={28} />
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            No calls yet
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Calls started from this chat will appear here.
          </p>
        </div>
      )}
    </div>
  );
}

export function CallHistoryPage({
  roomId,
  roomType,
  onBack,
}: CallHistoryPageProps) {
  const { logs, isLoading, errorText, title } = useCallHistory({
    isOpen: true,
    roomId,
    roomType,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-slate-950">
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label="Back to chat"
          title="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Recent calls, participants, and summaries
          </p>
        </div>
      </div>
      <CallHistoryContent
        logs={logs}
        isLoading={isLoading}
        errorText={errorText}
      />
    </div>
  );
}

export function CallHistoryModal({
  isOpen,
  roomId,
  roomType,
  onClose,
}: CallHistoryModalProps) {
  const { logs, isLoading, errorText, title } = useCallHistory({
    isOpen,
    roomId,
    roomType,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
      <div className="flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Recent calls, participants, and summaries
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Close call history"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <CallHistoryContent
          logs={logs}
          isLoading={isLoading}
          errorText={errorText}
        />
      </div>
    </div>
  );
}
