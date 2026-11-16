import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { ArrowRight, Check, ChevronDown, Keyboard, RotateCcw, SkipForward, X } from "lucide-react";
import { EXAMS, type Exam, type Lang } from "../data/exams";
import { buildText, PASSAGES, repeatTo } from "../data/passages";
import { examVerdict, groupWords, INSCRIPT, measure, type WordGroup } from "../lib/typing";
import { useStoredState, type KeyDelta, type TestRecord } from "../lib/storage";
import { Reveal, SectionHeading } from "./ui";
import { cn } from "../utils/cn";

export interface TestRequest {
  nonce: number;
  seconds?: number;
  lang?: Lang;
  examId?: string;
  drill?: { text: string; label: string };
}

type Status = "idle" | "running" | "done";
type Ime = "inscript" | "system";
type Mode = number | "exam";

const isIme = (v: unknown): v is Ime => v === "inscript" || v === "system";
const BASE_MODES = [60, 120, 300];
const BLOCKED = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown", "Enter"]);
const round1 = (n: number) => Math.round(n * 10) / 10;
const minLabel = (s: number) => (s % 60 === 0 ? `${s / 60} min` : `${s}s`);

interface WordProps {
  group: WordGroup;
  typedSlice: string;
  caret: number;
  showCaret: boolean;
}

/** Memoised per word, so only the word being typed re-renders on each key. */
const Word = memo(function Word({ group, typedSlice, caret, showCaret }: WordProps) {
  return (
    <span>
      {group.tokens.map((t) => {
        const seg = group.text.slice(t.s, t.e);
        const n = typedSlice.length;
        let state: "ok" | "bad" | "part" | "todo";
        if (n >= t.e) state = typedSlice.slice(t.s, t.e) === seg ? "ok" : "bad";
        else if (n > t.s) state = seg.startsWith(typedSlice.slice(t.s)) ? "part" : "bad";
        else state = "todo";
        const here = caret >= t.s && caret < t.e;
        return (
          <span
            key={t.s}
            data-caret={here ? "1" : undefined}
            className={cn(
              state === "ok" && "text-fog-100",
              state === "bad" && "rounded-[3px] bg-blush-400/20 text-blush-400",
              state === "part" && "text-saffron-200",
              state === "todo" && (here ? "text-fog-300" : "text-fog-500"),
              here && showCaret && "caret",
            )}
          >
            {seg}
          </span>
        );
      })}
    </span>
  );
});

function Seg<T extends string | number>({
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
  disabled?: boolean;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
      {options.map((o) => (
        <button
          key={String(o)}
          type="button"
          aria-pressed={value === o}
          disabled={disabled}
          onClick={() => onChange(o)}
          className={cn(
            "h-9 whitespace-nowrap rounded-full px-3 text-xs font-medium transition-all duration-300 disabled:cursor-not-allowed",
            value === o ? "bg-white/[0.12] text-fog-100" : "text-fog-400 hover:text-fog-100",
            disabled && value !== o && "opacity-40",
          )}
        >
          {render(o)}
        </button>
      ))}
    </div>
  );
}

interface Props {
  exam: Exam;
  defaultLang: Lang;
  targetFor: (lang: Lang) => number | null;
  request: TestRequest | null;
  onExamChange: (id: string) => void;
  onRecord: (rec: TestRecord, delta: KeyDelta) => void;
  onUseSpeed: (wpm: number, lang: Lang) => void;
}

