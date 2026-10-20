import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Side = "top" | "bottom" | "left" | "right";

const GAP = 8;
const CAN_HOVER = window.matchMedia("(hover: hover)").matches;
const MARGIN = 8;

interface Anchor {
  rect: DOMRect;
  side: Side;
}

function resolveSide(rect: DOMRect, side: Side): Side {
  if (side === "top" && rect.top < 48) return "bottom";
  if (side === "bottom" && rect.bottom > window.innerHeight - 48) return "top";
  if (side === "right" && rect.right > window.innerWidth - 160) return "left";
  if (side === "left" && rect.left < 160) return "right";
  return side;
}

function TooltipBubble({ anchor, children }: { anchor: Anchor; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);
  const { rect, side } = anchor;
  const vertical = side === "top" || side === "bottom";

  const x = side === "left" ? rect.left - GAP : side === "right" ? rect.right + GAP : rect.left + rect.width / 2;
  const y = side === "top" ? rect.top - GAP : side === "bottom" ? rect.bottom + GAP : rect.top + rect.height / 2;
  const transform = {
    top: "translate(-50%, -100%)",
    bottom: "translate(-50%, 0)",
    left: "translate(-100%, -50%)",
    right: "translate(0, -50%)",
  }[side];

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !vertical) return;
    const box = el.getBoundingClientRect();
    if (box.left < MARGIN) setShift(MARGIN - box.left);
    else if (box.right > window.innerWidth - MARGIN) setShift(window.innerWidth - MARGIN - box.right);
  }, [vertical]);

  const arrow = {
    top: { bottom: -4, left: `calc(50% - ${shift}px)`, marginLeft: -4 },
    bottom: { top: -4, left: `calc(50% - ${shift}px)`, marginLeft: -4 },
    left: { right: -4, top: "50%", marginTop: -4 },
    right: { left: -4, top: "50%", marginTop: -4 },
  }[side];

  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      style={{ left: x + shift, top: y, transform }}
      className="pointer-events-none fixed z-[100] max-w-64 animate-fade rounded-md bg-[#0d0a0a] px-2.5 py-1.5 text-[13px] font-semibold text-ink shadow-xl shadow-black/60"
    >
      {children}
      <span style={arrow} className="absolute size-2 rotate-45 bg-[#0d0a0a]" />
    </div>,
    document.body,
  );
}

export function Tooltip({
  label,
  side = "top",
  delay = 200,
  className = "",
  children,
}: {
  label: ReactNode;
  side?: Side;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!anchor) return;
    const hide = () => setAnchor(null);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [anchor]);

  function show() {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setAnchor({ rect, side: resolveSide(rect, side) });
    }, delay);
  }

  function hide() {
    window.clearTimeout(timer.current);
    setAnchor(null);
  }

  if (!label || !CAN_HOVER) return <>{children}</>;

  return (
    <>
      <span
        ref={ref}
        className={`inline-flex ${className}`}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onMouseDown={hide}
      >
        {children}
      </span>
      {anchor && <TooltipBubble anchor={anchor}>{label}</TooltipBubble>}
    </>
  );
}
