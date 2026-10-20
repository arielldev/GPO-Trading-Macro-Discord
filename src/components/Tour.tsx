import { ArrowLeft, ArrowRight, Hash, MousePointerClick, Play, Smile, User, type LucideIcon } from "lucide-react";
import { cloneElement, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";
import logo from "../../images/logo.webp";
import { useStore, type Modal } from "../lib/store";
import { Button, tap, TOUCH } from "./ui";

type Side = "top" | "bottom" | "left" | "right";
type State = ReturnType<typeof useStore.getState>;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}

interface Ctx {
  s: State;
  accounts: number;
  channels: number;
  macros: number;
  emojis: number;
  started: boolean;
  has: (id: string) => boolean;
  filled: (id: string) => boolean;
}

interface Step {
  id: string;
  phase: number;
  kind: "welcome" | "action" | "info";
  title: string;
  body?: ReactNode;
  target?: string | ((ctx: Ctx) => string);
  ring?: string | ((ctx: Ctx) => string);
  modal?: Modal["type"];
  side?: Side;
  action?: string;
  detour?: boolean;
  beacon?: boolean;
  nextLabel?: string;
  nav?: boolean;
  done?: (ctx: Ctx) => boolean;
}

const PHASES: { label: string; hint: string; icon: LucideIcon }[] = [
  { label: "Account", hint: "Connect the Discord account that posts", icon: User },
  { label: "Channel", hint: "Choose the server and channel to post in", icon: Hash },
  { label: "Macro", hint: "Click emojis together into a message", icon: Smile },
  { label: "Launch", hint: "Start the loop and watch it run", icon: Play },
];

