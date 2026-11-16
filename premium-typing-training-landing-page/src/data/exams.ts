export type Lang = "english" | "hindi";
export type ExamCategory = "ssc" | "state" | "central" | "forces" | "court" | "custom";
/** Exam-specific scoring we can estimate from a practice result. */
export type Scoring = "dp-hcm" | "rrb" | "jca";

export interface Exam {
  id: string;
  name: string;
  post: string;
  body: string;
  category: ExamCategory;
  /** English requirement in WPM. Key-depression tests are converted at 5 key depressions per word. */
  english: number;
  /** Hindi requirement in WPM, or null when the test has no Hindi option. */
  hindi: number | null;
  /** Official key-depressions-per-hour requirement, where the notice states one. */
  kdph?: number;
  /** Test length in minutes, where it is published. */
  testMinutes?: number;
  /** Candidates must clear both the Hindi and the English test. */
  bothLanguages?: boolean;
  /** Editing keys such as Backspace are not available in the real test. */
  noBackspace?: boolean;
  /** WPM targets are derived from a marks scheme rather than stated directly. */
  derived?: boolean;
  scoring?: Scoring;
  rules: string[];
  ref?: string;
  site?: { label: string; url: string };
}

/** When the requirements below were last checked against notices and published instructions. */
export const CHECKED_ON = "November 2026";

const SSC = { label: "ssc.gov.in", url: "https://ssc.gov.in" };

