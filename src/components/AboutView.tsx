import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ArrowUpRight, Code2, Star, Users } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import logo from "../../images/logo.webp";
import hero from "../assets/about-hero.svg";
import discordIcon from "../assets/discord-icon.png";
import fishing from "../assets/github-gpo-fishing.png";
import halloween from "../assets/github-gpo-halloween.png";
import { api } from "../lib/api";
import { guildIconUrl } from "../lib/emoji";
import { useStore } from "../lib/store";
import type { InviteInfo } from "../lib/types";
import { Tooltip } from "./Tooltip";
import { MenuButton } from "./ui";

const INVITE_CODE = "unPZxXAtfb";
const INVITE_URL = `https://discord.gg/${INVITE_CODE}`;

let cachedInvite: Promise<InviteInfo> | null = null;

const PROJECTS = [
  {
    name: "GPO Fishing",
    description: "Grand Piece Online fishing macro.",
    url: "https://github.com/arielldev/gpo-fishing",
    image: fishing,
  },
  {
    name: "GPO Halloween",
    description: "Trick or Treat macro for the GPO Halloween event.",
    url: "https://github.com/arielldev/gpo-halloween",
    image: halloween,
  },
];

function DiscordMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 127.14 96.36" fill="currentColor" aria-hidden className={className}>
      <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15ZM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69Zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69Z" />
    </svg>
  );
}

function open(url: string) {
  void openUrl(url);
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-xs font-bold tracking-wide text-sub uppercase">{children}</h2>;
}

export function AboutView() {
  const [version, setVersion] = useState("");
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const minimal = useStore((s) => s.config.minimal);
  const icon = (invite && guildIconUrl(invite.guildId, invite.icon, minimal ? 128 : 256)) ?? discordIcon;

  useEffect(() => {
    getVersion().then(setVersion, () => undefined);
    cachedInvite ??= api.invite(INVITE_CODE);
    cachedInvite.then(setInvite, () => {
      cachedInvite = null;
    });
  }, []);

  return (
    <section className="relative min-w-0 flex-1 overflow-y-auto rounded-tl-lg bg-chat">
      <MenuButton className="absolute top-3 left-3 z-10 bg-black/40" />
      <div className="relative h-56 shrink-0 overflow-hidden md:h-64">
        <img src={hero} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="relative mx-auto flex h-full max-w-5xl items-end gap-4 px-4 pb-6 md:gap-5 md:px-10 md:pb-8">
          <img src={logo} alt="" className="size-16 animate-pop md:size-24 object-contain drop-shadow-[0_8px_24px_#000a]" />
          <div className="animate-rise pb-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-ink md:text-3xl">Trading And Shi</h1>
              {version && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">v{version}</span>}
            </div>
            <p className="mt-1 text-sub">GPO Trading macro and shi</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-10 px-4 pt-4 pb-24 md:px-10">
        <div className="overflow-hidden rounded-2xl border border-line bg-side">
          <button onClick={() => open(INVITE_URL)} className="group relative block w-full overflow-hidden text-left">
            <div className="absolute inset-0 bg-gradient-to-r from-[#3a0710] via-accent to-[#3a0710] bg-[length:200%_100%] transition-[background-position] duration-700 group-hover:bg-right" />
            <div className="absolute inset-0 bg-[repeating-linear-gradient(-45deg,#0000_0_14px,#0000001f_14px_28px)]" />
            <div className="relative flex items-center justify-between gap-4 px-5 py-6 md:gap-6 md:px-6 md:py-7">
              <div>
                <div className="text-xs font-bold tracking-[0.3em] text-white/70 uppercase">Community</div>
                <h2 className="mt-1 text-2xl leading-none sm:text-4xl font-black tracking-tight text-white italic drop-shadow-[0_4px_0_#0006]">
                  JOIN TEAM DAI MACROS!
                </h2>
              </div>
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/15 text-white transition-transform duration-300 group-hover:translate-x-1 group-hover:bg-white/25">
                <ArrowUpRight className="size-6" />
              </span>
            </div>
          </button>
          <div className="flex flex-wrap items-center gap-4 px-5 py-4 md:px-6">
            <img src={icon} alt="" className="size-14 shrink-0 rounded-2xl object-cover" />
            <div className="min-w-[10rem] flex-1">
              <div className="truncate text-lg font-bold text-ink">{invite?.name ?? "Dai Macros"}</div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-sub">
                {invite ? (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-ok" /> {invite.online.toLocaleString()} Online
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-mute" /> {invite.members.toLocaleString()} Members
                    </span>
                  </>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Users className="size-4" /> Updates, help and more tools
                  </span>
                )}
              </div>
            </div>
            <Tooltip label="Opens discord.gg/unPZxXAtfb" className="max-sm:w-full">
              <button
                onClick={() => open(INVITE_URL)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md max-sm:w-full bg-[#5865f2] px-5 text-sm font-semibold text-white shadow-[0_6px_20px_-8px_#5865f2] transition-all hover:bg-[#4752c4] active:scale-[0.98]"
              >
                <DiscordMark className="size-5" /> Join Server
              </button>
            </Tooltip>
          </div>
        </div>

        <div>
          <div className="relative mb-4 overflow-hidden rounded-2xl border border-warn/30 bg-gradient-to-r from-[#2a1a05] via-[#3d2606] to-[#2a1a05] px-6 py-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_50%,#f0b23233,transparent_55%)]" />
            <div className="relative flex items-center gap-4">
              <Star className="size-9 shrink-0 animate-pop fill-current text-warn drop-shadow-[0_3px_0_#0007]" />
              <div className="min-w-0 flex-1">
                <h2 className="text-xl leading-none font-black tracking-tight text-warn italic sm:text-2xl drop-shadow-[0_3px_0_#0007]">PLEASE STAR THE MACROS!</h2>
                <p className="mt-1.5 text-sm text-sub">A star on GitHub helps the projects grow and keeps updates coming.</p>
              </div>
            </div>
          </div>
          <SectionTitle>More by arielldev</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PROJECTS.map((p) => (
              <Tooltip key={p.url} label={`Open ${p.name} on GitHub`} className="block">
              <button
                onClick={() => open(p.url)}
                className="group overflow-hidden rounded-2xl border border-line bg-side text-left transition-all duration-200 hover:-translate-y-1 hover:border-accent/60 hover:shadow-2xl hover:shadow-accent/10"
              >
                <div className="relative overflow-hidden border-b border-line">
                  <img src={p.image} alt={`${p.name} on GitHub`} className="block h-auto w-full transition-transform duration-500 group-hover:scale-[1.03]" />
                  <span className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 touch:opacity-100">
                    <ArrowUpRight className="size-4" />
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 font-semibold whitespace-nowrap text-ink">
                    <Code2 className="size-4 shrink-0 text-accent" /> {p.name}
                  </div>
                  <p className="mt-1 truncate text-sm text-sub">{p.description}</p>
                </div>
              </button>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
