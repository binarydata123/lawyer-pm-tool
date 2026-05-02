import { useState, useEffect } from 'react';
import { X, Bookmark, Hash, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

interface SavedMessage {
  id: string;
  message_id: string;
  note: string | null;
  created_at: string;
  message: {
    id: string;
    content: string;
    created_at: string;
    channel_id?: string;
    dm_id?: string;
    profiles?: {
      full_name: string;
    };
    channels?: {
      name: string;
    };
  };
}

interface SavedMessagesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSavedMessageClick?: (target: {
    messageId: string;
    channelId?: string | null;
    dmId?: string | null;
  }) => void;
}

export function SavedMessagesPanel({
  isOpen,
  onClose,
  onSavedMessageClick,
}: SavedMessagesPanelProps) {
  const [savedMessages, setSavedMessages] = useState<SavedMessage[]>([]);
  const [filterBy, setFilterBy] = useState<'all' | 'channels' | 'dms'>('all');
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && user) {
      loadSavedMessages();
    }
  }, [isOpen, user]);

  const loadSavedMessages = async () => {
    if (!user) return;

    const { data: channelBookmarks } = await supabase
      .from('message_bookmarks')
      .select(`
        id,
        message_id,
        note,
        created_at,
        message:messages!inner(
          id,
          content,
          created_at,
          channel_id,
          profiles:profiles!messages_user_id_fkey(full_name),
          channels(name)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const { data: dmBookmarks } = await supabase
      .from('message_bookmarks')
      .select(`
        id,
        message_id,
        note,
        created_at,
        message:direct_message_messages!inner(
          id,
          content,
          created_at,
          dm_id,
          profiles:profiles!direct_message_messages_user_id_fkey(full_name)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const allMessages = [
      ...(channelBookmarks || []),
      ...(dmBookmarks || [])
    ] as unknown as SavedMessage[];

    setSavedMessages(allMessages);
  };

  const handleRemoveBookmark = async (bookmarkId: string) => {
    const removedBookmark = savedMessages.find((saved) => saved.id === bookmarkId);

    await supabase
      .from('message_bookmarks')
      .delete()
      .eq('id', bookmarkId);

    if (removedBookmark?.message) {
      window.dispatchEvent(
        new CustomEvent('bookmark-changed', {
          detail: {
            channelId: removedBookmark.message.channel_id ?? null,
            dmId: removedBookmark.message.dm_id ?? null,
          },
        }),
      );
    }

    loadSavedMessages();
  };

  const filteredMessages = savedMessages.filter((msg) => {
    if (filterBy === 'channels') return msg.message.channel_id;
    if (filterBy === 'dms') return msg.message.dm_id;
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="text-primary-600" size={20} />
            <h2 className="text-lg font-semibold text-slate-900">Saved Messages</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-200">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterBy('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filterBy === 'all'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-150'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterBy('channels')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filterBy === 'channels'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-150'
              }`}
            >
              Channels
            </button>
            <button
              onClick={() => setFilterBy('dms')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filterBy === 'dms'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-150'
              }`}
            >
              Direct Messages
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredMessages.length === 0 ? (
            <div className="text-center py-12">
              <Bookmark size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-600">No saved messages yet</p>
              <p className="text-sm text-slate-500 mt-1">
                Click the bookmark icon on any message to save it
              </p>
            </div>
          ) : (
            filteredMessages.map((saved) => (
              <div
                key={saved.id}
                className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <button
                  type="button"
                  onClick={() =>
                    onSavedMessageClick?.({
                      messageId: saved.message.id,
                      channelId: saved.message.channel_id ?? null,
                      dmId: saved.message.dm_id ?? null,
                    })
                  }
                  className="flex w-full items-start justify-between gap-3 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-slate-900">
                        {saved.message.profiles?.full_name || 'Unknown user'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {format(new Date(saved.message.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                      {saved.message.channel_id && saved.message.channels && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Hash size={12} />
                          {saved.message.channels.name}
                        </span>
                      )}
                      {saved.message.dm_id && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <MessageSquare size={12} />
                          Direct Message
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700 text-sm leading-relaxed">
                      {saved.message.content}
                    </p>
                    {saved.note && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                        <span className="font-medium">Note:</span> {saved.note}
                      </div>
                    )}
                  </div>
                </button>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => handleRemoveBookmark(saved.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                    title="Remove bookmark"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
