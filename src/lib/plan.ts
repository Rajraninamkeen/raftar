import { getExam, type Lang } from "../data/exams";
import { COURSE_LENGTH, lessonsFor } from "../data/lessons";

export type PhaseId = "foundation" | "accuracy" | "speed" | "simulation" | "revision";

export const PHASES: Record<PhaseId, { label: string; color: string; blurb: string }> = {
  foundation: { label: "Foundation", color: "#6ea8ff", blurb: "Finger map, posture and full-keyboard reach." },
  accuracy: { label: "Accuracy", color: "#3ddc97", blurb: "Clean typing and weak-key repair." },
  speed: { label: "Speed", color: "#ffa94a", blurb: "Bursts, overspeed intervals and stamina." },
  simulation: { label: "Exam simulation", color: "#ff6b8b", blurb: "Full mocks under real exam rules." },
  revision: { label: "Revision", color: "#b9a5ff", blurb: "Light day to repair mistakes and recover." },
};

export const PHASE_ORDER: PhaseId[] = ["foundation", "accuracy", "speed", "simulation", "revision"];

export const MIN_DAYS = 3;
export const MAX_DAYS = 60;
/** Below this speed the learner is treated as new to touch typing and gets key lessons first. */
export const BEGINNER_BELOW = 10;

export interface PlannerState {
  examId: string;
  lang: Lang;
  days: number;
  minutes: number;
  current: number;
  customTarget: number;
}

export const DEFAULT_PLANNER: PlannerState = {
  examId: "ssc-chsl",
  lang: "english",
  days: 10,
  minutes: 60,
  current: 18,
  customTarget: 40,
};

/** Required speed for a language, or null when the exam has no test in it. */
export function targetFor(state: PlannerState, lang: Lang): number | null {
  const exam = getExam(state.examId);
  if (exam.id === "custom") return state.customTarget;
  return lang === "hindi" ? exam.hindi : exam.english;
}

export function resolveTarget(state: PlannerState): number {
  return targetFor(state, state.lang) ?? getExam(state.examId).english;
}

export function sameConfig(a: PlannerState, b: PlannerState): boolean {
  return (
    a.examId === b.examId &&
    a.lang === b.lang &&
    a.days === b.days &&
    a.minutes === b.minutes &&
    a.current === b.current &&
    a.customTarget === b.customTarget
  );
}

/**
 * What a task opens: a key lesson, a repeat of the weakest lesson, a review of
 * learned keys, a short practice passage, a weak-key drill, a timed test or a full mock.
 */
export type TaskKind = "lesson" | "repeat" | "review" | "practice" | "weak" | "test" | "mock";

export interface PlanTask {
  title: string;
  detail: string;
  minutes: number;
  kind: TaskKind;
  /** Length of the timed passage this task opens, in seconds. */
  testSeconds?: number;
  /** Course lessons to cover, 1-based and inclusive. */
  lessons?: [number, number];
}

export interface PlanDay {
  day: number;
  phase: PhaseId;
  title: string;
  targetWpm: number;
  accuracy: number;
  tasks: PlanTask[];
}

export type FeasibilityLevel = "ahead" | "comfortable" | "focused" | "ambitious" | "steep";

export interface Plan {
  days: PlanDay[];
  trainTo: number;
  totalHours: number;
  gain: number;
  beginner: boolean;
  feasibility: { level: FeasibilityLevel; label: string; note: string };
  phaseCounts: Record<PhaseId, number>;
}

export interface PlanInput {
  days: number;
  minutes: number;
  current: number;
  target: number;
  lang: Lang;
  testMinutes?: number;
}

const TITLES: Record<PhaseId, string[]> = {
  foundation: [
    "Home row, posture and finger map",
    "Top and bottom row reach",
    "Capitals, numbers and punctuation",
    "Full-keyboard flow without looking",
  ],
  accuracy: [
    "Slow is smooth: lock in clean typing",
    "Weak-key repair session",
    "Punctuation, capitals and number control",
    "Steady rhythm at a fixed pace",
    "Error-free paragraphs",
    "Common-word accuracy ladder",
  ],
  speed: [
    "Burst speed on common words",
    "Sustained speed: five-minute pushes",
    "Overspeed intervals",
    "Long-passage stamina",
    "Speed with an accuracy floor",
    "Finish faster than you start",
  ],
  simulation: ["Full mock under exam rules", "Double mock with error review", "Mock under pressure: no pauses"],
  revision: ["Revision day: repair and recover"],
};

const HINDI_FOUNDATION = [
  "Layout map: home row and matras",
  "Upper row, lower row and the Shift layer",
  "Half letters and conjuncts",
  "Full-keyboard flow without looking",
];

const ACCURACY_FLOOR: Record<PhaseId, number> = {
  foundation: 90,
  accuracy: 95,
  speed: 94,
  simulation: 96,
  revision: 95,
};

