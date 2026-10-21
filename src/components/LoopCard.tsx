import { ChevronDown, ClipboardPaste, Copy, Pause, Pencil, Repeat, Shuffle, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { duration } from "../lib/format";
import { useNow } from "../lib/hooks";
import { useStore } from "../lib/store";
import type { Channel, ChannelRun } from "../lib/types";
import { MessageContent } from "./MessageContent";
import { Tooltip } from "./Tooltip";

function RowButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <Tooltip label={label}>
    <button
      aria-label={label}
      onClick={onClick}
      className={`grid size-7 place-items-center rounded-md text-mute transition-colors hover:bg-hover ${danger ? "hover:text-bad" : "hover:text-ink"}`}
    >
      {children}
    </button>
    </Tooltip>
  );
}

export function LoopCard({
  channel,
  run,
  running,
  editing,
  onEdit,
  onDelete,
  onPaste,
  open,
  onToggle,
  className = "",
}: {
  channel: Channel;
  run: ChannelRun | undefined;
  running: boolean;
  editing: number | null;
  onEdit: (i: number) => void;
  onDelete: (i: number) => void;
  onPaste: (macros: string[]) => void;
  open: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const now = useNow(250);
  const clipboard = useStore((s) => s.clipboard);
  const copyMacros = useStore((s) => s.copyMacros);
  const every = Math.max(channel.cooldown, channel.slowmode);
  const count = channel.messages.length;
  const active = running && channel.enabled && !!run;
  const remaining = run ? run.nextReady - now : 0;
  const progress = active ? Math.min(1, Math.max(0, 1 - remaining / (every * 1000))) : 0;

  const summary =
    count === 0
      ? "Add a macro below to start the loop"
      : count === 1
        ? `Posts this macro every ${duration(every * 1000)}`
        : `Posts a random macro every ${duration(every * 1000)}`;

  const state = !channel.enabled
    ? { text: "Paused", tone: "bg-raised text-mute" }
    : !active
      ? { text: "Idle", tone: "bg-raised text-sub" }
      : run?.lastError
        ? { text: run.lastError, tone: "bg-bad/15 text-bad" }
        : remaining <= 0
          ? { text: "Posting…", tone: "bg-ok/15 text-ok" }
          : { text: `Next in ${duration(remaining)}`, tone: "bg-accent-soft text-accent" };

  return (
    <div data-tour="loop-card" className={`overflow-hidden rounded-xl border border-line bg-side ${className}`}>
      <div className="relative flex items-center gap-3 px-4 py-3">
        <div className={`grid size-10 shrink-0 place-items-center rounded-full ${active ? "bg-accent text-white" : "bg-raised text-sub"}`}>
          {channel.enabled ? <Repeat className={`size-5 ${active ? "animate-[spin_3s_linear_infinite]" : ""}`} /> : <Pause className="size-5" />}
        </div>
        <div
          role="button"
          tabIndex={-1}
          onClick={onToggle}
          className="min-w-0 flex-1 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink">Loop</span>
            {count > 1 && (
              <span className="flex items-center gap-1 rounded bg-raised px-1.5 py-px text-[11px] text-sub">
                <Shuffle className="size-3" /> {count} macros
              </span>
            )}
          </div>
          <div className="truncate text-sm text-sub">{summary}</div>
        </div>
        <div className="flex shrink-0 items-center">
          {count > 0 && (
            <RowButton label={count === 1 ? "Copy loop" : `Copy loop · ${count} macros`} onClick={() => copyMacros(channel.messages)}>
              <Copy className="size-4" />
            </RowButton>
          )}
          {clipboard.length > 0 && (
            <RowButton label={clipboard.length === 1 ? "Paste macro" : `Paste ${clipboard.length} macros`} onClick={() => onPaste(clipboard)}>
              <ClipboardPaste className="size-4" />
            </RowButton>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`max-w-48 truncate rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ${state.tone}`}>{state.text}</span>
          {active && run && run.postCount > 0 && <span className="text-[11px] text-mute">{run.postCount} posted this run</span>}
        </div>
        {count > 0 && (
          <Tooltip label={open ? "Collapse loop" : `Show ${count === 1 ? "macro" : `${count} macros`}`}>
            <button
              aria-label={open ? "Collapse loop" : "Expand loop"}
              aria-expanded={open}
              onClick={onToggle}
              className="grid size-8 shrink-0 place-items-center rounded-md text-mute transition-colors hover:bg-hover hover:text-ink"
            >
              <ChevronDown className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </button>
          </Tooltip>
        )}
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-line">
          <div className="h-full bg-accent transition-[width] duration-300 ease-linear" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      {count > 0 && open && (
        <ol className="max-h-[min(40vh,360px)] divide-y divide-line/60 overflow-y-auto overscroll-contain border-t border-line/60">
          {channel.messages.map((m, i) => (
            <li
              key={`${i}-${m}`}
              className={`group flex items-center gap-3 px-4 py-2 transition-colors ${
                editing === i ? "bg-accent-soft" : "hover:bg-hover/60"
              }`}
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-raised text-xs font-semibold text-sub tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <MessageContent content={m} />
              </div>
              <div className="flex shrink-0 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 touch:opacity-100">
                <RowButton label="Copy" onClick={() => copyMacros([m])}>
                  <Copy className="size-4" />
                </RowButton>
                <RowButton label="Edit" onClick={() => onEdit(i)}>
                  <Pencil className="size-4" />
                </RowButton>
                <RowButton label="Delete" danger onClick={() => onDelete(i)}>
                  <Trash2 className="size-4" />
                </RowButton>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