const STEPS: Step[] = [
  { id: "welcome", phase: 0, kind: "welcome", title: "Welcome to Trading And Shi" },
  {
    id: "account-open",
    phase: 0,
    kind: "action",
    title: "Connect your Discord account",
    body: "Macros are posted from your own Discord account. Start by adding one with the + in the left rail.",
    target: "add-account",
    side: "right",
    nav: true,
    action: "Click the + button",
    done: (c) => c.accounts > 0 || c.s.modal?.type === "addAccount",
  },
  {
    id: "account-token",
    phase: 0,
    kind: "action",
    title: "Paste your token",
    body: (
      <>
        Your token lets the app post as you, and it never leaves this computer. Not sure where to find it? Open{" "}
        <b className="text-ink">How do I get my token?</b> under the field for a 4-step guide.
      </>
    ),
    target: "modal",
    ring: (c) => (c.filled("token-input") ? "account-continue" : "token-input"),
    modal: "addAccount",
    side: "right",
    action: "Paste your token, then click Continue",
    done: (c) => c.accounts > 0 || c.has("account-profile"),
  },
  {
    id: "account-confirm",
    phase: 0,
    kind: "action",
    title: "Is this you?",
    body: (
      <>
        Found your Discord profile. The name and picture come straight from Discord. Click <b className="text-ink">Add Account</b> to finish
        this stage.
      </>
    ),
    target: "modal",
    ring: "account-add",
    modal: "addAccount",
    side: "right",
    action: "Click Add Account",
    done: (c) => c.accounts > 0,
  },
  {
    id: "channel-open",
    phase: 1,
    kind: "action",
    title: "Pick where to post",
    body: "Each account posts into one or more channels. Add the first one now.",
    target: "add-channel",
    side: "right",
    action: "Click Add Channel",
    done: (c) => c.channels > 0 || c.s.modal?.type === "addChannel",
  },
  {
    id: "channel-server",
    phase: 1,
    kind: "action",
    title: "Choose a server",
    body: (
      <>
        These are the servers your account is in. Ones already in your Emoji Library are tagged. Have a channel ID instead? Paste it at the
        bottom and click <b className="text-ink">Look up</b>.
      </>
    ),
    target: "modal",
    ring: "server-list",
    modal: "addChannel",
    side: "right",
    action: "Click a server",
    done: (c) => c.channels > 0 || c.has("channel-list") || c.has("channel-confirm"),
  },
  {
    id: "channel-pick",
    phase: 1,
    kind: "action",
    title: "Choose a channel",
    body: "Pick the text channel your macros should go to. The timer badge shows its slowmode, which is how often Discord lets you post there.",
    target: "modal",
    ring: "channel-list",
    modal: "addChannel",
    side: "right",
    action: "Click a text channel",
    done: (c) => c.channels > 0 || c.has("channel-confirm"),
  },
  {
    id: "channel-confirm",
    phase: 1,
    kind: "action",
    title: "Check the cooldown",
    body: (
      <>
        Cooldown is the wait between posts. It's set to the channel's slowmode for you, or 30 seconds if there isn't one. Keep{" "}
        <b className="text-ink">Pull this server's emojis</b> on so you have emojis to build macros with.
      </>
    ),
    target: "modal",
    ring: "channel-add",
    modal: "addChannel",
    side: "right",
    action: "Click Add Channel",
    done: (c) => c.channels > 0,
  },
  {
    id: "emojis",
    phase: 2,
    kind: "action",
    title: "Grab some emojis",
    body: "Macros are made of emojis, and your library is empty. Open the Emoji Library and add a server. Every emoji in it gets pulled in.",
    target: (c) => (c.s.modal?.type === "addServer" ? "modal" : c.s.view.kind === "library" ? "library-add-server" : "open-library"),
    modal: "addServer",
    side: "right",
    action: "Add a server to your library",
    detour: true,
    done: (c) => c.emojis > 0,
  },
  {
    id: "back-to-account",
    phase: 2,
    kind: "action",
    title: "Back to your account",
    body: "Click your account in the rail to get back to your channel.",
    target: "rail-account",
    side: "right",
    nav: true,
    action: "Click your account",
    detour: true,
    done: (c) => c.s.view.kind === "account",
  },
  {
    id: "macro-palette",
    phase: 2,
    kind: "action",
    title: "Build a macro",
    body: "A macro is a row of emojis sent as one message. Click emojis to add them in order. Search or tap a server chip to filter.",
    target: "macro-builder",
    ring: "emoji-grid",
    side: "top",
    action: "Click any emoji",
    done: (c) => c.macros > 0 || c.has("macro-pill"),
  },
  {
    id: "macro-add",
    phase: 2,
    kind: "action",
    title: "Add it to the loop",
    body: (
      <>
        Drag the pills to reorder them, or click ✕ to remove one. When it looks right, click <b className="text-ink">Add to loop</b>.
      </>
    ),
    target: "macro-builder",
    ring: "add-to-loop",
    side: "top",
    action: "Click Add to loop",
    done: (c) => c.macros > 0,
  },
  {
    id: "loop-card",
    phase: 2,
    kind: "info",
    title: "This is your loop",
    body: "Each post picks one of the channel's macros at random, so add as many as you like. Hover a macro to edit or delete it. While running, the bar fills as the next post gets closer.",
    target: "loop-card",
    side: "top",
  },
  {
    id: "loop-interval",
    phase: 3,
    kind: "info",
    title: "Timing and pause",
    body: "This is how often the channel posts. Click it to change the cooldown. The switch pauses this channel without removing it.",
    target: "loop-interval",
    side: "bottom",
  },
  {
    id: "activity",
    phase: 3,
    kind: "info",
    title: "Watch it live",
    body: "Activity opens a live log of every post, wait, break and error. Sent messages also show up right in the chat.",
    target: "activity-button",
    side: "bottom",
  },
  {
    id: "library",
    phase: 3,
    kind: "info",
    title: "Your Emoji Library",
    body: (
      <>
        Click the logo any time to add servers, or <b className="text-ink">Sync</b> when a server renames or deletes
        emojis. Your macros get fixed for you.
      </>
    ),
    target: "rail-library",
    side: "right",
    nav: true,
  },
  {
    id: "start",
    phase: 3,
    kind: "info",
    title: "Start posting",
    body: "Press ▶ to start. It first checks every emoji and channel for renames and deletions. Press ■ to stop. Delays, breaks and the auto-stop timer are under ⚙ Account Settings.",
    target: "start-button",
    side: "top",
    nav: true,
    action: "Press ▶ to start, or Finish to look around first",
    beacon: true,
    nextLabel: "Finish",
    done: (c) => c.started,
  },
];

const NUMBERED = STEPS.filter((s) => s.kind !== "welcome" && !s.detour);
const GAP = 14;
const EDGE = 12;
const GRACE = 400;
const OPPOSITE: Record<Side, Side> = { top: "bottom", bottom: "top", left: "right", right: "left" };

