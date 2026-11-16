import { CHECKED_ON, EXAMS } from "../data/exams";
import { LESSON_TOTAL } from "../data/lessons";
import { MAX_DAYS, MIN_DAYS } from "../lib/plan";
import { CountUp, Reveal } from "./ui";

const STATS = [
  { to: EXAMS.length, label: `exam typing rules, checked against official notices in ${CHECKED_ON}` },
  { to: LESSON_TOTAL, label: "step-by-step lessons from zero, in English and Hindi (Inscript)" },
  { to: MAX_DAYS, prefix: `${MIN_DAYS}–`, suffix: " days", label: "plan length. You choose it, Raftaar builds it" },
  { to: 0, prefix: "₹", label: "to use. No signup, no ads and no payment" },
];

function Row({ hidden }: { hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center gap-3 pr-3" aria-hidden={hidden || undefined}>
      {EXAMS.map((e) => (
        <li
          key={e.id}
          className="flex items-center gap-2.5 whitespace-nowrap rounded-full border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-fog-300"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-saffron-400/80" />
          {e.name}
        </li>
      ))}
    </ul>
  );
}

export function Facts() {
  return (
    <section aria-label="What Raftaar covers" className="relative py-14 sm:py-20">
      <div className="hairline absolute inset-x-0 top-0 h-px" aria-hidden="true" />

      <Reveal>
        <p className="px-5 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-fog-500">
          Typing rules built in for
        </p>
        <div className="marquee mt-6">
          <div className="marquee-track">
            <Row />
            <Row hidden />
          </div>
        </div>
      </Reveal>

      <div className="mx-auto mt-14 grid max-w-7xl grid-cols-2 gap-3 px-5 sm:px-8 lg:grid-cols-4 lg:gap-5">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 90}>
            <div className="glass h-full rounded-3xl p-5 sm:p-7">
              <p className="font-display text-3xl font-semibold tracking-[-0.03em] text-fog-100 sm:text-5xl">
                <CountUp to={s.to} prefix={s.prefix} suffix={s.suffix} />
              </p>
              <p className="mt-3 text-sm leading-relaxed text-fog-400">{s.label}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
