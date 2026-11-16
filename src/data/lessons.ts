import type { Lang } from "./exams";
import { INSCRIPT } from "../lib/typing";

/* ---------- Fingers and keyboard ---------- */

export type Finger = "l5" | "l4" | "l3" | "l2" | "r2" | "r3" | "r4" | "r5" | "thumb";

export const FINGERS: Record<Finger, { name: string; color: string }> = {
  l5: { name: "left little finger", color: "#ff6b8b" },
  l4: { name: "left ring finger", color: "#ff9f43" },
  l3: { name: "left middle finger", color: "#ffd166" },
  l2: { name: "left index finger", color: "#3ddc97" },
  r2: { name: "right index finger", color: "#4cc9f0" },
  r3: { name: "right middle finger", color: "#6ea8ff" },
  r4: { name: "right ring finger", color: "#b9a5ff" },
  r5: { name: "right little finger", color: "#f78fd6" },
  thumb: { name: "thumb", color: "#dfe1ea" },
};

const zone = (finger: Finger, codes: string) => codes.split(" ").map((c) => [c, finger] as const);

/** Standard touch-typing finger for every physical key. */
export const FINGER_OF: Record<string, Finger> = Object.fromEntries([
  ...zone("l5", "Backquote Digit1 KeyQ KeyA KeyZ Tab CapsLock ShiftLeft"),
  ...zone("l4", "Digit2 KeyW KeyS KeyX"),
  ...zone("l3", "Digit3 KeyE KeyD KeyC"),
  ...zone("l2", "Digit4 Digit5 KeyR KeyT KeyF KeyG KeyV KeyB"),
  ...zone("r2", "Digit6 Digit7 KeyY KeyU KeyH KeyJ KeyN KeyM"),
  ...zone("r3", "Digit8 KeyI KeyK Comma"),
  ...zone("r4", "Digit9 KeyO KeyL Period"),
  ...zone("r5", "Digit0 Minus Equal KeyP BracketLeft BracketRight Backslash Semicolon Quote Slash Enter ShiftRight Backspace"),
  ...zone("thumb", "Space"),
]);

/** Shift is held with the little finger of the hand that is not typing the key. */
export function shiftFor(code: string): "ShiftLeft" | "ShiftRight" {
  return FINGER_OF[code]?.startsWith("l") ? "ShiftRight" : "ShiftLeft";
}

export const US_LAYOUT: Record<string, [string, string]> = {
  Backquote: ["`", "~"],
  Digit1: ["1", "!"],
  Digit2: ["2", "@"],
  Digit3: ["3", "#"],
  Digit4: ["4", "$"],
  Digit5: ["5", "%"],
  Digit6: ["6", "^"],
  Digit7: ["7", "&"],
  Digit8: ["8", "*"],
  Digit9: ["9", "("],
  Digit0: ["0", ")"],
  Minus: ["-", "_"],
  Equal: ["=", "+"],
  BracketLeft: ["[", "{"],
  BracketRight: ["]", "}"],
  Backslash: ["\\", "|"],
  Semicolon: [";", ":"],
  Quote: ["'", '"'],
  Comma: [",", "<"],
  Period: [".", ">"],
  Slash: ["/", "?"],
};
for (const c of "abcdefghijklmnopqrstuvwxyz") US_LAYOUT[`Key${c.toUpperCase()}`] = [c, c.toUpperCase()];

export interface KeyCap {
  code: string;
  span: number;
}
const caps = (codes: string): KeyCap[] => codes.split(" ").map((code) => ({ code, span: 2 }));

/** Rows of a standard keyboard on a 30-column grid. An empty code is a spacer. */
export const KEYBOARD: KeyCap[][] = [
  [...caps("Backquote Digit1 Digit2 Digit3 Digit4 Digit5 Digit6 Digit7 Digit8 Digit9 Digit0 Minus Equal"), { code: "Backspace", span: 4 }],
  [{ code: "Tab", span: 3 }, ...caps("KeyQ KeyW KeyE KeyR KeyT KeyY KeyU KeyI KeyO KeyP BracketLeft BracketRight"), { code: "Backslash", span: 3 }],
  [{ code: "CapsLock", span: 4 }, ...caps("KeyA KeyS KeyD KeyF KeyG KeyH KeyJ KeyK KeyL Semicolon Quote"), { code: "Enter", span: 4 }],
  [{ code: "ShiftLeft", span: 5 }, ...caps("KeyZ KeyX KeyC KeyV KeyB KeyN KeyM Comma Period Slash"), { code: "ShiftRight", span: 5 }],
  [{ code: "", span: 8 }, { code: "Space", span: 14 }, { code: "", span: 8 }],
];

