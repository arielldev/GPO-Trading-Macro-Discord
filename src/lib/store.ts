import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import { api, errorText } from "./api";
import { applyFixes, diffServer, type EmojiDiff } from "./emoji";
import type { Account, BotStatus, Config, EmojiFix, HealthReport, LogEvent, Server } from "./types";

export type View = { kind: "library" } | { kind: "about" } | { kind: "account"; id: string };

export type Modal =
  | { type: "addAccount" }
  | { type: "accountSettings"; accountId: string }
  | { type: "addChannel"; accountId: string }
  | { type: "channelSettings"; accountId: string; channelId: string }
  | { type: "addServer" }
  | { type: "health"; accountId: string; report: HealthReport; startAfter: boolean };

export interface Toast {
  id: number;
  kind: "ok" | "error" | "info";
  text: string;
}

const LOG_CAP = 500;
const MINIMAL_LOG_CAP = 100;
const TOUR_KEY = "tour-complete";

function tourSeen(): boolean {
  try {
    return localStorage.getItem(TOUR_KEY) === "1";
  } catch {
    return false;
  }
}

interface Store {
  config: Config;
  launchedMinimal: boolean;
  ready: boolean;
  view: View;
  lastAccountId: string | null;
  selectedChannel: Record<string, string>;
  selectedServer: string | null;
  statuses: Record<string, BotStatus>;
  logs: Record<string, LogEvent[]>;
  unread: Record<string, number>;
  checking: Record<string, boolean>;
  showActivity: boolean;
  nav: boolean;
  modal: Modal | null;
  toasts: Toast[];
  tour: boolean;
  clipboard: string[];

  init: () => Promise<void>;
  update: (mutate: (draft: Config) => void) => void;
  setView: (view: View) => void;
  selectChannel: (accountId: string, channelId: string) => void;
  selectServer: (id: string | null) => void;
  openModal: (modal: Modal | null) => void;
  toggleActivity: () => void;
  setNav: (open: boolean) => void;
  endTour: (finished: boolean) => void;
  toast: (kind: Toast["kind"], text: string) => void;
  copyMacros: (macros: string[]) => void;
  clearLogs: (accountId: string) => void;
  refreshStatuses: () => Promise<void>;
  preflight: (accountId: string, startAfter: boolean) => Promise<void>;
  start: (accountId: string) => Promise<void>;
  stop: (accountId: string) => Promise<void>;
  applyEmojiFixes: (fixes: EmojiFix[]) => void;
  token: () => string | null;
  addServer: (server: Server) => void;
  syncServer: (id: string) => Promise<EmojiDiff | null>;
}

let toastSeq = 0;
let initialized = false;