function phaseFor(i: number, n: number, beginner: boolean): PhaseId {
  if (i === n - 1) return "simulation";
  if (i === 0) return "foundation";
  if (n >= 10 && (i + 1) % 7 === 0 && i < n - 2) return "revision";
  // Beginners spend a larger share of the plan learning the keys.
  const [foundation, accuracy, speed] = beginner ? [0.4, 0.62, 0.84] : [0.22, 0.52, 0.82];
  const p = i / (n - 1);
  if (p < foundation) return "foundation";
  if (p < accuracy) return "accuracy";
  if (p < speed) return "speed";
  return "simulation";
}

type TaskDef = [title: string, detail: string, weight: number, kind: TaskKind, testSeconds?: number];

interface TaskContext {
  wpm: number;
  accuracy: number;
  minutes: number;
  mockSeconds: number;
  isLast: boolean;
  lang: Lang;
  /** Lesson range for a beginner's foundation day. */
  lessons?: [number, number];
  /** Last foundation day: the alphabet is done, so a first timed test is possible. */
  firstTest: boolean;
}

function buildTasks(phase: PhaseId, ctx: TaskContext): PlanTask[] {
  const { wpm, accuracy, minutes, mockSeconds, isLast, lang, lessons, firstTest } = ctx;
  const mock = `${Math.round(mockSeconds / 60)}-minute`;
  const layout = lang === "hindi" ? " on the Inscript layout" : "";
  let defs: TaskDef[];

  switch (phase) {
    case "foundation":
      defs = lessons
        ? [
            ["Warm-up: keys you know", "Repeat the keys from your earlier lessons before adding new ones.", 0.15, "review"],
            [
              `Key lessons ${lessons[0]} to ${lessons[1]}`,
              `Step-by-step lessons in Learn. Every key shows which finger to use${layout}.`,
              0.45,
              "lesson",
            ],
            [
              "Words from learned keys",
              `Short lines made only from keys you have learned. Aim for ${accuracy}% accuracy.`,
              0.25,
              "review",
            ],
            firstTest
              ? [
                  "Your first timed test",
                  "Two minutes on a real passage. Accuracy matters more than the number today.",
                  0.15,
                  "test",
                  120,
                ]
              : ["Repeat for three stars", "Redo today's weakest lesson slowly and aim for 97% accuracy.", 0.15, "repeat"],
          ]
        : [
            ["Warm-up finger drills", "An easy one-minute passage to wake up every finger.", 0.15, "practice", 60],
            [
              "Guided key lessons",
              `Revise any row you are unsure of in Learn${layout}. Eyes stay on the screen, not on the keyboard.`,
              0.4,
              "lesson",
            ],
            [
              "Words and short sentences",
              `Easy passages at a relaxed pace. Aim for ${accuracy}% accuracy.`,
              0.3,
              "practice",
              120,
            ],
            ["Checkpoint test", `Two-minute test to log today's speed. Goal: ${wpm} WPM.`, 0.15, "test", 120],
          ];
      break;
    case "accuracy":
      defs = [
        ["Warm-up", "A one-minute passage at a comfortable, even pace.", 0.1, "practice", 60],
        ["Weak-key repair", "A drill built from the keys you missed most in your lessons and tests.", 0.3, "weak"],
        [
          "Clean paragraphs",
          `Two-minute passages with an accuracy floor of ${accuracy}%. Slow down if you drop below it.`,
          0.4,
          "practice",
          120,
        ],
        ["Timed test and error review", `Five-minute test at ${wpm} WPM, then review every mistake.`, 0.2, "test", 300],
      ];
      break;
    case "speed":
      defs = [
        ["Warm-up", "A one-minute passage to get up to pace.", 0.1, "practice", 60],
        [
          "One-minute bursts",
          `Repeated one-minute sprints at ${Math.round(wpm * 1.15)} WPM, about 15% above today's target.`,
          0.3,
          "practice",
          60,
        ],
        ["Sustained passages", `Five-minute passages holding ${wpm} WPM without stopping.`, 0.4, "practice", 300],
        ["Timed test", `Five-minute test. Keep accuracy at ${accuracy}% or better.`, 0.2, "test", 300],
      ];
      break;
    case "simulation":
      defs = [
        ["Warm-up", "A light one-minute passage. Settle your posture and breathing.", 0.1, "practice", 60],
        ["Mock test 1", `${mock} mock in exam mode at ${wpm} WPM.`, 0.35, "mock", mockSeconds],
        ["Error analysis", "Review every error, then drill your weakest keys.", 0.2, "weak"],
        isLast
          ? ["Final mock", "One last mock at exam pace. Then stop. Rest matters today.", 0.35, "mock", mockSeconds]
          : ["Mock test 2", `Second ${mock} mock. Beat your first attempt on accuracy.`, 0.35, "mock", mockSeconds],
      ];
      break;
    default:
      defs = [
        ["Easy warm-up", "A relaxed one-minute passage. No speed pressure today.", 0.2, "practice", 60],
        ["Mistake replay", "A drill built from the keys that cost you errors this week.", 0.4, "weak"],
        ["One relaxed test", `A single five-minute test at ${wpm} WPM to protect your rhythm.`, 0.4, "test", 300],
      ];
  }

  const mins = defs.map((d) => Math.max(1, Math.round(d[2] * minutes)));
  const diff = minutes - mins.reduce((a, b) => a + b, 0);
  const largest = mins.indexOf(Math.max(...mins));
  mins[largest] += diff;

  return defs.map((d, i) => ({
    title: d[0],
    detail: d[1],
    minutes: mins[i],
    kind: d[3],
    testSeconds: d[4],
    lessons: d[3] === "lesson" || d[3] === "repeat" ? lessons : undefined,
  }));
}

