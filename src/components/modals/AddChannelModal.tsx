import { ChevronLeft, Hash, Megaphone, Search, Timer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, errorText } from "../../lib/api";
import { guildIconUrl } from "../../lib/emoji";
import { duration } from "../../lib/format";
import { useAccount, useStore } from "../../lib/store";
import type { ChannelInfo, GuildSummary } from "../../lib/types";
import { Avatar, Button, Field, Input, Modal, Toggle } from "../ui";
import { Tooltip } from "../Tooltip";

const CATEGORY = 4;
const ANNOUNCEMENT = 5;

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex h-10 items-center gap-2 rounded-md border border-line bg-rail px-3 focus-within:border-accent">
      <Search className="size-4 text-mute" />
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-mute"
      />
    </div>
  );
}

export function AddChannelModal({ accountId, onClose }: { accountId: string; onClose: () => void }) {
  const account = useAccount(accountId);
  const servers = useStore((s) => s.config.servers);
  const update = useStore((s) => s.update);
  const addServer = useStore((s) => s.addServer);
  const selectChannel = useStore((s) => s.selectChannel);
  const toast = useStore((s) => s.toast);
  const token = account?.token ?? "";

  const [guilds, setGuilds] = useState<GuildSummary[] | null>(null);
  const [guild, setGuild] = useState<GuildSummary | null>(null);
  const [channels, setChannels] = useState<ChannelInfo[] | null>(null);
  const [picked, setPicked] = useState<ChannelInfo | null>(null);
  const [query, setQuery] = useState("");
  const [manualId, setManualId] = useState("");
  const [cooldown, setCooldown] = useState("30");
  const [pullEmojis, setPullEmojis] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.guilds(token).then(setGuilds, (e) => setError(errorText(e)));
  }, [token]);

  const savedIds = useMemo(() => new Set(servers.map((s) => s.id)), [servers]);
  const existing = useMemo(() => new Set(account?.channels.map((c) => c.id)), [account]);

  const sortedGuilds = useMemo(
    () =>
      (guilds ?? [])
        .filter((g) => g.name.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => Number(savedIds.has(b.id)) - Number(savedIds.has(a.id))),
    [guilds, query, savedIds],
  );

  const grouped = useMemo(() => {
    if (!channels) return [];
    const q = query.toLowerCase();
    const cats = channels.filter((c) => c.kind === CATEGORY);
    const text = channels.filter((c) => c.kind !== CATEGORY && (c.name ?? "").toLowerCase().includes(q));
    const groups: { name: string; items: ChannelInfo[] }[] = [{ name: "", items: text.filter((c) => !c.parentId) }];
    for (const cat of cats) groups.push({ name: cat.name ?? "", items: text.filter((c) => c.parentId === cat.id) });
    return groups.filter((g) => g.items.length);
  }, [channels, query]);

  function pick(c: ChannelInfo) {
    setPicked(c);
    setCooldown(String(c.rateLimitPerUser > 0 ? c.rateLimitPerUser : 30));
  }

  async function openGuild(g: GuildSummary) {
    setGuild(g);
    setQuery("");
    setChannels(null);
    setPicked(null);
    setPullEmojis(!savedIds.has(g.id));
    try {
      setChannels(await api.guildChannels(token, g.id));
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function lookup() {
    setLoading(true);
    setError(null);
    try {
      const info = await api.channel(token, manualId.trim());
      const g = info.guildId ? (guilds?.find((x) => x.id === info.guildId) ?? null) : null;
      setGuild(g);
      pick(info);
      setPullEmojis(!!info.guildId && !savedIds.has(info.guildId));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }

  async function add() {
    if (!picked) return;
    const cd = Number(cooldown);
    if (!Number.isFinite(cd) || cd < 1) {
      toast("error", "Cooldown must be a positive number");
      return;
    }
    if (existing.has(picked.id)) {
      toast("error", "This channel is already added");
      return;
    }
    setLoading(true);
    const guildId = picked.guildId ?? guild?.id ?? null;
    if (pullEmojis && guildId) {
      try {
        const server = await api.guild(token, guildId);
        addServer(server);
        toast("ok", `Pulled ${server.emojis.length} emojis from ${server.name}`);
      } catch (e) {
        toast("error", `Couldn't pull emojis: ${errorText(e)}`);
      }
    }
    update((d) => {
      d.accounts
        .find((a) => a.id === accountId)
        ?.channels.push({
          id: picked.id,
          name: picked.name ?? "",
          guildId,
          guildName: guild?.name ?? null,
          messages: [],
          cooldown: Math.round(cd),
          slowmode: picked.rateLimitPerUser,
          enabled: true,
        });
    });
    selectChannel(accountId, picked.id);
    onClose();
  }

  const step = picked ? "confirm" : guild ? "channel" : "server";

  return (
    <Modal
      title={step === "server" ? "Where do you want to post?" : step === "channel" ? guild?.name : "Almost there"}
      subtitle={step === "server" ? "Pick a server, then a channel." : step === "channel" ? "Pick a text channel." : undefined}
      onClose={onClose}
      width="w-[520px]"
      footer={
        <>
          {step !== "server" && (
            <Button
              variant="ghost"
              className="mr-auto"
              onClick={() => {
                if (picked) setPicked(null);
                else setGuild(null);
                setQuery("");
              }}
            >
              <ChevronLeft className="size-4" /> Back
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {step === "confirm" && (
            <Button data-tour="channel-add" loading={loading} onClick={add}>
              Add Channel
            </Button>
          )}
        </>
      }
    >
      {error && <p className="mb-3 rounded-md bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}

      {step === "server" && (
        <div className="space-y-4">
          <SearchBox value={query} onChange={setQuery} placeholder="Search servers" />
          <div data-tour="server-list" className="h-64 overflow-y-auto rounded-md bg-rail p-1">
            {!guilds && !error && <p className="p-4 text-center text-sm text-mute">Loading servers…</p>}
            {sortedGuilds.map((g) => (
              <button key={g.id} onClick={() => openGuild(g)} className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-hover">
                <Avatar src={guildIconUrl(g.id, g.icon, 64)} name={g.name} size={36} />
                <span className="flex-1 truncate text-sm text-ink">{g.name}</span>
                {savedIds.has(g.id) && <span className="rounded bg-accent-soft px-1.5 text-[10px] font-semibold text-accent uppercase">In library</span>}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualId.trim()) lookup();
            }}
          >
            <Field label="Or paste a channel ID">
              <div className="flex gap-2">
                <Input value={manualId} onChange={(e) => setManualId(e.target.value)} placeholder="123456789012345678" />
                <Button type="submit" variant="secondary" className="h-10 shrink-0 whitespace-nowrap" loading={loading} disabled={!manualId.trim()}>
                  {!loading && <Search className="size-4" />}
                  Look up
                </Button>
              </div>
            </Field>
          </form>
        </div>
      )}

      {step === "channel" && (
        <div className="space-y-3">
          <SearchBox value={query} onChange={setQuery} placeholder="Search channels" />
          <div data-tour="channel-list" className="h-80 overflow-y-auto rounded-md bg-rail p-1">
            {!channels && !error && <p className="p-4 text-center text-sm text-mute">Loading channels…</p>}
            {grouped.map((g) => (
              <div key={g.name || "_"} className="mb-2">
                {g.name && <div className="px-2 pt-2 pb-1 text-xs font-semibold tracking-wide text-mute uppercase">{g.name}</div>}
                {g.items.map((c) => {
                  const added = existing.has(c.id);
                  return (
                    <button
                      key={c.id}
                      disabled={added}
                      onClick={() => pick(c)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sub hover:bg-hover hover:text-ink disabled:opacity-40"
                    >
                      {c.kind === ANNOUNCEMENT ? <Megaphone className="size-4" /> : <Hash className="size-4" />}
                      <span className="flex-1 truncate text-sm">{c.name}</span>
                      {c.rateLimitPerUser > 0 && (
                        <Tooltip label={`Slowmode: one message per ${duration(c.rateLimitPerUser * 1000)}`}>
                          <span className="flex items-center gap-1 text-xs text-mute">
                            <Timer className="size-3" /> {duration(c.rateLimitPerUser * 1000)}
                          </span>
                        </Tooltip>
                      )}
                      {added && <span className="text-xs">added</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {step === "confirm" && picked && (
        <div data-tour="channel-confirm" className="space-y-5">
          <div className="flex items-center gap-3 rounded-lg bg-rail p-3">
            {guild ? <Avatar src={guildIconUrl(guild.id, guild.icon, 64)} name={guild.name} size={40} /> : <Hash className="size-10 text-mute" />}
            <div className="min-w-0">
              <div className="flex items-center gap-1 font-semibold text-ink">
                <Hash className="size-4 text-mute" />
                <span className="truncate">{picked.name ?? picked.id}</span>
              </div>
              <div className="truncate text-xs text-sub">{guild?.name ?? "Unknown server"}</div>
            </div>
          </div>
          <Field
            label="Cooldown (seconds)"
            hint={
              picked.rateLimitPerUser > 0
                ? `Slowmode detected: ${duration(picked.rateLimitPerUser * 1000)} per message — cooldown set to match.`
                : "No slowmode in this channel. How long to wait between posts."
            }
          >
            <Input type="number" min={1} value={cooldown} onChange={(e) => setCooldown(e.target.value)} />
          </Field>
          {(picked.guildId ?? guild?.id) && (
            <div className="flex items-center justify-between gap-4 rounded-lg bg-rail p-3">
              <div>
                <div className="text-sm font-medium text-ink">Pull this server's emojis</div>
                <div className="text-xs text-mute">Adds every emoji from {guild?.name ?? "this server"} to your library.</div>
              </div>
              <Toggle checked={pullEmojis} onChange={setPullEmojis} label="Pull emojis" />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
