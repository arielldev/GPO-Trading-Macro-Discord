import { Trash2 } from "lucide-react";
import { useState } from "react";
import { duration } from "../../lib/format";
import { useAccount, useStore } from "../../lib/store";
import { Button, Field, Input, Modal, SwitchRow, tap } from "../ui";

const PRESETS = [30, 60, 300, 1200, 3600];

export function ChannelSettingsModal({ accountId, channelId, onClose }: { accountId: string; channelId: string; onClose: () => void }) {
  const account = useAccount(accountId);
  const channel = account?.channels.find((c) => c.id === channelId);
  const update = useStore((s) => s.update);
  const toast = useStore((s) => s.toast);
  const [cooldown, setCooldown] = useState(String(channel?.cooldown ?? 30));
  const [enabled, setEnabled] = useState(channel?.enabled ?? true);
  const [confirm, setConfirm] = useState(false);

  if (!channel) return null;
  const belowSlowmode = channel.slowmode > 0 && Number(cooldown) < channel.slowmode;
  const presets = channel.slowmode > 0 ? [...new Set([channel.slowmode, ...PRESETS])].sort((a, b) => a - b) : PRESETS;

  function save() {
    const cd = Number(cooldown);
    if (!Number.isFinite(cd) || cd < 1) {
      toast("error", "Cooldown must be a positive number");
      return;
    }
    update((d) => {
      const c = d.accounts.find((a) => a.id === accountId)?.channels.find((x) => x.id === channelId);
      if (c) {
        c.cooldown = Math.round(cd);
        c.enabled = enabled;
      }
    });
    onClose();
  }

  function remove() {
    update((d) => {
      const a = d.accounts.find((x) => x.id === accountId);
      if (a) a.channels = a.channels.filter((c) => c.id !== channelId);
    });
    onClose();
  }

  return (
    <Modal
      title={`#${channel.name || channel.id}`}
      subtitle={channel.guildName ?? undefined}
      onClose={onClose}
      footer={
        <>
          <Button variant={confirm ? "danger" : "ghost"} className="mr-auto" onClick={() => (confirm ? remove() : setConfirm(true))}>
            <Trash2 className="size-4" /> {confirm ? tap("Click again to delete") : "Delete Channel"}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field
          label="Cooldown (seconds)"
          hint={
            belowSlowmode ? (
              <span className="text-warn">Below the channel's {duration(channel.slowmode * 1000)} slowmode — the bot will wait for slowmode anyway.</span>
            ) : (
              `Posts every ${duration(Number(cooldown) * 1000 || 0)}${channel.slowmode ? ` · slowmode ${duration(channel.slowmode * 1000)}` : ""}. 20 min or more is treated as priority.`
            )
          }
        >
          <Input type="number" min={1} value={cooldown} onChange={(e) => setCooldown(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => setCooldown(String(p))}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                Number(cooldown) === p ? "bg-accent text-white" : "bg-raised text-sub hover:text-ink"
              }`}
            >
              {p === channel.slowmode ? `Slowmode · ${duration(p * 1000)}` : duration(p * 1000)}
            </button>
          ))}
        </div>
        <SwitchRow title="Enabled" description="Disabled channels are skipped while the bot runs." checked={enabled} onChange={setEnabled} />
        <p className="text-xs text-mute">Channel ID: <span className="font-mono select-text">{channel.id}</span></p>
      </div>
    </Modal>
  );
}