export function TypingTest({ exam, defaultLang, targetFor, request, onExamChange, onRecord, onUseSpeed }: Props) {
  const examSeconds = (exam.testMinutes ?? 10) * 60;
  const [lang, setLang] = useState<Lang>(defaultLang);
  const [ime, setIme] = useStoredState<Ime>("ime", "inscript", isIme);
  const [mode, setMode] = useState<Mode>(60);
  const [pi, setPi] = useState(0);
  const [drill, setDrill] = useState<TestRequest["drill"] | null>(null);
  const [typed, setTyped] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [strict, setStrict] = useState(false);
  const [focused, setFocused] = useState(false);
  const [offset, setOffset] = useState(0);
  const [resizeTick, setResizeTick] = useState(0);
  const [result, setResult] = useState<TestRecord | null>(null);

  const startRef = useRef(0);
  const deltaRef = useRef<KeyDelta>({});
  const savedRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const seconds = mode === "exam" ? examSeconds : mode;
  const target = targetFor(lang);
  const needed = Math.ceil((seconds / 60) * (lang === "hindi" ? 70 : 95) * 5);
  const text = useMemo(
    () => (drill ? repeatTo(drill.text, needed) : buildText(lang, pi, needed)),
    [drill, lang, pi, needed],
  );
  const groups = useMemo(() => groupWords(text), [text]);

  const reset = (focus = true) => {
    setTyped("");
    setStatus("idle");
    setElapsed(0);
    setOffset(0);
    setResult(null);
    deltaRef.current = {};
    savedRef.current = false;
    if (focus) requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  };

  // Follow the plan's language.
  useEffect(() => {
    setLang(defaultLang);
    setDrill(null);
    reset(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultLang]);

  // New exam: restart, and apply its Backspace rule in exam mode.
  useEffect(() => {
    reset(false);
    if (mode === "exam") setStrict(!!exam.noBackspace);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam.id]);

  // Requests from the plan tracker (declared last so they win).
  useEffect(() => {
    if (!request) return;
    if (request.lang) setLang(request.lang);
    if (request.seconds) {
      const isExam = request.seconds === examSeconds;
      setMode(isExam ? "exam" : request.seconds);
      setStrict(isExam && !!exam.noBackspace);
    }
    setDrill(request.drill ?? null);
    reset(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.nonce]);

  // Countdown
  useEffect(() => {
    if (status !== "running") return;
    const id = window.setInterval(() => {
      const e = (performance.now() - startRef.current) / 1000;
      if (e >= seconds) {
        setElapsed(seconds);
        setStatus("done");
      } else {
        setElapsed(e);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [status, seconds]);

  // Save the finished test once.
  useEffect(() => {
    if (status !== "done" || savedRef.current) return;
    savedRef.current = true;
    if (typed.length < 5) return;
    const m = measure(text, typed, elapsed);
    const rec: TestRecord = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      at: new Date().toISOString(),
      examId: exam.id,
      lang,
      seconds: Math.round(m.seconds),
      gross: round1(m.gross),
      net: round1(m.net),
      accuracy: round1(m.accuracy),
      kdph: Math.round(m.kdph),
      words: m.words,
      wordErrors: m.wordErrors,
      target,
      ...(drill ? { drill: true } : {}),
    };
    setResult(rec);
    onRecord(rec, deltaRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Keep the current line in view (second of three visible lines).
  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const caret = inner.querySelector<HTMLElement>('[data-caret="1"]');
    if (!caret) return;
    const lh = parseFloat(getComputedStyle(inner).lineHeight) || 40;
    const line = Math.floor((caret.offsetTop + 2) / lh);
    setOffset(Math.max(0, (line - 1) * lh));
  }, [typed.length, text, resizeTick]);

  useEffect(() => {
    const onResize = () => setResizeTick((t) => t + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const applyValue = (raw: string) => {
    if (status === "done") return;
    let v = raw.replace(/[\r\n]/g, "").normalize("NFC");
    if (v.length > text.length) v = v.slice(0, text.length);
    if (strict && v.length < typed.length) return;

    // Record every new key against the character it should have been.
    let p = 0;
    while (p < typed.length && p < v.length && typed[p] === v[p]) p++;
    for (let j = p; j < v.length; j++) {
      const exp = text[j];
      const rec = deltaRef.current[exp] ?? [0, 0];
      rec[0] += 1;
      if (v[j] !== exp) rec[1] += 1;
      deltaRef.current[exp] = rec;
    }

    if (status === "idle" && v.length > 0) {
      startRef.current = performance.now();
      setStatus("running");
    }
    setTyped(v);
    if (v.length >= text.length) {
      setElapsed(Math.max(1, (performance.now() - startRef.current) / 1000));
      setStatus("done");
    }
  };

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => applyValue(e.target.value);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (BLOCKED.has(e.key)) {
      e.preventDefault();
      return;
    }
    if (strict && (e.key === "Backspace" || e.key === "Delete")) {
      e.preventDefault();
      return;
    }
    if (lang === "hindi" && ime === "inscript" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.nativeEvent.isComposing) {
      const pair = INSCRIPT[e.code];
      if (pair) {
        e.preventDefault();
        applyValue(typed + pair[e.shiftKey ? 1 : 0]);
      }
    }
  };

  // Keep the native caret at the end so edits always append.
  const pinCaret = (e: SyntheticEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const end = el.value.length;
    if (el.selectionStart !== end || el.selectionEnd !== end) el.setSelectionRange(end, end);
  };

  const live = useMemo(
    () => measure(text, typed, status === "idle" ? 1 : Math.max(elapsed, status === "done" ? 1 : 3)),
    [text, typed, elapsed, status],
  );
  const timeLeft = Math.max(0, Math.ceil(seconds - (status === "idle" ? 0 : elapsed)));
  const running = status === "running";
  const verdict = status === "done" && result ? examVerdict(exam, lang, target, live) : [];
  const modes: Mode[] = [
    ...BASE_MODES,
    ...(typeof mode === "number" && !BASE_MODES.includes(mode) ? [mode] : []),
    "exam",
  ];
  const langName = lang === "hindi" ? "Hindi" : "English";

  return (
    <section id="live-test" className="clip relative py-20 sm:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-1/3 -z-10 h-[32rem] w-[32rem] rounded-full bg-[#2b4bff]/15 blur-[110px]"
      />
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <SectionHeading eyebrow="Live test" title="Exam mode, right here in your browser.">
          Pick your exam and language, start typing and the clock starts. Every finished test is saved to Your
          progress, on this device.
        </SectionHeading>

        <Reveal delay={120} className="mt-12">
          <div className="glass-strong rounded-[2rem] p-1.5">
            <div className="rounded-[1.65rem] border border-white/[0.06] bg-ink-900/60 p-4 sm:p-7">
              {/* Settings */}
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
                <div className="relative">
                  <label htmlFor="test-exam" className="sr-only">
                    Exam rules for this test
                  </label>
                  <select
                    id="test-exam"
                    value={exam.id}
                    disabled={running}
                    onChange={(e) => onExamChange(e.target.value)}
                    className="h-11 w-full appearance-none truncate rounded-full border border-white/10 bg-white/[0.04] pl-4 pr-10 text-sm font-medium text-fog-100 transition-colors hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-60 [&>option]:bg-ink-800"
                  >
                    {EXAMS.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                    <option value="custom">Custom goal</option>
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fog-400"
                    aria-hidden="true"
                  />
                </div>
                <Seg<Lang>
                  label="Typing language"
                  options={["english", "hindi"]}
                  value={lang}
                  disabled={running}
                  onChange={(l) => {
                    setLang(l);
                    setDrill(null);
                    setPi(0);
                    reset();
                  }}
                  render={(o) => (o === "english" ? "English" : <span className="font-hindi">हिंदी</span>)}
                />
                <Seg<Mode>
                  label="Test length"
                  options={modes}
                  value={mode}
                  disabled={running}
                  onChange={(m) => {
                    setMode(m);
                    if (m === "exam") setStrict(!!exam.noBackspace);
                    reset();
                  }}
                  render={(o) => (o === "exam" ? `Exam · ${minLabel(examSeconds)}` : minLabel(o))}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {lang === "hindi" && (
                    <Seg<Ime>
                      label="Hindi keyboard"
                      options={["inscript", "system"]}
                      value={ime}
                      disabled={running}
                      onChange={(v) => {
                        setIme(v);
                        reset();
                      }}
                      render={(o) => (o === "inscript" ? "Built-in Inscript" : "My Hindi keyboard")}
                    />
                  )}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={strict}
                    disabled={running}
                    onClick={() => setStrict((s) => !s)}
                    className="flex h-9 items-center gap-2.5 rounded-full pl-1 pr-2 text-sm text-fog-300 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span
                      className={cn(
                        "relative h-6 w-10 rounded-full transition-colors duration-300",
                        strict ? "bg-saffron-500" : "bg-white/15",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300",
                          strict && "translate-x-4",
                        )}
                      />
                    </span>
                    No Backspace
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPi((p) => (p + 1) % PASSAGES[lang].length);
                      reset();
                    }}
                    disabled={running || !!drill}
                    className="flex h-9 items-center gap-2 rounded-full border border-white/10 px-3.5 text-xs font-medium text-fog-300 transition-all hover:bg-white/10 hover:text-fog-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
                    Next passage
                  </button>
                  <button
                    type="button"
                    onClick={() => reset()}
                    aria-label="Restart test"
                    className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-fog-300 transition-all hover:rotate-[-90deg] hover:bg-white/10 hover:text-fog-100 active:scale-90"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {drill && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-saffron-400/30 bg-saffron-400/[0.07] px-4 py-2.5 text-sm text-saffron-200">
                  <span>
                    Weak-key drill: <span className={cn(lang === "hindi" && "font-hindi")}>{drill.label}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDrill(null);
                      reset();
                    }}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 text-xs font-medium text-fog-200 hover:text-fog-100"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    Back to passages
                  </button>
                </div>
              )}

              {/* Passage */}
              <div
                className={cn(
                  "relative mt-4 rounded-3xl border bg-ink-950/60 px-4 py-5 transition-all duration-300 sm:px-7 sm:py-7",
                  focused ? "border-saffron-400/50 shadow-[0_0_0_4px_rgba(255,169,74,0.12)]" : "border-white/[0.08]",
                )}
              >
                <div
                  className={cn(
                    "h-[calc(var(--lh)*3)] overflow-hidden",
                    lang === "hindi" ? "[--lh:2.6rem] sm:[--lh:3.1rem]" : "[--lh:2.25rem] sm:[--lh:2.75rem]",
                  )}
                >
                  <div
                    ref={innerRef}
                    lang={lang === "hindi" ? "hi" : "en"}
                    className={cn(
                      "relative whitespace-pre-wrap break-words transition-transform duration-300 ease-out",
                      lang === "hindi"
                        ? "font-hindi text-[19px] leading-(--lh) sm:text-[24px] sm:leading-(--lh)"
                        : "font-mono text-[17px] leading-(--lh) sm:text-[22px] sm:leading-(--lh)",
                    )}
                    style={{ transform: `translateY(-${offset}px)` }}
                  >
                    {groups.map((g) => {
                      const end = g.start + g.text.length;
                      const L = typed.length;
                      const slice = L > g.start ? typed.slice(g.start, Math.min(L, end)) : "";
                      const caret = L >= g.start && L < end ? L - g.start : -1;
                      return (
                        <Word
                          key={g.start}
                          group={g}
                          typedSlice={slice}
                          caret={caret}
                          showCaret={caret >= 0 && focused && status !== "done"}
                        />
                      );
                    })}
                  </div>
                </div>

                <textarea
                  ref={inputRef}
                  value={typed}
                  onChange={onChange}
                  onKeyDown={onKeyDown}
                  onSelect={pinCaret}
                  onPaste={(e) => e.preventDefault()}
                  onDrop={(e) => e.preventDefault()}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  readOnly={status === "done"}
                  aria-label={`Typing area, ${langName}. Type the passage shown. The timer starts with your first key.`}
                  autoCapitalize="off"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                  className="absolute inset-0 z-10 h-full w-full cursor-text resize-none rounded-3xl text-base opacity-0 outline-hidden"
                />

                {!focused && status !== "done" && (
                  <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-3xl bg-ink-950/55 backdrop-blur-[3px]">
                    <span className="flex items-center gap-2.5 rounded-full border border-white/15 bg-ink-800/90 px-5 py-2.5 text-sm font-medium text-fog-100 shadow-xl">
                      <Keyboard className="h-4 w-4 text-saffron-300" aria-hidden="true" />
                      {running ? "Click here to keep typing" : "Click here and start typing"}
                    </span>
                  </div>
                )}
              </div>

              {lang === "hindi" && (
                <p className="mt-3 text-xs leading-relaxed text-fog-400">
                  {ime === "inscript"
                    ? "Built-in Inscript is on: type on your English keyboard, and Shift gives the upper layer. The full key map is in Features."
                    : "Using your own keyboard: switch to Hindi (Inscript or Remington GAIL) in your computer settings. Text must be Unicode, like Mangal."}
                </p>
              )}

              {/* Time bar */}
              <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.08]" aria-hidden="true">
                <div
                  className="h-full origin-left rounded-full bg-linear-to-r from-saffron-300 to-saffron-600 transition-transform duration-100 ease-linear"
                  style={{ transform: `scaleX(${Math.min(1, (status === "idle" ? 0 : elapsed) / seconds)})` }}
                />
              </div>

              {/* Live stats */}
              <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[
                  { k: "Net speed", v: status === "idle" ? "–" : String(Math.floor(live.net)), u: "WPM" },
                  { k: "Accuracy", v: typed.length ? String(Math.floor(live.accuracy)) : "–", u: "%" },
                  { k: "Errors", v: String(live.errors), u: "" },
                  { k: "Time left", v: String(timeLeft), u: "sec" },
                ].map((s) => (
                  <div key={s.k} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5 sm:p-4">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog-500">{s.k}</dt>
                    <dd className="mt-1 font-display text-3xl font-semibold tabular-nums tracking-[-0.03em] text-fog-100">
                      {s.v}
                      {s.u && (
                        <span className="ml-1.5 font-sans text-xs font-medium tracking-normal text-fog-400">{s.u}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="sr-only" role="status">
                {status === "done" && result
                  ? `Test complete. ${Math.floor(result.net)} words per minute at ${Math.floor(result.accuracy)} percent accuracy. Saved to your progress.`
                  : ""}
              </p>

              {status === "done" && !result && (
                <div className="swap mt-5 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-sm text-fog-300">Type at least a few words to get a result.</p>
                  <button type="button" onClick={() => reset()} className="btn btn-ghost h-11 px-5 text-sm">
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Try again
                  </button>
                </div>
              )}

              {status === "done" && result && (
                <div className="swap mt-5 rounded-3xl border border-saffron-400/25 bg-saffron-400/[0.06] p-5 sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="font-display text-2xl font-semibold tracking-[-0.02em] text-fog-100">
                        {Math.floor(result.net)} WPM at {Math.floor(result.accuracy)}% accuracy
                      </p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-fog-300">
                        <Check className="h-4 w-4 text-leaf-400" strokeWidth={3} aria-hidden="true" />
                        Saved to Your progress · {exam.name} · {langName} · {minLabel(result.seconds)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => onUseSpeed(Math.floor(result.net), lang)}
                        className="btn btn-primary h-12 px-6 text-[15px]"
                      >
                        Plan from {Math.floor(result.net)} WPM
                        <ArrowRight className="nudge h-4 w-4" aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => reset()} className="btn btn-ghost h-12 px-5 text-[15px]">
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        Try again
                      </button>
                    </div>
                  </div>

                  <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {[
                      { k: "Gross speed", v: `${Math.floor(result.gross)} WPM` },
                      { k: "Net KDPH", v: result.kdph.toLocaleString("en-IN") },
                      { k: "Word errors", v: `${result.wordErrors} of ${result.words}` },
                      { k: "Characters", v: `${live.correct} / ${live.typed} correct` },
                    ].map((s) => (
                      <div key={s.k} className="rounded-2xl border border-white/[0.07] bg-ink-900/50 p-3.5">
                        <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-fog-500">{s.k}</dt>
                        <dd className="mt-1 text-sm font-semibold tabular-nums text-fog-100">{s.v}</dd>
                      </div>
                    ))}
                  </dl>

                  <ul className="mt-4 space-y-2">
                    {verdict.map((v) => (
                      <li
                        key={v.label}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/[0.06] bg-ink-900/40 px-4 py-3 text-sm"
                      >
                        <span className="text-fog-300">{v.label}</span>
                        <span className="flex items-center gap-2">
                          <span className="font-mono tabular-nums text-fog-100">{v.value}</span>
                          {v.pass != null && (
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                                v.pass ? "bg-leaf-400/15 text-leaf-300" : "bg-blush-400/15 text-blush-400",
                              )}
                            >
                              {v.pass ? "Clears" : "Below"}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <p className="mt-4 text-center text-xs leading-relaxed text-fog-500">
            Net speed counts five correct characters as one word. Exam-style lines are estimates based on published
            rules. For a true reading, use a physical keyboard.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
