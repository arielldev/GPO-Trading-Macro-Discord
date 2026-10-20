import { ArrowRight, Copy, Plus, RefreshCw, Search, Smile, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { countAffected, emojiTag, guildIconUrl, searchEmojis, type EmojiDiff } from "../lib/emoji";
import { relative } from "../lib/format";
import { useStore } from "../lib/store";
import type { Emoji } from "../lib/types";
import { EmojiImg } from "./MessageContent";
import { Avatar, Button, drawer, Empty, IconButton, MenuButton } from "./ui";
import { Tooltip } from "./Tooltip";

function DiffBanner({ diff, onClose }: { diff: EmojiDiff; onClose: () => void }) {
  const config = useStore((s) => s.config);
  const applyEmojiFixes = useStore((s) => s.applyEmojiFixes);
  const toast = useStore((s) => s.toast);
  const affected = countAffected(config, diff.fixes);
  const changed = diff.added.length + diff.removed.length + diff.renamed.length;

  return (
    <div className="mx-6 mt-4 animate-rise rounded-lg border border-line bg-raised p-4">
      <div className="flex items-center gap-3">
        <RefreshCw className="size-4 text-accent" />
        <span className="text-sm font-semibold text-ink">
          {changed ? "Sync found changes" : "Already up to date"}
        </span>
        <span className="text-xs text-sub">
          {diff.added.length} added · {diff.renamed.length} renamed · {diff.removed.length} removed
        </span>
        <button onClick={onClose} className="ml-auto text-mute hover:text-ink" aria-label="Dismiss">
          <X className="size-4" />
        </button>
      </div>
      {diff.renamed.length + diff.removed.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {diff.renamed.map((r) => (
            <span key={r.from.id} className="flex items-center gap-1.5 rounded bg-rail px-2 py-1 text-xs text-sub">
              <EmojiImg {...r.to} size={18} /> :{r.from.name}: <ArrowRight className="size-3" /> <span className="text-ink">:{r.to.name}:</span>
            </span>
          ))}
          {diff.removed.map((e) => (
            <span key={e.id} className="rounded bg-bad/10 px-2 py-1 text-xs text-bad line-through">:{e.name}:</span>
          ))}
        </div>
      )}
      {affected > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-md bg-accent-soft px-3 py-2">
          <span className="text-sm text-ink">{affected} scheduled message(s) use changed emojis.</span>
          <Button
            className="h-8"
            onClick={() => {
              applyEmojiFixes(diff.fixes);
              toast("ok", `Updated ${affected} message(s)`);
              onClose();
            }}
          >
            Update messages
          </Button>
        </div>
      )}
    </div>
  );
}

