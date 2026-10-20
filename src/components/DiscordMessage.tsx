import type { ReactNode } from "react";
import { MessageContent } from "./MessageContent";
import { Avatar } from "./ui";

export function DiscordMessage({
  author,
  avatar,
  timestamp,
  badge,
  content,
  compact,
}: {
  author: string;
  avatar: string | null;
  timestamp?: ReactNode;
  badge?: ReactNode;
  content: string;
  compact?: boolean;
}) {
  return (
    <div className={`group flex gap-4 px-4 transition-colors hover:bg-black/20 ${compact ? "py-0.5" : "mt-4 py-1"}`}>
      <div className="w-10 shrink-0">
        {!compact && <Avatar src={avatar} name={author} size={40} />}
        {compact && timestamp && (
          <span className="invisible block pt-1 text-right text-[10px] text-mute group-hover:visible">{timestamp}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {!compact && (
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-medium text-ink hover:underline">{author}</span>
            {badge}
            {timestamp && <span className="text-xs text-mute">{timestamp}</span>}
          </div>
        )}
        <MessageContent content={content} />
      </div>
    </div>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="relative -top-px rounded bg-ok px-1.5 py-px text-[10px] font-semibold tracking-wide text-white uppercase">
      {children}
    </span>
  );
}
