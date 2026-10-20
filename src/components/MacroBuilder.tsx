import { ChevronDown, GripVertical, Plus, Save, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { emojiTag, tokenize, type EmojiEntry, type Segment } from "../lib/emoji";
import { EmojiPalette } from "./EmojiPalette";
import { EmojiImg } from "./MessageContent";
import { Button, tap } from "./ui";

interface Item {
  key: number;
  seg: Segment;
}

let itemSeq = 0;

function toItems(content: string | null): Item[] {
  if (!content) return [];
  return tokenize(content)
    .filter((s) => s.type === "emoji" || s.text.trim())
    .map((seg) => ({ key: ++itemSeq, seg: seg.type === "text" ? { type: "text", text: seg.text.trim() } : seg }));
}

function toContent(items: Item[]): string {
  return items.map(({ seg }) => (seg.type === "emoji" ? seg.tag : seg.text)).join(" ");
}

export function MacroBuilder({
  editing,
  onSubmit,
  onCancelEdit,
}: {
  editing: string | null;
  onSubmit: (content: string) => void;
  onCancelEdit: () => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(true);
  const [dragKey, setDragKey] = useState<number | null>(null);
  const dragging = useRef<number | null>(null);

  useEffect(() => {
    setItems(toItems(editing));
    if (editing !== null) setOpen(true);
  }, [editing]);

  useEffect(() => {
    if (editing === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancelEdit();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, onCancelEdit]);

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const { seg } of items) if (seg.type === "emoji") out[seg.emoji.id] = (out[seg.emoji.id] ?? 0) + 1;
    return out;
  }, [items]);

  function add(entry: EmojiEntry) {
    setItems((list) => [...list, { key: ++itemSeq, seg: { type: "emoji", emoji: entry.emoji, tag: emojiTag(entry.emoji) } }]);
  }

  function move(from: number, to: number) {
    setItems((list) => {
      if (from === to || to < 0 || to >= list.length) return list;
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function submit() {
    if (!items.length) return;
    onSubmit(toContent(items));
    if (editing === null) setItems([]);
  }

  return (
    <div data-tour="macro-builder" className="shrink-0 px-4 pb-4">
      {editing !== null && (
        <div className="flex items-center justify-between rounded-t-lg bg-accent-soft px-4 py-1.5 text-xs text-sub">
          <span>Editing macro</span>
          <span>
            escape to <button onClick={onCancelEdit} className="text-accent hover:underline">cancel</button>
          </span>
        </div>
      )}

      <div className={`overflow-hidden bg-input ring-1 ring-line ${editing !== null ? "rounded-b-lg" : "rounded-lg"}`}>
        <div className="flex items-start gap-3 p-3">
          <div className="flex min-h-11 flex-1 flex-wrap items-center gap-1.5" onDragOver={(e) => e.preventDefault()}>
            {items.length === 0 && (
              <span className="px-1 text-[15px] text-mute">
                <span className="@md:hidden">{tap("Click emojis below…")}</span>
                <span className="hidden @md:inline">{tap("Click emojis below to build a macro sequence…")}</span>
              </span>
            )}
            {items.map((item, i) => (
              <div
                key={item.key}
                data-tour="macro-pill"
                draggable
                onDragStart={(e) => {
                  dragging.current = i;
                  setDragKey(item.key);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnter={() => {
                  if (dragging.current === null || dragging.current === i) return;
                  move(dragging.current, i);
                  dragging.current = i;
                }}
                onDragEnd={() => {
                  dragging.current = null;
                  setDragKey(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                    e.preventDefault();
                    move(i, i + (e.key === "ArrowLeft" ? -1 : 1));
                  } else if (e.key === "Delete" || e.key === "Backspace") {
                    e.preventDefault();
                    setItems((list) => list.filter((x) => x.key !== item.key));
                  }
                }}
                tabIndex={0}
                aria-label={item.seg.type === "emoji" ? `:${item.seg.emoji.name}:, position ${i + 1}` : item.seg.text}
                className={`group flex h-9 cursor-grab animate-pop items-center gap-1 rounded-md border bg-raised pr-1 pl-0.5 transition-all active:cursor-grabbing ${
                  dragKey === item.key ? "border-accent opacity-50" : "border-line hover:border-accent/60"
                }`}
              >
                <GripVertical className="size-3.5 text-mute" />
                <span className="w-4 text-center text-[10px] font-semibold text-mute tabular-nums">{i + 1}</span>
                {item.seg.type === "emoji" ? (
                  <>
                    <EmojiImg {...item.seg.emoji} size={24} />
                    <span className="max-w-28 truncate text-xs text-sub">:{item.seg.emoji.name}:</span>
                  </>
                ) : (
                  <span className="max-w-40 truncate text-sm text-ink">{item.seg.text}</span>
                )}
                <button
                  aria-label="Remove"
                  onClick={() => setItems((list) => list.filter((x) => x.key !== item.key))}
                  className="grid size-5 place-items-center rounded text-mute transition-colors hover:bg-bad/20 hover:text-bad"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {items.length > 0 && (
              <Button variant="ghost" className="h-9 px-2" onClick={() => setItems([])}>
                Clear
              </Button>
            )}
            <Button data-tour="add-to-loop" className="h-9" disabled={!items.length} onClick={submit}>
              {editing !== null ? <Save className="size-4" /> : <Plus className="size-4" />}
              {editing !== null ? (
                "Save"
              ) : (
                <>
                  <span className="@md:hidden">Add</span>
                  <span className="hidden @md:inline">Add to loop</span>
                </>
              )}
            </Button>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Hide emojis" : "Show emojis"}
              aria-expanded={open}
              className="grid size-9 place-items-center rounded-md text-sub transition-colors hover:bg-hover hover:text-ink"
            >
              <ChevronDown className={`size-5 transition-transform ${open ? "" : "rotate-180"}`} />
            </button>
          </div>
        </div>

        {open && (
          <div data-tour="emoji-palette" className="border-t border-line/70">
            <EmojiPalette onPick={add} counts={counts} />
          </div>
        )}
      </div>
    </div>
  );
}
