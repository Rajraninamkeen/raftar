import { useCallback, useEffect, useState } from "react";
import { getExam, type Lang } from "./data/exams";
import { DEFAULT_PLANNER, type PlannerState } from "./lib/plan";
import {
  EMPTY_COURSE,
  EMPTY_KEYS,
  isActivePlan,
  isCourse,
  isHistory,
  isKeyStats,
  isPlanner,
  mergeKeys,
  todayISO,
  useStoredState,
  type ActivePlan,
  type CourseProgress,
  type KeyDelta,
  type KeyStats,
  type LessonResult,
  type TestRecord,
} from "./lib/storage";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { Facts } from "./components/Facts";
import { Exams } from "./components/Exams";
import { Planner } from "./components/Planner";
import { Academy, type LearnRequest } from "./components/Academy";
import { TypingTest, type TestRequest } from "./components/TypingTest";
import { Dashboard } from "./components/Dashboard";
import { Features } from "./components/Features";
import { Benefits } from "./components/Benefits";
import { Faq } from "./components/Faq";
import { FinalCta, Footer } from "./components/Closing";
import { prefersReducedMotion } from "./components/ui";

function scrollToSection(id: string) {
  // Wait a frame so freshly rendered content is laid out before scrolling.
  requestAnimationFrame(() =>
    document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" }),
  );
}

export default function App() {
  const [planner, setPlanner] = useStoredState<PlannerState>("planner", DEFAULT_PLANNER, isPlanner);
  const [history, setHistory] = useStoredState<TestRecord[]>("history", [], isHistory);
  const [keyStats, setKeyStats] = useStoredState<KeyStats>("keys", EMPTY_KEYS, isKeyStats);
  const [activePlan, setActivePlan] = useStoredState<ActivePlan | null>("plan", null, isActivePlan);
  const [course, setCourse] = useStoredState<CourseProgress>("course", EMPTY_COURSE, isCourse);
  const [testExamId, setTestExamId] = useState(planner.examId);
  const [testRequest, setTestRequest] = useState<TestRequest | null>(null);
  const [learnRequest, setLearnRequest] = useState<LearnRequest | null>(null);

  // The live test follows the exam chosen in the plan builder.
  useEffect(() => {
    setTestExamId(planner.examId);
  }, [planner.examId]);

  const update = useCallback(
    (patch: Partial<PlannerState>) => {
      setPlanner((prev) => {
        const next = { ...prev, ...patch };
        const exam = getExam(next.examId);
        // Fall back to English when the chosen exam has no Hindi typing test.
        if (next.lang === "hindi" && exam.id !== "custom" && exam.hindi == null) next.lang = "english";
        return next;
      });
    },
    [setPlanner],
  );

  const pickDays = useCallback(
    (days: number | null) => {
      if (days != null) update({ days });
      scrollToSection("planner");
    },
    [update],
  );

  const planForExam = useCallback(
    (examId: string) => {
      update({ examId });
      scrollToSection("planner");
    },
    [update],
  );

  const applyMeasuredSpeed = useCallback(
    (wpm: number, lang: Lang) => {
      update({ current: Math.max(0, Math.min(70, Math.round(wpm))), lang });
      scrollToSection("planner");
    },
    [update],
  );

  const recordTest = useCallback(
    (rec: TestRecord, delta: KeyDelta) => {
      setHistory((prev) => [...prev, rec].slice(-300));
      setKeyStats((prev) => mergeKeys(prev, rec.lang, delta));
    },
    [setHistory, setKeyStats],
  );

  // Lessons feed the same weak-key data as tests, and keep the best result per lesson.
  const recordLessonKeys = useCallback(
    (lang: Lang, delta: KeyDelta) => setKeyStats((prev) => mergeKeys(prev, lang, delta)),
    [setKeyStats],
  );

  const completeLesson = useCallback(
    (lang: Lang, id: string, result: LessonResult) => {
      setCourse((prev) => {
        const old = prev[lang][id];
        const best = old && old.acc > result.acc ? { ...old, at: result.at } : result;
        return { ...prev, [lang]: { ...prev[lang], [id]: best } };
      });
    },
    [setCourse],
  );

  const startPlan = useCallback(() => {
    setActivePlan({ config: { ...planner }, startedOn: todayISO(), done: {} });
    scrollToSection("progress");
  }, [planner, setActivePlan]);

  const openTest = useCallback((req: Omit<TestRequest, "nonce">) => {
    if (req.examId) setTestExamId(req.examId);
    setTestRequest({ ...req, nonce: Date.now() });
    scrollToSection("live-test");
  }, []);

  const openLearn = useCallback((req: Omit<LearnRequest, "nonce">) => {
    setLearnRequest({ ...req, nonce: Date.now() });
    scrollToSection("learn");
  }, []);

  const clearAll = useCallback(() => {
    setHistory([]);
    setKeyStats(EMPTY_KEYS);
    setActivePlan(null);
    setCourse(EMPTY_COURSE);
  }, [setHistory, setKeyStats, setActivePlan, setCourse]);

  const testExam = getExam(testExamId);
  const targetForTest = useCallback(
    (lang: Lang): number | null =>
      testExam.id === "custom" ? planner.customTarget : lang === "hindi" ? testExam.hindi : testExam.english,
    [testExam, planner.customTarget],
  );

  return (
    <div className="clip-x relative">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <Hero onPickDays={pickDays} />
        <Facts />
        <Exams onPlan={planForExam} />
        <Planner state={planner} update={update} activePlan={activePlan} onStart={startPlan} />
        <Academy
          defaultLang={planner.lang}
          progress={course}
          request={learnRequest}
          onComplete={completeLesson}
          onKeys={recordLessonKeys}
        />
        <TypingTest
          exam={testExam}
          defaultLang={planner.lang}
          targetFor={targetForTest}
          request={testRequest}
          onExamChange={setTestExamId}
          onRecord={recordTest}
          onUseSpeed={applyMeasuredSpeed}
        />
        <Dashboard
          history={history}
          keyStats={keyStats}
          activePlan={activePlan}
          course={course}
          onUpdatePlan={setActivePlan}
          onOpenTest={openTest}
          onOpenLearn={openLearn}
          onClearAll={clearAll}
        />
        <Features keyStats={keyStats} />
        <Benefits />
        <Faq />
        <FinalCta onPickDays={pickDays} />
      </main>
      <Footer />
    </div>
  );
}
