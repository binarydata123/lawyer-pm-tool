import { useEffect, useRef, useState } from "react";
import { X, Search, Hash, MessageSquare, File, Megaphone } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspaces } from "../../contexts/WorkspaceContext";
import { format } from "date-fns";

interface SearchResult {
  type: "message" | "file" | "channel" | "dm" | "broadcast";
  id: string;
  title: string;
  content?: string;
  timestamp?: string;
  channelName?: string;
  channelId?: string;
  dmId?: string;
  broadcastId?: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResultSelect?: (result: SearchResult) => void;
}

export function SearchModal({
  isOpen,
  onClose,
  onResultSelect,
}: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspaces();
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const indexRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (activeIndex >= 0) {
      indexRefs.current[activeIndex]?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [activeIndex]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 1) {
      requestIdRef.current += 1;
      setResults([]);
      setLoading(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void performSearch(trimmedQuery);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeWorkspaceId, isOpen, query, user?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (
        (e.key === "ArrowUp" || e.key === "ArrowDown") &&
        !query?.trim() &&
        !results.length
      )
        return;

      switch (e.key) {
        case "Escape":
          onClose();
          break;

        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
          break;

        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev < results?.length - 1 ? prev + 1 : 0));
          break;

        case "Enter":
          if (activeIndex >= 0) {
            e.preventDefault();
            onResultSelect?.(results[activeIndex]);
          }
          break;
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, query, results, activeIndex, onResultSelect, onClose]);

  const performSearch = async (searchQuery: string) => {
    if (!user || !activeWorkspaceId) return;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);

    try {
      const { data: memberChannels } = await supabase
        .from("channel_members")
        .select("channel_id")
        .eq("user_id", user.id);

      const channelIds = (
        (memberChannels as Array<{ channel_id: string }> | null) ?? []
      ).map((membership) => membership.channel_id);

      const { data: directMessages } = await supabase
        .from("direct_messages")
        .select("id, user1_id, user2_id")
        .eq("workspace_id", activeWorkspaceId)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      const dmIds = (
        (directMessages as Array<{
          id: string;
          user1_id: string;
          user2_id: string;
        }> | null) ?? []
      ).map((dm) => dm.id);

      // Fetch broadcast IDs regardless of channel/DM presence
      const { data: broadcastsData } = await supabase
        .from("broadcasts")
        .select("id")
        .eq("workspace_id", activeWorkspaceId);
      const broadcastIds = (
        (broadcastsData as Array<{ id: string }> | null) ?? []
      ).map((b) => b.id);

      const [
        { data: channelMessages },
        { data: directMessageResults },
        { data: broadcastMessagesResults },
        { data: channels },
        { data: broadcasts },
        { data: files },
      ] = await Promise.all([
        channelIds.length > 0
          ? supabase
              .from("messages")
              .select("id, content, created_at, channel_id, channels(name)")
              .in("channel_id", channelIds)
              .ilike("content", `%${searchQuery}%`)
              .limit(10)
          : Promise.resolve({ data: [] }),

        dmIds.length > 0
          ? supabase
              .from("direct_message_messages")
              .select("id, content, created_at, dm_id")
              .in("dm_id", dmIds)
              .ilike("content", `%${searchQuery}%`)
              .limit(10)
          : Promise.resolve({ data: [] }),

        broadcastIds.length > 0
          ? supabase
              .from("broadcast_messages")
              .select("id, content, created_at, broadcast_id, broadcasts(name)")
              .in("broadcast_id", broadcastIds)
              .ilike("content", `%${searchQuery}%`)
              .limit(10)
          : Promise.resolve({ data: [] }),

        channelIds.length > 0
          ? supabase
              .from("channels")
              .select("id, name, description")
              .in("id", channelIds)
              .or(
                `name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`,
              )
              .limit(5)
          : Promise.resolve({ data: [] }),

        // ✅ FIXED broadcast search
        supabase
          .from("broadcasts")
          .select("id, name, created_at")
          .eq("workspace_id", activeWorkspaceId)
          .ilike("name", `%${searchQuery}%`)
          .limit(5),

        channelIds.length > 0
          ? supabase
              .from("files")
              .select("id, name, created_at, channel_id, channels(name)")
              .in("channel_id", channelIds)
              .ilike("name", `%${searchQuery}%`)
              .limit(5)
          : Promise.resolve({ data: [] }),
      ]);

      if (requestIdRef.current !== requestId) {
        return;
      }

      const dmNameMap = new Map<string, string>();
      const dmProfileMap = new Map<
        string,
        { fullName: string; email: string }
      >();
      const otherUserIds = Array.from(
        new Set(
          (
            (directMessages as Array<{
              id: string;
              user1_id: string;
              user2_id: string;
            }> | null) ?? []
          ).map((dm) => (dm.user1_id === user.id ? dm.user2_id : dm.user1_id)),
        ),
      );

      if (otherUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", otherUserIds);

        if (requestIdRef.current !== requestId) {
          return;
        }

        const profileMap = new Map<string, { fullName: string; email: string }>(
          (
            (profiles as Array<{
              id: string;
              full_name: string | null;
              email: string;
            }> | null) ?? []
          ).map((profile) => [
            profile.id,
            {
              fullName: profile.full_name || profile.email,
              email: profile.email,
            },
          ]),
        );

        (
          (directMessages as Array<{
            id: string;
            user1_id: string;
            user2_id: string;
          }> | null) ?? []
        ).forEach((dm) => {
          const otherUserId =
            dm.user1_id === user.id ? dm.user2_id : dm.user1_id;
          const profile = profileMap.get(otherUserId);
          if (profile) {
            dmNameMap.set(dm.id, profile.fullName);
            dmProfileMap.set(dm.id, profile);
          } else {
            dmNameMap.set(dm.id, "Direct Message");
          }
        });
      }

      const matchingDmResults =
        (directMessages as Array<{
          id: string;
          user1_id: string;
          user2_id: string;
        }> | null) ?? [];
      const dmSearchResults = matchingDmResults
        .map((dm) => {
          const profile = dmProfileMap.get(dm.id);
          if (!profile) return null;

          const matchesQuery =
            profile.fullName
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            profile.email.toLowerCase().includes(searchQuery.toLowerCase());

          if (!matchesQuery) return null;

          return {
            type: "dm" as const,
            id: dm.id,
            title: profile.fullName,
            content: `Direct message with ${profile.fullName}`,
            channelName: profile.fullName,
            dmId: dm.id,
          };
        })
        .filter(Boolean) as SearchResult[];

      const searchResults: SearchResult[] = [
        ...dmSearchResults,
        ...(channels?.map((c: any) => ({
          type: "channel" as const,
          id: c.id,
          title: c.name,
          content: c.description,
          channelId: c.id,
        })) || []),
        ...(broadcasts?.map((b: any) => ({
          type: "broadcast" as const,
          id: b.id,
          title: b.name,
          content: `Broadcast: ${b.name}`, // Add content for broadcast type
          broadcastId: b.id,
        })) || []),
        ...(channelMessages?.map((m: any) => ({
          type: "message" as const,
          id: m.id,
          title: "Message",
          content: m.content,
          timestamp: m.created_at,
          channelName: (m.channels as any)?.name,
          channelId: m.channel_id,
        })) || []),
        ...(directMessageResults?.map((m: any) => ({
          type: "message" as const,
          id: m.id,
          title: "Message",
          content: m.content,
          timestamp: m.created_at,
          channelName: dmNameMap.get(m.dm_id) || "Direct Message",
          dmId: m.dm_id,
        })) || []),
        ...(broadcastMessagesResults?.map((m: any) => ({
          type: "message" as const,
          id: m.id,
          title: "Message",
          content: m.content,
          timestamp: m.created_at,
          channelName: (m.broadcasts as any)?.name, // Assuming broadcasts(name) is selected
          broadcastId: m.broadcast_id,
        })) || []),
        ...(files?.map((f: any) => ({
          type: "file" as const,
          id: f.id,
          title: f.name,
          timestamp: f.created_at,
          channelName: (f.channels as any)?.name,
          channelId: f.channel_id,
        })) || []),
      ];

      setResults(searchResults);
    } catch (error) {
      if (requestIdRef.current === requestId) {
        setResults([]);
      }
      console.error("Search error:", error);
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 animate-fade-in pt-20">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 animate-slide-in">
        <div className="flex items-center gap-3 p-5 border-b border-slate-200">
          <Search size={20} className="text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages, channels"
            className="flex-1 text-lg outline-none"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Searching...</div>
          ) : results.length === 0 && query.length > 2 ? (
            <div className="p-8 text-center text-slate-500">
              No results found for "{query}"
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Use ↑ and ↓ to navigate results. Press Enter to select.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => onResultSelect?.(result)}
                  ref={(el) => (indexRefs.current[index] = el)}
                  className={`w-full p-4 text-left flex items-start gap-3 transition-colors ${
                    index === activeIndex ? "bg-slate-100" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="mt-1">
                    {result.type === "channel" && (
                      <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Hash size={16} className="text-primary-600" />
                      </div>
                    )}
                    {result.type === "message" && (
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <MessageSquare size={16} className="text-blue-600" />
                      </div>
                    )}
                    {result.type === "dm" && (
                      <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                        <MessageSquare size={16} className="text-violet-600" />
                      </div>
                    )}
                    {result.type === "broadcast" && (
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Megaphone size={16} className="text-purple-600" />
                      </div>
                    )}
                    {result.type === "file" && (
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <File size={16} className="text-green-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900">
                        {result.title}
                      </span>
                      {/* {result.channelName && (
                        <>
                          <span className="text-slate-400">in</span>
                          <span className="text-sm text-slate-600">#{result.channelName}</span>
                        </>
                      )} */}
                      <div className="ml-auto flex-shrink-0 text-right">
                        {result.type === "channel" && (
                          <div className="text-sm font-medium text-slate-700 flex items-center gap-1">
                            <Hash size={14} />
                            {result.title}
                          </div>
                        )}

                        {result.type === "message" && result.channelId && (
                          <div className="text-sm text-slate-600">
                            #{result.channelName}
                          </div>
                        )}

                        {result.type === "message" && result.dmId && (
                          <div className="text-sm text-slate-600 flex items-center gap-1">
                            <MessageSquare size={14} />
                            {result.channelName}
                          </div>
                        )}
                        {result.type === "message" && result.broadcastId && (
                          <div className="text-sm text-slate-600 flex items-center gap-1">
                            <Megaphone size={14} />
                            {result.channelName}
                          </div>
                        )}

                        {result.type === "broadcast" && (
                          <div className="text-sm text-slate-600 flex items-center gap-1">
                            <Megaphone size={14} />
                            Broadcast
                          </div>
                        )}

                        {result.type === "dm" && (
                          <div className="text-sm text-slate-600 flex items-center gap-1">
                            <MessageSquare size={14} />
                            DM
                          </div>
                        )}

                        {result.type === "file" && (
                          <div className="text-sm text-slate-600">
                            #{result.channelName}
                          </div>
                        )}
                      </div>
                    </div>
                    {result.content && (
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {result.content}
                      </p>
                    )}
                    {result.timestamp && (
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(result.timestamp), "MMM d, h:mm a")}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-600 items-center gap-4">
          <span>
            Press{" "}
            <kbd className="px-2 py-1 bg-white border border-slate-300 rounded">
              ESC
            </kbd>{" "}
            to close
          </span>
          <span>
            Press{" "}
            <kbd className="px-2 py-1 bg-white border border-slate-300 rounded">
              Ctrl/Cmd + F
            </kbd>{" "}
            to open
          </span>
        </div>
      </div>
    </div>
  );
}
