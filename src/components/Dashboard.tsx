import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarCheck,
  Check,
  Download,
  GraduationCap,
  Keyboard,
  Pause,
  Play,
  RotateCcw,
  Square,
  Target,
  Timer as TimerIcon,
  Trash2,
} from "lucide-react";
import { getExam, type Lang } from "../data/exams";
import { LESSON_TOTAL, lessonsFor, nextLesson } from "../data/lessons";
import { buildDrill } from "../data/passages";
import { generatePlan, PHASES, resolveTarget } from "../lib/plan";
import { dayNumber, todayISO, type ActivePlan, type CourseProgress, type KeyStats, type TestRecord } from "../lib/storage";
import { attemptsTotal, displayChar, inscriptHint, weakKeys } from "../lib/typing";
import type { LearnRequest } from "./Academy";
import type { TestRequest } from "./TypingTest";
import { Reveal, SectionHeading } from "./ui";
import { cn } from "../utils/cn";

type OpenTest = (req: Omit<TestRequest, "nonce">) => void;
type OpenLearn = (req: Omit<LearnRequest, "nonce">) => void;

interface TimerState {
  key: string;
  endsAt: number;
  left: number;
  running: boolean;
}

const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const minLabel = (s: number) => (s % 60 === 0 ? `${s / 60}-min` : `${s}s`);
const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function drillFor(stats: KeyStats, lang: Lang) {
  const chars = weakKeys(stats[lang], lang, 6).map((w) => w.ch);
  return {
    text: buildDrill(lang, chars),
    label: chars.length ? chars.map(displayChar).join("  ") : "common words (no weak keys yet)",
  };
}

/* ---------- Active plan ---------- */

