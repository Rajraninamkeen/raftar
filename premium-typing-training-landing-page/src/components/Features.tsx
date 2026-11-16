import { useMemo, useState, type ReactNode } from "react";
import { Activity, CalendarRange, Calculator, Keyboard, Languages, Timer, type LucideIcon } from "lucide-react";
import { generatePlan, PHASES, PHASE_ORDER } from "../lib/plan";
import { attemptsTotal, capLabel, displayChar, INSCRIPT, KEY_ROWS, weakKeys } from "../lib/typing";
import type { KeyStats } from "../lib/storage";
import { Reveal, SectionHeading, SpotCard } from "./ui";
import { cn } from "../utils/cn";

function FeatureCard({
  icon: Icon,
  title,
  children,
  visual,
  className,
  delay,
  interactive,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  visual: ReactNode;
  className?: string;
  delay?: number;
  interactive?: boolean;
}) {
  return (
    <Reveal delay={delay} className={className}>
      <SpotCard className="glass group flex h-full flex-col overflow-hidden rounded-[2rem] p-6 transition-all duration-500 hover:border-white/20 sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl border border-saffron-400/25 bg-saffron-400/10 text-saffron-300 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <h3 className="mt-5 font-display text-2xl font-semibold tracking-[-0.02em] text-fog-100">{title}</h3>
        <p className="mt-2.5 max-w-lg text-[15px] leading-relaxed text-fog-400">{children}</p>
        <div className="mt-7 flex flex-1 flex-col justify-end" aria-hidden={interactive ? undefined : true}>
          {visual}
        </div>
      </SpotCard>
    </Reveal>
  );
}

/* ---------- Visuals built from the real engine ---------- */

