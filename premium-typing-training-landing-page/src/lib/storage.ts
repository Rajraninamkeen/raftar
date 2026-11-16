import { useEffect, useRef, useState } from "react";
import { isKnownExam, type Lang } from "../data/exams";
import type { PlannerState } from "./plan";

/** Namespaced so it never clashes with other sites on the same github.io origin. */
const PREFIX = "raftaar:v1:";

function read<T>(key: string, fallback: T, isValid: (v: unknown) => v is T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/** useState that persists to localStorage and stays in sync across tabs. */
export function useStoredState<T>(key: string, fallback: T, isValid: (v: unknown) => v is T) {
  const fullKey = PREFIX + key;
  const fallbackRef = useRef(fallback);
  const validRef = useRef(isValid);
  const [value, setValue] = useState<T>(() => read(fullKey, fallback, isValid));

  useEffect(() => {
    try {
      localStorage.setItem(fullKey, JSON.stringify(value));
    } catch {
      /* Storage blocked or full: keep working in memory. */
    }
  }, [fullKey, value]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === fullKey) setValue(read(fullKey, fallbackRef.current, validRef.current));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [fullKey]);

  return [value, setValue] as const;
}

/* ---------- Shapes ---------- */

export interface TestRecord {
  id: string;
  at: string;
  examId: string;
  lang: Lang;
  seconds: number;
  gross: number;
  net: number;
  accuracy: number;
  kdph: number;
  words: number;
  wordErrors: number;
  target: number | null;
  drill?: boolean;
}

/** Expected character → [attempts, misses]. */
export type KeyDelta = Record<string, [number, number]>;
export type KeyStats = Record<Lang, KeyDelta>;

export interface ActivePlan {
  config: PlannerState;
  /** Local date, yyyy-mm-dd. */
  startedOn: string;
  done: Record<string, boolean>;
}

export const EMPTY_KEYS: KeyStats = { english: {}, hindi: {} };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isLang = (v: unknown): v is Lang => v === "english" || v === "hindi";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function isPlanner(v: unknown): v is PlannerState {
  return (
    isObj(v) &&
    typeof v.examId === "string" &&
    isKnownExam(v.examId) &&
    isLang(v.lang) &&
    isNum(v.days) &&
    isNum(v.minutes) &&
    isNum(v.current) &&
    isNum(v.customTarget)
  );
}

export function isHistory(v: unknown): v is TestRecord[] {
  return (
    Array.isArray(v) &&
    v.every(
      (r) =>
        isObj(r) &&
        typeof r.id === "string" &&
        typeof r.at === "string" &&
        typeof r.examId === "string" &&
        isLang(r.lang) &&
        isNum(r.seconds) &&
        isNum(r.net) &&
        isNum(r.gross) &&
        isNum(r.accuracy),
    )
  );
}

export function isKeyStats(v: unknown): v is KeyStats {
  return isObj(v) && isObj(v.english) && isObj(v.hindi);
}

export function isActivePlan(v: unknown): v is ActivePlan | null {
  return v === null || (isObj(v) && isPlanner(v.config) && typeof v.startedOn === "string" && isObj(v.done));
}

export function mergeKeys(stats: KeyStats, lang: Lang, delta: KeyDelta): KeyStats {
  const next: KeyDelta = { ...stats[lang] };
  for (const [ch, [a, m]] of Object.entries(delta)) {
    const cur = next[ch] ?? [0, 0];
    next[ch] = [cur[0] + a, cur[1] + m];
  }
  return { ...stats, [lang]: next };
}

/* ---------- Dates ---------- */

export function todayISO(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 1 on the start date, 2 the next calendar day, and so on. */
export function dayNumber(startISO: string, d = new Date()): number {
  const [y, m, dd] = startISO.split("-").map(Number);
  const start = Date.UTC(y, (m || 1) - 1, dd || 1);
  const now = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((now - start) / 86400000) + 1;
}

/* ---------- Course progress ---------- */

export interface LessonResult {
  stars: number;
  acc: number;
  wpm: number;
  at: string;
}

/** Best result per passed lesson id, for each course. */
export type CourseProgress = Record<Lang, Record<string, LessonResult>>;

export const EMPTY_COURSE: CourseProgress = { english: {}, hindi: {} };

export function isCourse(v: unknown): v is CourseProgress {
  return isObj(v) && isObj(v.english) && isObj(v.hindi);
}
