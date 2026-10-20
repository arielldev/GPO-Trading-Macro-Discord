import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, Minus, Square, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import logo from "../../images/logo.webp";
import { Tooltip } from "./Tooltip";

const win = getCurrentWindow();

function WindowButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <Tooltip label={label} side="bottom" delay={500} className="h-full">
    <button
      onClick={onClick}
      aria-label={label}
      className={`grid w-11 place-items-center transition-colors focus-visible:-outline-offset-2 ${
        danger ? "hover:bg-accent hover:text-white" : "hover:bg-hover hover:text-ink"
      }`}
    >
      {children}
    </button>
    </Tooltip>
  );
}

export function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let active = true;
    const sync = () => win.isMaximized().then((v) => active && setMaximized(v));
    sync();
    const unlisten = win.onResized(sync);
    return () => {
      active = false;
      unlisten.then((off) => off());
    };
  }, []);

  return (
    <div data-tauri-drag-region className="flex h-8 shrink-0 items-center bg-rail pl-3 text-xs text-mute">
      <img src={logo} alt="" className="pointer-events-none mr-2 size-4 rounded" />
      <span data-tauri-drag-region className="font-semibold tracking-wide">
        Trading And Shi
      </span>
      <div className="ml-auto flex h-full">
        <WindowButton label="Minimize" onClick={() => win.minimize()}>
          <Minus className="size-4" />
        </WindowButton>
        <WindowButton label={maximized ? "Restore" : "Maximize"} onClick={() => win.toggleMaximize()}>
          {maximized ? <Copy className="size-3 -scale-x-100" /> : <Square className="size-3" />}
        </WindowButton>
        <WindowButton label="Close" danger onClick={() => win.close()}>
          <X className="size-4" />
        </WindowButton>
      </div>
    </div>
  );
}
