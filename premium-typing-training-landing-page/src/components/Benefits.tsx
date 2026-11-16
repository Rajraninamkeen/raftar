import { CalendarDays, Check, Gauge, Target, X } from "lucide-react";
import { Reveal, SectionHeading } from "./ui";

const WITHOUT = [
  "Practising whatever passage you happen to find",
  "No idea which keys are slowing you down",
  "Seeing the exam screen for the first time on exam day",
  "Speed goes up, accuracy falls apart",
];

const WITH = [
  "A fixed, time-boxed task list for every single day",
  "Weak keys found from your own tests, then drilled",
  "Exam-mode tests with the real length and rules",
  "An accuracy floor on every speed session",
];

const BENEFITS = [
  {
    icon: CalendarDays,
    title: "Built around your date",
    body: "Three days or sixty, the schedule compresses or stretches while keeping the same order: foundation, accuracy, speed, simulation.",
  },
  {
    icon: Gauge,
    title: "Honest about the gap",
    body: "If your target is too steep for the days you have, Raftaar says so and tells you how many days or minutes would make it realistic.",
  },
  {
    icon: Target,
    title: "Trained past the cut-off",
    body: "Plans aim a few words per minute above the requirement, so exam-day nerves do not cost you the result.",
  },
];

export function Benefits() {
  return (
    <section id="benefits" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading eyebrow="Why it works" title="Random practice gives random results.">
          Most aspirants lose the typing round to a missing plan, not a lack of effort. Structure is the difference.
        </SectionHeading>

        <div className="mt-14 grid gap-4 lg:grid-cols-2 lg:gap-5">
          <Reveal>
            <div className="h-full rounded-[2rem] border border-white/[0.07] bg-white/[0.015] p-6 sm:p-9">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fog-500">Without a plan</p>
              <ul className="mt-6 space-y-4">
                {WITHOUT.map((t) => (
                  <li key={t} className="flex items-start gap-4 text-fog-400">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/10 text-fog-500">
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="relative h-full overflow-hidden rounded-[2rem] border border-saffron-400/30 bg-linear-to-br from-saffron-500/[0.14] via-white/[0.03] to-transparent p-6 sm:p-9">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-saffron-500/25 blur-3xl"
              />
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-saffron-300">With Raftaar</p>
              <ul className="relative mt-6 space-y-4">
                {WITH.map((t) => (
                  <li key={t} className="flex items-start gap-4 text-fog-100">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-leaf-400 text-ink-950">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                    </span>
                    <span className="leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3 lg:gap-5">
          {BENEFITS.map((b, i) => (
            <Reveal key={b.title} delay={i * 100}>
              <div className="group h-full rounded-[2rem] border border-white/[0.07] bg-white/[0.02] p-6 transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.04] sm:p-8">
                <b.icon
                  className="h-6 w-6 text-saffron-300 transition-transform duration-500 group-hover:scale-110"
                  aria-hidden="true"
                />
                <h3 className="mt-5 font-display text-xl font-semibold tracking-[-0.02em] text-fog-100">{b.title}</h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-fog-400">{b.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
