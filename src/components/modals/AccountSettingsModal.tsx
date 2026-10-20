import { ChevronLeft, ChevronRight, EyeOff, Feather, RotateCw, ShieldCheck, Timer, Trash2, User } from "lucide-react";
import { useState, type ReactNode } from "react";
import { api, errorText } from "../../lib/api";
import { identity } from "../../lib/hooks";
import { useAccount, useStore } from "../../lib/store";
import type { Account, Settings } from "../../lib/types";
import { Avatar, Button, Field, Input, Modal, SwitchRow, tap } from "../ui";
import { displayName, TokenHelp, TokenInput } from "./AddAccountModal";

type Tab = "account" | "timing" | "privacy" | "performance" | "danger";

const TABS: { id: Tab; label: string; hint: string; icon: ReactNode }[] = [
  { id: "account", label: "My Account", hint: "Profile and token", icon: <User className="size-4" /> },
  { id: "timing", label: "Timing & Safety", hint: "Delays, breaks and auto-stop", icon: <Timer className="size-4" /> },
  { id: "privacy", label: "Privacy", hint: "Anonymous mode", icon: <EyeOff className="size-4" /> },
  { id: "performance", label: "Performance", hint: "Minimal mode", icon: <Feather className="size-4" /> },
  { id: "danger", label: "Remove Account", hint: "Delete this account from the app", icon: <Trash2 className="size-4" /> },
];

function NumberField({ label, hint, value, onChange, min = 0 }: { label: string; hint: string; value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <Field label={label} hint={hint}>
      <Input type="number" min={min} value={Number.isFinite(value) ? value : ""} onChange={(e) => onChange(e.target.valueAsNumber)} />
    </Field>
  );
}

