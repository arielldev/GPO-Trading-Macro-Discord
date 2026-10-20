import { ChevronRight, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { api, errorText } from "../../lib/api";
import { avatarUrl } from "../../lib/emoji";
import { useStore } from "../../lib/store";
import { DEFAULT_SETTINGS, type DiscordUser } from "../../lib/types";
import { Avatar, Button, Field, Input, Modal } from "../ui";

export function displayName(user: DiscordUser): string {
  return user.globalName ?? user.username;
}

export function TokenInput({
  value,
  onChange,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        data-tour="token-input"
        autoFocus={autoFocus}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste your Discord token"
        className="pr-10 font-mono"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide token" : "Show token"}
        className="absolute top-1/2 right-3 -translate-y-1/2 text-mute hover:text-ink"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function TokenHelp() {
  return (
    <details className="group mt-3 rounded-md bg-rail px-3 py-2 text-xs text-sub">
      <summary className="flex cursor-pointer list-none items-center gap-1 font-medium text-sub hover:text-ink">
        <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
        How do I get my token?
      </summary>
      <ol className="mt-2 ml-5 list-decimal space-y-1">
        <li>Open discord.com in Chrome and press F12.</li>
        <li>Go to the Network tab and send a message in any channel.</li>
        <li>Click the “messages” request and find Request Headers.</li>
        <li>Copy the Authorization value.</li>
      </ol>
    </details>
  );
}

export function AddAccountModal({ onClose }: { onClose: () => void }) {
  const update = useStore((s) => s.update);
  const setView = useStore((s) => s.setView);
  const anonymous = useStore((s) => s.config.anonymous);
  const nextNumber = useStore((s) => s.config.accounts.length + 1);
  const [token, setToken] = useState("");
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    setLoading(true);
    setError(null);
    try {
      setUser(await api.me(token.trim()));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }

  function add() {
    if (!user) return;
    const id = crypto.randomUUID();
    update((d) => {
      d.accounts.push({
        id,
        name: displayName(user),
        token: token.trim(),
        user,
        settings: { ...DEFAULT_SETTINGS },
        channels: [],
      });
    });
    setView({ kind: "account", id });
    onClose();
  }

  return (
    <Modal
      title={user ? "Looks good!" : "Add an account"}
      subtitle={
        user
          ? "This is the Discord account that will post."
          : "Connect a Discord account to schedule messages from it."
      }
      onClose={onClose}
      footer={
        user ? (
          <>
            <Button variant="ghost" onClick={() => setUser(null)}>
              Back
            </Button>
            <Button data-tour="account-add" onClick={add} autoFocus>
              Add Account
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              data-tour="account-continue"
              loading={loading}
              disabled={!token.trim()}
              onClick={verify}
            >
              Continue
            </Button>
          </>
        )
      }
    >
      {user ? (
        <div data-tour="account-profile">
          <div className="overflow-hidden rounded-lg bg-rail">
            <div className="h-16 bg-gradient-to-r from-accent to-[#3a0710]" />
            <div className="flex items-end gap-3 px-4 pb-4">
              <Avatar
                src={anonymous ? null : avatarUrl(user.id, user.avatar, 128)}
                name={anonymous ? `Account ${nextNumber}` : user.username}
                size={72}
                className="-mt-9 border-[6px] border-rail"
              />
              <div className="pb-1">
                <div className="text-lg font-bold text-ink">
                  {anonymous ? `Account ${nextNumber}` : displayName(user)}
                </div>
                <div className="text-sm text-sub">
                  {anonymous ? "Hidden by Anonymous mode" : `@${user.username}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (token.trim()) verify();
          }}
        >
          <div className="mb-4 flex gap-3 rounded-lg border border-warn/30 bg-warn/10 p-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warn" />
            <div>
              <div className="text-sm font-semibold text-warn">
                Highly suggested: use an alt account
              </div>
              <p className="mt-0.5 text-xs text-sub">
                Automated posting may get a Discord account flagged Use a spare
                account, not your main.
              </p>
            </div>
          </div>
          <Field label="Token" hint="Stored locally on this computer only.">
            <TokenInput value={token} onChange={setToken} autoFocus />
          </Field>
          {error && <p className="mt-2 text-sm text-bad">{error}</p>}
          <TokenHelp />
        </form>
      )}
    </Modal>
  );
}