export interface KeyRef {
  code: string;
  shift: boolean;
}

function invert(layout: Record<string, [string, string]>): Record<string, KeyRef> {
  const out: Record<string, KeyRef> = {};
  for (const [code, pair] of Object.entries(layout)) {
    const k = pair[0].normalize("NFC");
    if (!(k in out)) out[k] = { code, shift: false };
  }
  for (const [code, pair] of Object.entries(layout)) {
    const k = pair[1].normalize("NFC");
    if (!(k in out)) out[k] = { code, shift: true };
  }
  return out;
}

const REV: Record<Lang, Record<string, KeyRef>> = { english: invert(US_LAYOUT), hindi: invert(INSCRIPT) };

/** Conjuncts that have their own key on the Inscript number row. */
export const HINDI_COMBOS = ["क्ष", "त्र", "ज्ञ", "श्र"].map((c) => c.normalize("NFC"));

/** The key to press next at `pos`, and the text that key produces. */
export function keyFor(lang: Lang, text: string, pos: number, combos = false): (KeyRef & { out: string }) | null {
  if (pos >= text.length) return null;
  const ch = text[pos];
  if (ch === " ") return { code: "Space", shift: false, out: " " };
  if (lang === "hindi" && combos) {
    for (const c of HINDI_COMBOS) if (text.startsWith(c, pos)) return { ...REV.hindi[c], out: c };
  }
  const k = REV[lang][ch];
  return k ? { ...k, out: ch } : null;
}

/* ---------- Course model ---------- */

export interface Lesson {
  id: string;
  /** 1-based position in the course. */
  n: number;
  stage: string;
  title: string;
  /** Characters introduced in this lesson. */
  keys: string[];
  tip: string;
  lines: string[];
  /** Suggest the number-row shortcuts for क्ष, त्र, ज्ञ and श्र. */
  combos?: boolean;
  checklist?: string[];
  /** Extra physical keys to point out in the introduction. */
  marks?: string[];
}

export interface Stage {
  title: string;
  blurb: string;
  lessons: Lesson[];
}

interface Draft {
  title: string;
  keys?: string;
  tip: string;
  lines: string[];
  combos?: boolean;
  checklist?: string[];
  marks?: string[];
}
interface StageDraft {
  title: string;
  blurb: string;
  lessons: Draft[];
}