export function generatePlan(input: PlanInput): Plan {
  const n = Math.max(MIN_DAYS, Math.min(MAX_DAYS, Math.round(input.days)));
  const { minutes, current, target, lang, testMinutes } = input;
  const beginner = current < BEGINNER_BELOW;

  // Train slightly past the cut-off so exam-day nerves don't cost the result.
  const trainTo = Math.max(Math.ceil(target * 1.08), current + 2);
  const mockSeconds = (testMinutes ?? 10) * 60;

  const phases = Array.from({ length: n }, (_, i) => phaseFor(i, n, beginner));
  const foundationDays = phases.flatMap((p, i) => (p === "foundation" ? [i] : []));
  const course = lessonsFor(lang);
  const total = COURSE_LENGTH[lang];

  const counters: Record<PhaseId, number> = { foundation: 0, accuracy: 0, speed: 0, simulation: 0, revision: 0 };
  const days: PlanDay[] = [];

  for (let i = 0; i < n; i++) {
    const phase = phases[i];
    const isLast = i === n - 1;
    const eased = Math.pow((i + 1) / n, 0.85);
    const targetWpm = Math.round(current + (trainTo - current) * eased);
    const accuracy = ACCURACY_FLOOR[phase];

    // A beginner's foundation days share the whole key course between them.
    const fi = foundationDays.indexOf(i);
    let lessons: [number, number] | undefined;
    if (beginner && fi >= 0) {
      const from = Math.min(total, Math.floor((fi * total) / foundationDays.length) + 1);
      lessons = [from, Math.max(from, Math.floor(((fi + 1) * total) / foundationDays.length))];
    }

    const pool = phase === "foundation" && lang === "hindi" ? HINDI_FOUNDATION : TITLES[phase];
    let title = pool[counters[phase] % pool.length];
    if (lessons) {
      const a = course[lessons[0] - 1].stage.toLowerCase();
      const b = course[lessons[1] - 1].stage.toLowerCase();
      title = a === b ? `Learn the keys: ${a}` : `Learn the keys: ${a} to ${b}`;
    } else if (phase === "foundation" && counters.foundation === 0 && current >= 25) {
      title = "Technique tune-up: posture and finger discipline";
    }
    if (isLast) title = "Final rehearsal and calm-down";
    counters[phase] += 1;

    days.push({
      day: i + 1,
      phase,
      title,
      targetWpm,
      accuracy,
      tasks: buildTasks(phase, {
        wpm: targetWpm,
        accuracy,
        minutes,
        mockSeconds,
        isLast,
        lang,
        lessons,
        firstTest: fi === foundationDays.length - 1,
      }),
    });
  }

  const gain = Math.max(0, target - current);
  const totalHours = (n * minutes) / 60;
  // A beginner first has to learn the keyboard: allow about 10 hours to reach 15 WPM,
  // and expect slower gains after that than someone who already touch types.
  const overhead = beginner ? 10 * ((15 - Math.min(current, 15)) / 15) : 0;
  const effort = beginner ? Math.max(0, target - 15) * 1.5 : gain;
  const spare = totalHours - overhead;
  // Exactly enough hours to learn the keys and nothing left to gain counts as "achievable with focus".
  const perHour = spare > 0 ? effort / spare : spare === 0 && effort === 0 ? 2 : Infinity;
  const saferDays = Math.ceil((effort / 2.2 + overhead) / (minutes / 60));
  const tip = `At ${minutes} minutes a day, about ${saferDays} days is a safer runway.`;
  const zero = beginner ? " The first days go to learning the keys, lesson by lesson." : "";

  let feasibility: Plan["feasibility"];
  if (gain === 0) {
    feasibility = {
      level: "ahead",
      label: "Already at exam speed",
      note: "Your plan focuses on accuracy, stamina and a safety buffer above the cut-off.",
    };
  } else if (perHour <= 1.2) {
    feasibility = {
      level: "comfortable",
      label: "Comfortable pace",
      note: `Plenty of runway. Stay consistent and you should build a buffer before exam day.${zero}`,
    };
  } else if (perHour <= 2.2) {
    feasibility = {
      level: "focused",
      label: "Achievable with focus",
      note: `A realistic target if you complete every session. Don't skip the accuracy days.${zero}`,
    };
  } else if (perHour <= 3.5) {
    feasibility = { level: "ambitious", label: "Ambitious", note: `Possible, but tight. ${tip}${zero}` };
  } else {
    feasibility = { level: "steep", label: "Very steep", note: `A gap this size usually needs more time. ${tip}${zero}` };
  }

  return { days, trainTo, totalHours, gain, beginner, feasibility, phaseCounts: counters };
}
