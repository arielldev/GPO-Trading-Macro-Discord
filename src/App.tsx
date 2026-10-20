import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useEffect } from "react";
import { AboutView } from "./components/AboutView";
import { AccountView } from "./components/AccountView";
import { LibraryView } from "./components/LibraryView";
import { AccountSettingsModal } from "./components/modals/AccountSettingsModal";
import { AddAccountModal } from "./components/modals/AddAccountModal";
import { AddChannelModal } from "./components/modals/AddChannelModal";
import { AddServerModal } from "./components/modals/AddServerModal";
import { ChannelSettingsModal } from "./components/modals/ChannelSettingsModal";
import { HealthModal } from "./components/modals/HealthModal";
import { ServerRail } from "./components/ServerRail";
import { TitleBar } from "./components/TitleBar";
import { Tour } from "./components/Tour";
import { UserPanel } from "./components/UserPanel";
import { useStore } from "./lib/store";
import { isMobile } from "./components/ui";

function Modals() {
  const modal = useStore((s) => s.modal);
  const openModal = useStore((s) => s.openModal);
  const close = () => openModal(null);
  if (!modal) return null;
  switch (modal.type) {
    case "addAccount":
      return <AddAccountModal onClose={close} />;
    case "accountSettings":
      return <AccountSettingsModal accountId={modal.accountId} onClose={close} />;
    case "addChannel":
      return <AddChannelModal accountId={modal.accountId} onClose={close} />;
    case "channelSettings":
      return <ChannelSettingsModal accountId={modal.accountId} channelId={modal.channelId} onClose={close} />;
    case "addServer":
      return <AddServerModal onClose={close} />;
    case "health":
      return <HealthModal accountId={modal.accountId} report={modal.report} startAfter={modal.startAfter} onClose={close} />;
  }
}

function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="flex animate-rise items-center gap-2 rounded-lg border border-line bg-[#0b0809] px-4 py-2.5 text-sm text-ink shadow-2xl shadow-black">
          {t.kind === "ok" ? <CheckCircle2 className="size-4 text-ok" /> : t.kind === "error" ? <XCircle className="size-4 text-bad" /> : <Info className="size-4 text-accent" />}
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function App() {
  const ready = useStore((s) => s.ready);
  const view = useStore((s) => s.view);
  const init = useStore((s) => s.init);
  const tour = useStore((s) => s.tour);
  const minimal = useStore((s) => s.config.minimal);
  const nav = useStore((s) => s.nav);
  const setNav = useStore((s) => s.setNav);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    document.documentElement.classList.toggle("minimal", minimal);
  }, [minimal]);

  useEffect(() => {
    document.documentElement.classList.toggle("mobile", isMobile);
  }, []);

  return (
    <div className="flex h-full flex-col">
      {!isMobile && <TitleBar />}
      <div className="relative flex min-h-0 flex-1">
        <ServerRail />
        {nav && <div className="fixed inset-x-0 top-(--titlebar) bottom-0 z-20 animate-fade bg-black/60 md:hidden" onClick={() => setNav(false)} />}
        {ready &&
          (view.kind === "library" ? (
            <LibraryView />
          ) : view.kind === "about" ? (
            <AboutView />
          ) : (
            <AccountView key={view.id} accountId={view.id} />
          ))}
        {ready && <UserPanel />}
      </div>
      <Modals />
      {ready && tour && <Tour />}
      <Toasts />
    </div>
  );
}
