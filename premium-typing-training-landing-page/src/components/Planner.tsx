import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Download, Minus, Play, Plus } from "lucide-react";
import { EXAMS, getExam, type Lang } from "../data/exams";
import {
  generatePlan,
  MAX_DAYS,
  MIN_DAYS,
  PHASES,
  PHASE_ORDER,
  resolveTarget,
  sameConfig,
  type FeasibilityLevel,
  type Plan,
  type PlannerState,
} from "../lib/plan";
import type { ActivePlan } from "../lib/storage";
import { Reveal, SectionHeading } from "./ui";
import { cn } from "../utils/cn";

const DAY_PRESETS = [5, 7, 10, 15, 30, 45];
const MINUTE_OPTIONS = [30, 45, 60, 90, 120];

const TONE: Record<FeasibilityLevel, string> = {
  ahead: "border-leaf-400/30 bg-leaf-400/10 text-leaf-300",
  comfortable: "border-leaf-400/30 bg-leaf-400/10 text-leaf-300",
  focused: "border-saffron-400/35 bg-saffron-400/10 text-saffron-300",
  ambitious: "border-saffron-500/45 bg-saffron-500/15 text-saffron-200",
  steep: "border-blush-400/40 bg-blush-400/10 text-blush-400",
};

function fill(value: number, min: number, max: number) {
  return { "--fill": `${((value - min) / (max - min)) * 100}%` } as CSSProperties;
}

function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm font-medium text-fog-200">{label}</div>
        {hint && <div className="text-right text-xs text-fog-400">{hint}</div>}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Segment<T extends string | number>({
  label,
  options,
  value,
  onChange,
  render,
  disabled,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
  render: (v: T) => ReactNode;
  disabled?: (v: T) => boolean;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1">
      {options.map((o) => {
        const off = disabled?.(o) ?? false;
        return (
          <button
            key={String(o)}
            type="button"
            aria-pressed={value === o}
            disabled={off}
            onClick={() => onChange(o)}
            className={cn(
              "h-10 min-w-0 flex-1 rounded-xl px-1 text-sm font-medium transition-all duration-300",
              value === o
                ? "bg-white/[0.12] text-fog-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                : "text-fog-400 hover:text-fog-100",
              off && "cursor-not-allowed opacity-40 hover:text-fog-400",
            )}
          >
            {render(o)}
          </button>
        );
      })}
    </div>
  );
}