function tapNode(node: ReactNode): ReactNode {
  if (!TOUCH) return node;
  if (typeof node === "string") return tap(node);
  if (Array.isArray(node)) return node.map(tapNode);
  if (isValidElement<{ children?: ReactNode }>(node)) {
    const kids = node.props.children;
    return cloneElement(node, undefined, ...(Array.isArray(kids) ? kids.map(tapNode) : [tapNode(kids)]));
  }
  return node;
}

function find(id: string): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${id}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width && r.height ? el : null;
}

function measure(id: string, origin: DOMRect, pad: number): Box | null {
  const el = find(id);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const radius = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, r.height / 2);
  return {
    x: Math.round(r.left - origin.left - pad),
    y: Math.round(r.top - origin.top - pad),
    w: Math.round(r.width + pad * 2),
    h: Math.round(r.height + pad * 2),
    r: Math.round(radius + pad),
  };
}

function context(s: State): Ctx {
  const id = s.view.kind === "account" ? s.view.id : s.lastAccountId;
  const account = s.config.accounts.find((a) => a.id === id) ?? s.config.accounts[0];
  return {
    s,
    accounts: s.config.accounts.length,
    channels: account?.channels.length ?? 0,
    macros: account?.channels.reduce((n, c) => n + c.messages.length, 0) ?? 0,
    emojis: s.config.servers.reduce((n, x) => n + x.emojis.length, 0),
    started: !!account && (!!s.statuses[account.id]?.running || !!s.checking[account.id]),
    has: (t) => !!find(t),
    filled: (t) => !!(find(t) as HTMLInputElement | null)?.value?.trim(),
  };
}

function place(hole: Box, card: { w: number; h: number }, area: { w: number; h: number }, prefer: Side) {
  const clampX = (x: number) => Math.max(EDGE, Math.min(x, area.w - card.w - EDGE));
  const clampY = (y: number) => Math.max(EDGE, Math.min(y, area.h - card.h - EDGE));
  const at = (side: Side) => {
    if (side === "right") return { x: hole.x + hole.w + GAP, y: clampY(hole.y + hole.h / 2 - card.h / 2) };
    if (side === "left") return { x: hole.x - GAP - card.w, y: clampY(hole.y + hole.h / 2 - card.h / 2) };
    if (side === "bottom") return { x: clampX(hole.x + hole.w / 2 - card.w / 2), y: hole.y + hole.h + GAP };
    return { x: clampX(hole.x + hole.w / 2 - card.w / 2), y: hole.y - GAP - card.h };
  };
  const fits = ({ x, y }: { x: number; y: number }) => x >= EDGE && y >= EDGE && x + card.w <= area.w - EDGE && y + card.h <= area.h - EDGE;
  const order: Side[] = [prefer, OPPOSITE[prefer], ...(["right", "left", "bottom", "top"] as Side[]).filter((s) => s !== prefer && s !== OPPOSITE[prefer])];
  for (const side of order) {
    const p = at(side);
    if (fits(p)) return { ...p, side: side as Side | null };
  }
  const p = at(prefer);
  return { x: clampX(p.x), y: clampY(p.y), side: null as Side | null };
}

interface Frame {
  index: number;
  paused: boolean;
  lost: boolean;
  hole: Box | null;
  ring: Box | null;
  area: { w: number; h: number };
  card: { w: number; h: number };
}