export const EXAMS: Exam[] = [
  {
    id: "ssc-chsl",
    name: "SSC CHSL",
    post: "LDC / JSA · PA / SA",
    body: "Staff Selection Commission",
    category: "ssc",
    english: 35,
    hindi: 30,
    testMinutes: 10,
    rules: [
      "35 WPM (about 10,500 key depressions per hour) in English, 30 WPM (about 9,000) in Hindi",
      "10 minutes, plus 5 minutes for candidates allowed a scribe",
      "Qualifying. The language chosen in the application cannot be changed",
    ],
    ref: "CHSL 2025 notice",
    site: SSC,
  },
  {
    id: "ssc-chsl-deo",
    name: "SSC CHSL DEO",
    post: "Data Entry Operator",
    body: "Staff Selection Commission",
    category: "ssc",
    english: 27,
    hindi: null,
    kdph: 8000,
    testMinutes: 15,
    rules: [
      "8,000 key depressions per hour",
      "15-minute English passage of about 2,000 to 2,200 key depressions",
      "Qualifying",
    ],
    ref: "CHSL 2025 notice",
    site: SSC,
  },
  {
    id: "ssc-chsl-deo-cag",
    name: "SSC CHSL DEO Grade A",
    post: "Office of the C&AG",
    body: "Staff Selection Commission",
    category: "ssc",
    english: 50,
    hindi: null,
    kdph: 15000,
    testMinutes: 15,
    rules: [
      "15,000 key depressions per hour",
      "15-minute English passage of about 3,700 to 4,000 key depressions",
      "Qualifying",
    ],
    ref: "CHSL 2025 notice",
    site: SSC,
  },
  {
    id: "ssc-cgl",
    name: "SSC CGL DEST",
    post: "Tax Assistant · CBDT / CBIC",
    body: "Staff Selection Commission",
    category: "ssc",
    english: 27,
    hindi: null,
    kdph: 8000,
    testMinutes: 15,
    rules: [
      "About 2,000 key depressions in 15 minutes (8,000 per hour)",
      "English passage, typed on computer",
      "Qualifying, held with Tier 2",
    ],
    ref: "CGL 2025 notice",
    site: SSC,
  },
  {
    id: "delhi-police-hcm",
    name: "Delhi Police HCM",
    post: "Head Constable (Ministerial)",
    body: "SSC for Delhi Police",
    category: "forces",
    english: 30,
    hindi: 25,
    testMinutes: 10,
    scoring: "dp-hcm",
    rules: [
      "Minimum 30 WPM in English or 25 WPM in Hindi, in 10 minutes",
      "Scored out of 25: 10 marks at the minimum, 25 above 50 WPM English or 45 WPM Hindi",
      "Typed on computer from a printed passage",
    ],
    ref: "HCM 2025 notice",
    site: SSC,
  },
  {
    id: "upsssc-ja",
    name: "UPSSSC Junior Assistant",
    post: "Kanishtha Sahayak",
    body: "UP Subordinate Services Selection Commission",
    category: "state",
    english: 30,
    hindi: 25,
    testMinutes: 5,
    bothLanguages: true,
    rules: [
      "Hindi 25 WPM and English 30 WPM. Both tests must be cleared",
      "Hindi in Mangal (Inscript) or Kruti Dev 010, as reported",
      "Reported as 5 minutes per language. Confirm on your admit card",
    ],
    ref: "Advt. 12-Exam/2024",
    site: { label: "upsssc.gov.in", url: "https://upsssc.gov.in" },
  },
  {
    id: "rrb-ntpc",
    name: "RRB NTPC",
    post: "Clerk cum Typist posts",
    body: "Railway Recruitment Boards",
    category: "central",
    english: 30,
    hindi: 25,
    testMinutes: 10,
    noBackspace: true,
    scoring: "rrb",
    rules: [
      "30 WPM English (300 words) or 25 WPM Hindi (250 words) in 10 minutes",
      "No Backspace, Delete or spell-check during the test",
      "Mistakes up to 5% of words are ignored, then 10 words are deducted per mistake",
    ],
    ref: "CEN 05/2024 & 06/2024",
    site: { label: "rrbapply.gov.in", url: "https://www.rrbapply.gov.in" },
  },
  {
    id: "capf-hcm",
    name: "CAPF HCM",
    post: "BSF · CRPF · CISF · ITBP · SSB",
    body: "Central Armed Police Forces",
    category: "forces",
    english: 35,
    hindi: 30,
    testMinutes: 10,
    rules: [
      "35 WPM (about 10,500 KDPH) in English or 30 WPM (about 9,000) in Hindi",
      "10-minute test on computer",
      "Each force publishes its own notice",
    ],
    ref: "Force HCM notices",
    site: { label: "rectt.bsf.gov.in", url: "https://rectt.bsf.gov.in" },
  },
  {
    id: "dsssb-jsa",
    name: "DSSSB JSA / LDC",
    post: "Junior Assistant · DASS Grade IV",
    body: "Delhi Subordinate Services Selection Board",
    category: "state",
    english: 35,
    hindi: 30,
    testMinutes: 10,
    rules: ["35 WPM in English or 30 WPM in Hindi, on computer", "10-minute test", "Qualifying"],
    ref: "JSA / LDC notices",
    site: { label: "dsssb.delhi.gov.in", url: "https://dsssb.delhi.gov.in" },
  },
  {
    id: "kvs-jsa",
    name: "KVS / NVS JSA",
    post: "Junior Secretariat Assistant",
    body: "Kendriya and Navodaya Vidyalaya",
    category: "central",
    english: 35,
    hindi: 30,
    testMinutes: 10,
    rules: [
      "35 WPM in English or 30 WPM in Hindi, in 10 minutes",
      "Typing is qualifying",
      "A separate Computer Proficiency Test follows",
    ],
    ref: "JSA recruitment notices",
    site: { label: "kvsangathan.nic.in", url: "https://kvsangathan.nic.in" },
  },
  {
    id: "epfo-ssa",
    name: "EPFO SSA",
    post: "Social Security Assistant",
    body: "Employees' Provident Fund Organisation",
    category: "central",
    english: 35,
    hindi: 30,
    testMinutes: 10,
    rules: [
      "35 WPM in English or 30 WPM in Hindi (10,500 or 9,000 KDPH)",
      "10-minute qualifying computer skill test",
      "Hindi in Mangal font with the Inscript layout",
    ],
    ref: "SSA notice and skill-test instructions",
    site: { label: "epfindia.gov.in", url: "https://www.epfindia.gov.in" },
  },
  {
    id: "sci-jca",
    name: "Supreme Court JCA",
    post: "Junior Court Assistant",
    body: "Supreme Court of India",
    category: "court",
    english: 35,
    hindi: null,
    testMinutes: 10,
    scoring: "jca",
    rules: ["35 WPM in English, after deducting mistakes", "Mistakes allowed up to 3%", "10 minutes, on computer"],
    ref: "JCA 2025 notice",
    site: { label: "sci.gov.in", url: "https://www.sci.gov.in" },
  },
  {
    id: "ahc-ja",
    name: "Allahabad HC Junior Assistant",
    post: "Group C",
    body: "High Court of Judicature at Allahabad",
    category: "court",
    english: 30,
    hindi: 25,
    bothLanguages: true,
    rules: [
      "Hindi 25 WPM and English 30 WPM, on computer",
      "25 marks each for the Hindi and English tests",
      "Hindi typing in Mangal font",
    ],
    ref: "Group C recruitment notice",
    site: { label: "allahabadhighcourt.in", url: "https://www.allahabadhighcourt.in" },
  },
  {
    id: "rssb-ldc",
    name: "RSSB Clerk / Jr. Assistant",
    post: "Rajasthan · Clerk Grade II",
    body: "Rajasthan Staff Selection Board",
    category: "state",
    english: 18,
    hindi: 15,
    testMinutes: 10,
    bothLanguages: true,
    derived: true,
    rules: [
      "No fixed WPM: 0.05 marks per correct English word, 0.0625 per Hindi word",
      "At least 9 of 25 in each paper: about 180 English or 144 Hindi correct words in 10 minutes",
      "The Hindi speed test uses the DevLys 010 font",
    ],
    ref: "Clerk Gr. II / Jr. Asst. notice",
    site: { label: "rssb.rajasthan.gov.in", url: "https://rssb.rajasthan.gov.in" },
  },
];

export const CUSTOM_EXAM: Exam = {
  id: "custom",
  name: "Custom goal",
  post: "Any other typing test",
  body: "",
  category: "custom",
  english: 40,
  hindi: 40,
  rules: [],
};

export function isKnownExam(id: string): boolean {
  return id === "custom" || EXAMS.some((e) => e.id === id);
}

export function getExam(id: string): Exam {
  if (id === "custom") return CUSTOM_EXAM;
  return EXAMS.find((e) => e.id === id) ?? EXAMS[0];
}

export const CATEGORY_LABEL: Record<ExamCategory, string> = {
  ssc: "SSC",
  state: "State",
  central: "Railway & Central",
  forces: "Police & Forces",
  court: "Courts",
  custom: "Custom",
};
