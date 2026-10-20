import { Info, Plus } from "lucide-react";
import type { ReactNode } from "react";
import logo from "../../images/logo.webp";
import { botState, identity } from "../lib/hooks";
import { useStore } from "../lib/store";
import { Tooltip } from "./Tooltip";
import { Avatar, drawer, StatusDot } from "./ui";

function RailItem({
  label,
  active,
  onClick,
  children,
  badge,
  tour,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  badge?: ReactNode;
  tour?: string;
}) {
  return (
    <div className="group relative flex w-full justify-center">
      <span
        className={`absolute top-1/2 left-0 w-1 -translate-y-1/2 rounded-r-full bg-white transition-all duration-200 ${
          active ? "h-10" : "h-0 group-hover:h-5"
        }`}
      />
      <Tooltip label={label} side="right" delay={0}>
        <button
          data-tour={tour}
          onClick={onClick}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className={`relative size-12 overflow-visible transition-all duration-200 ${
            active ? "rounded-2xl" : "rounded-3xl group-hover:rounded-2xl"
          }`}
        >
          <div className={`size-12 overflow-hidden transition-all duration-200 ${active ? "rounded-2xl" : "rounded-3xl group-hover:rounded-2xl"}`}>
            {children}
          </div>
          {badge}
        </button>
      </Tooltip>
    </div>
  );
}

export function ServerRail() {
  const accounts = useStore((s) => s.config.accounts);
  const view = useStore((s) => s.view);
  const statuses = useStore((s) => s.statuses);
  const anonymous = useStore((s) => s.config.anonymous);
  const setView = useStore((s) => s.setView);
  const openModal = useStore((s) => s.openModal);
  const nav = useStore((s) => s.nav);

  return (
    <nav className={`scroll-hidden flex w-[72px] shrink-0 ${drawer(nav)} flex-col items-center gap-2 overflow-y-auto bg-rail pt-3 pb-20`}>
      <RailItem label="Emoji Library" tour="rail-library" active={view.kind === "library"} onClick={() => setView({ kind: "library" })}>
        <img src={logo} alt="" className="size-12 object-cover" />
      </RailItem>
      <div className="mx-auto h-0.5 w-8 shrink-0 rounded bg-line" />

      {accounts.map((a) => {
        const who = identity(a, accounts, anonymous, 96);
        return (
          <RailItem
            key={a.id}
            label={who.name}
            tour="rail-account"
            active={view.kind === "account" && view.id === a.id}
            onClick={() => setView({ kind: "account", id: a.id })}
            badge={statuses[a.id]?.running && <StatusDot state={botState(statuses[a.id])} ring="border-rail" />}
          >
            <Avatar src={who.avatar} name={who.name} size={48} rounded="rounded-none" />
          </RailItem>
        );
      })}

      <RailItem label="Add an Account" tour="add-account" active={false} onClick={() => openModal({ type: "addAccount" })}>
        <div className="grid size-12 place-items-center bg-raised text-accent transition-colors group-hover:bg-accent group-hover:text-white">
          <Plus className="size-6" />
        </div>
      </RailItem>

      <div className="mt-auto" />
      <RailItem label="About & Community" active={view.kind === "about"} onClick={() => setView({ kind: "about" })}>
        <div className="grid size-12 place-items-center bg-raised text-sub transition-colors group-hover:bg-accent group-hover:text-white">
          <Info className="size-6" />
        </div>
      </RailItem>
    </nav>
  );
}