function PhaseBar({ phase }: { phase: number }) {
  return (
    <div className="flex gap-1.5 px-4 pt-4">
      {PHASES.map((p, i) => (
        <div key={p.label} className="min-w-0 flex-1">
          <div className="h-1 overflow-hidden rounded-full bg-line">
            <div className={`h-full rounded-full bg-accent transition-all duration-500 ${i < phase ? "w-full" : i === phase ? "w-1/2 animate-pulse" : "w-0"}`} />
          </div>
          <div className={`mt-1.5 flex items-center gap-1 truncate text-[10px] font-semibold tracking-wide uppercase ${i <= phase ? "text-ink" : "text-mute"}`}>
            <p.icon className="size-3 shrink-0" />
            {p.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function Welcome({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <div className="w-[440px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-line bg-chat shadow-2xl shadow-black/70">
      <div className="h-24 bg-gradient-to-r from-accent via-[#6e0a1a] to-[#1a0507]" />
      <img src={logo} alt="" className="-mt-10 ml-6 size-20 rounded-2xl border-[6px] border-chat object-cover" />
      <div className="px-6">
        <h2 className="text-xl font-bold text-ink">Welcome to Trading And Shi</h2>
        <p className="mt-1 text-sm text-sub">{tap("Let's set up your first emoji macro. It takes about two minutes, and we'll highlight exactly where to click.")}</p>
        <ol className="mt-4 space-y-2">
          {PHASES.map((p, i) => (
            <li key={p.label} className="flex items-center gap-3 rounded-lg bg-side px-3 py-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                <p.icon className="size-4" />
              </span>
              <div>
                <div className="text-sm font-semibold text-ink">
                  {i + 1}. {p.label}
                </div>
                <div className="text-xs text-mute">{p.hint}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-5 flex items-center justify-end gap-2 bg-side px-6 py-4">
        <Button variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
        <Button onClick={onStart} autoFocus>
          Show me around <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function Tour() {
  const endTour = useStore((s) => s.endTour);
  const root = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const last = useRef<{ index: number; hole: Box; ring: Box | null; seen: number } | null>(null);
  const [acked, setAcked] = useState<ReadonlySet<string>>(new Set());
  const [frame, setFrame] = useState<Frame | null>(null);
  const [nudge, setNudge] = useState(0);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const s = useStore.getState();
      const ctx = context(s);
      const index = STEPS.findIndex((st) => !acked.has(st.id) && !st.done?.(ctx));
      if (index < 0) {
        s.endTour(true);
        return;
      }
      const step = STEPS[index];
      if (window.innerWidth < 768 && !s.modal && s.nav !== !!step.nav) s.setNav(!!step.nav);
      const origin = root.current?.getBoundingClientRect();
      if (!origin) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const targetId = typeof step.target === "function" ? step.target(ctx) : step.target;
      let hole = targetId ? measure(targetId, origin, targetId === "modal" ? 0 : 6) : null;
      const ringId = typeof step.ring === "function" ? step.ring(ctx) : step.ring;
      let ring = ringId ? measure(ringId, origin, 3) : null;
      const now = performance.now();
      const prev = last.current;
      if (hole) last.current = { index, hole, ring, seen: now };
      else if (targetId && prev?.index === index && now - prev.seen < GRACE) {
        hole = prev.hole;
        ring = prev.ring;
      }
      const next: Frame = {
        index,
        paused: !!s.modal && s.modal.type !== step.modal,
        lost: !!targetId && !hole,
        hole,
        ring,
        area: { w: Math.round(origin.width), h: Math.round(origin.height) },
        card: { w: cardRef.current?.offsetWidth ?? 320, h: cardRef.current?.offsetHeight ?? 220 },
      };
      setFrame((f) => (f && JSON.stringify(f) === JSON.stringify(next) ? f : next));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [acked]);

  const step = frame ? STEPS[frame.index] : null;
  const targetId = step && typeof step.target === "string" ? step.target : null;

  useEffect(() => {
    if (targetId && targetId !== "modal") find(targetId)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [targetId]);

  if (!frame || !step || frame.paused) return <div ref={root} className="pointer-events-none fixed inset-x-0 top-(--titlebar) bottom-0 z-45" />;

  const { hole, ring, area, card } = frame;
  const ack = () => setAcked((a) => new Set(a).add(step.id));
  const prevStep = STEPS[frame.index - 1];
  const canBack = step.kind === "info" && prevStep?.kind === "info" && acked.has(prevStep.id);
  const back = () =>
    setAcked((a) => {
      const n = new Set(a);
      n.delete(prevStep.id);
      return n;
    });
  const skip = () => endTour(false);
  const poke = () => setNudge((n) => n + 1);

  const spot = hole && !frame.lost ? hole : null;
  const pos =
    step.kind === "welcome" || !spot
      ? { x: (area.w - card.w) / 2, y: step.kind === "welcome" ? (area.h - card.h) / 2 : area.h - card.h - 24, side: null }
      : place(spot, card, area, step.side ?? "right");
  const pointAt = ring ?? spot;
  const tip = pointAt && {
    x: Math.min(pointAt.x + pointAt.w / 2, area.w - 24),
    y: Math.min(pointAt.y + Math.min(pointAt.h * 0.6, pointAt.h - 8), area.h - 24),
  };
  const beacon = step.kind === "action" || step.beacon;
  const number = NUMBERED.indexOf(step) + 1;

  const arrow =
    spot && pos.side
      ? pos.side === "left" || pos.side === "right"
        ? { top: Math.max(18, Math.min(spot.y + spot.h / 2 - pos.y, card.h - 18)), [pos.side === "right" ? "left" : "right"]: -6 }
        : { left: Math.max(18, Math.min(spot.x + spot.w / 2 - pos.x, card.w - 18)), [pos.side === "bottom" ? "top" : "bottom"]: -6 }
      : null;

  return (
    <div ref={root} className="pointer-events-none fixed inset-x-0 top-(--titlebar) bottom-0 z-45 overflow-hidden">
      {!frame.lost &&
        (spot ? (
          <>
            <div
              className="absolute transition-all duration-300 ease-out"
              style={{ left: spot.x, top: spot.y, width: spot.w, height: spot.h, borderRadius: spot.r, boxShadow: "0 0 0 9999px #000000b8" }}
            />
            {!ring && (
              <div
                className={`absolute border-2 border-accent transition-all duration-300 ease-out ${beacon ? "animate-beacon" : ""}`}
                style={{ left: spot.x, top: spot.y, width: spot.w, height: spot.h, borderRadius: spot.r }}
              />
            )}
            <div className="pointer-events-auto absolute inset-x-0 top-0" style={{ height: Math.max(0, spot.y) }} onMouseDown={poke} />
            <div className="pointer-events-auto absolute inset-x-0 bottom-0" style={{ top: spot.y + spot.h }} onMouseDown={poke} />
            <div className="pointer-events-auto absolute left-0" style={{ top: spot.y, height: spot.h, width: Math.max(0, spot.x) }} onMouseDown={poke} />
            <div className="pointer-events-auto absolute right-0" style={{ top: spot.y, height: spot.h, left: spot.x + spot.w }} onMouseDown={poke} />
          </>
        ) : (
          <div className="pointer-events-auto absolute inset-0 animate-fade bg-black/72" onMouseDown={poke} />
        ))}

      {ring && !frame.lost && (
        <div
          className={`absolute border-2 border-accent transition-all duration-300 ease-out ${beacon ? "animate-beacon" : ""}`}
          style={{ left: ring.x, top: ring.y, width: ring.w, height: ring.h, borderRadius: ring.r }}
        />
      )}

      {beacon && tip && !frame.lost && (
        <div className="absolute transition-all duration-300 ease-out" style={{ left: tip.x - 11, top: tip.y - 11 }}>
          <MousePointerClick className="size-7 animate-point fill-accent text-white drop-shadow-[0_2px_6px_#000]" />
        </div>
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-live="polite"
        aria-label={step.title}
        className="pointer-events-auto absolute transition-[left,top] duration-300 ease-out"
        style={{ left: pos.x, top: pos.y }}
      >
        <div key={`${step.id}-${nudge}`} className={nudge ? "animate-shake" : ""}>
          {step.kind === "welcome" ? (
            <Welcome onStart={ack} onSkip={skip} />
          ) : (
            <div key={step.id} className="relative w-80 max-w-[calc(100vw-1.5rem)] animate-pop rounded-xl border border-accent/40 bg-chat shadow-2xl shadow-black/70">
              {arrow && <span style={arrow} className={`absolute size-3 rotate-45 ${pos.side === "top" ? "bg-side" : "bg-chat"}`} />}
              <PhaseBar phase={step.phase} />
              <div className="px-4 pt-3 pb-4">
                <div className="text-[11px] font-semibold tracking-wide text-accent uppercase">
                  {step.detour ? "Quick detour" : `Step ${number} of ${NUMBERED.length}`}
                </div>
                <h3 className="mt-1 text-base font-bold text-ink">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-sub">{tapNode(step.body)}</p>
                {step.action && (
                  <div className="mt-3 flex items-center gap-2 rounded-md bg-accent-soft px-3 py-2 text-xs font-medium text-ink">
                    <MousePointerClick className="size-4 shrink-0 text-accent" />
                    {tap(step.action)}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 rounded-b-xl bg-side px-4 py-3">
                <button onClick={skip} className="text-xs text-mute transition-colors hover:text-ink">
                  Skip tour
                </button>
                <div className="ml-auto flex gap-2">
                  {canBack && (
                    <Button variant="secondary" className="h-8 px-3" onClick={back}>
                      <ArrowLeft className="size-4" /> Back
                    </Button>
                  )}
                  {step.kind === "info" && (
                    <Button className="h-8 px-3" onClick={ack}>
                      {step.nextLabel ?? "Next"} <ArrowRight className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