function EmojiGrid({ emojis }: { emojis: Emoji[] }) {
  const toast = useStore((s) => s.toast);
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-2 md:grid-cols-[repeat(auto-fill,minmax(112px,1fr))]">
      {emojis.map((e) => (
        <div
          key={e.id}
          className="group relative flex flex-col items-center gap-2 rounded-lg border border-transparent bg-side p-3 transition-colors hover:border-line hover:bg-raised"
        >
          <EmojiImg {...e} size={40} />
          <span className="w-full truncate text-center text-xs text-sub">:{e.name}:</span>
          <div className="absolute top-1 right-1 hidden gap-0.5 group-focus-within:flex group-hover:flex touch:flex">
            <Tooltip label="Copy tag">
            <button
              aria-label={`Copy :${e.name}:`}
              onClick={() => navigator.clipboard.writeText(emojiTag(e)).then(() => toast("info", `Copied :${e.name}:`))}
              className="grid size-6 place-items-center rounded bg-rail text-sub hover:text-ink"
            >
              <Copy className="size-3" />
            </button>
            </Tooltip>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LibraryView() {
  const config = useStore((s) => s.config);
  const selected = useStore((s) => s.selectedServer);
  const selectServer = useStore((s) => s.selectServer);
  const openModal = useStore((s) => s.openModal);
  const syncServer = useStore((s) => s.syncServer);
  const update = useStore((s) => s.update);
  const toast = useStore((s) => s.toast);
  const nav = useStore((s) => s.nav);
  const [query, setQuery] = useState("");
  const [syncing, setSyncing] = useState<string | null>(null);
  const [diff, setDiff] = useState<{ id: string; diff: EmojiDiff } | null>(null);

  const server = config.servers.find((s) => s.id === selected) ?? config.servers[0];
  const currentId = server?.id;
  const source = server?.emojis ?? [];
  const filtered = useMemo(
    () => searchEmojis(source.map((emoji) => ({ emoji, source: "", sourceId: "" })), query).map((e) => e.emoji),
    [source, query],
  );
  const totalEmojis = config.servers.reduce((n, s) => n + s.emojis.length, 0);

  async function sync(id: string) {
    setSyncing(id);
    const result = await syncServer(id);
    setSyncing(null);
    if (result) setDiff({ id, diff: result });
  }

  async function syncAll() {
    for (const s of config.servers) {
      setSyncing(s.id);
      const result = await syncServer(s.id);
      if (result && (result.fixes.length || result.added.length)) setDiff({ id: s.id, diff: result });
    }
    setSyncing(null);
    toast("ok", "All servers synced");
  }

  return (
    <div className="flex min-w-0 flex-1 overflow-hidden rounded-tl-lg">
      <aside className={`flex w-60 shrink-0 flex-col bg-side ${drawer(nav, true)}`}>
        <div className="flex h-12 shrink-0 items-center border-b border-black/40 px-4 font-semibold shadow-[0_1px_0_#0003]">
          Emoji Library
          <span className="ml-auto rounded-full bg-raised px-2 text-xs text-sub">{totalEmojis}</span>
        </div>
        <div className={`min-h-0 flex-1 overflow-y-auto px-2 pt-3 ${config.servers.length ? "" : "pb-20"}`}>
          <div className="px-2 pb-1 text-xs font-semibold tracking-wide text-mute uppercase">Servers</div>
          {config.servers.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                selectServer(s.id);
                setQuery("");
              }}
              className={`mt-0.5 flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors ${
                currentId === s.id ? "bg-active text-ink" : "text-sub hover:bg-hover hover:text-ink"
              }`}
            >
              <Avatar src={guildIconUrl(s.id, s.icon, 64)} name={s.name} size={32} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{s.name}</div>
                <div className="text-xs text-mute">{s.emojis.length} emojis</div>
              </div>
              {syncing === s.id && <RefreshCw className="size-3.5 animate-spin text-accent" />}
            </button>
          ))}
          <button
            data-tour="library-add-server"
            onClick={() => openModal({ type: "addServer" })}
            className="mt-1 flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm text-sub transition-colors hover:bg-hover hover:text-ink"
          >
            <div className="grid size-8 place-items-center rounded-full bg-raised text-accent">
              <Plus className="size-4" />
            </div>
            Add a Server
          </button>

        </div>
        {config.servers.length > 0 && (
          <div className="border-t border-black/40 p-2 pb-18">
            <Button variant="secondary" className="w-full" loading={syncing !== null} onClick={syncAll}>
              <RefreshCw className="size-4" /> Sync all servers
            </Button>
          </div>
        )}
      </aside>

      <section className="relative flex min-w-0 flex-1 flex-col bg-chat">
        <MenuButton className="absolute top-3 left-3 z-10" />
        {!server ? (
          <Empty icon={<Smile className="size-10" />} title="Build your emoji library">
            <p>Add a server and every emoji in it gets pulled in automatically — ready to use with “:” in any message.</p>
            <Button className="mt-5" onClick={() => openModal({ type: "addServer" })}>
              <Plus className="size-4" /> Add a Server
            </Button>
          </Empty>
        ) : (
          <>
            <div className="relative shrink-0 overflow-hidden border-b border-black/40">
              <div className="absolute inset-0 bg-gradient-to-r from-accent/25 via-accent/5 to-transparent" />
              <div className="relative flex flex-wrap items-center gap-4 px-6 py-5 max-md:pl-14">
                <Avatar src={guildIconUrl(server.id, server.icon, 128)} name={server.name} size={64} rounded="rounded-2xl" />
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-bold text-ink">{server.name}</h1>
                  <p className="text-sm text-sub">
                    {source.length} emojis · synced {relative(server.syncedAt)}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Button variant="secondary" loading={syncing === server.id} onClick={() => sync(server.id)}>
                    <RefreshCw className="size-4" /> Sync
                  </Button>
                  <IconButton
                    label="Remove server"
                    onClick={() => {
                      update((d) => void (d.servers = d.servers.filter((s) => s.id !== server.id)));
                      selectServer(null);
                    }}
                    className="hover:text-bad!"
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </div>
            </div>

            {diff && diff.id === currentId && <DiffBanner diff={diff.diff} onClose={() => setDiff(null)} />}

            <div className="flex shrink-0 gap-2 px-6 pt-4">
              <div className="flex h-10 flex-1 items-center gap-2 rounded-md border border-line bg-rail px-3 focus-within:border-accent">
                <Search className="size-4 text-mute" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search emojis"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-mute"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {filtered.length === 0 ? (
                <p className="mt-10 text-center text-sm text-mute">{query ? `No emoji matches “${query}”` : "No emojis here yet."}</p>
              ) : (
                <EmojiGrid emojis={filtered} />
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
