import { NewChannelModal } from "../../components/modals/NewChannelModal";
import { NewDMModal } from "../../components/modals/NewDMModal";
import { InvitePeopleModal } from "../../components/modals/InvitePeopleModal";
import { SearchModal } from "../../components/search/SearchModal";
import { SettingsModal } from "../../components/modals/SettingsModal";
import { TeamMembersModal } from "../../components/modals/TeamMembersModal";
import NotificationModal from "../../components/modals/NotificationModal";
import { SavedMessagesPanel } from "../../components/chat/SavedMessagesPanel";
import { ForwardMessageModal } from "../../components/chat/ForwardMessageModal";
import { NewBroadcastModal } from "../../components/modals/NewBroadcastModal";
import type { MainAppMessage } from "./types";

interface MainAppModalsProps {
  showNewChannelModal: boolean;
  showNewDMModal: boolean;
  showNewBroadcastModal?: boolean;
  showInvitePeopleModal: boolean;
  showSearchModal: boolean;
  showSettingsModal: boolean;
  showMembersModal: boolean;
  showNotificationModal: boolean;
  showSavedMessages: boolean;
  selectedChannelId?: string;
  selectedBroadcastId?: string;
  messageToForward: MainAppMessage | null;
  messagesToForward: MainAppMessage[] | null;
  onCloseNewChannel: () => void;
  onCloseNewDM: () => void;
  onCloseNewBroadcast?: () => void;
  onCloseInvitePeople: () => void;
  onCloseSearch: () => void;
  onCloseSettings: () => void;
  onCloseMembers: () => void;
  onCloseNotifications: () => void;
  onCloseSavedMessages: () => void;
  onCloseForwardMessage: () => void;
  onChannelCreated: (channelId: string, isPrivate: boolean) => void;
  onDMCreated: (dmId: string, userId: string) => void;
  onBroadcastCreated?: (broadcastId: string) => void;
  onChannelLeft: () => void;
  onNotificationSelect: (args: {
    channelId?: string;
    dmId?: string;
    recipientId?: string;
    messageId?: string;
    timestamp?: string;
  }) => void;
  onViewMoreNotifications: () => void;
  onSavedMessageClick: (args: {
    messageId: string;
    channelId?: string | null;
    dmId?: string | null;
  }) => void;
  onSearchResultSelect: (args: {
    id: string;
    type: string;
    channelId?: string;
    dmId?: string;
    timestamp?: string;
  }) => Promise<void>;
}

export function MainAppModals({
  showNewChannelModal,
  showNewDMModal,
  showNewBroadcastModal,
  showInvitePeopleModal,
  showSearchModal,
  showSettingsModal,
  showMembersModal,
  showNotificationModal,
  showSavedMessages,
  selectedChannelId,
  selectedBroadcastId,
  messageToForward,
  messagesToForward,
  onCloseNewChannel,
  onCloseNewDM,
  onCloseNewBroadcast,
  onCloseInvitePeople,
  onCloseSearch,
  onCloseSettings,
  onCloseMembers,
  onCloseNotifications,
  onCloseSavedMessages,
  onCloseForwardMessage,
  onChannelCreated,
  onDMCreated,
  onBroadcastCreated,
  onChannelLeft,
  onNotificationSelect,
  onViewMoreNotifications,
  onSavedMessageClick,
  onSearchResultSelect,
}: MainAppModalsProps) {
  return (
    <>
      <NewChannelModal
        isOpen={showNewChannelModal}
        onClose={onCloseNewChannel}
        onChannelCreated={onChannelCreated}
      />

      <NewDMModal
        isOpen={showNewDMModal}
        onClose={onCloseNewDM}
        onDMCreated={onDMCreated}
      />

      <InvitePeopleModal
        isOpen={showInvitePeopleModal}
        onClose={onCloseInvitePeople}
      />

      <SearchModal
        isOpen={showSearchModal}
        onClose={onCloseSearch}
        onResultSelect={onSearchResultSelect}
      />

      <SettingsModal isOpen={showSettingsModal} onClose={onCloseSettings} />

      <NewBroadcastModal
        isOpen={!!showNewBroadcastModal}
        onClose={onCloseNewBroadcast ?? (() => {})}
        onBroadcastCreated={onBroadcastCreated}
      />

      <TeamMembersModal
        isOpen={showMembersModal}
        onClose={onCloseMembers}
        channelId={selectedChannelId}
        broadcastId={selectedBroadcastId}
        onChannelLeft={onChannelLeft}
      />

      <NotificationModal
        isOpen={showNotificationModal}
        onClose={onCloseNotifications}
        onNotificationSelect={onNotificationSelect}
        onViewMore={onViewMoreNotifications}
      />

      <SavedMessagesPanel
        isOpen={showSavedMessages}
        onClose={onCloseSavedMessages}
        onSavedMessageClick={onSavedMessageClick}
      />

      <ForwardMessageModal
        isOpen={!!messageToForward || !!messagesToForward?.length}
        onClose={onCloseForwardMessage}
        message={messageToForward}
        messages={messagesToForward ?? undefined}
      />
    </>
  );
}
