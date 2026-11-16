import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Keyboard as KeyboardIcon, Play, RotateCcw, Star, Target } from "lucide-react";
import type { Lang } from "../data/exams";
import {
  buildReview,
  COURSES,
  FINGERS,
  FINGER_OF,
  keyFor,
  lessonsFor,
  nextLesson,
  shiftFor,
  type Finger,
  type Lesson,
} from "../data/lessons";
import { capLabel, displayChar, groupWords, INSCRIPT } from "../lib/typing";
import type { CourseProgress, KeyDelta, LessonResult } from "../lib/storage";
import { Hands, KeyboardGuide } from "./Keyboard";
import { prefersReducedMotion, Reveal, SectionHeading } from "./ui";
import { cn } from "../utils/cn";

export interface LearnRequest {
  nonce: number;
  lang?: Lang;
  lessonId?: string;
  review?: boolean;
}

type Phase = "intro" | "practice" | "result";
type KeyHit = NonNullable<ReturnType<typeof keyFor>>;

interface Outcome {
  acc: number;
  wpm: number;
  stars: number;
  errors: number;
  watch: string[];
}

interface Run {
  chars: number;
  ms: number;
  lineStart: number;
  finished: boolean;
  seen: Set<string>;
  errors: Set<string>;
  delta: KeyDelta;
}

const freshRun = (): Run => ({ chars: 0, ms: 0, lineStart: 0, finished: false, seen: new Set(), errors: new Set(), delta: {} });

function bump(delta: KeyDelta, ch: string, missed: boolean) {
  const d = delta[ch] ?? [0, 0];
  d[0] += 1;
  if (missed) d[1] += 1;
  delta[ch] = d;
}

const KEY_NAMES: Record<string, string> = {
  Space: "Space bar",
  Comma: "comma key",
  Period: "full stop key",
  Slash: "slash key",
  Semicolon: "semicolon key",
  Quote: "apostrophe key",
  Minus: "hyphen key",
};
const keyName = (code: string) => KEY_NAMES[code] ?? `${capLabel(code)} key`;
const show = (s: string) => (s === " " ? "␣" : s.length > 1 ? s : displayChar(s));

function instruct(k: KeyHit) {
  const finger = FINGER_OF[k.code];
  const side = shiftFor(k.code) === "ShiftRight" ? "right" : "left";
  const active: Finger[] = finger ? [finger] : [];
  if (k.shift) active.push(side === "right" ? "r5" : "l5");
  return {
    how: k.shift ? `Hold ${side} Shift, then press the ${keyName(k.code)}` : `Press the ${keyName(k.code)}`,
    finger: k.code === "Space" ? "either thumb" : finger ? FINGERS[finger].name : "",
    color: finger ? FINGERS[finger].color : "#dfe1ea",
    active,
  };
}

function Stars({ n, size = "h-4 w-4", animate }: { n: number; size?: string; animate?: boolean }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${n} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          aria-hidden="true"
          style={animate ? ({ "--i": i } as CSSProperties) : undefined}
          className={cn(size, i < n ? "fill-saffron-400 text-saffron-400" : "text-white/20", animate && i < n && "pop")}
        />
      ))}
    </span>
  );
}

function Line({ text, pos, lang, flash }: { text: string; pos: number; lang: Lang; flash: number }) {
  const groups = useMemo(() => groupWords(text), [text]);
  return (
    <p
      lang={lang === "hindi" ? "hi" : "en"}
      className={cn(
        "whitespace-pre-wrap break-words text-center",
        lang === "hindi" ? "font-hindi text-[1.7rem] leading-[1.9] sm:text-[2.3rem]" : "font-mono text-2xl leading-[1.7] sm:text-[2rem]",
      )}
    >
      {groups.map((g) => (
        <span key={g.start}>
          {g.tokens.map((t) => {
            const s = g.start + t.s;
            const e = g.start + t.e;
            const state = e <= pos ? "done" : s <= pos ? "cur" : "todo";
            return (
              <span
                key={state === "cur" ? `${s}-${flash}` : s}
                className={cn(
                  state === "done" && "text-leaf-300",
                  state === "cur" && "rounded-md bg-saffron-400/25 text-fog-100 ring-1 ring-saffron-400/60",
                  state === "cur" && flash > 0 && "miss-char",
                  state === "todo" && "text-fog-400",
                )}
              >
                {g.text.slice(t.s, t.e)}
              </span>
            );
          })}
        </span>
      ))}
    </p>
  );
}

