import { ScrollText, Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { clock } from "../lib/format";
import { useStore } from "../lib/store";
import type { LogEvent, LogLevel } from "../lib/types";
import { IconButton } from "./ui";

const EMPTY: LogEvent[] = [];

const TONES: Record<LogLevel, string> = {
  info: "text-sub",
  success: "text-ok",
  sent: "text-ok",
  warn: "text-warn",
  error: "text-bad",
};

export function ActivityPanel({ accountId }: { accountId: string }) {
  const logs = useStore((s) => s.logs[accountId] ?? EMPTY);
  const clearLogs = useStore((s) => s.clearLogs);
  const toggleActivity = useStore((s) => s.toggleActivity);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [logs.length]);

  return (
    <aside className="flex w-80 shrink-0 animate-fade max-lg:fixed max-lg:top-(--titlebar) max-lg:right-0 max-lg:bottom-0 max-lg:z-30 max-lg:shadow-2xl max-lg:shadow-black max-md:w-full lg:w-72 xl:w-80 flex-col border-l border-black/40 bg-side">
      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-black/40 px-4 shadow-[0_1px_0_#0003]">
        <h2 className="flex-1 font-semibold text-ink">Activity log</h2>
        <IconButton label="Clear" onClick={() => clearLogs(accountId)}>
          <Trash2 className="size-4" />
        </IconButton>
        <IconButton label="Close" onClick={toggleActivity}>
          <X className="size-4" />
        </IconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 font-mono text-xs leading-relaxed select-text">
        {logs.length === 0 && (
          <div className="mt-10 flex flex-col items-center gap-3 px-4 text-center font-sans">
            <div className="grid size-12 place-items-center rounded-full bg-raised text-accent">
              <ScrollText className="size-6" />
            </div>
            <p className="text-sm font-medium text-ink">No activity yet</p>
            <p className="text-xs text-mute">Press ▶ Start in the bottom panel. Every post, wait, break and error will show up here live.</p>
          </div>
        )}
        {logs.map((l, i) => (
          <div key={i} className="flex gap-2 rounded px-1 py-0.5 hover:bg-hover">
            <span className="shrink-0 text-mute">{clock(l.ts)}</span>
            <span className={`break-words ${TONES[l.level]}`}>{l.text}</span>
          </div>
        ))}
        <div ref={end} />
      </div>
    </aside>
  );
}
