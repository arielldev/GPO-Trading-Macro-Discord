import type { Config, Emoji, EmojiFix, Server } from "./types";

const TAG_RE = /<(a?):(\w+):(\d+)>/g;

export type Segment = { type: "text"; text: string } | { type: "emoji"; emoji: Emoji; tag: string };

export interface EmojiEntry {
  emoji: Emoji;
  source: string;
  sourceId: string;
}


export function emojiTag(e: Emoji): string {
  return `<${e.animated ? "a" : ""}:${e.name}:${e.id}>`;
}

export function emojiUrl(e: Pick<Emoji, "id" | "animated">, size = 48, lite = false): string {
  const base = `https://cdn.discordapp.com/emojis/${e.id}.webp?size=${size}`;
  if (lite) return base;
  return `${base}&quality=lossless${e.animated ? "&animated=true" : ""}`;
}

export function guildIconUrl(id: string, icon: string | null, size = 96): string | null {
  return icon ? `https://cdn.discordapp.com/icons/${id}/${icon}.webp?size=${size}` : null;
}

export function avatarUrl(id: string, avatar: string | null, size = 80): string | null {
  return avatar ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.webp?size=${size}` : null;
}

export function tokenize(content: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of content.matchAll(TAG_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ type: "text", text: content.slice(last, idx) });
    out.push({ type: "emoji", tag: m[0], emoji: { animated: m[1] === "a", name: m[2], id: m[3] } });
    last = idx + m[0].length;
  }
  if (last < content.length) out.push({ type: "text", text: content.slice(last) });
  return out;
}

export function isEmojiOnly(segments: Segment[]): boolean {
  const emojis = segments.filter((s) => s.type === "emoji").length;
  return emojis > 0 && emojis <= 30 && segments.every((s) => s.type === "emoji" || !s.text.trim());
}

export function allEmojis(config: Config): EmojiEntry[] {
  return [
    ...config.servers.flatMap((s) => s.emojis.map((emoji) => ({ emoji, source: s.name, sourceId: s.id }))),
  ];
}

export function searchEmojis(entries: EmojiEntry[], query: string, limit = Infinity): EmojiEntry[] {
  const q = query.toLowerCase();
  if (!q) return entries.slice(0, limit);
  const starts: EmojiEntry[] = [];
  const contains: EmojiEntry[] = [];
  for (const e of entries) {
    const n = e.emoji.name.toLowerCase();
    if (n.startsWith(q)) starts.push(e);
    else if (n.includes(q)) contains.push(e);
  }
  return [...starts, ...contains].slice(0, limit);
}

export function applyFixes(content: string, fixes: EmojiFix[]): string {
  let out = content;
  for (const f of fixes) out = out.split(f.oldTag).join(f.newTag ?? "");
  return out.replace(/ {2,}/g, " ").trim();
}

export interface EmojiDiff {
  added: Emoji[];
  removed: Emoji[];
  renamed: { from: Emoji; to: Emoji }[];
  fixes: EmojiFix[];
}

export function diffServer(before: Server, after: Server): EmojiDiff {
  const next = new Map(after.emojis.map((e) => [e.id, e]));
  const prev = new Set(before.emojis.map((e) => e.id));
  const diff: EmojiDiff = { added: [], removed: [], renamed: [], fixes: [] };
  for (const e of before.emojis) {
    const n = next.get(e.id);
    if (!n) {
      diff.removed.push(e);
      const reupload = after.emojis.find((x) => x.name === e.name && !prev.has(x.id));
      diff.fixes.push({ oldTag: emojiTag(e), newTag: reupload ? emojiTag(reupload) : null });
    } else if (n.name !== e.name || n.animated !== e.animated) {
      diff.renamed.push({ from: e, to: n });
      diff.fixes.push({ oldTag: emojiTag(e), newTag: emojiTag(n) });
    }
  }
  diff.added = after.emojis.filter((e) => !prev.has(e.id));
  return diff;
}

export function countAffected(config: Config, fixes: EmojiFix[]): number {
  return config.accounts
    .flatMap((a) => a.channels.flatMap((c) => c.messages))
    .filter((m) => fixes.some((f) => m.includes(f.oldTag))).length;
}
