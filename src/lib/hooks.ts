import { useEffect, useState } from "react";
import { avatarUrl } from "./emoji";
import { useStore } from "./store";
import type { Account, BotStatus } from "./types";

export function useNow(interval = 500): number {
  const minimal = useStore((s) => s.config.minimal);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const ms = minimal ? Math.max(interval, 1000) : interval;
    let id: number | undefined;
    const sync = () => {
      window.clearInterval(id);
      id = undefined;
      if (document.visibilityState !== "visible") return;
      setNow(Date.now());
      id = window.setInterval(() => setNow(Date.now()), ms);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [interval, minimal]);
  return now;
}

export function botState(status: BotStatus | undefined): "running" | "break" | "idle" {
  if (!status?.running) return "idle";
  return status.breakUntil ? "break" : "running";
}

export function useBotStatus(accountId: string | undefined): BotStatus | undefined {
  return useStore((s) => (accountId ? s.statuses[accountId] : undefined));
}

export interface Identity {
  name: string;
  handle: string | null;
  avatar: string | null;
}

export function identity(account: Account, accounts: Account[], anonymous: boolean, size?: number): Identity {
  if (anonymous) return { name: `Account ${accounts.findIndex((a) => a.id === account.id) + 1}`, handle: null, avatar: null };
  const u = account.user;
  return { name: u?.globalName ?? u?.username ?? account.name, handle: u ? `@${u.username}` : null, avatar: u ? avatarUrl(u.id, u.avatar, size) : null };
}

export function useIdentity(account: Account, size?: number): Identity {
  const accounts = useStore((s) => s.config.accounts);
  const anonymous = useStore((s) => s.config.anonymous);
  return identity(account, accounts, anonymous, size);
}