function PlanTracker({
  activePlan,
  keyStats,
  course,
  onUpdatePlan,
  onOpenTest,
  onOpenLearn,
}: {
  activePlan: ActivePlan | null;
  keyStats: KeyStats;
  course: CourseProgress;
  onUpdatePlan: (p: ActivePlan | null) => void;
  onOpenTest: OpenTest;
  onOpenLearn: OpenLearn;
}) {
  const [viewDay, setViewDay] = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const config = activePlan?.config;
  const plan = useMemo(() => {
    if (!config) return null;
    return generatePlan({
      days: config.days,
      minutes: config.minutes,
      current: config.current,
      target: resolveTarget(config),
      lang: config.lang,
      testMinutes: getExam(config.examId).testMinutes,
    });
  }, [config]);

  useEffect(() => {
    if (!timer?.running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [timer?.running]);

  const left = timer ? (timer.running ? Math.max(0, timer.endsAt - now) : timer.left) : 0;

  // When a task timer runs out, tick the task.
  useEffect(() => {
    if (!timer || !timer.running || left > 0) return;
    if (activePlan && !activePlan.done[timer.key]) {
      onUpdatePlan({ ...activePlan, done: { ...activePlan.done, [timer.key]: true } });
    }
    setTimer(null);
  }, [left, timer, activePlan, onUpdatePlan]);

  if (!activePlan || !plan || !config) {
    return (
      <div className="glass flex h-full flex-col justify-between rounded-[2rem] p-6 sm:p-8">
        <div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-saffron-400/25 bg-saffron-400/10 text-saffron-300">
            <CalendarCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <h3 className="mt-5 font-display text-2xl font-semibold tracking-[-0.02em] text-fog-100">
            No active plan yet
          </h3>
          <p className="mt-2.5 max-w-md text-[15px] leading-relaxed text-fog-400">
            Build a plan and press “Start this plan”. Each day's tasks then appear here with timers and checkboxes,
            and your ticks are saved in this browser.
          </p>
        </div>
        <a href="#planner" className="btn btn-primary mt-8 h-12 self-start px-6 text-[15px]">
          Build my plan
          <ArrowRight className="nudge h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    );
  }

  const exam = getExam(config.examId);
  const n = plan.days.length;
  const today = dayNumber(activePlan.startedOn);
  const day = Math.min(n, Math.max(1, viewDay ?? Math.min(Math.max(today, 1), n)));
  const current = plan.days[day - 1];
  const phase = PHASES[current.phase];
  const total = plan.days.reduce((a, d) => a + d.tasks.length, 0);
  const doneCount = plan.days.reduce(
    (a, d) => a + d.tasks.filter((_, i) => activePlan.done[`${d.day}-${i}`]).length,
    0,
  );
  const pct = Math.round((doneCount / total) * 100);
  const status = today > n ? `Plan period over · day ${n} was the last` : `Day ${Math.max(today, 1)} of ${n}`;

  const courseDone = course[config.lang];
  const lessonSlice = (range?: [number, number]) => {
    const all = lessonsFor(config.lang);
    return range ? all.slice(range[0] - 1, range[1]) : all;
  };
  const openLessons = (range?: [number, number]) => {
    const target = lessonSlice(range).find((l) => !courseDone[l.id]) ?? nextLesson(config.lang, courseDone);
    onOpenLearn({ lang: config.lang, lessonId: target.id });
  };

  // The passed lesson in the range with the lowest accuracy, or the first one if none is passed yet.
  const openWeakest = (range?: [number, number]) => {
    const slice = lessonSlice(range);
    const passed = slice.filter((l) => courseDone[l.id]).sort((a, b) => courseDone[a.id].acc - courseDone[b.id].acc);
    onOpenLearn({ lang: config.lang, lessonId: (passed[0] ?? slice[0]).id });
  };

  const toggle = (key: string) => {
    const done = { ...activePlan.done };
    if (done[key]) delete done[key];
    else done[key] = true;
    onUpdatePlan({ ...activePlan, done });
  };

  const startTimer = (key: string, minutes: number) => {
    const ms = minutes * 60000;
    const t = Date.now();
    setNow(t);
    setTimer({ key, endsAt: t + ms, left: ms, running: true });
  };

  return (
    <div className="glass h-full rounded-[2rem] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-saffron-300">{status}</p>
          <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] text-fog-100 sm:text-3xl">
            {exam.name} · {n}-day plan
          </h3>
          <p className="mt-1 text-sm text-fog-400">
            {config.lang === "hindi" ? "Hindi" : "English"} · {config.minutes} min a day · started{" "}
            {fmtDay(activePlan.startedOn)}
          </p>
        </div>
        {confirmReset ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setTimer(null);
                onUpdatePlan(null);
                setConfirmReset(false);
              }}
              className="btn h-9 border border-blush-400/50 bg-blush-400/15 px-4 text-xs text-blush-400"
            >
              Remove plan
            </button>
            <button type="button" onClick={() => setConfirmReset(false)} className="btn btn-ghost h-9 px-4 text-xs">
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmReset(true)} className="btn btn-ghost h-9 px-4 text-xs">
            Reset plan
          </button>
        )}
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs text-fog-400">
          <span>
            {doneCount} of {total} tasks done
          </span>
          <span className="font-mono tabular-nums text-fog-200">{pct}%</span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.08]"
          role="progressbar"
          aria-label="Plan progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-saffron-300 to-saffron-600 transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div
        role="group"
        aria-label="Days in this plan"
        className={cn("mt-5 grid grid-cols-7 gap-1.5 p-0.5 sm:grid-cols-10", n > 30 && "max-h-[9.75rem] overflow-y-auto pr-1")}
      >
        {plan.days.map((d) => {
          const doneHere = d.tasks.filter((_, i) => activePlan.done[`${d.day}-${i}`]).length;
          const complete = doneHere === d.tasks.length;
          const isToday = d.day === today;
          return (
            <button
              key={d.day}
              type="button"
              aria-pressed={day === d.day}
              aria-label={`Day ${d.day}${isToday ? ", today" : ""}, ${doneHere} of ${d.tasks.length} tasks done`}
              onClick={() => setViewDay(d.day)}
              className={cn(
                "relative h-11 rounded-xl border font-mono text-sm tabular-nums transition-all duration-300",
                day === d.day
                  ? "border-saffron-400/70 bg-saffron-400/15 text-fog-100"
                  : "border-white/[0.07] bg-white/[0.03] text-fog-400 hover:border-white/25 hover:text-fog-100",
                isToday && day !== d.day && "border-white/30 text-fog-100",
              )}
            >
              {complete ? <Check className="mx-auto h-4 w-4 text-leaf-300" strokeWidth={3} aria-hidden="true" /> : d.day}
              <span
                className="absolute bottom-1.5 left-1/2 h-[3px] w-3.5 -translate-x-1/2 rounded-full"
                style={{ background: PHASES[d.phase].color, opacity: complete ? 1 : 0.6 }}
              />
              {isToday && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-saffron-400" />}
            </button>
          );
        })}
      </div>

      <div key={day} className="swap mt-5 rounded-3xl border border-white/[0.08] bg-ink-900/60 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className="rounded-full border px-3 py-1 text-xs font-semibold"
            style={{ color: phase.color, borderColor: `${phase.color}55`, background: `${phase.color}1a` }}
          >
            {phase.label}
          </span>
          <span className="font-mono text-xs text-fog-400">
            Day {day}
            {day === today ? " · today" : ""}
          </span>
          <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-fog-200">
            Target {current.targetWpm} WPM · {current.accuracy}%+
          </span>
        </div>
        <h4 className="mt-3 font-display text-xl font-semibold tracking-[-0.02em] text-fog-100">{current.title}</h4>

        <ol className="mt-4 space-y-2">
          {current.tasks.map((t, i) => {
            const key = `${current.day}-${i}`;
            const done = !!activePlan.done[key];
            const mine = timer && timer.key === key ? timer : null;
            return (
              <li
                key={key}
                className={cn(
                  "rounded-2xl border p-3.5 transition-colors duration-300 sm:p-4",
                  done ? "border-leaf-400/20 bg-leaf-400/[0.04]" : "border-white/[0.07] bg-white/[0.025]",
                )}
              >
                <div className="flex items-start gap-3.5">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    aria-label={`Mark “${t.title}” as done`}
                    onClick={() => toggle(key)}
                    className={cn(
                      "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-all duration-300 active:scale-90",
                      done ? "border-leaf-400 bg-leaf-400 text-ink-950" : "border-white/25 hover:border-saffron-400",
                    )}
                  >
                    {done && <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className={cn("font-medium", done ? "text-fog-400 line-through" : "text-fog-100")}>{t.title}</p>
                      <span className="shrink-0 font-mono text-xs tabular-nums text-fog-400">{t.minutes} min</span>
                    </div>
                    <p className="mt-0.5 text-sm leading-relaxed text-fog-400">{t.detail}</p>

                    {!done && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {(t.kind === "test" || t.kind === "mock") && t.testSeconds ? (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenTest({ seconds: t.testSeconds, lang: config.lang, examId: config.examId })
                            }
                            className="btn btn-primary h-9 px-4 text-xs"
                          >
                            <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                            Start {minLabel(t.testSeconds)} test
                          </button>
                        ) : mine ? (
                          <>
                            <span className="rounded-full bg-white/[0.08] px-3 py-1.5 font-mono text-sm tabular-nums text-fog-100">
                              <span className="sr-only">Time left </span>
                              {mmss(left)}
                            </span>
                            {mine.running ? (
                              <button
                                type="button"
                                onClick={() => setTimer({ ...mine, running: false, left })}
                                className="btn btn-ghost h-9 px-3.5 text-xs"
                              >
                                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                                Pause
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  const t0 = Date.now();
                                  setNow(t0);
                                  setTimer({ ...mine, running: true, endsAt: t0 + mine.left });
                                }}
                                className="btn btn-ghost h-9 px-3.5 text-xs"
                              >
                                <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                                Resume
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setTimer(null)}
                              aria-label="Stop timer"
                              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-fog-300 transition-colors hover:bg-white/10"
                            >
                              <Square className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startTimer(key, t.minutes)}
                            className="btn btn-ghost h-9 px-4 text-xs"
                          >
                            <TimerIcon className="h-3.5 w-3.5" aria-hidden="true" />
                            Start {t.minutes}-min timer
                          </button>
                        )}
                        {t.kind === "lesson" && (
                          <>
                            <button type="button" onClick={() => openLessons(t.lessons)} className="btn btn-primary h-9 px-4 text-xs">
                              <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                              {t.lessons ? `Open lessons ${t.lessons[0]}–${t.lessons[1]}` : "Open lessons"}
                            </button>
                            {t.lessons && (
                              <span className="text-xs text-fog-400">
                                {lessonSlice(t.lessons).filter((l) => courseDone[l.id]).length} of{" "}
                                {lessonSlice(t.lessons).length} passed
                              </span>
                            )}
                          </>
                        )}
                        {t.kind === "repeat" && (
                          <button type="button" onClick={() => openWeakest(t.lessons)} className="btn btn-ghost h-9 px-4 text-xs">
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                            Repeat weakest lesson
                          </button>
                        )}
                        {t.kind === "review" && (
                          <button
                            type="button"
                            onClick={() => onOpenLearn({ lang: config.lang, review: true })}
                            className="btn btn-ghost h-9 px-4 text-xs"
                          >
                            <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
                            Practise learned keys
                          </button>
                        )}
                        {t.kind === "practice" && t.testSeconds && (
                          <button
                            type="button"
                            onClick={() => onOpenTest({ seconds: t.testSeconds, lang: config.lang, examId: config.examId })}
                            className="btn btn-ghost h-9 px-4 text-xs"
                          >
                            <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                            Open {minLabel(t.testSeconds)} practice
                          </button>
                        )}
                        {t.kind === "weak" && (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenTest({
                                seconds: 120,
                                lang: config.lang,
                                examId: config.examId,
                                drill: drillFor(keyStats, config.lang),
                              })
                            }
                            className="btn btn-ghost h-9 px-4 text-xs"
                          >
                            <Target className="h-3.5 w-3.5" aria-hidden="true" />
                            Open weak-key drill
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/* ---------- Numbers ---------- */

function StatsCard({ history, lessonsDone }: { history: TestRecord[]; lessonsDone: number }) {
  const last10 = history.slice(-10);
  const best = history.reduce((a, r) => Math.max(a, r.net), 0);
  const latest = history[history.length - 1];
  const avgAcc = last10.length ? last10.reduce((a, r) => a + r.accuracy, 0) / last10.length : null;
  const days = new Set(history.map((r) => todayISO(new Date(r.at)))).size;

  const tiles = [
    { k: "Tests finished", v: String(history.length), u: "" },
    { k: "Best net speed", v: history.length ? String(Math.floor(best)) : "–", u: "WPM" },
    {
      k: "Latest",
      v: latest ? String(Math.floor(latest.net)) : "–",
      u: latest?.target ? `/ ${latest.target} WPM` : "WPM",
    },
    { k: "Avg accuracy", v: avgAcc == null ? "–" : String(Math.floor(avgAcc)), u: "% · last 10" },
    { k: "Lessons passed", v: String(lessonsDone), u: `of ${LESSON_TOTAL}` },
    { k: "Days practised", v: String(days), u: days === 1 ? "day" : "days" },
  ];

  return (
    <div className="glass flex h-full flex-col rounded-[2rem] p-5 sm:p-7">
      <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-fog-100">Your numbers</h3>
      <dl className="mt-5 grid grid-cols-2 gap-2.5">
        {tiles.map((t) => (
          <div key={t.k} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
            <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog-500">{t.k}</dt>
            <dd className="mt-1.5 font-display text-3xl font-semibold tabular-nums tracking-[-0.03em] text-fog-100">
              {t.v}
              {t.u && <span className="ml-1.5 font-sans text-xs font-medium tracking-normal text-fog-400">{t.u}</span>}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-auto pt-5">
        {history.length ? (
          <p className="text-xs leading-relaxed text-fog-500">
            Counts finished tests on this device, including weak-key drills. Accuracy is rounded down.
          </p>
        ) : (
          <a
            href="#live-test"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-saffron-300 hover:text-saffron-200"
          >
            Take your first test
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
}

function HistoryCard({ history }: { history: TestRecord[] }) {
  const pts = history.slice(-20);
  const target = [...pts].reverse().find((r) => r.target != null)?.target ?? null;
  const recent = history.slice(-5).reverse();

  let chart = null;
  if (pts.length >= 2) {
    const vals = pts.map((r) => r.net);
    const lo = Math.max(0, Math.min(...vals, target ?? Infinity) - 5);
    const hi = Math.max(...vals, target ?? 0) + 5;
    const x = (i: number) => (i / (pts.length - 1)) * 100;
    const y = (v: number) => 100 - ((v - lo) / (hi - lo)) * 100;
    const line = pts.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(2)},${y(r.net).toFixed(2)}`).join(" ");
    chart = (
      <div
        role="img"
        aria-label={`Net speed over your last ${pts.length} tests, from ${Math.floor(vals[0])} to ${Math.floor(vals[vals.length - 1])} words per minute.`}
        className="relative h-40"
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <linearGradient id="hist-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffa94a" stopOpacity="0.3" />
              <stop offset="1" stopColor="#ffa94a" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line} L100,100 L0,100 Z`} fill="url(#hist-fill)" />
          {target != null && (
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
          )}
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
        {target != null && (
          <span
            className="absolute left-0 -translate-y-full pb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-leaf-300"
            style={{ top: `${y(target)}%` }}
          >
            Target {target} WPM
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="glass grid gap-6 rounded-[2rem] p-5 sm:p-7 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-8">
      <div>
      <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-fog-100">Speed trend</h3>
      <div className="mt-5 rounded-3xl border border-white/[0.07] bg-ink-900/50 p-4">
        {chart ?? (
          <p className="grid h-40 place-items-center px-6 text-center text-sm text-fog-400">
            Finish two tests to see your trend here.
          </p>
        )}
      </div>
      </div>
      <div>
      <h4 className="text-sm font-medium text-fog-200 lg:mt-1.5">Recent tests</h4>
      {recent.length ? (
        <ul className="mt-3 divide-y divide-white/[0.06]">
          {recent.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="truncate text-fog-200">
                  {getExam(r.examId).name}
                  {r.drill ? " · drill" : ""}
                </p>
                <p className="text-xs text-fog-500">
                  {fmtWhen(r.at)} · {r.lang === "hindi" ? "Hindi" : "English"} · {Math.round(r.seconds / 60) || 1} min
                </p>
              </div>
              <p className="shrink-0 text-right font-mono tabular-nums">
                <span className="text-fog-100">{Math.floor(r.net)} WPM</span>
                <span className="block text-xs text-fog-500">{Math.floor(r.accuracy)}%</span>
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-fog-500">No tests yet.</p>
      )}
      </div>
    </div>
  );
}

function WeakKeysCard({ keyStats, onOpenTest }: { keyStats: KeyStats; onOpenTest: OpenTest }) {
  const [lang, setLang] = useState<Lang>(() =>
    attemptsTotal(keyStats.hindi) > attemptsTotal(keyStats.english) ? "hindi" : "english",
  );
  const list = weakKeys(keyStats[lang], lang, 6);
  const total = attemptsTotal(keyStats[lang]);

  return (
    <div className="glass flex h-full flex-col rounded-[2rem] p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-fog-100">Weak keys</h3>
        <div role="group" aria-label="Weak keys language" className="flex gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
          {(["english", "hindi"] as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={lang === l}
              onClick={() => setLang(l)}
              className={cn(
                "h-8 rounded-full px-3 text-xs font-medium transition-all",
                lang === l ? "bg-white/[0.12] text-fog-100" : "text-fog-400 hover:text-fog-100",
              )}
            >
              {l === "english" ? "English" : <span className="font-hindi">हिंदी</span>}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 text-sm text-fog-400">
        From {total.toLocaleString("en-IN")} keys you have typed in {lang === "hindi" ? "Hindi" : "English"} tests.
      </p>

      {list.length ? (
        <ul className="mt-5 flex-1 space-y-3">
          {list.map((w) => {
            const hint = lang === "hindi" ? inscriptHint(w.ch) : null;
            return (
              <li key={w.ch} className="flex items-center gap-3">
                <span
                  className={cn(
                    "grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-fog-100",
                    w.ch === " " ? "font-mono text-[10px]" : lang === "hindi" ? "font-hindi text-xl" : "font-mono text-base",
                  )}
                >
                  {displayChar(w.ch)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-fog-400">{hint ? `Inscript: ${hint}` : `${w.attempts} attempts`}</span>
                    <span className="font-mono tabular-nums text-fog-200">{Math.round(w.rate * 100)}% missed</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-saffron-400 to-blush-400"
                      style={{ width: `${Math.max(6, w.rate * 100)}%` }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-5 flex-1 rounded-2xl border border-dashed border-white/15 p-5 text-sm leading-relaxed text-fog-400">
          No weak keys yet. A key shows up here once you have typed it at least 8 times and missed it twice.
        </p>
      )}

      <button
        type="button"
        disabled={!list.length}
        onClick={() => onOpenTest({ lang, seconds: 120, drill: drillFor(keyStats, lang) })}
        className="btn btn-primary mt-6 h-11 self-start px-5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Target className="h-4 w-4" aria-hidden="true" />
        Practise these keys
      </button>
    </div>
  );
}

function DataControls({ history, onClearAll }: { history: TestRecord[]; onClearAll: () => void }) {
  const [confirm, setConfirm] = useState(false);

  const exportCsv = () => {
    const header = ["date", "exam", "language", "seconds", "gross_wpm", "net_wpm", "accuracy_pct", "net_kdph", "words", "word_errors", "target_wpm", "drill"];
    const rows = history.map((r) => [
      r.at,
      getExam(r.examId).name,
      r.lang,
      r.seconds,
      r.gross,
      r.net,
      r.accuracy,
      r.kdph,
      r.words,
      r.wordErrors,
      r.target ?? "",
      r.drill ? "yes" : "",
    ]);
    const esc = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [header, ...rows].map((row) => row.map(esc).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `raftaar-progress-${todayISO()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="mt-5 flex flex-col gap-4 rounded-[2rem] border border-white/[0.07] bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <p className="max-w-xl text-sm leading-relaxed text-fog-400">
        Saved only in this browser. Clearing browser data or switching device starts fresh, so export a copy if you
        want to keep it.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={exportCsv}
          disabled={!history.length}
          className="btn btn-ghost h-10 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Export CSV
        </button>
        {confirm ? (
          <>
            <button
              type="button"
              onClick={() => {
                onClearAll();
                setConfirm(false);
              }}
              className="btn h-10 border border-blush-400/50 bg-blush-400/15 px-4 text-sm text-blush-400"
            >
              Delete everything
            </button>
            <button type="button" onClick={() => setConfirm(false)} className="btn btn-ghost h-10 px-4 text-sm">
              Cancel
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="btn btn-ghost h-10 px-4 text-sm">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Clear my data
          </button>
        )}
      </div>
    </div>
  );
}

export function Dashboard({
  history,
  keyStats,
  activePlan,
  course,
  onUpdatePlan,
  onOpenTest,
  onOpenLearn,
  onClearAll,
}: {
  history: TestRecord[];
  keyStats: KeyStats;
  activePlan: ActivePlan | null;
  onUpdatePlan: (p: ActivePlan | null) => void;
  course: CourseProgress;
  onOpenTest: OpenTest;
  onOpenLearn: OpenLearn;
  onClearAll: () => void;
}) {
  return (
    <section id="progress" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading eyebrow="Your progress" title="Real numbers from your own practice.">
          Every lesson you pass, every test you finish and every task you tick is saved in this browser. No account, and nothing is sent to
          a server.
        </SectionHeading>

        <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <Reveal className="lg:row-span-2">
            <div className="h-full">
              <PlanTracker
                activePlan={activePlan}
                keyStats={keyStats}
                course={course}
                onUpdatePlan={onUpdatePlan}
                onOpenLearn={onOpenLearn}
                onOpenTest={onOpenTest}
              />
            </div>
          </Reveal>
          <Reveal delay={120}>
            <StatsCard
              history={history}
              lessonsDone={Object.keys(course.english).length + Object.keys(course.hindi).length}
            />
          </Reveal>
          <Reveal delay={180}>
            <WeakKeysCard keyStats={keyStats} onOpenTest={onOpenTest} />
          </Reveal>
        </div>

        <Reveal className="mt-5">
          <HistoryCard history={history} />
        </Reveal>

        <Reveal>
          <DataControls history={history} onClearAll={onClearAll} />
        </Reveal>
      </div>
    </section>
  );
}
