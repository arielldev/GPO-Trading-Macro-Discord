import { Hash, ScrollText, Settings, Timer } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { clock, duration } from "../lib/format";
import { useBotStatus, useIdentity } from "../lib/hooks";
import { useStore } from "../lib/store";
import type { Account, Channel, LogEvent } from "../lib/types";
import { Badge, DiscordMessage } from "./DiscordMessage";
import { LoopCard } from "./LoopCard";
import { MacroBuilder } from "./MacroBuilder";
import { IconButton, MenuButton, Reveal, Toggle } from "./ui";
import { Tooltip } from "./Tooltip";

const EMPTY: LogEvent[] = [];

export function ChatView({ account, channel }: { account: Account; channel: Channel }) {
  const update = useStore((s) => s.update);
  const openModal = useStore((s) => s.openModal);
  const showActivity = useStore((s) => s.showActivity);
  const toggleActivity = useStore((s) => s.toggleActivity);
  const toast = useStore((s) => s.toast);
  const logs = useStore((s) => s.logs[account.id] ?? EMPTY);
  const unread = useStore((s) => s.unread[account.id] ?? 0);
  const status = useBotStatus(account.id);
  const [editing, setEditing] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const sent = useMemo(() => logs.filter((l) => l.level === "sent" && l.channelId === channel.id), [logs, channel.id]);
  const who = useIdentity(account);
  const anonymous = useStore((s) => s.config.anonymous);
  const every = Math.max(channel.cooldown, channel.slowmode);

  useEffect(() => setEditing(null), [channel.id]);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [sent.length, channel.messages.length, channel.id]);

  function mutateChannel(fn: (c: Channel) => void) {
    update((d) => {
      const c = d.accounts.find((a) => a.id === account.id)?.channels.find((x) => x.id === channel.id);
      if (c) fn(c);
    });
  }

  function paste(macros: string[]) {
    const fresh = macros.filter((m) => !channel.messages.includes(m));
    const skipped = macros.length - fresh.length;
    if (!fresh.length) {
      toast("info", skipped === 1 ? "That macro is already in this loop" : "Those macros are already in this loop");
      return;
    }
    mutateChannel((c) => void c.messages.push(...fresh));
    toast("ok", `Pasted ${fresh.length} macro${fresh.length === 1 ? "" : "s"}${skipped ? ` · ${skipped} already here` : ""}`);
  }

  function submit(content: string) {
    if (editing !== null) {
      mutateChannel((c) => void (c.messages[editing] = content));
      setEditing(null);
    } else {
      mutateChannel((c) => void c.messages.push(content));
    }
  }

  return (
    <section className="@container flex min-w-0 flex-1 flex-col bg-chat">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-black/40 px-4 shadow-[0_1px_0_#0003]">
        <MenuButton className="-ml-2" />
        <Hash className="size-6 shrink-0 text-mute" />
        <h1 className="min-w-0 truncate font-semibold text-ink">{channel.name || channel.id}</h1>
        {channel.guildName && (
          <>
            <div className="mx-2 hidden h-6 w-px shrink-0 bg-line @xl:block" />
            <span className="hidden min-w-0 truncate text-sm text-sub @xl:inline">{channel.guildName}</span>
          </>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div data-tour="loop-interval" className="flex items-center gap-2">
            <Tooltip label={channel.slowmode ? `Loop interval · channel slowmode is ${duration(channel.slowmode * 1000)}` : "Loop interval · click to change"} side="bottom">
            <button
              onClick={() => openModal({ type: "channelSettings", accountId: account.id, channelId: channel.id })}
              className="flex items-center gap-1.5 rounded-full bg-raised px-2.5 py-1 text-xs whitespace-nowrap text-sub transition-colors hover:text-ink"
            >
              <Timer className="size-3.5" />
              every {duration(every * 1000)}
              {channel.slowmode > 0 && <span className="hidden text-mute @2xl:inline">· slowmode</span>}
            </button>
            </Tooltip>
            <Tooltip label={channel.enabled ? "Loop on · click to pause" : "Loop paused · click to resume"} side="bottom">
              <Toggle checked={channel.enabled} onChange={(v) => mutateChannel((c) => void (c.enabled = v))} label="Loop enabled" />
            </Tooltip>
          </div>
          <Tooltip label="Live log of everything the bot does" side="bottom">
          <button
            data-tour="activity-button"
            aria-label="Activity"
            onClick={toggleActivity}
            aria-pressed={showActivity}
            className={`flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors ${
              showActivity ? "bg-active text-ink" : "text-sub hover:bg-hover hover:text-ink"
            }`}
          >
            <ScrollText className="size-4" />
            <span className="hidden @lg:inline">Activity</span>
            {unread > 0 && !showActivity && (
              <span className="min-w-5 rounded-full bg-accent px-1.5 text-center text-[11px] leading-5 font-bold text-white tabular-nums">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>
          </Tooltip>
          <span className="hidden @md:inline-flex">
            <IconButton label="Edit Channel" onClick={() => openModal({ type: "channelSettings", accountId: account.id, channelId: channel.id })}>
              <Settings className="size-5" />
            </IconButton>
          </span>
        </div>
      </header>

      <div ref={scroller} className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto pb-6">
        <div className="flex min-h-full shrink-0 flex-col justify-end">
          <div className="px-4 pt-10">
            <div className="mb-3 grid size-17 place-items-center rounded-full bg-raised">
              <Hash className="size-10 text-ink" />
            </div>
            <h2 className="text-2xl leading-tight font-bold break-words text-ink @lg:text-[32px]">#{channel.name || channel.id}</h2>
            <p className="mt-1 text-sub">Build macros with the emojis below — they run on a loop in this channel.</p>
          </div>

          <LoopCard
            channel={channel}
            run={status?.channels[channel.id]}
            running={!!status?.running}
            editing={editing}
            onEdit={setEditing}
            onDelete={(i) => {
              mutateChannel((c) => void c.messages.splice(i, 1));
              setEditing(null);
            }}
            onPaste={paste}
          />

          {sent.length > 0 && (
            <div className="mx-4 mt-6 mb-1 flex items-center gap-2">
              <div className="h-px flex-1 bg-line" />
              <span className="text-[11px] font-semibold tracking-wide text-mute uppercase">Sent this session</span>
              <div className="h-px flex-1 bg-line" />
            </div>
          )}
          {sent.map((l, i) => (
            <DiscordMessage
              key={`${l.ts}-${i}`}
              author={who.name}
              avatar={who.avatar}
              timestamp={
                <>
                  Today at <Reveal hidden={anonymous}>{clock(l.ts)}</Reveal>
                </>
              }
              badge={<Badge>Sent</Badge>}
              content={l.content ?? ""}
              compact={i > 0 && l.ts - sent[i - 1].ts < 5 * 60_000}
            />
          ))}
        </div>
      </div>

      <MacroBuilder editing={editing === null ? null : (channel.messages[editing] ?? null)} onSubmit={submit} onCancelEdit={() => setEditing(null)} />
    </section>
  );
}