export const useStore = create<Store>((set, get) => ({
  config: { accounts: [], servers: [], anonymous: false, minimal: false },
  launchedMinimal: false,
  ready: false,
  view: { kind: "library" },
  lastAccountId: null,
  selectedChannel: {},
  selectedServer: null,
  statuses: {},
  logs: {},
  unread: {},
  checking: {},
  showActivity: false,
  nav: false,
  modal: null,
  toasts: [],
  tour: false,
  clipboard: [],

  init: async () => {
    if (initialized) return;
    initialized = true;
    const config = await api.loadConfig();
    const first = config.accounts[0];
    const tour = !first && !tourSeen();
    set({ config, launchedMinimal: config.minimal, ready: true, tour, view: first ? { kind: "account", id: first.id } : { kind: "library" }, lastAccountId: first?.id ?? null });
    if (!first && !tour) set({ modal: { type: "addAccount" } });
    for (const acc of config.minimal ? [] : config.accounts) {
      if (!acc.token) continue;
      api.me(acc.token).then(
        (user) => {
          const name = user.globalName ?? user.username;
          if (JSON.stringify(user) === JSON.stringify(acc.user) && name === acc.name) return;
          get().update((d) => {
            const a = d.accounts.find((x) => x.id === acc.id);
            if (a) Object.assign(a, { user, name });
          });
        },
        () => {},
      );
    }

    await listen<LogEvent>("bot-log", ({ payload }) => {
      set((s) => {
        const id = payload.accountId;
        const list = [...(s.logs[id] ?? []), payload];
        const viewing = s.showActivity && s.view.kind === "account" && s.view.id === id;
        return {
          logs: { ...s.logs, [id]: list.slice(-(s.config.minimal ? MINIMAL_LOG_CAP : LOG_CAP)) },
          unread: viewing ? s.unread : { ...s.unread, [id]: (s.unread[id] ?? 0) + 1 },
        };
      });
    });
    await listen("bot-state", () => void get().refreshStatuses());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void get().refreshStatuses();
    });
    void get().refreshStatuses();
  },

  update: (mutate) => {
    const draft = structuredClone(get().config);
    mutate(draft);
    set({ config: draft });
    api.saveConfig(draft).catch((e) => get().toast("error", `Failed to save: ${errorText(e)}`));
  },

  setView: (view) =>
    set((s) =>
      view.kind === "account"
        ? { view, nav: false, lastAccountId: view.id, unread: s.showActivity ? { ...s.unread, [view.id]: 0 } : s.unread }
        : { view, nav: false },
    ),
  selectChannel: (accountId, channelId) => set((s) => ({ nav: false, selectedChannel: { ...s.selectedChannel, [accountId]: channelId } })),
  selectServer: (id) => set({ selectedServer: id, nav: false }),
  setNav: (nav) => set({ nav }),
  openModal: (modal) => set(modal ? { modal, nav: false } : { modal }),
  toggleActivity: () =>
    set((s) => {
      const open = !s.showActivity;
      const id = s.view.kind === "account" ? s.view.id : null;
      return { showActivity: open, unread: open && id ? { ...s.unread, [id]: 0 } : s.unread };
    }),

  endTour: (finished) => {
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {}
    set({ tour: false });
    if (finished) get().toast("ok", "Tour complete — you're all set!");
    else if (!get().config.accounts.length && !get().modal) set({ modal: { type: "addAccount" } });
  },

  toast: (kind, text) => {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts, { id, kind, text }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3600);
  },

  copyMacros: (macros) => {
    if (!macros.length) return;
    set({ clipboard: macros });
    navigator.clipboard.writeText(macros.join("\n")).catch(() => {});
    get().toast("info", macros.length === 1 ? "Copied macro" : `Copied ${macros.length} macros`);
  },

  clearLogs: (accountId) => set((s) => ({ logs: { ...s.logs, [accountId]: [] }, unread: { ...s.unread, [accountId]: 0 } })),

  refreshStatuses: async () => {
    try {
      set({ statuses: await api.botStatuses() });
    } catch {
      return;
    }
  },

  preflight: async (accountId, startAfter) => {
    const { toast, update } = get();
    set((s) => ({ checking: { ...s.checking, [accountId]: true } }));
    try {
      const report = await api.checkHealth(accountId);
      const raised: string[] = [];
      update((draft) => {
        draft.servers = report.servers;
        const acc = draft.accounts.find((a) => a.id === accountId);
        for (const u of report.channelUpdates) {
          const ch = acc?.channels.find((c) => c.id === u.channelId);
          if (!ch) continue;
          ch.name = u.name;
          ch.slowmode = u.slowmode;
          if (ch.cooldown < u.slowmode) {
            ch.cooldown = u.slowmode;
            raised.push(`#${u.name}`);
          }
        }
      });
      if (raised.length) toast("info", `Slowmode changed — cooldown raised for ${raised.join(", ")}`);
      if (report.emojiIssues.length || report.channelIssues.length) {
        set({ modal: { type: "health", accountId, report, startAfter } });
      } else if (startAfter) {
        await get().start(accountId);
      } else {
        toast("ok", `All good — ${report.checkedEmojis} emoji(s) and channels verified`);
      }
    } catch (e) {
      toast("error", errorText(e));
    } finally {
      set((s) => ({ checking: { ...s.checking, [accountId]: false } }));
    }
  },

  start: async (accountId) => {
    try {
      await api.startBot(accountId);
      await get().refreshStatuses();
    } catch (e) {
      get().toast("error", errorText(e));
    }
  },

  stop: async (accountId) => {
    await api.stopBot(accountId);
    await get().refreshStatuses();
  },

  applyEmojiFixes: (fixes) => {
    if (!fixes.length) return;
    get().update((draft) => {
      for (const acc of draft.accounts) {
        for (const ch of acc.channels) {
          ch.messages = ch.messages.map((m) => applyFixes(m, fixes)).filter(Boolean);
        }
      }
    });
  },

  token: () => {
    const { config, view } = get();
    const current = view.kind === "account" ? config.accounts.find((a) => a.id === view.id) : undefined;
    return current?.token || config.accounts.find((a) => a.token)?.token || null;
  },

  addServer: (server) => {
    get().update((d) => {
      const idx = d.servers.findIndex((s) => s.id === server.id);
      if (idx >= 0) d.servers[idx] = server;
      else d.servers.push(server);
    });
  },

  syncServer: async (id) => {
    const { token, toast, config, addServer } = get();
    const t = token();
    const before = config.servers.find((s) => s.id === id);
    if (!t || !before) {
      toast("error", "Add an account first to sync servers");
      return null;
    }
    try {
      const after = await api.guild(t, id);
      addServer(after);
      return diffServer(before, after);
    } catch (e) {
      toast("error", `${before.name}: ${errorText(e)}`);
      return null;
    }
  },
}));

export function useAccount(id: string | undefined): Account | undefined {
  return useStore((s) => s.config.accounts.find((a) => a.id === id));
}