/** A matra standing alone (after a space or comma) is shown on a dotted circle: ◌ि. */
const carry = (s: string) => s.normalize("NFC").replace(/(^|[\s,(])(\p{M})/gu, "$1\u25CC$2");

function build(prefix: string, drafts: StageDraft[]): Stage[] {
  let n = 0;
  return drafts.map((s) => ({
    title: s.title,
    blurb: s.blurb,
    lessons: s.lessons.map((d) => {
      n += 1;
      return {
        id: `${prefix}-${n}`,
        n,
        stage: s.title,
        title: carry(d.title),
        keys: (d.keys ? d.keys.split(" ") : []).map((k) => (k === "Space" ? " " : k.normalize("NFC"))),
        tip: carry(d.tip),
        lines: d.lines.map((l) => l.normalize("NFC")),
        combos: d.combos,
        checklist: d.checklist,
        marks: d.marks,
      };
    }),
  }));
}

const POSTURE = [
  "Sit straight with both feet flat on the floor.",
  "Keep your elbows close to your body and your wrists off the desk.",
  "Rest your fingers on A S D F and J K L ;. Feel the small bumps on F and J.",
  "Keep your eyes on the screen. Use the key guide below, not your keyboard.",
];

/* ---------- English course (QWERTY) ---------- */

const ENGLISH: StageDraft[] = [
  {
    title: "Home row",
    blurb: "Where your fingers rest.",
    lessons: [
      {
        title: "F, J and Space",
        keys: "f j Space",
        tip: "Your index fingers live on F and J. Tap each key lightly and bring the finger straight back. Use a thumb for Space.",
        checklist: POSTURE,
        lines: ["fff jjj fff jjj", "fj fj jf jf fj", "f j f j ff jj", "fjf jfj ffj jjf", "jf fj jjf ffj fjfj"],
      },
      {
        title: "D and K",
        keys: "d k",
        tip: "Middle fingers. Keep your index fingers resting on F and J while the middle fingers tap.",
        lines: ["ddd kkk ddd kkk", "dk dk kd kd dk", "fd jk df kj fdk", "dfj kjd fkd jdk", "kd fj dk jf dkfj"],
      },
      {
        title: "S and L",
        keys: "s l",
        tip: "Ring fingers. They are weaker, so go slowly and keep the rhythm even.",
        lines: ["sss lll sss lll", "sl sl ls ls sl", "sd lk ds kl sdf", "lkj sdf jkl fds", "skl dsl fls jsd"],
      },
      {
        title: "A and ;",
        keys: "a ;",
        tip: "Little fingers. You now know the whole home row: A S D F on the left, J K L ; on the right.",
        lines: ["aaa ;;; aaa ;;;", "a; a; ;a ;a a;", "as l; sa ;l asd", "asdf jkl; asdf jkl;", "ask dad all sad", "a lad; a dad; a fall"],
      },
      {
        title: "G and H",
        keys: "g h",
        tip: "Index fingers stretch one key inward: F reaches to G, J reaches to H. Come back to F and J after each tap.",
        lines: ["fgf jhj fgf jhj", "ggg hhh gh gh hg", "fg jh gf hj fgh", "had has gas hall half", "glad flag flash shall", "half a glass; a glad lad"],
      },
      {
        title: "Home row words",
        tip: "No new keys. Type real words using only the home row, and do not look down.",
        lines: [
          "ask dad had all",
          "a sad lad; a glad dad",
          "flask salad glass flash",
          "shall fall; had half",
          "dad has a flag; a lad has a flask",
          "all lads shall dash; dad had a salad",
        ],
      },
    ],
  },
  {
    title: "Top row",
    blurb: "Reach up, then return home.",
    lessons: [
      {
        title: "E and I",
        keys: "e i",
        tip: "Middle fingers reach up: D to E, K to I. Only the finger moves. The hand stays on the home row.",
        lines: [
          "ded kik ded kik",
          "eee iii ei ei ie",
          "de ki ed ik die",
          "like side life idea",
          "feel field skill slide",
          "he is glad; she likes a salad",
          "she sees a lake; he said hi",
        ],
      },
      {
        title: "R and U",
        keys: "r u",
        tip: "Index fingers reach up: F to R, J to U.",
        lines: [
          "frf juj frf juj",
          "rrr uuu ru ru ur",
          "fr ju rf uj fur",
          "rule sure real rush",
          "ride dark fire user",
          "her hair; a sure rule",
          "she used a ruler; he is here",
        ],
      },
      {
        title: "T and Y",
        keys: "t y",
        tip: "Index fingers stretch up and inward: F to T, J to Y. These are long reaches, so keep them slow.",
        lines: [
          "ftf jyj ftf jyj",
          "ttt yyy ty ty yt",
          "ft jy tf yj try",
          "the they that this",
          "stay year try yet",
          "date left right fast",
          "they are here; this is easy",
          "she starts early; he stays late",
        ],
      },
      {
        title: "W and O",
        keys: "w o",
        tip: "Ring fingers reach up: S to W, L to O.",
        lines: [
          "sws lol sws lol",
          "www ooo wo wo ow",
          "sw lo ws ol two",
          "work word world would",
          "who what where how",
          "we saw the show; they will go",
          "the work is good; we are ready",
        ],
      },
      {
        title: "Q and P",
        keys: "q p",
        tip: "Little fingers reach up: A to Q, ; to P. Q is almost always followed by U.",
        lines: [
          "aqa ;p; aqa ;p;",
          "qqq ppp qp qp pq",
          "aq ;p qa p; quip",
          "quit quite quiet quote",
          "paper people page post",
          "please keep quiet at the top",
          "prepare the report with full effort",
        ],
      },
      {
        title: "Top row words",
        tip: "No new keys. You now know two full rows, enough for hundreds of real words.",
        lines: [
          "the people work together",
          "we were there last year",
          "your typed page is ready",
          "wait for the right word",
          "they wrote a short report",
          "try a little harder today",
        ],
      },
    ],
  },
  {
    title: "Bottom row",
    blurb: "Reach down to finish the alphabet.",
    lessons: [
      {
        title: "V and M",
        keys: "v m",
        tip: "Index fingers reach down: F to V, J to M.",
        lines: [
          "fvf jmj fvf jmj",
          "vvv mmm vm vm mv",
          "fv jm vf mj move",
          "have give live love",
          "more time some make",
          "my marks may improve",
          "we have to move with time",
        ],
      },
      {
        title: "C and comma",
        keys: "c ,",
        tip: "Middle fingers reach down: D to C, K to the comma. Type one space after a comma.",
        lines: [
          "dcd k,k dcd k,k",
          "ccc ,,, c, c, ,c",
          "dc k, cd ,k cost",
          "could come call care",
          "clerk, office, court, police",
          "check each word, type it right",
          "accuracy comes first, speed comes later",
        ],
      },
      {
        title: "X and full stop",
        keys: "x .",
        tip: "Ring fingers reach down: S to X, L to the full stop. Type one space after a full stop.",
        lines: [
          "sxs l.l sxs l.l",
          "xxx ... x. x. .x",
          "sx l. xs .l six",
          "exam text extra relax",
          "fix it. mix it. tax it.",
          "the exam is this week.",
          "relax. take the test. you will do well.",
        ],
      },
      {
        title: "Z and slash",
        keys: "z /",
        tip: "Little fingers reach down: A to Z, ; to the slash.",
        lines: [
          "aza ;/; aza ;/;",
          "zzz /// z/ z/ /z",
          "az ;/ za /; zip",
          "zero size quiz lazy",
          "he/she his/her day/week",
          "the prize was a silver cup.",
          "seize the day; a quiz is easy.",
        ],
      },
      {
        title: "B and N",
        keys: "b n",
        tip: "Index fingers reach down and inward: F to B, J to N. That completes the alphabet.",
        lines: [
          "fbf jnj fbf jnj",
          "bbb nnn bn bn nb",
          "fb jn bf nj ban",
          "been both best begin",
          "not now new never number",
          "nobody can beat a calm mind.",
          "begin now, and be better by next week.",
        ],
      },
      {
        title: "All 26 letters",
        tip: "No new keys. These lines use every letter of the alphabet.",
        lines: [
          "the quick brown fox jumps over the lazy dog.",
          "pack my box with five dozen jugs.",
          "a clerk types every file with care.",
          "public offices need exact records.",
          "just keep moving; speed will come.",
          "we practise daily, so we improve quickly.",
        ],
      },
    ],
  },
  {
    title: "Capitals and punctuation",
    blurb: "Shift, and the marks exams use.",
    lessons: [
      {
        title: "Capital letters",
        tip: "Hold Shift with the little finger of the other hand, tap the letter, then release. Left-hand letter: right Shift. Right-hand letter: left Shift.",
        marks: ["ShiftLeft", "ShiftRight"],
        lines: [
          "fF jJ dD kK sS lL",
          "Aa Ss Dd Ff Jj Kk Ll",
          "India Delhi Patna Agra",
          "Monday Friday March June",
          "Ravi and Sita live in Kanpur.",
          "The Ganga flows through Uttar Pradesh.",
          "Staff Selection Commission",
        ],
      },
      {
        title: "Question mark, colon and quotes",
        keys: "? : ' \" -",
        tip: "The question mark, colon and double quote need Shift. The apostrophe and hyphen do not.",
        lines: [
          ";:; /?/ ;'; ;-;",
          "who? what? when? where?",
          "note: read the passage first.",
          "it's fine; don't stop.",
          'he said, "type with care."',
          "a well-known, time-bound plan",
          "Is this your seat? Yes, it is.",
        ],
      },
      {
        title: "Full sentences",
        tip: "No new keys. Type complete sentences with capitals and punctuation, exactly as an exam passage has them.",
        lines: [
          "The test starts at ten in the morning.",
          "Please carry your admit card and a photo.",
          "Do not look at the keyboard while typing.",
          "Accuracy first; speed follows practice.",
          "Every candidate gets the same passage.",
          "Stay calm, breathe slowly and begin.",
        ],
      },
    ],
  },
  {
    title: "Numbers",
    blurb: "The top row of digits.",
    lessons: [
      {
        title: "Numbers 1 to 5",
        keys: "1 2 3 4 5",
        tip: "The left hand reaches up to the number row: little finger 1, ring 2, middle 3, index 4 and 5. Return to the home row after each number.",
        lines: [
          "a1a s2s d3d f4f f5f",
          "111 222 333 444 555",
          "12 23 34 45 51 15",
          "1 file, 2 pens, 3 forms",
          "Room 12, Seat 45, Gate 3",
          "On 15 May, 34 candidates sat in Hall 2.",
        ],
      },
      {
        title: "Numbers 6 to 0",
        keys: "6 7 8 9 0",
        tip: "Right hand: index finger 6 and 7, middle 8, ring 9, little finger 0.",
        lines: [
          "j6j j7j k8k l9l ;0;",
          "666 777 888 999 000",
          "67 78 89 90 06 60",
          "10 minutes, 35 words, 2000 keys",
          "Call 1800 on 26 January 2026.",
          "Roll number 4071, Centre 286, Seat 59.",
        ],
      },
    ],
  },
  {
    title: "Real typing",
    blurb: "From words to a full passage.",
    lessons: [
      {
        title: "Most common words",
        tip: "These short words make up about half of any English passage. Type them until they feel automatic.",
        lines: [
          "the of and to in is that for it as",
          "was with be by on not he this are or",
          "his from at which but have an had they you",
          "were their one all we can her has there been",
          "if more when will would who so no out up",
          "said what its about than into them only other time",
        ],
      },
      {
        title: "Office and exam words",
        tip: "Exam passages are full of official vocabulary. Longer words need a steady rhythm, not a faster one.",
        lines: [
          "office record report letter notice order",
          "government department ministry commission board",
          "candidate examination result selection merit",
          "application certificate document signature",
          "The department issued a notice on Monday.",
          "Each candidate must sign the attendance sheet.",
        ],
      },
      {
        title: "Your first paragraph",
        tip: "The last lesson. Type these lines as one passage. After this, you are ready for timed tests.",
        lines: [
          "A typing test checks speed and accuracy.",
          "Keep your eyes on the passage, not on the keys.",
          "If you make a mistake, stay calm and move ahead.",
          "Daily practice makes common words flow without effort.",
          "Trust your training on the day of the exam.",
          "You are now ready for the live test.",
        ],
      },
    ],
  },
];

/* ---------- Hindi course (Inscript layout, as used with Mangal) ---------- */

const HINDI: StageDraft[] = [
  {
    title: "Home row",
    blurb: "Common consonants and matras.",
    lessons: [
      {
        title: "र, क, त and Space",
        keys: "र क त Space",
        tip: "Inscript puts common consonants under your right hand: J types र, K types क and L types त. Rest your fingers on A S D F and J K L ; exactly as for English.",
        checklist: POSTURE,
        lines: ["ररर ककक ततत ररर", "रक रक कत कत तर", "कर कर तक तक तर", "कर तक तर रत कतर", "तर कर तक कतर कर"],
      },
      {
        title: "ि and े",
        keys: "ि े",
        tip: "Matras sit under your left hand. Always type the consonant first and the matra after it, even for ि, which is drawn on the left.",
        lines: ["कि कि के के ति ते", "रि रे कि के ति ते", "कि के रेत केक तेरे", "करे करते तेरे केक", "रेत के केक कि तेरे"],
      },
      {
        title: "ो, ु and ्",
        keys: "ो ु ्",
        tip: "A types ो and G types ु. D types the halant ्, which joins two consonants: क + ् + र makes क्र.",
        lines: ["को को कु कु तो तु", "रो रु को कु तो तु", "रोक रुक तुक कोर", "क्र त्र क्त क्र त्र", "रुको रोको करो तो", "कुत्ते को रोको"],
      },
      {
        title: "प, च and ट",
        keys: "प च ट",
        tip: "The right index finger stretches from J to H for प. The little finger types च on ; and reaches one key to the right for ट.",
        lines: ["रपर रपर चटच चटच", "पर चर पट चट टप", "पेट चोट टिकट कपट", "पुत्र चित्र पत्र", "चुप रुको टिकट चेक करो", "पेट पर चोट"],
      },
      {
        title: "Home row words",
        tip: "No new keys. Real Hindi words from the home row alone.",
        lines: ["कर तक पर चुप रुक", "पेट चोट टिकट केक", "पुत्र को पत्र", "चित्र पर चित्र", "रेत पर कुत्ते रुके", "टिकट चेक करके रुको"],
      },
    ],
  },
  {
    title: "Top row",
    blurb: "Long matras and more consonants.",
    lessons: [
      {
        title: "ा and ी",
        keys: "ा ी",
        tip: "The left middle finger reaches up to E for ा. The left index finger reaches up to R for ी.",
        lines: ["का की ता ती रा री", "पा पी चा ची टा टी", "कार तार चार पार", "काकी चाची पिता पापा", "तीर टीका रीत कीट", "पिता की कार पर पत्ते"],
      },
      {
        title: "ह and ग",
        keys: "ह ग",
        tip: "The right index finger reaches up to U for ह. The right middle finger reaches up to I for ग.",
        lines: ["रहर रहर कगक कगक", "हर हक गत गीत हार", "गाता गाती रहा रही", "कहा कही राग पग", "गति हित गिरा गहरा", "हर गीत की गति"],
      },
      {
        title: "ब, द and ज",
        keys: "ब द ज",
        tip: "Right hand, top row: Y types ब, O types द and P types ज.",
        lines: ["रबर रबर तदत चजच", "बात दर जब बाद", "दादा बाजार जीत दीप", "बीज काज राज पद", "जाति जगत बाकी बीता", "दादा जी की बात", "जब तक जीत की बात हो"],
      },
      {
        title: "ू, ै, ौ and ड",
        keys: "ू ै ौ ड",
        tip: "Left hand, top row: T types ू, W types ै and Q types ौ. The right little finger reaches to [ for ड.",
        lines: ["कू कै कौ दू दै दौ", "दूर रूप कूद जूता", "पैर बैर तैर कैद है", "दौर गौर चौक दौरा", "डर डाक डाकू डूब", "पिता जी दूर है", "डाक पर टिकट है"],
      },
    ],
  },
  {
    title: "Bottom row",
    blurb: "The rest of the base layer.",
    lessons: [
      {
        title: "म and न",
        keys: "म न",
        tip: "The left hand reaches down: C types म and V types न.",
        lines: ["ममम ननन मन नम", "मन नाम काम मान", "नमक मकान कमर जन", "दिन नीम पानी रानी", "मेरा नाम राम है", "नानी ने कहानी कही", "पानी कम है"],
      },
      {
        title: "ल and स",
        keys: "ल स",
        tip: "The right index finger reaches down: N types ल and M types स.",
        lines: ["ललल ससस लस सल", "कल सब लाल साल", "सरल लगन सात बस", "दस सच बल जल", "सीमा लीला साहस सागर", "सच की जीत होती है", "सरल काम पहले करो"],
      },
      {
        title: "व, य and ं",
        keys: "व य ं",
        tip: "B types व, the slash key types य, and X types the anusvara ं, which you type after the letter it sits on.",
        lines: ["ववव ययय वय यव", "वन यह वह नया", "हवा दया यार वार", "रंग संग मंच बंद", "हंस संत गंगा कंबल", "यह मेरा मकान है", "सब लोग यहां नहीं हैं"],
      },
      {
        title: "Base layer words",
        keys: ",",
        tip: "No new letters, only the comma. Everything here is typed without Shift.",
        lines: [
          "राम, मोहन, सीता",
          "दिन, रात, सुबह",
          "मेरा नाम मोहन है",
          "हम सब बाजार जा रहे हैं",
          "यह काम सरल नहीं है",
          "मन लगाकर काम करो",
          "समय पर काम पूरा करो",
        ],
      },
    ],
  },
  {
    title: "Shift layer",
    blurb: "Vowels, aspirated letters and marks.",
    lessons: [
      {
        title: "अ, आ, इ and ई",
        keys: "अ आ इ ई",
        tip: "Vowels are on the same keys as their matras, with Shift. Hold right Shift with your right little finger, then tap the key with your left hand.",
        lines: ["अ आ इ ई अ आ इ ई", "अब आम इस ईद", "आज आप आना आराम", "अगर अपना अंदर अलग", "इतना इसी इनाम इलाज", "आज आप आराम करो", "अब इस काम को पूरा करो"],
      },
      {
        title: "उ, ऊ, ए, ऐ, ओ and औ",
        keys: "उ ऊ ए ऐ ओ औ",
        tip: "The remaining vowels, again with right Shift: G for उ, T for ऊ, S for ए, W for ऐ, A for ओ and Q for औ.",
        lines: ["उ ऊ ए ऐ ओ औ", "उस उन ऊपर ऊन", "एक एकता ऐसा ऐनक", "ओर ओस और औरत", "आओ जाओ लाओ गए", "एक और एक दो होते हैं", "राम और सीता आए"],
      },
      {
        title: "ख, थ, छ, ठ and फ",
        keys: "ख थ छ ठ फ",
        tip: "Aspirated letters share a key with their plain form. These are under the right hand, so hold left Shift with your left little finger.",
        lines: ["ख थ छ ठ फ ख थ छ", "खत थक छत ठग फल", "खाना साथ हाथ छाता", "ठीक फिर कथा रथ", "सफल पीठ मछली लिखो", "हाथ से साफ लिखो", "छत पर मत खेलो"],
      },
      {
        title: "भ, घ, ध, झ and ढ",
        keys: "भ घ ध झ ढ",
        tip: "More Shift letters on the top row, right hand: Y for भ, I for घ, O for ध, P for झ and [ for ढ.",
        lines: ["भ घ ध झ ढ भ घ ध", "भर घर धन झट ढक", "भारत घास धागा झील", "ढाल सभा आधा बाघ", "समझ धीरे भाई घंटा", "भारत हमारा घर है", "घर में सब भाई हैं"],
      },
      {
        title: "श, ष, ण, ँ, ः and ।",
        keys: "श ष ण ँ ः ।",
        tip: "Shift + M types श, Shift + comma types ष and Shift + C types ण. Shift + X is the chandrabindu ँ, Shift + hyphen is the visarga ः, and Shift + full stop is the danda ।.",
        lines: [
          "श ष ण श ष ण",
          "शक शाम देश वेश",
          "भाषा विशेष दोष वर्ष",
          "कण गुण कारण गणना",
          "माँ चाँद हँस गाँव",
          "अतः दुःख नहीं करना।",
          "यह मेरा देश है।",
          "माँ ने कहा, शाम को आना।",
        ],
      },
      {
        title: "ृ, ़, ॉ and half letters",
        keys: "ृ ़ ॉ ऑ",
        tip: "The = key types ृ. The ] key types the nukta ़, which comes right after its letter: ड + ़ makes ड़. The \\ key types ॉ, and with Shift, ऑ. For a half letter, type the letter, then ्, then the next letter.",
        lines: [
          "कृ गृ दृ पृ मृ",
          "कृपा गृह दृढ़ कृषि",
          "बड़ा पढ़ना लड़का पेड़",
          "डॉक्टर कॉलेज ऑफिस",
          "क्या प्यार अच्छा सत्य",
          "शब्द मुख्य स्थान व्यक्ति",
          "हिन्दी पक्का बच्चा स्कूल",
          "लड़का स्कूल में पढ़ता है।",
        ],
      },
      {
        title: "Shortcuts for क्ष, त्र, ज्ञ and श्र",
        keys: "क्ष त्र ज्ञ श्र",
        combos: true,
        tip: "Four common conjuncts have their own keys on the number row: Shift + 7 for क्ष, Shift + 6 for त्र, Shift + 5 for ज्ञ and Shift + 8 for श्र. Typing them letter by letter also works.",
        lines: [
          "क्ष त्र ज्ञ श्र क्ष त्र",
          "क्षमा कक्षा शिक्षा रक्षा",
          "पत्र मित्र चित्र छात्र",
          "ज्ञान विज्ञान आज्ञा",
          "श्री श्रम श्रेणी विश्राम",
          "छात्र कक्षा में शिक्षा लेते हैं।",
          "मित्र को पत्र लिखो।",
        ],
      },
    ],
  },
  {
    title: "Real typing",
    blurb: "From words to a full passage.",
    lessons: [
      {
        title: "Most common words",
        combos: true,
        tip: "These short words appear in almost every Hindi sentence. Type them until they feel automatic.",
        lines: [
          "और का की के में है हैं से को पर",
          "यह वह एक नहीं भी तो ही था थे थी",
          "कर रहा गया लिए अपने कुछ साथ बाद",
          "होता होती सकता सकते करना करने वाले",
          "जब तक अब तब कब कहाँ यहाँ वहाँ",
          "लेकिन क्योंकि इसलिए अगर ताकि",
        ],
      },
      {
        title: "Office and exam words",
        combos: true,
        tip: "Exam passages use official vocabulary with many conjuncts. Keep a steady rhythm through the long words.",
        lines: [
          "कार्यालय विभाग आदेश सूचना पत्र",
          "सरकार आयोग परीक्षा परिणाम चयन",
          "उम्मीदवार आवेदन प्रमाण पत्र हस्ताक्षर",
          "निर्धारित समय में अनुच्छेद टाइप करें।",
          "विभाग ने सोमवार को आदेश जारी किया।",
          "सभी उम्मीदवार समय पर उपस्थित हों।",
        ],
      },
      {
        title: "Your first paragraph",
        combos: true,
        tip: "The last lesson. Type these lines as one passage. After this, you are ready for timed tests.",
        lines: [
          "टंकण परीक्षा में गति और शुद्धता दोनों देखी जाती हैं।",
          "नजर स्क्रीन पर रखें, कीबोर्ड पर नहीं।",
          "गलती हो जाए तो घबराएँ नहीं, आगे बढ़ें।",
          "प्रतिदिन का अभ्यास उंगलियों को तेज बनाता है।",
          "परीक्षा के दिन अपने अभ्यास पर भरोसा रखें।",
          "अब आप लाइव टेस्ट के लिए तैयार हैं।",
        ],
      },
    ],
  },
];

export const COURSES: Record<Lang, Stage[]> = { english: build("en", ENGLISH), hindi: build("hi", HINDI) };

const FLAT: Record<Lang, Lesson[]> = {
  english: COURSES.english.flatMap((s) => s.lessons),
  hindi: COURSES.hindi.flatMap((s) => s.lessons),
};

export const lessonsFor = (lang: Lang): Lesson[] => FLAT[lang];
export const COURSE_LENGTH: Record<Lang, number> = { english: FLAT.english.length, hindi: FLAT.hindi.length };
export const LESSON_TOTAL = FLAT.english.length + FLAT.hindi.length;

/** First lesson that has not been passed yet (or the last one when the course is finished). */
export function nextLesson(lang: Lang, done: Record<string, unknown>): Lesson {
  const all = FLAT[lang];
  return all.find((l) => !done[l.id]) ?? all[all.length - 1];
}

/** A mixed practice set built only from lessons the learner has already passed. */
export function buildReview(lang: Lang, doneIds: string[]): Lesson | null {
  const passed = FLAT[lang].filter((l) => doneIds.includes(l.id));
  if (!passed.length) return null;
  const pool = Array.from(new Set(passed.flatMap((l) => l.lines.slice(2))));
  const lines: string[] = [];
  while (lines.length < 6 && pool.length) lines.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return {
    id: "review",
    n: 0,
    stage: "Review",
    title: "Keys you have learned",
    keys: [],
    tip: `A mixed set of lines from the ${passed.length} ${passed.length === 1 ? "lesson" : "lessons"} you have passed. Nothing new, so aim for clean, even typing.`,
    lines,
    combos: passed.some((l) => l.combos),
  };
}
