import { Hash, Plus } from "lucide-react";
import { useEffect } from "react";
import { useAccount, useStore } from "../lib/store";
import { ActivityPanel } from "./ActivityPanel";
import { ChannelSidebar } from "./ChannelSidebar";
import { ChatView } from "./ChatView";
import { Button, Empty, MenuButton } from "./ui";

export function AccountView({ accountId }: { accountId: string }) {
  const account = useAccount(accountId);
  const selected = useStore((s) => s.selectedChannel[accountId]);
  const selectChannel = useStore((s) => s.selectChannel);
  const showActivity = useStore((s) => s.showActivity);
  const openModal = useStore((s) => s.openModal);
  const toggleActivity = useStore((s) => s.toggleActivity);
  const channel = account?.channels.find((c) => c.id === selected) ?? account?.channels[0];

  useEffect(() => {
    if (channel && channel.id !== selected) selectChannel(accountId, channel.id);
  }, [channel, selected, accountId, selectChannel]);

  if (!account) return null;

  return (
    <div className="flex min-w-0 flex-1 overflow-hidden rounded-tl-lg">
      <ChannelSidebar account={account} />
      {channel ? (
        <ChatView account={account} channel={channel} />
      ) : (
        <div className="relative flex-1 bg-chat">
          <MenuButton className="absolute top-3 left-3" />
          <Empty icon={<Hash className="size-10" />} title="No channels yet">
            <p>Pick a server and channel to post in, then write your messages Discord-style.</p>
            <Button data-tour="add-channel" className="mt-5" onClick={() => openModal({ type: "addChannel", accountId })}>
              <Plus className="size-4" /> Add Channel
            </Button>
          </Empty>
        </div>
      )}
      {showActivity && (
        <>
          <div className="fixed inset-x-0 top-(--titlebar) bottom-0 z-25 animate-fade bg-black/50 lg:hidden" onClick={toggleActivity} />
          <ActivityPanel accountId={accountId} />
        </>
      )}
    </div>
  );
}
