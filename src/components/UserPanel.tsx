import { Loader2, Play, Settings, Square } from "lucide-react";
import { duration } from "../lib/format";
import { botState, identity, useBotStatus, useNow } from "../lib/hooks";
import { useStore } from "../lib/store";
import { Tooltip } from "./Tooltip";
import { Avatar, IconButton, StatusDot } from "./ui";

export function UserPanel() {
  const account = useStore((s) => s.config.accounts.find((a) => a.id === s.lastAccountId) ?? s.config.accounts[0]);
  const checking = useStore((s) => (account ? s.checking[account.id] : false));
  const preflight = useStore((s) => s.preflight);
  const stop = useStore((s) => s.stop);
  const setView = useStore((s) => s.setView);
  const openModal = useStore((s) => s.openModal);
  const status = useBotStatus(account?.id);
  const now = useNow(1000);
  const compact = useStore((s) => s.view.kind === "about");
  const nav = useStore((s) => s.nav);
  const accounts = useStore((s) => s.config.accounts);
  const anonymous = useStore((s) => s.config.anonymous);

  if (!account) return null;

  const state = botState(status);
  const who = identity(account, accounts, anonymous);
  const line =
    state === "break" && status?.breakUntil
      ? `On break · ${duration(status.breakUntil - now)}`
      : state === "running"
        ? status?.endsAt
          ? `Running · ${duration(status.endsAt - now)} left`
          : `Running · ${status?.totalPosts ?? 0} sent`
        : checking
          ? "Running checks…"
          : "Idle";

  if (compact) {
    return (
      <div className={`absolute bottom-2 left-2 z-20 grid h-14 w-14 animate-rise max-md:fixed max-md:z-30 ${nav ? "" : "max-md:hidden"} place-items-center rounded-lg border border-line/70 bg-[#1b1415]/95 shadow-xl shadow-black/60 backdrop-blur`}>
        <Tooltip label={`${who.name} · ${line}`} side="right">
          <button onClick={() => setView({ kind: "account", id: account.id })} aria-label={`Open ${who.name}`} className="relative rounded-full">
            <Avatar src={who.avatar} name={who.name} size={36} />
            <StatusDot state={state} ring="border-[#1b1415]" />
          </button>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className={`absolute bottom-2 left-2 z-20 flex h-14 w-74 animate-rise max-md:fixed max-md:z-30 ${nav ? "" : "max-md:hidden"} items-center gap-1 rounded-lg border border-line/70 bg-[#1b1415]/95 px-1.5 shadow-xl shadow-black/60 backdrop-blur`}>
      <button
        onClick={() => setView({ kind: "account", id: account.id })}
        aria-label={`Open ${who.name}`}
        className="group flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 pr-2 pl-1 text-left transition-colors hover:bg-hover"
      >
        <div className="relative shrink-0">
          <Avatar src={who.avatar} name={who.name} size={32} />
          <StatusDot state={state} ring="border-[#1b1415]" />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-semibold text-ink">{who.name}</div>
          <div className="relative h-4 overflow-hidden text-xs">
            <span
              className={`absolute inset-0 truncate transition-transform duration-200 group-hover:-translate-y-full ${
                state === "running" ? "text-ok" : state === "break" ? "text-warn" : "text-mute"
              }`}
            >
              {line}
            </span>
            <span className="absolute inset-0 translate-y-full truncate text-sub transition-transform duration-200 group-hover:translate-y-0">
              {who.handle ?? (anonymous ? "Anonymous mode" : who.name)}
            </span>
          </div>
        </div>
      </button>

      {status?.running ? (
        <IconButton label="Stop" onClick={() => stop(account.id)} className="text-accent! hover:bg-accent-soft!">
          <Square className="size-4 fill-current" />
        </IconButton>
      ) : (
        <IconButton data-tour="start-button" label="Start" disabled={checking} onClick={() => preflight(account.id, true)} className="text-ok! hover:bg-ok/15!">
          {checking ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4 fill-current" />}
        </IconButton>
      )}
      <IconButton label="Account Settings" onClick={() => openModal({ type: "accountSettings", accountId: account.id })}>
        <Settings className="size-4.5" />
      </IconButton>
    </div>
  );
}
