import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Check, Play } from "lucide-react";
import { generatePlan, PHASES } from "../lib/plan";
import { Eyebrow, Orb, prefersReducedMotion } from "./ui";

const CYCLE = [5, 10, 15, 30];
const PRESETS = [5, 7, 10, 15, 30];
const SAMPLE =
  "The skill test is taken on a computer. Speed gets you shortlisted, but accuracy gets you selected.";

function HeroVisual({ days }: { days: number }) {
  const reduced = prefersReducedMotion();
  const [n, setN] = useState(() => (reduced ? 62 : 0));
  const startRef = useRef(0);
  const lastRef = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let timer = 0;
    const tick = () => {
      const t = performance.now();
      setN((v) => {
        const next = v >= SAMPLE.length + 18 ? 0 : v + 1;
        if (next === 1) startRef.current = t;
        if (next >= 1 && next <= SAMPLE.length) lastRef.current = t;
        return next;
      });
      timer = window.setTimeout(tick, 150 + Math.random() * 110);
    };
    timer = window.setTimeout(tick, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  const shown = Math.min(n, SAMPLE.length);
  const progress = shown / SAMPLE.length;
  const mins = (lastRef.current - startRef.current) / 60000;
  // Measured from the demo's own keystrokes.
  const wpm = shown > 8 && mins > 0 ? Math.round(shown / 5 / mins) : reduced ? 60 : 0;

  const plan = useMemo(
    () => generatePlan({ days, minutes: 60, current: 18, target: 35, lang: "english", testMinutes: 10 }),
    [days],
  );
  const activeDay = Math.max(1, Math.round(days * 0.4));

  return (
    <div className="relative mx-auto w-full max-w-[540px] pb-20 pt-6" aria-hidden="true">
      <div className="absolute inset-x-4 top-10 -z-10 h-64 rounded-full bg-saffron-500/20 blur-[90px]" />

      <div className="animate-float-slow">
        <div className="glass-strong rounded-[1.75rem] p-1.5">
          <div className="rounded-[1.4rem] border border-white/[0.06] bg-ink-900/70 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              </div>
              <span className="truncate font-mono text-[11px] uppercase tracking-[0.16em] text-fog-500">
                Demo · exam mode
              </span>
              <span className="rounded-full border border-leaf-400/25 bg-leaf-400/10 px-2.5 py-1 font-mono text-[11px] text-leaf-300">
                SSC CHSL
              </span>
            </div>

            <p className="mt-6 min-h-[8.5rem] font-mono text-[15px] leading-8 sm:min-h-[8rem] sm:text-base">
              <span className="text-fog-100">{SAMPLE.slice(0, shown)}</span>
              <span className="blink -mx-px inline-block h-[1.15em] w-0.5 translate-y-[0.2em] rounded bg-saffron-400 shadow-[0_0_12px_rgba(255,169,74,0.9)]" />
              <span className="text-fog-500/70">{SAMPLE.slice(shown)}</span>
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2.5">
              {[
                { k: "Speed", v: wpm ? String(wpm) : "–", u: "WPM" },
                { k: "Accuracy", v: "100", u: "%" },
                { k: "Cut-off", v: "35", u: "WPM" },
              ].map((s) => (
                <div key={s.k} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-fog-500">{s.k}</p>
                  <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-fog-100 sm:text-3xl">
                    {s.v}
                    <span className="ml-1 font-sans text-xs font-medium text-fog-400">{s.u}</span>
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-linear-to-r from-saffron-300 to-saffron-600 transition-[width] duration-200 ease-linear"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-[15.5rem] animate-float sm:-left-8" style={{ animationDelay: "-2s" }}>
        <div className="glass-strong rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fog-300">Generated plan</span>
            <span key={days} className="swap font-mono text-xs font-medium text-saffron-300">
              {days} days
            </span>
          </div>
          <div
            className="mt-3 grid min-h-[2.4rem] content-center gap-1"
            style={{ gridTemplateColumns: `repeat(${Math.min(days, 10)}, minmax(0, 1fr))` }}
          >
            {plan.days.map((d) => (
              <span
                key={d.day}
                className="h-2.5 rounded-[3px] transition-opacity duration-500"
                style={{ background: PHASES[d.phase].color, opacity: d.day <= activeDay ? 1 : 0.32 }}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-fog-400">
            <span>
              Day {activeDay}/{days}
            </span>
            <span>18 → {plan.trainTo} WPM</span>
          </div>
        </div>
      </div>

      <div className="absolute -top-1 right-1 animate-float sm:-right-5" style={{ animationDelay: "-4.5s" }}>
        <div className="glass-strong flex items-center gap-2.5 rounded-full py-2 pl-2 pr-4">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-leaf-400 text-ink-950">
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
          <span className="text-xs font-medium text-fog-100">Progress saved on your device</span>
        </div>
      </div>

      <div className="absolute -right-2 bottom-6 hidden animate-float-slow gap-1.5 sm:flex" style={{ animationDelay: "-6s" }}>
        {["J", "K", "L"].map((k, i) => (
          <span
            key={k}
            className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-linear-to-b from-ink-600 to-ink-800 font-mono text-sm font-medium text-fog-200 shadow-[0_6px_0_-1px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)]"
            style={{ transform: `translateY(${i === 1 ? 4 : 0}px)` }}
          >
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Hero({ onPickDays }: { onPickDays: (days: number | null) => void }) {
  const [idx, setIdx] = useState(1);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = window.setInterval(() => setIdx((i) => (i + 1) % CYCLE.length), 2800);
    return () => window.clearInterval(t);
  }, []);

  const days = CYCLE[idx];
  const i = (n: number) => ({ "--i": n }) as CSSProperties;

  return (
    <section id="top" className="clip relative pb-16 pt-28 sm:pt-36 lg:pb-24 lg:pt-40">
      <div className="grid-bg absolute inset-0 -z-10" aria-hidden="true" />
      <Orb className="-left-40 -top-40 -z-10 h-[34rem] w-[34rem] bg-saffron-500/20" />
      <Orb className="-right-48 top-10 -z-10 h-[38rem] w-[38rem] bg-[#2b4bff]/20" style={{ animationDelay: "-8s" }} />
      <Orb
        className="bottom-[-18rem] left-1/3 -z-10 h-[30rem] w-[30rem] bg-leaf-500/10"
        style={{ animationDelay: "-14s" }}
      />

      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        <div>
          <div className="enter" style={i(0)}>
            <Eyebrow>
              <span>
                Free typing trainer for Indian exams{" "}
                <span className="hidden font-hindi normal-case tracking-normal sm:inline">· आपका समय, आपका प्लान</span>
              </span>
            </Eyebrow>
          </div>

          <h1
            className="enter mt-6 font-display text-[2.85rem] font-semibold leading-[1] tracking-[-0.04em] text-fog-100 sm:text-7xl lg:text-[5.25rem]"
            style={i(1)}
          >
            <span className="sr-only">Exam-ready typing speed in the number of days you choose.</span>
            <span aria-hidden="true">
              <span className="block">Exam-ready</span>
              <span className="block">typing speed</span>
              <span className="block whitespace-nowrap pb-2">
                in{" "}
                <span key={days} className="swap text-gradient inline-block pb-1 pr-1">
                  {days} days.
                </span>
              </span>
            </span>
          </h1>

          <p className="enter mt-6 max-w-xl text-pretty text-lg leading-relaxed text-fog-400 sm:text-xl" style={i(2)}>
            Pick your exam and how many days you have. Five, ten, thirty: you decide. Raftaar builds a day-by-day plan
            of drills, timed tasks and exam-mode tests for SSC, UPSSSC, RRB, Delhi Police, courts and more.
          </p>

          <div className="enter mt-8" style={i(3)}>
            <p id="hero-days-label" className="text-sm font-medium text-fog-300">
              How many days until your typing test?
            </p>
            <div role="group" aria-labelledby="hero-days-label" className="mt-3 flex flex-wrap gap-2">
              {PRESETS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onPickDays(d)}
                  className="relative h-11 rounded-full border border-white/12 bg-white/[0.04] px-4 text-sm font-medium text-fog-200 transition-all duration-300 hover:-translate-y-0.5 hover:border-saffron-400/60 hover:bg-saffron-400/10 hover:text-saffron-200"
                >
                  <span className="font-display text-base font-semibold tabular-nums">{d}</span> days
                </button>
              ))}
              <button
                type="button"
                onClick={() => onPickDays(null)}
                className="h-11 rounded-full border border-dashed border-white/20 px-4 text-sm font-medium text-fog-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-saffron-400/60 hover:text-saffron-200"
              >
                Custom
              </button>
            </div>
          </div>

          <div className="enter mt-8 flex flex-col gap-3 sm:flex-row sm:items-center" style={i(4)}>
            <a href="#planner" className="btn btn-primary h-14 px-7 text-base">
              Build my plan
              <ArrowRight className="nudge h-5 w-5" aria-hidden="true" />
            </a>
            <a href="#live-test" className="btn btn-ghost h-14 px-7 text-base">
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              Take a one-minute test
            </a>
          </div>

          <p className="enter mt-4 text-sm text-fog-400" style={i(5)}>
            Never typed before?{" "}
            <a
              href="#learn"
              className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-saffron-300 underline-offset-4 hover:underline"
            >
              Start from zero with step-by-step lessons
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </p>

          <ul className="enter mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-fog-400" style={i(5)}>
            {["Step-by-step lessons from zero", "English and हिंदी (Inscript)", "Free, no signup"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-leaf-400" strokeWidth={2.5} aria-hidden="true" />
                <span className="font-hindi">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="enter" style={i(4)}>
          <HeroVisual days={days} />
        </div>
      </div>
    </section>
  );
}
