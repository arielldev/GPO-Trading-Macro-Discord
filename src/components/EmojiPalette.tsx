import { Search, Smile } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { allEmojis, guildIconUrl, searchEmojis, type EmojiEntry } from "../lib/emoji";
import { useStore } from "../lib/store";
import { EmojiImg } from "./MessageContent";
import { Avatar, Button } from "./ui";
import { Tooltip } from "./Tooltip";

const ALL = "all";
const PAGE = 120;

export function EmojiPalette({ onPick, counts }: { onPick: (e: EmojiEntry) => void; counts: Record<string, number> }) {
  const config = useStore((s) => s.config);
  const setView = useStore((s) => s.setView);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState(ALL);
  const [limit, setLimit] = useState(PAGE);

  const sources = config.servers.filter((s) => s.emojis.length).map((s) => ({ id: s.id, name: s.name, icon: guildIconUrl(s.id, s.icon, 64) }));

  const entries = useMemo(() => {
    const scoped = allEmojis(config).filter((e) => source === ALL || e.sourceId === source);
    return searchEmojis(scoped, query);
  }, [config, source, query]);

  useEffect(() => setLimit(PAGE), [source, query]);

  if (!sources.length) {
    return (
      <div className="flex items-center justify-center gap-3 px-4 py-6 text-sm text-sub">
        <Smile className="size-5 text-mute" />
        No emojis yet — add a server to pull its emojis.
        <Button data-tour="open-library" className="h-8" onClick={() => setView({ kind: "library" })}>
          Open Emoji Library
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 px-3 pt-3">
        <div className="flex h-8 w-full shrink-0 items-center gap-2 rounded-md bg-rail px-2 focus-within:ring-1 focus-within:ring-accent @md:w-56">
          <Search className="size-4 text-mute" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search emojis"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-mute"
          />
        </div>
        <div className="scroll-hidden flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {[{ id: ALL, name: "All", icon: null }, ...sources].map((s) => (
            <button
              key={s.id}
              aria-pressed={source === s.id}
              onClick={() => setSource(s.id)}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full pr-3 pl-1 text-xs transition-colors ${
                source === s.id ? "bg-accent text-white" : "bg-raised text-sub hover:text-ink"
              } ${s.id === ALL ? "pl-3" : ""}`}
            >
              {s.id !== ALL && <Avatar src={s.icon} name={s.name} size={24} />}
              <span className="max-w-28 truncate">{s.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div
        data-tour="emoji-grid"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (limit < entries.length && el.scrollTop + el.clientHeight > el.scrollHeight - 120) setLimit((n) => n + PAGE);
        }}
        className="grid h-40 grid-cols-[repeat(auto-fill,minmax(44px,1fr))] content-start gap-0.5 overflow-y-auto p-3 [@media(max-height:700px)]:h-28">
        {entries.length === 0 && <p className="col-span-full py-6 text-center text-sm text-mute">No emoji matches “{query}”</p>}
        {entries.slice(0, limit).map((entry) => {
          const n = counts[entry.emoji.id];
          return (
            <Tooltip
              key={`${entry.sourceId}-${entry.emoji.id}`}
              delay={350}
              label={
                <span className="flex items-center gap-2">
                  <EmojiImg {...entry.emoji} size={20} />
                  <span>
                    :{entry.emoji.name}: <span className="font-normal text-mute">· {entry.source}</span>
                  </span>
                </span>
              }
            >
            <button
              aria-label={`Add :${entry.emoji.name}:`}
              onClick={() => onPick(entry)}
              className="relative grid size-11 place-items-center rounded-md transition-all hover:scale-110 hover:bg-hover active:scale-95"
            >
              <EmojiImg {...entry.emoji} size={30} />
              {n > 0 && (
                <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] leading-4 font-bold text-white">
                  {n}
                </span>
              )}
            </button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
