import { Loader2, Menu, X } from "lucide-react";
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { initials } from "../lib/format";
import { useStore } from "../lib/store";
import { Tooltip } from "./Tooltip";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "success";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover shadow-[0_0_0_1px_#ff2d4a22,0_6px_20px_-8px_#c8102e]",
  secondary: "bg-raised text-ink hover:bg-hover border border-line",
  danger: "bg-bad/90 text-white hover:bg-bad",
  ghost: "text-sub hover:text-ink hover:underline",
  success: "bg-ok text-white hover:brightness-110",
};

export function Button({
  variant = "primary",
  loading,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  active,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <Tooltip label={label}>
      <button
        {...rest}
        aria-label={label}
        className={`grid size-8 place-items-center rounded-md transition-colors disabled:opacity-40 ${
          active ? "text-ink bg-hover" : "text-sub hover:text-ink hover:bg-hover"
        } ${className}`}
      >
        {children}
      </button>
    </Tooltip>
  );
}

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={`h-10 w-full rounded-md border border-line bg-rail px-3 text-sm text-ink outline-none transition-colors placeholder:text-mute focus:border-accent ${className}`}
    />
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold tracking-wide text-sub uppercase">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-mute">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${checked ? "bg-ok" : "bg-[#4a3a3b]"}`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${checked ? "left-4.5" : "left-0.5"}`}
      />
    </button>
  );
}

export function SwitchRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-line py-4 last:border-0">
      <div>
        <div className="text-sm font-medium text-ink">{title}</div>
        <div className="mt-1 text-xs text-mute">{description}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

export function Avatar({
  src,
  name,
  size = 40,
  className = "",
  rounded = "rounded-full",
}: {
  src: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
  rounded?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.36) };
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        style={style}
        onError={() => setFailed(true)}
        className={`${rounded} object-cover ${className}`}
      />
    );
  }
  return (
    <div
      style={style}
      className={`${rounded} grid shrink-0 place-items-center bg-gradient-to-br from-accent to-[#4a0a14] font-semibold text-white ${className}`}
    >
      {initials(name)}
    </div>
  );
}

export function StatusDot({ state, ring = "border-side" }: { state: "running" | "break" | "idle"; ring?: string }) {
  const color = state === "running" ? "bg-ok" : state === "break" ? "bg-warn" : "bg-mute";
  return <span className={`absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full border-[3px] ${ring} ${color}`} />;
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  width = "w-[480px]",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const drag = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const sheetGrip = {
    onPointerDown: (e: React.PointerEvent) => {
      drag.current = e.clientY;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (drag.current !== null) setPull(Math.max(0, e.clientY - drag.current));
    },
    onPointerUp: () => {
      drag.current = null;
      if (pull > 100) onClose();
      else setPull(0);
    },
  };

  return (
    <div
      className="fixed inset-0 z-40 grid animate-fade place-items-center bg-black/75 backdrop-blur-[2px] max-md:items-end max-md:justify-items-stretch"
      onMouseDown={onClose}
    >
      <div
        data-tour="modal"
        onMouseDown={(e) => e.stopPropagation()}
        style={pull ? { transform: `translateY(${pull}px)` } : undefined}
        className={`${width} relative flex max-h-[88vh] max-w-[calc(100vw-1.5rem)] animate-pop flex-col overflow-hidden rounded-xl border border-line bg-chat shadow-2xl shadow-black/60 max-md:max-h-[92dvh] max-md:w-full max-md:max-w-full max-md:animate-sheet max-md:rounded-b-none max-md:rounded-t-2xl max-md:border-x-0 max-md:border-b-0 ${drag.current === null ? "transition-transform duration-200" : ""}`}
      >
        <div {...sheetGrip} className="flex shrink-0 touch-none justify-center pt-2.5 pb-1 md:hidden">
          <span className="h-1.5 w-10 rounded-full bg-line" />
        </div>
        <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 z-10 text-mute hover:text-ink">
          <X className="size-5" />
        </button>
        {title && (
          <div className="px-6 pt-6 pb-3 text-center">
            <h2 className="text-xl font-bold text-ink">{title}</h2>
            {subtitle && <p className="mt-1.5 text-sm text-sub">{subtitle}</p>}
          </div>
        )}
        <div className={`min-h-0 flex-1 overflow-y-auto px-6 pb-4 ${footer ? "" : "max-md:pb-[max(1rem,env(safe-area-inset-bottom))]"}`}>{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 bg-side px-6 py-4 max-md:pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>
        )}
      </div>
    </div>
  );
}

export function Reveal({ hidden, children }: { hidden: boolean; children: ReactNode }) {
  const [shown, setShown] = useState(false);
  if (!hidden) return <>{children}</>;
  return (
    <Tooltip label={shown ? "Click to hide" : "Hidden · click to show"}>
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        className={shown ? "hover:underline" : "rounded bg-raised px-1.5 text-[11px] font-medium text-mute transition-colors hover:text-ink"}
      >
        {shown ? children : "hidden"}
      </button>
    </Tooltip>
  );
}

export const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
export const TOUCH = window.matchMedia("(hover: none)").matches;

export function tap(text: string): string {
  return TOUCH ? text.replace(/\bClick/g, "Tap").replace(/\bclick/g, "tap") : text;
}

export function drawer(open: boolean, offset = false): string {
  const base = "max-md:fixed max-md:top-(--titlebar) max-md:bottom-0 max-md:z-30 max-md:shadow-2xl max-md:shadow-black max-md:transition-transform max-md:duration-200";
  if (!offset) return `${base} max-md:left-0 ${open ? "" : "max-md:-translate-x-full"}`;
  return `${base} max-md:left-[72px] ${open ? "" : "max-md:-translate-x-[calc(100%+72px)]"}`;
}

export function MenuButton({ className = "" }: { className?: string }) {
  const setNav = useStore((s) => s.setNav);
  return (
    <button
      onClick={() => setNav(true)}
      aria-label="Open menu"
      className={`grid size-8 shrink-0 place-items-center rounded-md text-sub transition-colors hover:bg-hover hover:text-ink md:hidden ${className}`}
    >
      <Menu className="size-5" />
    </button>
  );
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 grid size-20 place-items-center rounded-full bg-raised text-accent">{icon}</div>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <div className="mt-2 max-w-sm text-sm text-sub">{children}</div>
    </div>
  );
}
