import { Check, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, errorText } from "../../lib/api";
import { guildIconUrl } from "../../lib/emoji";
import { useStore } from "../../lib/store";
import type { GuildSummary } from "../../lib/types";
import { Avatar, Button, Field, Input, Modal } from "../ui";

export function AddServerModal({ onClose }: { onClose: () => void }) {
  const servers = useStore((s) => s.config.servers);
  const token = useStore((s) => s.token)();
  const addServer = useStore((s) => s.addServer);
  const selectServer = useStore((s) => s.selectServer);
  const toast = useStore((s) => s.toast);
  const [guilds, setGuilds] = useState<GuildSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [manualId, setManualId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.guilds(token).then(setGuilds, (e) => setError(errorText(e)));
  }, [token]);

  const saved = useMemo(() => new Set(servers.map((s) => s.id)), [servers]);
  const filtered = (guilds ?? []).filter((g) => g.name.toLowerCase().includes(query.toLowerCase()));

  async function add(id: string) {
    if (!token) return;
    setBusy(id);
    try {
      const server = await api.guild(token, id);
      addServer(server);
      selectServer(server.id);
      toast("ok", `Pulled ${server.emojis.length} emojis from ${server.name}`);
    } catch (e) {
      toast("error", errorText(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal
      title="Add a server"
      subtitle="Pick a server you're in — all of its emojis get pulled in automatically."
      onClose={onClose}
      width="w-[520px]"
      footer={<Button variant="secondary" onClick={onClose}>Done</Button>}
    >
      {!token ? (
        <p className="py-6 text-center text-sm text-sub">Add an account first so servers can be loaded.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex h-10 items-center gap-2 rounded-md border border-line bg-rail px-3 focus-within:border-accent">
            <Search className="size-4 text-mute" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your servers"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-mute"
            />
          </div>

          <div className="h-72 overflow-y-auto rounded-md bg-rail p-1">
            {error && <p className="p-4 text-sm text-bad">{error}</p>}
            {!guilds && !error && <p className="p-4 text-center text-sm text-mute">Loading servers…</p>}
            {filtered.map((g) => (
              <div key={g.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-hover">
                <Avatar src={guildIconUrl(g.id, g.icon, 64)} name={g.name} size={36} />
                <span className="flex-1 truncate text-sm text-ink">{g.name}</span>
                {saved.has(g.id) ? (
                  <Button variant="secondary" className="h-8" loading={busy === g.id} onClick={() => add(g.id)}>
                    <Check className="size-4 text-ok" /> Re-sync
                  </Button>
                ) : (
                  <Button className="h-8" loading={busy === g.id} onClick={() => add(g.id)}>
                    Add
                  </Button>
                )}
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualId.trim()) add(manualId.trim());
            }}
          >
            <Field label="Or add by server ID">
              <div className="flex gap-2">
                <Input value={manualId} onChange={(e) => setManualId(e.target.value)} placeholder="123456789012345678" />
                <Button type="submit" variant="secondary" loading={busy === manualId.trim()} disabled={!manualId.trim()}>
                  Add
                </Button>
              </div>
            </Field>
          </form>
        </div>
      )}
    </Modal>
  );
}
