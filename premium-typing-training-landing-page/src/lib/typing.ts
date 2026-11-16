import type { Exam, Lang } from "../data/exams";

/* ---------- Text segmentation ---------- */

export interface Token {
  s: number;
  e: number;
}

export interface WordGroup {
  start: number;
  text: string;
  tokens: Token[];
}

const VIRAMA = "\u094D";
const MARK = /\p{M}/u;
const JOINER = /[\u200C\u200D]/;
const SPACE = /\s/;

/**
 * Splits text into words (each with its trailing space) made of display tokens.
 * A token is one character in English, or one full akshara in Hindi (consonants
 * joined by virama plus their matras and marks), so Devanagari is never broken
 * apart when it is coloured.
 */
export function groupWords(text: string): WordGroup[] {
  const groups: WordGroup[] = [];
  let current: WordGroup | null = null;
  let prev = "";
  let i = 0;
  for (const ch of text) {
    const isSpace = SPACE.test(ch);
    if (!current) {
      current = { start: i, text: "", tokens: [] };
      groups.push(current);
    }
    const rel = i - current.start;
    const last = current.tokens[current.tokens.length - 1];
    const joins = !isSpace && (MARK.test(ch) || JOINER.test(ch) || prev === VIRAMA || JOINER.test(prev));
    if (joins && last) last.e = rel + ch.length;
    else current.tokens.push({ s: rel, e: rel + ch.length });
    current.text += ch;
    i += ch.length;
    prev = ch;
    if (isSpace) current = null;
  }
  return groups;
}

/* ---------- Metrics ---------- */

export interface Metrics {
  seconds: number;
  typed: number;
  correct: number;
  errors: number;
  gross: number;
  net: number;
  accuracy: number;
  kdph: number;
  words: number;
  wordErrors: number;
  wordErrorPct: number;
}

/** One word = 5 characters. Net counts only characters that match the passage. */
export function measure(passage: string, typed: string, seconds: number): Metrics {
  const secs = Math.max(1, seconds);
  const minutes = secs / 60;
  let correct = 0;
  for (let i = 0; i < typed.length; i++) if (typed[i] === passage[i]) correct++;

  let words = 0;
  let wordErrors = 0;
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(passage)) !== null && m.index < typed.length) {
    words++;
    const stop = Math.min(m.index + m[0].length + 1, typed.length);
    for (let i = m.index; i < stop; i++) {
      if (typed[i] !== passage[i]) {
        wordErrors++;
        break;
      }
    }
  }

  return {
    seconds: secs,
    typed: typed.length,
    correct,
    errors: typed.length - correct,
    gross: typed.length / 5 / minutes,
    net: correct / 5 / minutes,
    accuracy: typed.length ? (correct / typed.length) * 100 : 100,
    kdph: (correct / secs) * 3600,
    words,
    wordErrors,
    wordErrorPct: words ? (wordErrors / words) * 100 : 0,
  };
}

/* ---------- Exam-style verdicts ---------- */

