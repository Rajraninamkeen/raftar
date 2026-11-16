import { ArrowRight, ArrowUpRight, Play } from "lucide-react";
import { Logo, Reveal } from "./ui";

const DAY_OPTIONS = [5, 7, 10, 15, 30];

export function FinalCta({ onPickDays }: { onPickDays: (days: number | null) => void }) {
  return (
    <section aria-labelledby="cta-title" className="relative px-3 py-16 sm:px-5 sm:py-24">
      <Reveal>
        <div className="clip relative mx-auto max-w-7xl rounded-[2.5rem] border border-white/10 bg-ink-800 px-6 py-16 text-center sm:px-12 sm:py-24">
          <div aria-hidden="true" className="grid-bg absolute inset-0 opacity-70" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 left-1/2 h-[30rem] w-[52rem] -translate-x-1/2 animate-drift rounded-full bg-saffron-500/30 blur-[110px]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-52 left-1/4 h-[26rem] w-[36rem] animate-drift rounded-full bg-[#2b4bff]/25 blur-[110px]"
            style={{ animationDelay: "-9s" }}
          />

          <div className="relative">
            <h2
              id="cta-title"
              className="mx-auto max-w-4xl text-balance font-display text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-fog-100 sm:text-6xl lg:text-7xl"
            >
              Your exam date is fixed. <span className="text-gradient">Your plan should be too.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-fog-300">
              Free, with no signup. Pick the days you have left and your schedule is ready before your chai cools.
            </p>

            <div
              role="group"
              aria-label="Choose how many days you have"
              className="mx-auto mt-9 flex max-w-xl flex-wrap justify-center gap-2"
            >
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onPickDays(d)}
                  className="h-12 rounded-full border border-white/15 bg-white/[0.06] px-5 text-sm font-medium text-fog-100 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-saffron-400/60 hover:bg-saffron-400/15"
                >
                  <span className="font-display text-base font-semibold tabular-nums">{d}</span> days
                </button>
              ))}
            </div>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href="#planner" className="btn btn-primary h-14 w-full px-8 text-base sm:w-auto">
                Build my plan
                <ArrowRight className="nudge h-5 w-5" aria-hidden="true" />
              </a>
              <a href="#live-test" className="btn btn-ghost h-14 w-full px-8 text-base sm:w-auto">
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                Test my speed first
              </a>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

const PRODUCT_LINKS = [
  { href: "#exams", label: "Exams and rules" },
  { href: "#planner", label: "Plan builder" },
  { href: "#learn", label: "Lessons from zero" },
  { href: "#live-test", label: "Live typing test" },
  { href: "#progress", label: "Your progress" },
  { href: "#faq", label: "FAQ" },
];

const OFFICIAL_LINKS = [
  { href: "https://ssc.gov.in", label: "SSC" },
  { href: "https://upsssc.gov.in", label: "UPSSSC" },
  { href: "https://www.rrbapply.gov.in", label: "RRB apply portal" },
  { href: "https://dsssb.delhi.gov.in", label: "DSSSB" },
  { href: "https://kvsangathan.nic.in", label: "KVS" },
  { href: "https://www.epfindia.gov.in", label: "EPFO" },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.07]">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <a href="#top" aria-label="Raftaar, back to top" className="inline-block rounded-full">
              <Logo />
            </a>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-fog-400">
              Free typing training for competitive exams in India. You choose the days, Raftaar builds the schedule.
            </p>
            <p className="mt-4 font-hindi text-sm text-fog-400">आपका समय, आपका प्लान।</p>
          </div>

          <nav aria-label="Product">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-fog-500">Product</h2>
            <ul className="mt-5 space-y-3">
              {PRODUCT_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="rounded text-sm text-fog-300 transition-colors hover:text-saffron-300">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Official websites">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-fog-500">Official websites</h2>
            <ul className="mt-5 space-y-3">
              {OFFICIAL_LINKS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded text-sm text-fog-300 transition-colors hover:text-saffron-300"
                  >
                    {l.label}
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="hairline mt-12 h-px" aria-hidden="true" />

        <div className="mt-8 flex flex-col gap-4 text-xs leading-relaxed text-fog-500 md:flex-row md:items-start md:justify-between">
          <p>© {new Date().getFullYear()} Raftaar. Made in India for aspirants.</p>
          <p className="max-w-xl md:text-right">
            Raftaar is an independent practice tool and is not affiliated with SSC, UPSSSC, RRB or any government
            body. Always check your official notification for current requirements.
          </p>
        </div>
      </div>
    </footer>
  );
}
