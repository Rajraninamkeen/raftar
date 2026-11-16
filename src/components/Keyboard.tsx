import type { Lang } from "../data/exams";
import { FINGERS, FINGER_OF, KEYBOARD, shiftFor, US_LAYOUT, type Finger, type KeyRef } from "../data/lessons";
import { displayChar, INSCRIPT } from "../lib/typing";
import { cn } from "../utils/cn";

const SPECIAL: Record<string, string> = {
  Backspace: "⌫",
  Tab: "Tab",
  CapsLock: "Caps",
  Enter: "Enter",
  ShiftLeft: "Shift",
  ShiftRight: "Shift",
  Space: "Space",
};

function legend(lang: Lang, code: string, layer: 0 | 1): string {
  if (SPECIAL[code]) return SPECIAL[code];
  if (lang === "hindi") {
    const pair = INSCRIPT[code];
    return pair ? displayChar(pair[layer]) : "";
  }
  if (code.startsWith("Key")) return code.slice(3);
  return US_LAYOUT[code]?.[layer] ?? "";
}

function latin(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return US_LAYOUT[code]?.[0] ?? "";
}

/** On-screen keyboard coloured by finger, with the next key lit up. */
export function KeyboardGuide({
  lang,
  target,
  wrong,
  wrongTick = 0,
  marks,
  layer,
}: {
  lang: Lang;
  target?: KeyRef | null;
  wrong?: string | null;
  wrongTick?: number;
  marks?: string[];
  layer?: 0 | 1;
}) {
  const activeLayer: 0 | 1 = layer ?? (target?.shift ? 1 : 0);
  const shiftCode = target?.shift ? shiftFor(target.code) : null;

  return (
    <div aria-hidden="true" className="select-none space-y-1 sm:space-y-1.5">
      {KEYBOARD.map((row, r) => (
        <div key={r} className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-[3px] sm:gap-1.5">
          {row.map((k, i) => {
            if (!k.code) return <span key={i} style={{ gridColumn: `span ${k.span}` }} />;
            const finger = FINGER_OF[k.code];
            const color = finger ? FINGERS[finger].color : "#7f8498";
            const isTarget = target?.code === k.code;
            const isShift = shiftCode === k.code;
            const isMark = !!marks?.includes(k.code);
            const isWrong = wrong === k.code;
            const special = !!SPECIAL[k.code];
            const lit = isTarget || isShift;
            return (
              <span
                key={isWrong ? `${k.code}-${wrongTick}` : k.code}
                style={{
                  gridColumn: `span ${k.span}`,
                  background: isWrong ? undefined : lit ? color : `${color}${isMark ? "59" : "1c"}`,
                  borderColor: isWrong ? undefined : lit || isMark ? color : `${color}40`,
                }}
                className={cn(
                  "relative grid h-8 min-w-0 place-items-center rounded-md border transition-transform duration-100 sm:h-10 sm:rounded-lg",
                  special ? "font-mono text-[8px] sm:text-[11px]" : lang === "hindi" ? "font-hindi text-[11px] sm:text-base" : "font-mono text-[10px] sm:text-sm",
                  lit ? "z-10 font-bold text-ink-950 shadow-lg" : "text-fog-200",
                  isTarget && "scale-110",
                  isMark && !lit && "text-fog-100",
                  isWrong && "miss-key border-blush-400 text-blush-400",
                )}
              >
                {lang === "hindi" && !special && (
                  <span className="absolute left-1 top-0.5 hidden font-mono text-[8px] leading-none opacity-60 sm:block">
                    {latin(k.code)}
                  </span>
                )}
                {legend(lang, k.code, activeLayer)}
                {(k.code === "KeyF" || k.code === "KeyJ") && (
                  <span className="absolute bottom-[3px] h-[2px] w-2 rounded bg-current opacity-60 sm:w-3" />
                )}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const LEFT: [Finger, number, number][] = [
  ["l5", 8, 44],
  ["l4", 36, 62],
  ["l3", 64, 72],
  ["l2", 92, 60],
];
const RIGHT: [Finger, number, number][] = [
  ["r5", 8, 44],
  ["r4", 36, 62],
  ["r3", 64, 72],
  ["r2", 92, 60],
];

function Hand({ fingers, active }: { fingers: [Finger, number, number][]; active: Finger[] }) {
  const idle = "rgba(255,255,255,0.09)";
  const stroke = "rgba(255,255,255,0.16)";
  const thumb = active.includes("thumb");
  return (
    <>
      <rect x="6" y="76" width="112" height="38" rx="18" fill="rgba(255,255,255,0.06)" stroke={stroke} />
      {fingers.map(([f, x, h]) => (
        <rect
          key={f}
          x={x}
          y={82 - h}
          width="24"
          height={h + 10}
          rx="12"
          fill={active.includes(f) ? FINGERS[f].color : idle}
          stroke={active.includes(f) ? FINGERS[f].color : stroke}
        />
      ))}
      <rect
        x="120"
        y="60"
        width="24"
        height="48"
        rx="12"
        transform="rotate(48 132 100)"
        fill={thumb ? FINGERS.thumb.color : idle}
        stroke={thumb ? FINGERS.thumb.color : stroke}
      />
    </>
  );
}

/** Two hands, with the finger (and Shift finger) to use highlighted. */
export function Hands({ active, className }: { active: Finger[]; className?: string }) {
  return (
    <svg viewBox="0 0 360 120" className={cn("w-auto", className ?? "mx-auto h-16 sm:h-24")} aria-hidden="true">
      <Hand fingers={LEFT} active={active} />
      <g transform="translate(360 0) scale(-1 1)">
        <Hand fingers={RIGHT} active={active} />
      </g>
    </svg>
  );
}
