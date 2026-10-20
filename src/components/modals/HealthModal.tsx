import { AlertTriangle, ArrowRight, Hash, ServerCrash } from "lucide-react";
import { useState } from "react";
import { useAccount, useStore } from "../../lib/store";
import type { EmojiIssue, EmojiIssueKind, HealthReport } from "../../lib/types";
import { EmojiImg } from "../MessageContent";
import { Button, Modal } from "../ui";

const KIND: Record<EmojiIssueKind, { label: string; tone: string }> = {
  renamed: { label: "Renamed", tone: "bg-warn/15 text-warn" },
  replaced: { label: "Re-uploaded", tone: "bg-warn/15 text-warn" },
  deleted: { label: "Deleted", tone: "bg-bad/15 text-bad" },
};

function Check({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="size-4 shrink-0 cursor-pointer accent-[var(--color-accent)]"
    />
  );
}

function IssueRow({ issue, channelNames, checked, onChange }: { issue: EmojiIssue; channelNames: string; checked: boolean; onChange: (v: boolean) => void }) {
  const old = { id: issue.emojiId, name: issue.oldName, animated: issue.oldTag.startsWith("<a:") };
  const next = issue.newTag?.match(/<(a?):(\w+):(\d+)>/);
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-md bg-rail px-3 py-2.5 hover:bg-hover">
      <Check checked={checked} onChange={onChange} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={issue.kind === "deleted" ? "opacity-40 grayscale" : ""}>
            <EmojiImg {...old} size={22} />
          </span>
          <span className={issue.kind === "deleted" ? "text-sub line-through" : "text-sub"}>:{issue.oldName}:</span>
          {next && (
            <>
              <ArrowRight className="size-3.5 text-mute" />
              <EmojiImg id={next[3]} name={next[2]} animated={next[1] === "a"} size={22} />
              <span className="text-ink">:{next[2]}:</span>
            </>
          )}
          <span className={`rounded px-1.5 text-[10px] font-semibold uppercase ${KIND[issue.kind].tone}`}>{KIND[issue.kind].label}</span>
        </div>
        <div className="mt-0.5 truncate text-xs text-mute">
          {issue.newTag ? "Will be updated" : "Will be removed"} in {channelNames}
          {issue.serverName && <> · {issue.serverName}</>}
        </div>
      </div>
    </label>
  );
}

export function HealthModal({
  accountId,
  report,
  startAfter,
  onClose,
}: {
  accountId: string;
  report: HealthReport;
  startAfter: boolean;
  onClose: () => void;
}) {
  const account = useAccount(accountId);
  const update = useStore((s) => s.update);
  const applyEmojiFixes = useStore((s) => s.applyEmojiFixes);
  const start = useStore((s) => s.start);
  const toast = useStore((s) => s.toast);
  const [fix, setFix] = useState<Record<string, boolean>>(() => Object.fromEntries(report.emojiIssues.map((i) => [i.oldTag, true])));
  const [disableBroken, setDisableBroken] = useState(true);

  const nameOf = (id: string) => {
    const c = account?.channels.find((x) => x.id === id);
    return `#${c?.name || id}`;
  };

  async function proceed(applyChanges: boolean) {
    if (applyChanges) {
      const fixes = report.emojiIssues.filter((i) => fix[i.oldTag]).map((i) => ({ oldTag: i.oldTag, newTag: i.newTag }));
      applyEmojiFixes(fixes);
      if (disableBroken && report.channelIssues.length) {
        const broken = new Set(report.channelIssues.map((c) => c.channelId));
        update((d) => {
          for (const c of d.accounts.find((a) => a.id === accountId)?.channels ?? []) if (broken.has(c.id)) c.enabled = false;
        });
      }
      toast("ok", "Fixes applied");
    }
    onClose();
    if (startAfter) await start(accountId);
  }

  return (
    <Modal
      title={startAfter ? "Before you start…" : "Health check"}
      subtitle="Some things changed since you set up your messages."
      onClose={onClose}
      width="w-[600px]"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {startAfter && <Button variant="secondary" onClick={() => proceed(false)}>Start anyway</Button>}
          <Button onClick={() => proceed(true)}>{startAfter ? "Fix & Start" : "Apply fixes"}</Button>
        </>
      }
    >
      <div className="space-y-5">
        {report.emojiIssues.length > 0 && (
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wide text-sub uppercase">
              <AlertTriangle className="size-3.5 text-warn" /> Emoji changes · {report.emojiIssues.length}
            </h3>
            <div className="space-y-1.5">
              {report.emojiIssues.map((i) => (
                <IssueRow
                  key={i.oldTag}
                  issue={i}
                  channelNames={i.channelIds.map(nameOf).join(", ")}
                  checked={!!fix[i.oldTag]}
                  onChange={(v) => setFix((f) => ({ ...f, [i.oldTag]: v }))}
                />
              ))}
            </div>
          </section>
        )}

        {report.channelIssues.length > 0 && (
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wide text-sub uppercase">
              <Hash className="size-3.5 text-bad" /> Channel problems · {report.channelIssues.length}
            </h3>
            <div className="space-y-1.5">
              {report.channelIssues.map((c) => (
                <div key={c.channelId} className="rounded-md bg-rail px-3 py-2.5">
                  <div className="text-sm text-ink">#{c.channelName || c.channelId}</div>
                  <div className="text-xs text-bad">{c.error}</div>
                </div>
              ))}
            </div>
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-sub">
              <Check checked={disableBroken} onChange={setDisableBroken} /> Disable these channels
            </label>
          </section>
        )}

        {report.serverErrors.length > 0 && (
          <section className="rounded-md border border-line px-3 py-2.5 text-xs text-sub">
            <div className="mb-1 flex items-center gap-2 font-semibold text-ink">
              <ServerCrash className="size-3.5" /> Couldn't refresh some servers
            </div>
            {report.serverErrors.map((s) => (
              <div key={s.serverId}>
                {s.serverName}: {s.error}
              </div>
            ))}
          </section>
        )}

        <p className="text-xs text-mute">
          Checked {report.checkedEmojis} emoji(s){report.unverified > 0 && <>, {report.unverified} from servers not in your library couldn't be fully verified</>}.
        </p>
      </div>
    </Modal>
  );
}