export function AccountSettingsModal({ accountId, onClose }: { accountId: string; onClose: () => void }) {
  const account = useAccount(accountId);
  const update = useStore((s) => s.update);
  const stop = useStore((s) => s.stop);
  const setView = useStore((s) => s.setView);
  const toast = useStore((s) => s.toast);
  const accounts = useStore((s) => s.config.accounts);
  const anonymous = useStore((s) => s.config.anonymous);
  const minimal = useStore((s) => s.config.minimal);
  const launchedMinimal = useStore((s) => s.launchedMinimal);
  const anyRunning = useStore((s) => Object.values(s.statuses).some((b) => b.running));
  const [tab, setTab] = useState<Tab>("account");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Account | null>(account ?? null);
  const [verifying, setVerifying] = useState(false);
  const [confirm, setConfirm] = useState(false);

  if (!account || !draft) return null;

  const dirty = draft.token !== account.token || JSON.stringify(draft.settings) !== JSON.stringify(account.settings);
  const who = identity(draft, accounts, anonymous, 128);
  const set = (patch: Partial<Settings>) => setDraft({ ...draft, settings: { ...draft.settings, ...patch } });

  async function save() {
    if (!draft) return;
    const s = draft.settings;
    if (![s.betweenCooldown, s.betweenVariance, s.channelVariance, s.timerMinutes].every((n) => Number.isFinite(n) && n >= 0) || s.betweenCooldown < 1 || s.timerMinutes < 1) {
      toast("error", "Please enter valid positive numbers");
      return;
    }
    let user = draft.user;
    if (draft.token !== account!.token) {
      setVerifying(true);
      try {
        user = await api.me(draft.token.trim());
      } catch (e) {
        toast("error", errorText(e));
        return;
      } finally {
        setVerifying(false);
      }
    }
    update((d) => {
      const idx = d.accounts.findIndex((a) => a.id === accountId);
      if (idx >= 0) d.accounts[idx] = { ...d.accounts[idx], name: user ? displayName(user) : d.accounts[idx].name, token: draft.token.trim(), user, settings: draft.settings };
    });
    setDraft({ ...draft, user, name: user ? displayName(user) : draft.name });
    toast("ok", "Settings saved");
  }

  async function remove() {
    await stop(accountId);
    update((d) => void (d.accounts = d.accounts.filter((a) => a.id !== accountId)));
    setView({ kind: "library" });
    onClose();
  }

  return (
    <Modal onClose={onClose} width="w-[880px]">
      <div className="-mx-6 -mb-4 flex h-[600px] max-h-[calc(88vh-1rem)] max-md:h-auto max-md:max-h-[calc(92dvh-1.25rem)] max-md:flex-col">
        <nav
          className={`w-56 shrink-0 bg-side px-3 py-6 max-md:w-full max-md:flex-1 max-md:overflow-y-auto max-md:bg-chat max-md:px-4 max-md:pt-1 max-md:pb-6 ${
            open ? "max-md:hidden" : ""
          }`}
        >
          <div className="px-2.5 pb-1.5 text-xs font-semibold tracking-wide text-mute uppercase max-md:hidden">{who.name}</div>
          <div className="mb-5 flex items-center gap-3 pr-8 md:hidden">
            <Avatar src={who.avatar} name={who.name} size={52} />
            <div className="min-w-0">
              <div className="truncate text-lg font-bold text-ink">{who.name}</div>
              <div className="truncate text-sm text-sub">{who.handle ?? "Account settings"}</div>
            </div>
          </div>
          <div className="max-md:divide-y max-md:divide-line/60 max-md:overflow-hidden max-md:rounded-xl max-md:bg-side">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  setOpen(true);
                }}
                className={`mt-0.5 flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[15px] transition-colors max-md:mt-0 max-md:gap-3 max-md:rounded-none max-md:px-4 max-md:py-3 max-md:text-ink max-md:active:bg-hover ${
                  tab === t.id ? "md:bg-active md:text-ink" : "text-sub hover:bg-hover hover:text-ink"
                } ${t.id === "danger" ? "text-bad!" : ""}`}
              >
                <span className="max-md:grid max-md:size-8 max-md:shrink-0 max-md:place-items-center max-md:rounded-lg max-md:bg-raised">{t.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block">{t.label}</span>
                  <span className="block truncate text-xs text-mute md:hidden">{t.hint}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-mute md:hidden" />
              </button>
            ))}
          </div>
        </nav>

        <div className={`relative min-w-0 flex-1 overflow-y-auto px-5 pt-1 pb-6 md:px-10 md:py-8 ${open ? "" : "max-md:hidden"}`}>
          <button onClick={() => setOpen(false)} className="mb-4 -ml-1 flex h-8 items-center gap-1 text-sm font-medium text-sub hover:text-ink md:hidden">
            <ChevronLeft className="size-5" /> Settings
          </button>
          {tab === "account" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-ink">My Account</h2>
              <div className="overflow-hidden rounded-lg bg-rail">
                <div className="h-24 bg-gradient-to-r from-accent via-[#6e0a1a] to-[#1a0507]" />
                <div className="flex items-end gap-4 px-4 pb-4">
                  <Avatar
                    src={who.avatar}
                    name={who.name}
                    size={84}
                    className="-mt-10 border-[6px] border-rail"
                  />
                  <div className="pb-1">
                    <div className="text-xl font-bold text-ink">{who.name}</div>
                    {who.handle && <div className="text-sm text-sub">{who.handle}</div>}
                  </div>
                </div>
              </div>
              <Field label="Token" hint="Changing the token re-verifies it when you save.">
                <TokenInput value={draft.token} onChange={(token) => setDraft({ ...draft, token })} />
              </Field>
              <TokenHelp />
            </div>
          )}

          {tab === "timing" && (
            <div className="space-y-6 pb-16">
              <h2 className="text-xl font-bold text-ink">Timing & Safety</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <NumberField label="Between-channel delay" hint="Base seconds between channels." min={1} value={draft.settings.betweenCooldown} onChange={(v) => set({ betweenCooldown: v })} />
                <NumberField label="Delay variance" hint="± seconds added at random." value={draft.settings.betweenVariance} onChange={(v) => set({ betweenVariance: v })} />
                <NumberField label="Cooldown extra" hint="Adds 0–N seconds to each channel cooldown." value={draft.settings.channelVariance} onChange={(v) => set({ channelVariance: v })} />
                <NumberField label="Auto-stop after (min)" hint="Used when the timer is on." min={1} value={draft.settings.timerMinutes} onChange={(v) => set({ timerMinutes: v })} />
              </div>
              <div className="rounded-lg bg-rail px-4">
                <SwitchRow title="Randomized timing" description="Applies variance to delays and cooldowns." checked={draft.settings.antiDetection} onChange={(v) => set({ antiDetection: v })} />
                <SwitchRow title="Take breaks" description="Pauses 1–2.5 minutes every 15–25 posts." checked={draft.settings.breaksEnabled} onChange={(v) => set({ breaksEnabled: v })} />
                <SwitchRow title="Auto-stop timer" description={`Stops the bot after ${draft.settings.timerMinutes || 0} minutes.`} checked={draft.settings.timerEnabled} onChange={(v) => set({ timerEnabled: v })} />
              </div>
              <p className="flex items-center gap-2 text-xs text-mute">
                <ShieldCheck className="size-4" /> Before each start, emojis and channels are checked for renames, re-uploads and deletions.
              </p>
            </div>
          )}

          {tab === "privacy" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-ink">Privacy</h2>
              <div className="rounded-lg bg-rail px-4">
                <SwitchRow
                  title="Anonymous mode"
                  description="Hides Discord profile pictures, names and message times everywhere in the app. Handy for screenshots and streaming. Applies to every account."
                  checked={anonymous}
                  onChange={(v) => update((d) => void (d.anonymous = v))}
                />
              </div>
              <p className="flex items-center gap-2 text-xs text-mute">
                <EyeOff className="size-4" /> {tap("Hidden times show as “hidden”. Click one to reveal it.")}
              </p>
            </div>
          )}

          {tab === "performance" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-ink">Performance</h2>
              <div className="rounded-lg bg-rail px-4">
                <SwitchRow
                  title="Minimal mode"
                  description="Uses less RAM, CPU, GPU and data while posting exactly the same messages. Applies to every account."
                  checked={minimal}
                  onChange={(v) => update((d) => void (d.minimal = v))}
                />
              </div>
              <ul className="space-y-1.5 text-xs text-mute">
                <li>• No animations, blur or transitions, and timers tick once a second</li>
                <li>• Animated emojis show as still images, and all images download smaller</li>
                <li>• Skips the “typing…” request before each post</li>
                <li>• Pre-start checks download only emoji lists and share one request per server</li>
                <li>• Turns off the GPU process and uses one web process; drops to low memory while minimized</li>
                <li>• Keeps a shorter activity log and skips the profile refresh on launch</li>
              </ul>
              {minimal !== launchedMinimal && (
                <div className="flex items-center gap-3 rounded-lg border border-warn/30 bg-warn/10 p-3">
                  <RotateCw className="size-5 shrink-0 text-warn" />
                  <div className="min-w-0 flex-1 text-sm text-ink">
                    Restart to apply the GPU and memory settings.
                    {anyRunning && <div className="text-xs text-sub">Restarting stops the running bots.</div>}
                  </div>
                  <Button variant="secondary" onClick={() => void api.restartApp()}>
                    Restart now
                  </Button>
                </div>
              )}
            </div>
          )}

          {tab === "danger" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-ink">Remove Account</h2>
              <p className="text-sm text-sub">This stops the bot and deletes this account and its {account.channels.length} channel(s) from the app. Your emoji library is kept.</p>
              <Button variant="danger" onClick={() => (confirm ? remove() : setConfirm(true))}>
                <Trash2 className="size-4" /> {confirm ? tap("Click again to confirm") : "Remove Account"}
              </Button>
            </div>
          )}

          {dirty && (
            <div className="sticky bottom-0 mt-6 flex animate-rise items-center gap-3 rounded-lg bg-[#0b0809] p-3 pl-4 shadow-2xl shadow-black">
              <span className="flex-1 text-sm text-ink">Careful — you have unsaved changes!</span>
              <Button variant="ghost" onClick={() => setDraft(account)}>Reset</Button>
              <Button variant="success" loading={verifying} onClick={save}>Save Changes</Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
