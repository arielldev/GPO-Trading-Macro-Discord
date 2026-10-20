import { ChevronDown, Hash, Plus, Settings } from "lucide-react";
import { useState } from "react";
import { duration } from "../lib/format";
import { useBotStatus, useIdentity, useNow } from "../lib/hooks";
import { useStore } from "../lib/store";
import type { Account, Channel } from "../lib/types";
import { Tooltip } from "./Tooltip";
import { drawer } from "./ui";

function groupChannels(channels: Channel[]): [string, Channel[]][] {
  const map = new Map<string, Channel[]>();
  for (const c of channels) {
    const key = c.guildName ?? "Other";
    map.set(key, [...(map.get(key) ?? []), c]);
  }
  return [...map.entries()];
}

function Countdown({ ms, error }: { ms: number; error: string | null }) {
  if (error) return <span className="rounded bg-bad/15 px-1.5 text-[11px] font-semibold text-bad">!</span>;
  if (ms <= 0) return <span className="rounded bg-ok/15 px-1.5 text-[11px] font-semibold text-ok">ready</span>;
  const tone = ms > 300_000 ? "text-sub" : ms > 60_000 ? "text-warn" : "text-accent";
  return <span className={`font-mono text-[11px] tabular-nums ${tone}`}>{duration(ms)}</span>;
}

export function ChannelSidebar({ account }: { account: Account }) {
  const selected = useStore((s) => s.selectedChannel[account.id]);
  const selectChannel = useStore((s) => s.selectChannel);
  const openModal = useStore((s) => s.openModal);
  const status = useBotStatus(account.id);
  const nav = useStore((s) => s.nav);
  const now = useNow();
  const who = useIdentity(account);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const groups = groupChannels(account.channels);

  return (
    <aside className={`flex w-60 shrink-0 flex-col bg-side ${drawer(nav, true)}`}>
      <button
        onClick={() => openModal({ type: "accountSettings", accountId: account.id })}
        className="flex h-12 shrink-0 items-center justify-between border-b border-black/40 px-4 font-semibold text-ink shadow-[0_1px_0_#0003] transition-colors hover:bg-hover"
      >
        <span className="truncate">{who.name}</span>
        <ChevronDown className="size-4 shrink-0" />
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pt-3 pb-20">
        {groups.length === 0 && (
          <button
            onClick={() => openModal({ type: "addChannel", accountId: account.id })}
            className="w-full rounded-lg border border-dashed border-line p-4 text-left text-sm text-sub transition-colors hover:border-accent hover:text-ink"
          >
            <Plus className="mb-2 size-5 text-accent" />
            Add your first channel to start scheduling messages.
          </button>
        )}

        {groups.map(([guild, channels], gi) => (
          <div key={guild} className="mb-3">
            <div className="group flex items-center pr-1">
              <button
                onClick={() => setCollapsed((c) => ({ ...c, [guild]: !c[guild] }))}
                className="flex flex-1 items-center gap-0.5 truncate py-1 text-xs font-semibold tracking-wide text-mute uppercase hover:text-sub"
              >
                <ChevronDown className={`size-3 shrink-0 transition-transform ${collapsed[guild] ? "-rotate-90" : ""}`} />
                <span className="truncate">{guild}</span>
              </button>
              {gi === 0 && (
                <Tooltip label="Add Channel">
                <button
                  aria-label="Add Channel"
                  onClick={() => openModal({ type: "addChannel", accountId: account.id })}
                  className="text-mute hover:text-ink"
                >
                  <Plus className="size-4" />
                </button>
                </Tooltip>
              )}
            </div>
            {!collapsed[guild] &&
              channels.map((c) => {
                const run = status?.running ? status.channels[c.id] : undefined;
                const isActive = selected === c.id;
                return (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => selectChannel(account.id, c.id)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
                      e.preventDefault();
                      selectChannel(account.id, c.id);
                    }}
                    className={`group/ch mt-0.5 flex h-8 items-center gap-1.5 rounded-md px-2 transition-colors ${
                      isActive ? "bg-active text-ink" : "text-mute hover:bg-hover hover:text-sub"
                    } ${c.enabled ? "" : "opacity-45"}`}
                  >
                    <Hash className="size-5 shrink-0" />
                    <span className={`flex-1 truncate text-[15px] ${isActive ? "font-medium" : ""}`}>{c.name || c.id}</span>
                    {c.enabled && run && <Countdown ms={run.nextReady - now} error={run.lastError} />}
                    <Tooltip
                      label="Edit Channel"
                      className={isActive ? "" : "hidden group-hover/ch:inline-flex group-focus-within/ch:inline-flex touch:inline-flex"}
                    >
                    <button
                      aria-label="Edit Channel"
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal({ type: "channelSettings", accountId: account.id, channelId: c.id });
                      }}
                      className="text-sub hover:text-ink"
                    >
                      <Settings className="size-4" />
                    </button>
                    </Tooltip>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </aside>
  );
}