interface Props {
  defaultLang: Lang;
  progress: CourseProgress;
  request: LearnRequest | null;
  onComplete: (lang: Lang, id: string, result: LessonResult) => void;
  onKeys: (lang: Lang, delta: KeyDelta) => void;
}

export function Academy({ defaultLang, progress, request, onComplete, onKeys }: Props) {
  const [lang, setLang] = useState<Lang>(defaultLang);
  const all = useMemo(() => lessonsFor(lang), [lang]);
  const done = progress[lang];
  const [activeId, setActiveId] = useState(() => nextLesson(defaultLang, progress[defaultLang]).id);
  const [review, setReview] = useState<Lesson | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [cursor, setCursor] = useState({ line: 0, pos: 0 });
  const [miss, setMiss] = useState<{ code: string | null; at: string | null; n: number }>({ code: null, at: null, n: 0 });
  const [guide, setGuide] = useState(true);
  const [focused, setFocused] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const cur = useRef({ line: 0, pos: 0 });
  const run = useRef<Run>(freshRun());
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const practiceRef = useRef<HTMLDivElement>(null);
  // Bumped whenever the main button of the next screen should take focus.
  const [focusTick, setFocusTick] = useState(0);
  const askFocus = () => setFocusTick((t) => t + 1);

  const lesson = review ?? all.find((l) => l.id === activeId) ?? all[0];
  const index = all.findIndex((l) => l.id === lesson.id);
  const upNext = nextLesson(lang, done);
  const doneCount = all.filter((l) => done[l.id]).length;
  const best = review ? undefined : done[lesson.id];

  const open = (l: Lang, id?: string, rev: Lesson | null = null) => {
    setLang(l);
    setReview(rev);
    setActiveId(id ?? nextLesson(l, progress[l]).id);
    setPhase("intro");
    setOutcome(null);
  };

  // Follow the plan's language.
  useEffect(() => {
    open(defaultLang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultLang]);

  // Requests from the plan tracker (declared last so they win).
  useEffect(() => {
    if (!request) return;
    const l = request.lang ?? lang;
    open(l, request.lessonId, request.review ? buildReview(l, Object.keys(progress[l])) : null);
    askFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.nonce]);

  // Keyboard flow: Enter on the result opens the next lesson, Enter again starts it.
  // Runs after the new screen has rendered, so the button it focuses is the right one.
  useEffect(() => {
    if (focusTick > 0 && phase !== "practice") primaryRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTick]);

  const start = () => {
    run.current = freshRun();
    cur.current = { line: 0, pos: 0 };
    setCursor(cur.current);
    setMiss({ code: null, at: null, n: 0 });
    setOutcome(null);
    setPhase("practice");
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
      // Bring the typing line to the top so the whole key guide fits on small laptop screens.
      practiceRef.current?.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    });
  };

  const pick = (id: string) => {
    open(lang, id);
    askFocus();
    playerRef.current?.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  const finish = () => {
    const r = run.current;
    r.finished = true;
    const acc = Math.floor(((r.chars - r.errors.size) / Math.max(1, r.chars)) * 100);
    const wpm = Math.max(1, Math.round(r.chars / 5 / Math.max(r.ms / 60000, 1 / 600)));
    const stars = acc >= 97 ? 3 : acc >= 92 ? 2 : acc >= 85 ? 1 : 0;
    const watch = Object.entries(r.delta)
      .filter(([, v]) => v[1] > 0)
      .sort((a, b) => b[1][1] - a[1][1])
      .slice(0, 4)
      .map(([ch]) => ch);
    setOutcome({ acc, wpm, stars, errors: r.errors.size, watch });
    setPhase("result");
    askFocus();
    onKeys(lang, r.delta);
    if (!review && stars > 0) onComplete(lang, lesson.id, { stars, acc, wpm, at: new Date().toISOString() });
  };

  /** Stop-on-error: the cursor only moves when the right key is pressed. */
  const feed = (out: string, code: string | null) => {
    const r = run.current;
    const at = cur.current;
    const text = lesson.lines[at.line];
    if (r.finished || !text) return;
    const now = performance.now();
    if (!r.lineStart) r.lineStart = now;
    const id = `${at.line}:${at.pos}`;
    const hit = text.startsWith(out, at.pos);
    if (!r.seen.has(id)) {
      r.seen.add(id);
      bump(r.delta, text[at.pos], !hit);
    }
    if (!hit) {
      r.errors.add(id);
      setMiss((m) => ({ code, at: id, n: m.n + 1 }));
      return;
    }
    for (let j = 1; j < out.length; j++) {
      r.seen.add(`${at.line}:${at.pos + j}`);
      bump(r.delta, text[at.pos + j], false);
    }
    setMiss((m) => (m.at ? { code: null, at: null, n: m.n } : m));
    const np = at.pos + out.length;
    if (np < text.length) {
      cur.current = { line: at.line, pos: np };
    } else {
      r.ms += now - r.lineStart;
      r.lineStart = 0;
      r.chars += text.length;
      if (at.line + 1 >= lesson.lines.length) {
        finish();
        return;
      }
      cur.current = { line: at.line + 1, pos: 0 };
    }
    setCursor(cur.current);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    setCapsOn(e.getModifierState("CapsLock"));
    if (e.ctrlKey || e.metaKey || e.altKey || e.key === "Tab" || e.nativeEvent.isComposing) return;
    let out: string | null = null;
    if (e.key === " " || e.code === "Space") out = " ";
    else if (lang === "hindi" && INSCRIPT[e.code]) out = INSCRIPT[e.code][e.shiftKey ? 1 : 0];
    else if (e.key.length === 1) out = e.key;
    if (out == null) {
      if (e.key === "Backspace" || e.key === "Enter" || e.key === "Delete" || e.key.startsWith("Arrow")) e.preventDefault();
      return;
    }
    e.preventDefault();
    feed(out.normalize("NFC"), e.code || null);
  };

  // Fallback for on-screen keyboards, which do not send usable keydown events.
  const onInput = (e: FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const value = el.value.normalize("NFC");
    el.value = "";
    for (const ch of value) if (ch !== "\n") feed(ch, null);
  };

  const text = lesson.lines[Math.min(cursor.line, lesson.lines.length - 1)];
  const hit = phase === "practice" ? keyFor(lang, text, cursor.pos, lesson.combos) : null;
  const info = hit ? instruct(hit) : null;
  const posId = `${cursor.line}:${cursor.pos}`;
  const r = run.current;
  const liveAcc = r.seen.size ? Math.floor(((r.seen.size - r.errors.size) / r.seen.size) * 100) : 100;

  const introKeys = lesson.keys.map((k) => keyFor(lang, k, 0, true)).filter((k): k is KeyHit => !!k);
  const allShift = introKeys.length > 0 && introKeys.every((k) => k.shift);
  const marks = [
    ...introKeys.map((k) => k.code),
    ...introKeys.filter((k) => k.shift).map((k) => shiftFor(k.code)),
    ...(lesson.marks ?? []),
  ];
  const minutes = Math.max(1, Math.round(lesson.lines.join("").length / 55));
  const passed = !!outcome && outcome.stars > 0;
  const following = !review && index >= 0 && index < all.length - 1 ? all[index + 1] : null;

  return (
    <section id="learn" className="clip relative py-20 sm:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-1/4 -z-10 h-[32rem] w-[32rem] rounded-full bg-leaf-500/[0.08] blur-[110px]"
      />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading eyebrow="Learn from zero" title="Never typed before? Start here.">
          A complete course, from the home row to full paragraphs. Each lesson adds one or two keys, shows which finger
          to use, and waits until you press the right key.
        </SectionHeading>

        <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] lg:gap-6">
          {/* ---------- Course map ---------- */}
          <Reveal className="order-2 lg:order-1">
            <div className="glass rounded-[2rem] p-4 sm:p-5">
              <div role="group" aria-label="Course language" className="flex gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1">
                {(["english", "hindi"] as Lang[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    aria-pressed={lang === l}
                    onClick={() => open(l)}
                    className={cn(
                      "h-10 flex-1 rounded-xl px-2 text-sm font-medium transition-all duration-300",
                      lang === l ? "bg-white/[0.12] text-fog-100" : "text-fog-400 hover:text-fog-100",
                    )}
                  >
                    {l === "english" ? "English" : <span className="font-hindi">हिंदी · Inscript</span>}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-fog-400">
                <span>
                  {doneCount} of {all.length} lessons passed
                </span>
                <span className="font-mono tabular-nums text-fog-200">{Math.round((doneCount / all.length) * 100)}%</span>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.08]"
                role="progressbar"
                aria-label="Course progress"
                aria-valuemin={0}
                aria-valuemax={all.length}
                aria-valuenow={doneCount}
              >
                <div
                  className="h-full rounded-full bg-linear-to-r from-leaf-400 to-leaf-300 transition-[width] duration-500"
                  style={{ width: `${(doneCount / all.length) * 100}%` }}
                />
              </div>

              <button
                type="button"
                disabled={!doneCount}
                onClick={() => {
                  open(lang, undefined, buildReview(lang, Object.keys(done)));
                  askFocus();
                  playerRef.current?.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
                }}
                className="btn btn-ghost mt-4 h-10 w-full text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Target className="h-4 w-4" aria-hidden="true" />
                Practise learned keys
              </button>

              <div className="mt-4 max-h-[34rem] space-y-4 overflow-y-auto pr-1">
                {COURSES[lang].map((stage) => (
                  <div key={stage.title}>
                    <p className="px-1 font-mono text-[10px] uppercase tracking-[0.16em] text-fog-500">{stage.title}</p>
                    <ul className="mt-2 space-y-1">
                      {stage.lessons.map((l) => {
                        const res = done[l.id];
                        const isActive = !review && l.id === lesson.id;
                        return (
                          <li key={l.id}>
                            <button
                              type="button"
                              onClick={() => pick(l.id)}
                              aria-current={isActive ? "true" : undefined}
                              className={cn(
                                "flex min-h-12 w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-all duration-300",
                                isActive
                                  ? "border-saffron-400/60 bg-saffron-400/10"
                                  : "border-transparent hover:border-white/15 hover:bg-white/[0.04]",
                              )}
                            >
                              <span
                                className={cn(
                                  "grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-xs tabular-nums",
                                  res ? "bg-leaf-400 text-ink-950" : "border border-white/15 text-fog-300",
                                )}
                              >
                                {res ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> : l.n}
                              </span>
                              <span className={cn("min-w-0 flex-1 truncate text-sm", lang === "hindi" && "font-hindi", isActive ? "text-fog-100" : "text-fog-200")}>
                                {l.title}
                                {res && <span className="sr-only">, passed</span>}
                              </span>
                              {res ? (
                                <Stars n={res.stars} size="h-3 w-3" />
                              ) : (
                                l.id === upNext.id && (
                                  <span className="rounded-full bg-saffron-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-saffron-300">
                                    Next
                                  </span>
                                )
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* ---------- Lesson player ---------- */}
          <Reveal delay={120} className="order-1 min-w-0 lg:order-2">
            <div
              ref={playerRef}
              data-phase={phase}
              data-code={hit?.code ?? ""}
              data-shift={hit?.shift ? "1" : "0"}
              className="glass-strong rounded-[2rem] p-1.5"
            >
              <div className="rounded-[1.65rem] border border-white/[0.06] bg-ink-900/60 p-4 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-saffron-300">
                      {review ? "Review" : `Lesson ${lesson.n} of ${all.length} · ${lesson.stage}`}
                    </p>
                    <h3 className={cn("mt-2 font-display text-2xl font-semibold tracking-[-0.02em] text-fog-100 sm:text-3xl", lang === "hindi" && "font-hindi")}>
                      {lesson.title}
                    </h3>
                  </div>
                  {!review && (
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        onClick={() => pick(all[index - 1].id)}
                        disabled={index <= 0}
                        aria-label="Previous lesson"
                        className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-fog-300 transition-all hover:bg-white/10 active:scale-90 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => pick(all[index + 1].id)}
                        disabled={index >= all.length - 1}
                        aria-label="Next lesson"
                        className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-fog-300 transition-all hover:bg-white/10 active:scale-90 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>

                {/* ----- Intro ----- */}
                {phase === "intro" && (
                  <div key={`${lesson.id}-intro`} className="swap">
                    <p className={cn("mt-4 max-w-2xl text-[15px] leading-relaxed text-fog-300", lang === "hindi" && "font-hindi")}>
                      {lesson.tip}
                    </p>

                    {lesson.checklist && (
                      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                        {lesson.checklist.map((c) => (
                          <li key={c} className="flex gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3 text-sm leading-relaxed text-fog-300">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-leaf-400" strokeWidth={3} aria-hidden="true" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    )}

                    {introKeys.length > 0 && (
                      <>
                        <p className="mt-5 text-sm font-medium text-fog-200">New in this lesson</p>
                        <ul className="mt-2.5 flex flex-wrap gap-2">
                          {introKeys.map((k) => {
                            const i = instruct(k);
                            return (
                              <li key={k.out} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] py-1.5 pl-1.5 pr-4">
                                <span
                                  className={cn("grid h-11 min-w-11 place-items-center rounded-xl px-2 text-lg font-semibold text-ink-950", lang === "hindi" ? "font-hindi" : "font-mono")}
                                  style={{ background: i.color }}
                                >
                                  {show(k.out)}
                                </span>
                                <span className="text-sm">
                                  <span className="block font-medium text-fog-100">
                                    {k.shift ? "Shift + " : ""}
                                    {k.code === "Space" ? "Space bar" : capLabel(k.code)}
                                  </span>
                                  <span className="block text-xs text-fog-400">{i.finger}</span>
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    )}

                    <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
                      <button ref={primaryRef} type="button" onClick={start} className="btn btn-primary h-12 px-6 text-[15px]">
                        <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                        {best ? "Practise again" : "Start lesson"}
                      </button>
                      <p className="text-sm text-fog-400">
                        {lesson.lines.length} lines · about {minutes} min
                        {best && (
                          <span className="ml-3 inline-flex items-center gap-2 align-middle text-fog-300">
                            <Stars n={best.stars} size="h-3.5 w-3.5" />
                            Best {best.acc}% · {best.wpm} WPM
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="mt-6">
                      <KeyboardGuide lang={lang} marks={marks} layer={allShift ? 1 : 0} />
                    </div>
                  </div>
                )}

                {/* ----- Practice ----- */}
                {phase === "practice" && (
                  <div ref={practiceRef}>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="sr-only">
                          Line {cursor.line + 1} of {lesson.lines.length}
                        </span>
                        {lesson.lines.map((_, i) => (
                          <span
                            key={i}
                            aria-hidden="true"
                            className={cn(
                              "h-1.5 w-5 rounded-full transition-colors sm:w-7",
                              i < cursor.line ? "bg-leaf-400" : i === cursor.line ? "bg-saffron-400" : "bg-white/15",
                            )}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs tabular-nums text-fog-300">
                          {liveAcc}% · {r.errors.size} {r.errors.size === 1 ? "miss" : "misses"}
                        </span>
                        <button
                          type="button"
                          aria-pressed={guide}
                          onClick={() => setGuide((g) => !g)}
                          className="flex h-9 items-center gap-2 rounded-full border border-white/10 px-3 text-xs font-medium text-fog-300 transition-colors hover:bg-white/10 hover:text-fog-100"
                        >
                          {guide ? <Eye className="h-3.5 w-3.5" aria-hidden="true" /> : <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />}
                          Key guide
                        </button>
                        <button
                          type="button"
                          onClick={start}
                          aria-label="Restart lesson"
                          className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-fog-300 transition-all hover:rotate-[-90deg] hover:bg-white/10 active:scale-90"
                        >
                          <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "relative mt-4 rounded-3xl border bg-ink-950/60 px-4 py-6 transition-all duration-300 sm:px-7 sm:py-8",
                        focused ? "border-saffron-400/50 shadow-[0_0_0_4px_rgba(255,169,74,0.12)]" : "border-white/[0.08]",
                      )}
                    >
                      <div data-line>
                        <Line text={text} pos={cursor.pos} lang={lang} flash={miss.at === posId ? miss.n : 0} />
                      </div>
                      <textarea
                        ref={inputRef}
                        onKeyDown={onKeyDown}
                        onInput={onInput}
                        onPaste={(e) => e.preventDefault()}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        aria-label={`Lesson typing area. Type this line: ${text}`}
                        autoCapitalize="off"
                        autoCorrect="off"
                        autoComplete="off"
                        spellCheck={false}
                        className="absolute inset-0 z-10 h-full w-full cursor-text resize-none rounded-3xl text-base opacity-0 outline-hidden"
                      />
                      {!focused && (
                        <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-3xl bg-ink-950/60 backdrop-blur-[3px]">
                          <span className="flex items-center gap-2.5 rounded-full border border-white/15 bg-ink-800/90 px-5 py-2.5 text-sm font-medium text-fog-100 shadow-xl">
                            <KeyboardIcon className="h-4 w-4 text-saffron-300" aria-hidden="true" />
                            Click here to continue
                          </span>
                        </div>
                      )}
                    </div>

                    {capsOn && lang === "english" && (
                      <p role="alert" className="mt-3 rounded-2xl border border-blush-400/40 bg-blush-400/10 px-4 py-2.5 text-sm text-blush-400">
                        Caps Lock is on. Turn it off, then use Shift for capital letters.
                      </p>
                    )}

                    {hit && info && (
                      <div className="mt-4 flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 sm:p-4">
                        <span
                          className={cn(
                            "grid h-14 min-w-14 place-items-center rounded-2xl px-2 text-2xl font-bold text-ink-950 sm:h-16 sm:min-w-16 sm:text-3xl",
                            lang === "hindi" ? "font-hindi" : "font-mono",
                          )}
                          style={{ background: info.color }}
                          aria-hidden="true"
                        >
                          {show(hit.out)}
                        </span>
                        <p className="min-w-0 flex-1 text-sm leading-relaxed sm:text-base" aria-live="polite">
                          <span className="block font-medium text-fog-100">{info.how}</span>
                          <span className="block" style={{ color: info.color }}>
                            {info.finger}
                          </span>
                        </p>
                        {guide && (
                          <div className="hidden shrink-0 sm:block">
                            <Hands active={info.active} className="h-16" />
                          </div>
                        )}
                      </div>
                    )}

                    {guide && (
                      <div className="mt-4">
                        <KeyboardGuide lang={lang} target={hit} wrong={miss.at === posId ? miss.code : null} wrongTick={miss.n} />
                      </div>
                    )}
                  </div>
                )}

                {/* ----- Result ----- */}
                {phase === "result" && outcome && (
                  <div key={`${lesson.id}-result`} className="swap mt-6 text-center">
                    <Stars n={outcome.stars} size="h-10 w-10" animate />
                    <h4 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] text-fog-100" role="status">
                      {passed ? (review ? "Review complete" : "Lesson passed") : "Almost there"}
                    </h4>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-fog-400">
                      {passed
                        ? outcome.stars === 3
                          ? "Clean typing. That is exactly the habit an exam rewards."
                          : "Passed. Repeat it slowly for three stars, or move on."
                        : "You need 85% accuracy to pass. Slow down, follow the key guide and try again."}
                    </p>

                    <dl className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-2.5">
                      {[
                        { k: "Accuracy", v: `${outcome.acc}%` },
                        { k: "Speed", v: `${outcome.wpm} WPM` },
                        { k: "Misses", v: String(outcome.errors) },
                      ].map((s) => (
                        <div key={s.k} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5">
                          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-fog-500">{s.k}</dt>
                          <dd className="mt-1 font-display text-xl font-semibold tabular-nums text-fog-100">{s.v}</dd>
                        </div>
                      ))}
                    </dl>

                    {outcome.watch.length > 0 && (
                      <p className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm text-fog-400">
                        Keys to watch:
                        {outcome.watch.map((ch) => (
                          <span
                            key={ch}
                            className={cn(
                              "grid h-9 min-w-9 place-items-center rounded-lg border border-blush-400/40 bg-blush-400/10 px-2 text-fog-100",
                              lang === "hindi" ? "font-hindi text-lg" : "font-mono text-sm",
                            )}
                          >
                            {show(ch)}
                          </span>
                        ))}
                      </p>
                    )}

                    <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                      {!passed ? (
                        <button ref={primaryRef} type="button" onClick={start} className="btn btn-primary h-12 px-6 text-[15px]">
                          <RotateCcw className="h-4 w-4" aria-hidden="true" />
                          Try again
                        </button>
                      ) : review ? (
                        <button ref={primaryRef} type="button" onClick={() => open(lang)} className="btn btn-primary h-12 px-6 text-[15px]">
                          Back to lessons
                          <ArrowRight className="nudge h-4 w-4" aria-hidden="true" />
                        </button>
                      ) : following ? (
                        <button
                          ref={primaryRef}
                          type="button"
                          onClick={() => {
                            open(lang, following.id);
                            askFocus();
                          }}
                          className="btn btn-primary h-12 max-w-full px-6 text-[15px]"
                        >
                          <span className={cn("truncate", lang === "hindi" && "font-hindi")}>Next: {following.title}</span>
                          <ArrowRight className="nudge h-4 w-4 shrink-0" aria-hidden="true" />
                        </button>
                      ) : (
                        <a href="#live-test" className="btn btn-primary h-12 px-6 text-[15px]">
                          Course complete · take the live test
                          <ArrowRight className="nudge h-4 w-4" aria-hidden="true" />
                        </a>
                      )}
                      {passed && (
                        <button type="button" onClick={start} className="btn btn-ghost h-12 px-6 text-[15px]">
                          <RotateCcw className="h-4 w-4" aria-hidden="true" />
                          Repeat
                        </button>
                      )}
                    </div>
                    <p className="mt-5 font-mono text-[11px] text-fog-500">3 stars: 97%+ · 2 stars: 92%+ · 1 star: 85%+</p>
                  </div>
                )}
              </div>
            </div>
            <p className="mt-4 text-center text-xs leading-relaxed text-fog-500">
              Lessons need a physical keyboard. The Hindi course teaches Inscript, the layout used with Mangal. Remington
              (Kruti Dev) lessons are not included.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
