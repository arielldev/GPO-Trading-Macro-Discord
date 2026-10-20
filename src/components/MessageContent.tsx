import { emojiUrl, isEmojiOnly, tokenize } from "../lib/emoji";
import { useStore } from "../lib/store";
import { Tooltip } from "./Tooltip";

export function EmojiImg({ id, name, animated, size }: { id: string; name: string; animated: boolean; size: number }) {
  const minimal = useStore((s) => s.config.minimal);
  return (
    <img
      src={emojiUrl({ id, animated }, size >= 40 ? 96 : 48, minimal)}
      alt={`:${name}:`}
      loading="lazy"
      decoding="async"
      draggable={false}
      style={{ width: size, height: size }}
      className="inline-block object-contain align-[-0.3em]"
    />
  );
}

export function MessageContent({ content }: { content: string }) {
  const segments = tokenize(content);
  const jumbo = isEmojiOnly(segments);
  return (
    <div className={`text-[15px] leading-5.5 break-words whitespace-pre-wrap text-ink ${jumbo ? "py-0.5" : ""}`}>
      {segments.map((s, i) =>
        s.type === "text" ? (
          jumbo ? null : <span key={i}>{s.text}</span>
        ) : (
          <Tooltip key={i} label={`:${s.emoji.name}:`} delay={300} className={jumbo ? "mr-1" : "mx-px align-middle"}>
            <EmojiImg {...s.emoji} size={jumbo ? 48 : 22} />
          </Tooltip>
        ),
      )}
    </div>
  );
}