function InscriptMap() {
  const [shift, setShift] = useState(false);
  const [active, setActive] = useState("KeyF");
  const pair = INSCRIPT[active];

  return (
    <div>
      <div className="space-y-1.5" role="group" aria-label="Inscript keyboard map">
        {KEY_ROWS.map((row, r) => (
          <div key={r} className="flex justify-center gap-1 sm:gap-1.5" style={{ paddingInline: `${r * 2.5}%` }}>
            {row.map((code) => {
              const [normal, shifted] = INSCRIPT[code];
              return (
                <button
                  key={code}
                  type="button"
                  onMouseEnter={() => setActive(code)}
                  onFocus={() => setActive(code)}
                  onClick={() => setActive(code)}
                  aria-label={`Key ${capLabel(code)} types ${normal}; with Shift ${shifted}`}
                  className={cn(
                    "relative grid aspect-square min-w-0 flex-1 place-items-center rounded-lg border transition-all duration-200 sm:rounded-xl",
                    active === code
                      ? "-translate-y-0.5 border-saffron-400/70 bg-saffron-400/15"
                      : "border-white/[0.08] bg-white/[0.03] hover:border-white/25",
                  )}
                >
                  <span className="absolute left-1 top-0.5 font-mono text-[8px] text-fog-500 sm:left-1.5 sm:text-[10px]">
                    {capLabel(code)}
                  </span>
                  <span className="font-hindi text-sm text-fog-100 sm:text-lg">
                    {displayChar(shift ? shifted : normal)}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          aria-pressed={shift}
          onClick={() => setShift((s) => !s)}
          className={cn(
            "h-9 rounded-full border px-4 font-mono text-xs transition-all",
            shift
              ? "border-saffron-400/60 bg-saffron-400/15 text-saffron-200"
              : "border-white/10 bg-white/[0.04] text-fog-300 hover:text-fog-100",
          )}
        >
          Shift layer {shift ? "on" : "off"}
        </button>
        <p className="font-mono text-xs text-fog-400" aria-live="polite">
          {capLabel(active)} → <span className="font-hindi text-base text-fog-100">{displayChar(pair[0])}</span>
          <span className="mx-2 text-fog-500">·</span>
          Shift + {capLabel(active)} → <span className="font-hindi text-base text-fog-100">{displayChar(pair[1])}</span>
        </p>
      </div>
    </div>
  );
}

function TasksVisual() {
  const day = useMemo(
    () => generatePlan({ days: 10, minutes: 60, current: 18, target: 35, lang: "english", testMinutes: 10 }).days[3],
    [],
  );
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fog-500">
        Day 4 of a 10-day SSC CHSL plan · {PHASES[day.phase].label}
      </p>
      <ul className="mt-3 space-y-2">
        {day.tasks.map((t, i) => (
          <li
            key={t.title}
            className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 transition-transform duration-500 group-hover:translate-x-1"
            style={{ transitionDelay: `${i * 60}ms` }}
          >
            <span className="h-5 w-5 shrink-0 rounded-full border-2 border-white/20" />
            <span className="flex-1 text-sm font-medium text-fog-100">{t.title}</span>
            <span className="font-mono text-xs tabular-nums text-fog-400">{t.minutes} min</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExamScreen() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-950/70 transition-transform duration-700 group-hover:-translate-y-1">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-2.5 font-mono text-[11px] text-fog-400">
        <span className="truncate">RRB NTPC · Exam mode · English</span>
        <span className="shrink-0 tabular-nums text-saffron-300">10:00</span>
      </div>
      <div className="p-4 font-mono text-[12.5px] leading-6">
        <span className="text-fog-100">India is a land of many languages, cultures and </span>
        <span className="rounded-[3px] bg-blush-400/20 text-blush-400">t</span>
        <span className="caret text-fog-300">r</span>
        <span className="text-fog-500">aditions. The work of public offices depends on people who can prepare letters.</span>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-2.5 font-mono text-[11px] text-fog-500">
        <span>Backspace: off (RRB rule)</span>
        <span>Net WPM · KDPH · word errors</span>
      </div>
    </div>
  );
}

const FORMULAS = [
  ["Gross WPM", "all typed characters ÷ 5 ÷ minutes"],
  ["Net WPM", "correct characters ÷ 5 ÷ minutes"],
  ["Net KDPH", "correct key depressions per hour"],
  ["Word errors", "words with at least one mistake"],
];
const CONVERSIONS = ["35 WPM = 10,500 KDPH", "30 WPM = 9,000 KDPH", "8,000 KDPH ≈ 27 WPM"];

function FormulaVisual() {
  return (
    <div>
      <dl className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-ink-950/60 px-4">
        {FORMULAS.map(([k, v]) => (
          <div key={k} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5 text-sm">
            <dt className="font-medium text-fog-100">{k}</dt>
            <dd className="font-mono text-xs text-fog-400">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        {CONVERSIONS.map((c) => (
          <span key={c} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-fog-300">
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function PlanLengths() {
  const rows = useMemo(
    () =>
      [5, 10, 15, 30].map((d) => ({
        d,
        plan: generatePlan({ days: d, minutes: 60, current: 18, target: 35, lang: "english", testMinutes: 10 }),
      })),
    [],
  );
  const used = PHASE_ORDER.filter((p) => rows.some((r) => r.plan.phaseCounts[p] > 0));
  return (
    <div>
      <div className="space-y-3">
        {rows.map(({ d, plan }) => (
          <div key={d} className="flex items-center gap-3">
            <span className="w-16 shrink-0 font-mono text-xs text-fog-400">{d} days</span>
            <div className="flex h-3 flex-1 gap-[2px] overflow-hidden rounded-full">
              {plan.days.map((x) => (
                <span key={x.day} className="h-full flex-1" style={{ background: PHASES[x.phase].color }} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-fog-400">
        {used.map((p) => (
          <li key={p} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: PHASES[p].color }} />
            {PHASES[p].label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function WeakKeysVisual({ keyStats }: { keyStats: KeyStats }) {
  const lang = attemptsTotal(keyStats.hindi) > attemptsTotal(keyStats.english) ? "hindi" : "english";
  const list = weakKeys(keyStats[lang], lang, 5);

  if (!list.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 p-5 text-sm leading-relaxed text-fog-400">
        No data yet. Finish a test in the live test above and the keys you miss most appear here, worked out from
        your own typing.
      </div>
    );
  }
  return (
    <ul className="space-y-2.5">
      {list.map((w) => (
        <li key={w.ch} className="flex items-center gap-3">
          <span
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-fog-100",
              w.ch === " " ? "font-mono text-[10px]" : lang === "hindi" ? "font-hindi text-lg" : "font-mono text-sm",
            )}
          >
            {displayChar(w.ch)}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-linear-to-r from-saffron-400 to-blush-400"
              style={{ width: `${Math.max(6, w.rate * 100)}%` }}
            />
          </div>
          <span className="w-24 text-right font-mono text-xs tabular-nums text-fog-300">
            {Math.round(w.rate * 100)}% missed
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Features({ keyStats }: { keyStats: KeyStats }) {
  return (
    <section id="features" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Features"
          title={
            <>
              Everything between you and the <span className="whitespace-nowrap">cut-off</span>, handled.
            </>
          }
        >
          Every feature here works today, in this page. There is nothing to install and no account to create.
        </SectionHeading>

        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-6 lg:gap-5">
          <FeatureCard
            icon={Languages}
            title="Hindi typing, no software needed"
            visual={<InscriptMap />}
            className="md:col-span-2 lg:col-span-4"
            interactive
          >
            Built-in Inscript turns your English keyboard into the standard Hindi layout. Hover a key to see what
            it types. Prefer Remington GAIL? Switch to your own Hindi keyboard in the test.
          </FeatureCard>

          <FeatureCard icon={Timer} title="Timed tasks for every day" visual={<TasksVisual />} className="lg:col-span-2" delay={90}>
            Each day is split into time-boxed tasks with a timer and a checkbox. This list is real output from the
            plan engine.
          </FeatureCard>

          <FeatureCard icon={Keyboard} title="Exam mode, before exam day" visual={<ExamScreen />} className="lg:col-span-3">
            Pick an exam and the test runs with its real length and rules, such as no Backspace for RRB NTPC.
          </FeatureCard>

          <FeatureCard icon={Calculator} title="Scored with exam formulas" visual={<FormulaVisual />} className="lg:col-span-3" delay={90}>
            Net speed, KDPH and word errors, plus exam-style lines for Delhi Police HCM marks and RRB NTPC
            deductions.
          </FeatureCard>

          <FeatureCard icon={CalendarRange} title="Plans that fit 3 to 60 days" visual={<PlanLengths />} className="lg:col-span-3">
            Short or long, every plan keeps the same order: foundation, accuracy, speed, then full mocks. These bars
            are generated live.
          </FeatureCard>

          <FeatureCard icon={Activity} title="Weak keys from your own typing" visual={<WeakKeysVisual keyStats={keyStats} />} className="lg:col-span-3" delay={90}>
            Every key you type is checked against the passage. The ones you miss most become a drill made from real
            passage words.
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}