function Trajectory({ plan, current, target, selected }: { plan: Plan; current: number; target: number; selected: number }) {
  const values = [current, ...plan.days.map((d) => d.targetWpm)];
  const lo = Math.min(current, target) - 4;
  const hi = Math.max(plan.trainTo, target) + 4;
  const y = (v: number) => 100 - ((v - lo) / (hi - lo)) * 100;
  const x = (i: number) => (i / (values.length - 1)) * 100;
  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(" ");

  return (
    <div
      role="img"
      aria-label={`Projected training speed from ${current} to ${plan.trainTo} words per minute over ${plan.days.length} days. Exam cut-off is ${target}.`}
      className="relative h-40 w-full"
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <linearGradient id="traj-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffa94a" stopOpacity="0.32" />
            <stop offset="1" stopColor="#ffa94a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line} L100,100 L0,100 Z`} fill="url(#traj-fill)" />
        <line
          x1="0"
          x2="100"
          y1={y(target)}
          y2={y(target)}
          stroke="#3ddc97"
          strokeWidth="1.5"
          strokeDasharray="5 5"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={line}
          fill="none"
          stroke="#ffa94a"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span
        className="absolute left-0 -translate-y-full pb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-leaf-300"
        style={{ top: `${y(target)}%` }}
      >
        Cut-off {target} WPM
      </span>
      <span
        className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-saffron-400 bg-ink-950 shadow-[0_0_0_5px_rgba(255,169,74,0.18)] transition-all duration-500 ease-out"
        style={{ left: `${x(selected)}%`, top: `${y(values[selected])}%` }}
      />
    </div>
  );
}

export function Planner({
  state,
  update,
  activePlan,
  onStart,
}: {
  state: PlannerState;
  update: (patch: Partial<PlannerState>) => void;
  activePlan: ActivePlan | null;
  onStart: () => void;
}) {
  const exam = getExam(state.examId);
  const isCustom = exam.id === "custom";
  const target = resolveTarget(state);
  const hindiAllowed = isCustom || exam.hindi != null;
  const langLabel = state.lang === "hindi" ? "Hindi" : "English";

  const plan = useMemo(
    () =>
      generatePlan({
        days: state.days,
        minutes: state.minutes,
        current: state.current,
        target,
        lang: state.lang,
        testMinutes: exam.testMinutes,
      }),
    [state.days, state.minutes, state.current, state.lang, target, exam.testMinutes],
  );

  const n = plan.days.length;
  const [selected, setSelected] = useState(1);
  const [downloaded, setDownloaded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const isActive = !!activePlan && sameConfig(activePlan.config, state);
  const activeLabel = activePlan ? `${getExam(activePlan.config.examId).name}, ${activePlan.config.days} days` : "";
  // Keep the selection inside the plan when it gets shorter, and remember the clamp.
  if (selected > n) setSelected(n);
  const sel = Math.min(selected, n);
  const day = plan.days[sel - 1];
  const phase = PHASES[day.phase];

  const setDays = (d: number) => update({ days: Math.max(MIN_DAYS, Math.min(MAX_DAYS, d)) });

  const download = () => {
    const lines = [
      `RAFTAAR · ${n}-DAY TYPING PLAN`,
      `${exam.name} · ${langLabel} · exam cut-off ${target} WPM`,
      `Starting speed: ${state.current} WPM · Training target: ${plan.trainTo} WPM`,
      `Daily practice: ${state.minutes} minutes · Total: ${plan.totalHours.toFixed(1)} hours`,
      `Outlook: ${plan.feasibility.label}. ${plan.feasibility.note}`,
      "",
      "Day targets are training goals, not guarantees. Confirm exam requirements in your official notification.",
      ...plan.days.flatMap((d) => [
        "",
        `DAY ${d.day} · ${PHASES[d.phase].label.toUpperCase()} · ${d.title}`,
        `Target: ${d.targetWpm} WPM at ${d.accuracy}%+ accuracy`,
        ...d.tasks.map((t) => `  [ ] ${String(t.minutes).padStart(2, " ")} min  ${t.title}: ${t.detail}`),
      ]),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raftaar-${n}-day-typing-plan.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 2400);
  };

  return (
    <section id="planner" className="clip relative py-20 sm:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-24 -z-10 h-[40rem] w-[70rem] -translate-x-1/2 rounded-full bg-saffron-500/[0.07] blur-[120px]"
      />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading eyebrow="Plan builder" title="You set the days. Raftaar builds the schedule.">
          Five days left or sixty, the plan stretches to fit. Every day gets a target speed and a time-boxed task
          list, and the last days are always full mocks.
        </SectionHeading>

        <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:gap-6">
          {/* ---------- Controls ---------- */}
          <Reveal className="lg:sticky lg:top-24 lg:self-start">
            <form
              onSubmit={(e) => e.preventDefault()}
              aria-label="Plan settings"
              className="glass space-y-7 rounded-[2rem] p-5 sm:p-7"
            >
              <Field label={<label htmlFor="planner-exam">Your exam</label>}>
                <div className="relative">
                  <select
                    id="planner-exam"
                    value={state.examId}
                    onChange={(e) => update({ examId: e.target.value })}
                    className="h-12 w-full appearance-none truncate rounded-2xl border border-white/10 bg-white/[0.04] pl-4 pr-11 text-[15px] font-medium text-fog-100 transition-colors hover:border-white/25 [&>option]:bg-ink-800"
                  >
                    {EXAMS.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} · {e.post}
                      </option>
                    ))}
                    <option value="custom">Custom goal · any other exam</option>
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fog-400"
                    aria-hidden="true"
                  />
                </div>
              </Field>

              <Field label="Typing language" hint={!hindiAllowed ? "This test is English only" : undefined}>
                <Segment<Lang>
                  label="Typing language"
                  options={["english", "hindi"]}
                  value={state.lang}
                  onChange={(lang) => update({ lang })}
                  disabled={(o) => o === "hindi" && !hindiAllowed}
                  render={(o) => (o === "english" ? "English" : <span className="font-hindi">हिंदी</span>)}
                />
              </Field>

              {isCustom && (
                <Field
                  label={<label htmlFor="planner-target">Target speed</label>}
                  hint={<output htmlFor="planner-target">{state.customTarget} WPM</output>}
                >
                  <input
                    id="planner-target"
                    type="range"
                    min={20}
                    max={80}
                    value={state.customTarget}
                    onChange={(e) => update({ customTarget: Number(e.target.value) })}
                    style={fill(state.customTarget, 20, 80)}
                    className="range"
                  />
                </Field>
              )}

              <Field label={<label htmlFor="planner-days">Days until your test</label>}>
                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setDays(state.days - 1)}
                    disabled={state.days <= MIN_DAYS}
                    aria-label="One day less"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-fog-200 transition-all hover:border-white/25 hover:bg-white/10 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <output htmlFor="planner-days" className="flex items-baseline gap-2">
                    <span
                      key={state.days}
                      className="swap text-gradient font-display text-6xl font-semibold tabular-nums leading-none tracking-[-0.04em]"
                    >
                      {state.days}
                    </span>
                    <span className="text-sm font-medium text-fog-400">days</span>
                  </output>
                  <button
                    type="button"
                    onClick={() => setDays(state.days + 1)}
                    disabled={state.days >= MAX_DAYS}
                    aria-label="One day more"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-fog-200 transition-all hover:border-white/25 hover:bg-white/10 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <input
                  id="planner-days"
                  type="range"
                  min={MIN_DAYS}
                  max={MAX_DAYS}
                  value={state.days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  style={fill(state.days, MIN_DAYS, MAX_DAYS)}
                  className="range mt-4"
                />
                <div role="group" aria-label="Quick day presets" className="mt-3 grid grid-cols-6 gap-1.5">
                  {DAY_PRESETS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={state.days === d}
                      aria-label={`${d} days`}
                      onClick={() => setDays(d)}
                      className={cn(
                        "h-10 rounded-xl border font-mono text-sm tabular-nums transition-all duration-300",
                        state.days === d
                          ? "border-saffron-400/60 bg-saffron-400/15 text-saffron-200"
                          : "border-white/[0.08] bg-white/[0.03] text-fog-400 hover:border-white/25 hover:text-fog-100",
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Practice time per day">
                <Segment<number>
                  label="Practice time per day"
                  options={MINUTE_OPTIONS}
                  value={state.minutes}
                  onChange={(minutes) => update({ minutes })}
                  render={(o) => (
                    <>
                      <span className="tabular-nums">{o}</span>
                      <span className="ml-0.5 text-xs text-fog-500">m</span>
                    </>
                  )}
                />
              </Field>

              <Field
                label={<label htmlFor="planner-current">Your speed today</label>}
                hint={
                  <output htmlFor="planner-current">
                    {state.current === 0 ? "Starting from zero" : `${state.current} WPM`}
                  </output>
                }
              >
                <input
                  id="planner-current"
                  type="range"
                  min={0}
                  max={70}
                  value={state.current}
                  onChange={(e) => update({ current: Number(e.target.value) })}
                  style={fill(state.current, 0, 70)}
                  className="range"
                />
                <a
                  href="#live-test"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded text-xs font-medium text-saffron-300 underline-offset-4 hover:underline"
                >
                  Not sure? Measure it in the live test
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </a>
              </Field>
            </form>
          </Reveal>

          {/* ---------- Result ---------- */}
          <Reveal delay={120}>
            <div className="glass rounded-[2rem] p-5 sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-display text-3xl font-semibold tracking-[-0.03em] text-fog-100 sm:text-4xl">
                    Your {n}-day plan
                  </h3>
                  <p className="mt-2 text-sm text-fog-400">
                    {exam.name} · {langLabel} · {state.minutes} minutes a day
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-2 self-start rounded-full border px-3.5 py-2 text-sm font-semibold",
                    TONE[plan.feasibility.level],
                  )}
                >
                  <span className="h-2 w-2 rounded-full bg-current" />
                  {plan.feasibility.label}
                </span>
              </div>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-fog-300" aria-live="polite">
                {plan.feasibility.note}
              </p>
              {plan.beginner && (
                <p className="mt-3 max-w-2xl rounded-2xl border border-leaf-400/25 bg-leaf-400/[0.06] px-4 py-3 text-sm leading-relaxed text-leaf-300">
                  Starting from zero: your foundation days are step-by-step key lessons with a finger guide, so you
                  learn the keyboard before any timed test.{" "}
                  <a href="#learn" className="font-semibold underline underline-offset-4">
                    Open lesson 1
                  </a>
                </p>
              )}
              {(exam.bothLanguages || exam.derived) && (
                <p className="mt-3 max-w-2xl rounded-2xl border border-saffron-400/25 bg-saffron-400/[0.06] px-4 py-3 text-sm leading-relaxed text-saffron-200">
                  {exam.bothLanguages &&
                    `${exam.name} tests both Hindi and English. Train the other language too: switch the language above and start a second plan when this one ends, or alternate days. `}
                  {exam.derived && `Targets for ${exam.name} are worked out from its marks scheme, not a stated WPM.`}
                </p>
              )}

              <dl className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[
                  { k: "Today", v: String(state.current), u: "WPM" },
                  {
                    k: "Exam needs",
                    v: String(target),
                    u: exam.kdph && !isCustom ? `WPM · ${exam.kdph.toLocaleString("en-IN")} KDPH` : "WPM",
                  },
                  { k: "We train to", v: String(plan.trainTo), u: "WPM" },
                  {
                    k: "Total practice",
                    v: plan.totalHours % 1 === 0 ? String(plan.totalHours) : plan.totalHours.toFixed(1),
                    u: "hours",
                  },
                ].map((s) => (
                  <div key={s.k} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog-500">{s.k}</dt>
                    <dd className="mt-1.5 font-display text-3xl font-semibold tabular-nums tracking-[-0.03em] text-fog-100">
                      {s.v}
                      <span className="ml-1.5 block font-sans text-xs font-medium tracking-normal text-fog-400 sm:inline">
                        {s.u}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-6 rounded-3xl border border-white/[0.07] bg-ink-900/50 p-4 sm:p-5">
                <Trajectory plan={plan} current={state.current} target={target} selected={sel} />
                <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-fog-500">
                  <span>Start</span>
                  <span>Day {n}</span>
                </div>
              </div>

              {/* Phase bar */}
              <div className="mt-6">
                <div className="flex h-2.5 gap-1 overflow-hidden rounded-full" aria-hidden="true">
                  {plan.days.map((d) => (
                    <span
                      key={d.day}
                      className="h-full flex-1 transition-opacity duration-300"
                      style={{ background: PHASES[d.phase].color, opacity: d.day === sel ? 1 : 0.55 }}
                    />
                  ))}
                </div>
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-fog-400">
                  {PHASE_ORDER.filter((p) => plan.phaseCounts[p] > 0).map((p) => (
                    <li key={p} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: PHASES[p].color }} />
                      {PHASES[p].label}
                      <span className="tabular-nums text-fog-500">
                        {plan.phaseCounts[p]} {plan.phaseCounts[p] === 1 ? "day" : "days"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Day picker */}
              <div className="mt-7">
                <p id="day-picker-label" className="text-sm font-medium text-fog-200">
                  Tap a day to see its tasks
                </p>
                <div
                  role="group"
                  aria-labelledby="day-picker-label"
                  className={cn(
                    "mt-3 grid grid-cols-6 gap-1.5 p-0.5 sm:grid-cols-10",
                    n > 30 && "max-h-[13.5rem] overflow-y-auto pr-1.5",
                  )}
                >
                  {plan.days.map((d) => (
                    <button
                      key={d.day}
                      type="button"
                      aria-pressed={sel === d.day}
                      aria-label={`Day ${d.day}, ${PHASES[d.phase].label}`}
                      onClick={() => setSelected(d.day)}
                      className={cn(
                        "relative h-12 rounded-xl border font-mono text-sm tabular-nums transition-all duration-300",
                        sel === d.day
                          ? "border-saffron-400/70 bg-saffron-400/15 text-fog-100 shadow-[0_8px_24px_-10px_rgba(255,138,31,0.7)]"
                          : "border-white/[0.07] bg-white/[0.03] text-fog-400 hover:-translate-y-0.5 hover:border-white/25 hover:text-fog-100",
                      )}
                    >
                      {d.day}
                      <span
                        className="absolute bottom-1.5 left-1/2 h-[3px] w-3.5 -translate-x-1/2 rounded-full"
                        style={{ background: PHASES[d.phase].color }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Day detail */}
              <div aria-live="polite" className="mt-5">
                <div
                  key={`${sel}-${n}-${state.minutes}-${state.examId}-${state.lang}`}
                  className="swap rounded-3xl border border-white/[0.08] bg-ink-900/60 p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span
                        className="rounded-full border px-3 py-1 text-xs font-semibold"
                        style={{ color: phase.color, borderColor: `${phase.color}55`, background: `${phase.color}1a` }}
                      >
                        {phase.label}
                      </span>
                      <span className="font-mono text-xs text-fog-400">
                        Day {day.day} of {n}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelected(Math.max(1, sel - 1))}
                        disabled={sel === 1}
                        aria-label="Previous day"
                        className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-fog-300 transition-all hover:bg-white/10 active:scale-90 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelected(Math.min(n, sel + 1))}
                        disabled={sel === n}
                        aria-label="Next day"
                        className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-fog-300 transition-all hover:bg-white/10 active:scale-90 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <h4 className="mt-4 text-balance font-display text-2xl font-semibold tracking-[-0.02em] text-fog-100">
                    {day.title}
                  </h4>
                  <p className="mt-1.5 text-sm text-fog-400">{phase.blurb}</p>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                    <span className="rounded-full bg-white/[0.06] px-3 py-1.5 text-fog-200">
                      Target {day.targetWpm} WPM
                    </span>
                    <span className="rounded-full bg-white/[0.06] px-3 py-1.5 text-fog-200">
                      Accuracy {day.accuracy}%+
                    </span>
                    <span className="rounded-full bg-white/[0.06] px-3 py-1.5 text-fog-200">
                      {state.minutes} minutes
                    </span>
                  </div>

                  <div className="mt-5 flex h-1.5 gap-1" aria-hidden="true">
                    {day.tasks.map((t, i) => (
                      <span
                        key={t.title}
                        className="h-full rounded-full"
                        style={{ flexGrow: t.minutes, background: phase.color, opacity: 1 - i * 0.2 }}
                      />
                    ))}
                  </div>

                  <ol className="mt-4 space-y-2">
                    {day.tasks.map((t) => (
                      <li
                        key={t.title}
                        className="flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3.5 transition-colors duration-300 hover:border-white/15 hover:bg-white/[0.05]"
                      >
                        <span className="flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-white/[0.06] font-mono leading-none text-fog-100">
                          <span className="text-base tabular-nums">{t.minutes}</span>
                          <span className="mt-1 text-[10px] text-fog-400">min</span>
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-fog-100">{t.title}</p>
                          <p className="mt-0.5 text-sm leading-relaxed text-fog-400">{t.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                {isActive ? (
                  <a href="#progress" className="btn btn-primary h-12 px-6 text-[15px]">
                    <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                    Plan active · open today's tasks
                  </a>
                ) : confirming ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirming(false);
                        onStart();
                      }}
                      className="btn btn-primary h-12 px-6 text-[15px]"
                    >
                      Replace my current plan
                    </button>
                    <button type="button" onClick={() => setConfirming(false)} className="btn btn-ghost h-12 px-6 text-[15px]">
                      Keep current plan
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => (activePlan ? setConfirming(true) : onStart())}
                    className="btn btn-primary h-12 px-6 text-[15px]"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    Start this {n}-day plan
                  </button>
                )}
                <button type="button" onClick={download} className="btn btn-ghost h-12 px-6 text-[15px]">
                  {downloaded ? (
                    <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                  ) : (
                    <Download className="h-4 w-4" aria-hidden="true" />
                  )}
                  {downloaded ? "Saved to downloads" : "Download as text"}
                </button>
              </div>
              {confirming && (
                <p className="mt-3 text-sm text-fog-400" role="status">
                  You already have an active plan ({activeLabel}). Starting this one replaces it and clears its ticks.
                </p>
              )}
              <p className="mt-4 text-xs leading-relaxed text-fog-500">
                Daily targets are estimates based on steady practice, not guarantees. Started plans are saved in this
                browser only.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
