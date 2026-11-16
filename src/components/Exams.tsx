import { useState } from "react";
import { ArrowRight, ArrowUpRight, Plus } from "lucide-react";
import { CATEGORY_LABEL, CHECKED_ON, EXAMS, type Exam, type ExamCategory } from "../data/exams";
import { Reveal, SectionHeading, SpotCard } from "./ui";
import { cn } from "../utils/cn";

type Filter = "all" | Exclude<ExamCategory, "custom">;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All exams" },
  { id: "ssc", label: "SSC" },
  { id: "state", label: "State" },
  { id: "central", label: "Railway & Central" },
  { id: "forces", label: "Police & Forces" },
  { id: "court", label: "Courts" },
];

function Metric({ label, value, unit, muted }: { label: string; value: string; unit?: string; muted?: boolean }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
      <dt className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-fog-500">{label}</dt>
      <dd
        className={cn(
          "mt-1 font-display font-semibold tabular-nums tracking-[-0.02em]",
          muted ? "text-sm text-fog-400" : "text-xl text-fog-100",
        )}
      >
        {value}
        {unit && <span className="ml-1 font-sans text-[11px] font-medium tracking-normal text-fog-400">{unit}</span>}
      </dd>
    </div>
  );
}

function ExamCard({ exam, onPlan }: { exam: Exam; onPlan: (id: string) => void }) {
  const badges = [
    exam.bothLanguages && "Hindi + English both",
    exam.noBackspace && "No Backspace",
    exam.scoring === "dp-hcm" && "Scored out of 25",
    exam.derived && "Derived from marks",
  ].filter(Boolean) as string[];

  return (
    <SpotCard className="glass group flex h-full flex-col rounded-3xl p-6 transition-all duration-500 hover:-translate-y-1.5 hover:border-white/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-fog-100">{exam.name}</h3>
          <p className="mt-1 text-sm text-fog-400">{exam.post}</p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-fog-400">
          {CATEGORY_LABEL[exam.category]}
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-2">
        {exam.kdph ? (
          <>
            <Metric label="Speed" value={exam.kdph.toLocaleString("en-IN")} unit="KDPH" />
            <Metric label="Roughly" value={`${exam.english}`} unit="WPM" />
          </>
        ) : (
          <>
            <Metric label="English" value={String(exam.english)} unit="WPM" />
            {exam.hindi != null ? (
              <Metric label="Hindi" value={String(exam.hindi)} unit="WPM" />
            ) : (
              <Metric label="Hindi" value="No test" muted />
            )}
          </>
        )}
        {exam.testMinutes ? (
          <Metric label="Time" value={String(exam.testMinutes)} unit="min" />
        ) : (
          <Metric label="Time" value="As notified" muted />
        )}
      </dl>

      {badges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {badges.map((b) => (
            <span
              key={b}
              className="rounded-full border border-saffron-400/25 bg-saffron-400/[0.07] px-2.5 py-1 text-[11px] font-medium text-saffron-200"
            >
              {b}
            </span>
          ))}
        </div>
      )}

      <ul className="mt-4 flex-1 space-y-2 text-sm leading-relaxed text-fog-400">
        {exam.rules.map((r) => (
          <li key={r} className="flex gap-2.5">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-saffron-400/70" aria-hidden="true" />
            <span>{r}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-white/[0.06] pt-3">
        <button
          type="button"
          onClick={() => onPlan(exam.id)}
          className="inline-flex min-h-11 items-center gap-2 rounded-full text-sm font-semibold text-saffron-300 transition-colors hover:text-saffron-200"
        >
          Plan for this exam
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
        </button>
        {exam.site && (
          <a
            href={exam.site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1 rounded text-xs text-fog-400 transition-colors hover:text-fog-100"
          >
            {exam.site.label}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">(official website, opens in a new tab)</span>
          </a>
        )}
      </div>
      {exam.ref && (
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-fog-500">Source: {exam.ref}</p>
      )}
    </SpotCard>
  );
}

export function Exams({ onPlan }: { onPlan: (id: string) => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [showAll, setShowAll] = useState(false);
  const list = filter === "all" ? EXAMS : EXAMS.filter((e) => e.category === filter);

  return (
    <section id="exams" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Exams covered"
          title={
            <>
              Every board has its own <span className="whitespace-nowrap">cut-off</span>. We train you for yours.
            </>
          }
        >
          Speed, time, language and even the Backspace rule change from one notice to the next. Each card below is
          checked against the official notice and links to the board's website.
        </SectionHeading>

        <Reveal delay={100}>
          <div
            role="group"
            aria-label="Filter exams by category"
            className="mx-auto mt-10 flex max-w-full flex-wrap justify-center gap-2"
          >
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "h-10 rounded-full border px-4 text-sm font-medium transition-all duration-300",
                  filter === f.id
                    ? "border-saffron-400/60 bg-saffron-400/15 text-saffron-200"
                    : "border-white/10 bg-white/[0.03] text-fog-400 hover:border-white/25 hover:text-fog-100",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </Reveal>

        <ul key={filter} className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {list.map((exam, i) => (
            <li key={exam.id} className={cn(!showAll && i >= 4 && "hidden sm:block")}>
              <Reveal delay={Math.min(i, 5) * 70} className="h-full">
                <ExamCard exam={exam} onPlan={onPlan} />
              </Reveal>
            </li>
          ))}
          <li className={cn(!showAll && list.length > 4 && "hidden sm:block")}>
            <Reveal delay={Math.min(list.length, 5) * 70} className="h-full">
              <div className="flex h-full min-h-[16rem] flex-col justify-between rounded-3xl border border-dashed border-white/15 bg-white/[0.015] p-6 transition-colors duration-500 hover:border-saffron-400/50">
                <div>
                  <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-saffron-300">
                    <Plus className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 font-display text-xl font-semibold tracking-[-0.02em] text-fog-100">
                    Don't see your exam?
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-fog-400">
                    Other high courts, BSSC, JSSC, state secretariats and more. Set the speed from your notification
                    and get the same day-by-day plan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onPlan("custom")}
                  className="btn btn-ghost mt-6 h-11 self-start px-5 text-sm"
                >
                  Set a custom goal
                  <ArrowRight className="nudge h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </Reveal>
          </li>
        </ul>

        {!showAll && list.length > 4 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="btn btn-ghost mt-4 h-12 w-full text-[15px] sm:hidden"
          >
            Show all {list.length} exams
          </button>
        )}

        <Reveal>
          <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-fog-500">
            Checked against official notices and published test instructions in {CHECKED_ON}. Rules can change
            between recruitment cycles, so confirm them in your latest notification before the test.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