export interface Verdict {
  label: string;
  value: string;
  pass: boolean | null;
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-IN");

/** Speed-to-marks slabs from the Delhi Police HCM 2025 notice. */
export function delhiPoliceMarks(wpm: number, lang: Lang): number | null {
  const min = lang === "hindi" ? 25 : 30;
  if (wpm < min) return null;
  const over = wpm - min;
  if (over === 0) return 10;
  if (over <= 5) return 12;
  if (over <= 10) return 15;
  if (over <= 15) return 18;
  if (over <= 20) return 21;
  return 25;
}

export function examVerdict(exam: Exam, lang: Lang, target: number | null, m: Metrics): Verdict[] {
  const out: Verdict[] = [];
  const net = Math.floor(m.net);
  if (target != null) {
    out.push({ label: `Net speed (needs ${target} WPM)`, value: `${net} WPM`, pass: net >= target });
  } else {
    out.push({
      label: `${exam.name} has no ${lang === "hindi" ? "Hindi" : "English"} test`,
      value: `${net} WPM`,
      pass: null,
    });
  }
  if (exam.kdph && lang === "english") {
    out.push({ label: `Net KDPH (needs ${fmt(exam.kdph)})`, value: fmt(m.kdph), pass: m.kdph >= exam.kdph });
  }
  if (exam.scoring === "dp-hcm" && target != null) {
    const marks = delhiPoliceMarks(net, lang);
    out.push({
      label: "Delhi Police HCM marks",
      value: marks == null ? "Below minimum" : `${marks} / 25`,
      pass: marks != null,
    });
  }
  if (exam.scoring === "rrb" && target != null) {
    const grossWords = m.typed / 5;
    const allowed = Math.floor(grossWords * 0.05);
    const penalty = Math.max(0, m.wordErrors - allowed) * 10;
    const rrb = Math.max(0, grossWords - penalty) / (m.seconds / 60);
    out.push({
      label: "RRB-style net (5% mistakes ignored, 10 words per extra mistake)",
      value: `${Math.floor(rrb)} WPM`,
      pass: rrb >= target,
    });
  }
  if (exam.scoring === "jca") {
    out.push({
      label: "Word errors (3% allowed)",
      value: `${m.wordErrorPct.toFixed(1)}%`,
      pass: m.wordErrorPct <= 3,
    });
  }
  return out;
}

/* ---------- Inscript keyboard (standard Devanagari layout) ---------- */

/** Physical key code → [normal, with Shift]. Digits stay 0-9, as on the Windows Hindi keyboard. */
export const INSCRIPT: Record<string, [string, string]> = {
  Backquote: ["ॊ", "ऒ"],
  Digit1: ["1", "ऍ"],
  Digit2: ["2", "ॅ"],
  Digit3: ["3", "्र"],
  Digit4: ["4", "र्"],
  Digit5: ["5", "ज्ञ"],
  Digit6: ["6", "त्र"],
  Digit7: ["7", "क्ष"],
  Digit8: ["8", "श्र"],
  Digit9: ["9", "("],
  Digit0: ["0", ")"],
  Minus: ["-", "ः"],
  Equal: ["ृ", "ऋ"],
  KeyQ: ["ौ", "औ"],
  KeyW: ["ै", "ऐ"],
  KeyE: ["ा", "आ"],
  KeyR: ["ी", "ई"],
  KeyT: ["ू", "ऊ"],
  KeyY: ["ब", "भ"],
  KeyU: ["ह", "ङ"],
  KeyI: ["ग", "घ"],
  KeyO: ["द", "ध"],
  KeyP: ["ज", "झ"],
  BracketLeft: ["ड", "ढ"],
  BracketRight: ["़", "ञ"],
  Backslash: ["ॉ", "ऑ"],
  KeyA: ["ो", "ओ"],
  KeyS: ["े", "ए"],
  KeyD: ["्", "अ"],
  KeyF: ["ि", "इ"],
  KeyG: ["ु", "उ"],
  KeyH: ["प", "फ"],
  KeyJ: ["र", "ऱ"],
  KeyK: ["क", "ख"],
  KeyL: ["त", "थ"],
  Semicolon: ["च", "छ"],
  Quote: ["ट", "ठ"],
  KeyZ: ["ॆ", "ऎ"],
  KeyX: ["ं", "ँ"],
  KeyC: ["म", "ण"],
  KeyV: ["न", "ऩ"],
  KeyB: ["व", "ऴ"],
  KeyN: ["ल", "ळ"],
  KeyM: ["स", "श"],
  Comma: [",", "ष"],
  Period: [".", "।"],
  Slash: ["य", "य़"],
};

export const KEY_ROWS: string[][] = [
  ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "BracketLeft", "BracketRight"],
  ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote"],
  ["KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash"],
];

const SYMBOL_LABEL: Record<string, string> = {
  Backquote: "`",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
};

/** Printed label of a physical key on a US keyboard. */
export function capLabel(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return SYMBOL_LABEL[code] ?? code;
}

/** How to type a Hindi character with built-in Inscript, for example "Shift + F". */
export function inscriptHint(ch: string): string | null {
  for (const [code, pair] of Object.entries(INSCRIPT)) {
    if (pair[0] === ch) return capLabel(code);
    if (pair[1] === ch) return `Shift + ${capLabel(code)}`;
  }
  return null;
}

/** Makes spaces and combining matras visible on their own. */
export function displayChar(ch: string): string {
  if (ch === " ") return "Space";
  if (/^\p{M}/u.test(ch)) return `\u25CC${ch}`;
  return ch;
}

/* ---------- Weak keys ---------- */

export interface WeakKey {
  ch: string;
  attempts: number;
  misses: number;
  rate: number;
}

export function attemptsTotal(stats: Record<string, [number, number]> | undefined): number {
  if (!stats) return 0;
  return Object.values(stats).reduce((a, v) => a + (v?.[0] ?? 0), 0);
}

export function weakKeys(stats: Record<string, [number, number]> | undefined, lang: Lang, limit = 6): WeakKey[] {
  if (!stats) return [];
  const merged: Record<string, [number, number]> = {};
  for (const [ch, v] of Object.entries(stats)) {
    if (!Array.isArray(v)) continue;
    const k = lang === "english" ? ch.toLowerCase() : ch;
    const cur = merged[k] ?? [0, 0];
    merged[k] = [cur[0] + v[0], cur[1] + v[1]];
  }
  return Object.entries(merged)
    .filter(([, [a, m]]) => a >= 8 && m >= 2)
    .map(([ch, [a, m]]) => ({ ch, attempts: a, misses: m, rate: m / a }))
    .sort((x, y) => y.rate - x.rate || y.misses - x.misses)
    .slice(0, limit);
}
