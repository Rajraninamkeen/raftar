import { useState } from "react";
import { Plus } from "lucide-react";
import { CHECKED_ON } from "../data/exams";
import { Reveal, SectionHeading } from "./ui";
import { cn } from "../utils/cn";

const FAQS = [
  {
    q: "I have never typed before. Where do I start?",
    a: "Start with Learn. It is a complete course: 26 English lessons and 23 Hindi (Inscript) lessons, from the home row to full paragraphs. Each lesson adds one or two keys, shows which finger to use on an on-screen keyboard, and only moves forward when you press the right key. Pass a lesson with 85% accuracy to unlock your stars. If you set your speed to zero in the plan builder, your first days are scheduled as these lessons.",
  },
  {
    q: "Can I really get exam-ready in 5 or 10 days?",
    a: "It depends on the gap between your current speed and the cut-off. The plan builder is upfront about this: it rates every plan as comfortable, achievable, ambitious or very steep, and suggests a safer number of days when the gap is large. Short plans work best when you already type and need to lift speed and accuracy by a few words per minute.",
  },
  {
    q: "Where do the exam speeds come from?",
    a: `From official notices and published test instructions, checked in ${CHECKED_ON}. Every exam card names its source and links to the board's official website. Rules can change between recruitment cycles, so always confirm the requirement in your latest notification.`,
  },
  {
    q: "How does Hindi typing work here?",
    a: "Three ways. The Learn course teaches Inscript key by key. In the live test, built-in Inscript turns your English keyboard into the standard Inscript layout, so nothing needs installing. Or switch to your own Hindi keyboard in your computer settings, such as Remington GAIL or Inscript, and type normally. The text is Unicode, like Mangal. Legacy fonts such as Kruti Dev and DevLys are not shown, but Remington GAIL follows the same Remington key positions.",
  },
  {
    q: "Is it free? Do I need an account?",
    a: "Yes, it is free, and there is no account. Your plan, test history and weak-key data are saved in this browser's local storage and never leave your device. Clearing browser data deletes them, so use Export CSV in Your progress to keep a copy.",
  },
  {
    q: "What happens if I miss a day?",
    a: "The tracker follows calendar days from your start date and keeps unfinished tasks visible, so you can open any earlier day and catch up. If you fall far behind, reset and start a new plan with the days you have left.",
  },
  {
    q: "Can I practise on my phone?",
    a: "Typing tests are taken on a physical keyboard, so that is how you should train. A laptop or desktop is ideal. You can connect a keyboard to a phone or tablet, but a computer is closest to the real test.",
  },
  {
    q: "How is typing speed calculated?",
    a: "One word is five characters, including spaces. Net WPM counts only correct characters, while gross WPM counts everything you typed. KDPH is key depressions per hour, so 35 WPM equals 10,500 KDPH. Where an exam publishes its own rules, such as RRB NTPC deductions or Delhi Police HCM marks, your result also shows an exam-style estimate.",
  },
  {
    q: "Is Raftaar connected to SSC or any government body?",
    a: "No. Raftaar is an independent practice tool. Exam names are used only to describe the test patterns it helps you prepare for.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading eyebrow="FAQ" title="Questions, answered straight." align="left">
            Still unsure? Build a plan and take a one-minute test. Both are free and take under two minutes.
          </SectionHeading>
          <Reveal delay={120}>
            <a href="#planner" className="btn btn-ghost mt-8 h-12 px-6 text-[15px]">
              Open the plan builder
            </a>
          </Reveal>
        </div>

        <div className="space-y-3">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={item.q} delay={Math.min(i, 4) * 60}>
                <div
                  className={cn(
                    "rounded-3xl border transition-colors duration-500",
                    isOpen ? "border-white/15 bg-white/[0.05]" : "border-white/[0.08] bg-white/[0.02] hover:border-white/15",
                  )}
                >
                  <h3>
                    <button
                      type="button"
                      id={`faq-q-${i}`}
                      aria-expanded={isOpen}
                      aria-controls={`faq-a-${i}`}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="flex w-full items-center justify-between gap-5 rounded-3xl px-5 py-5 text-left sm:px-7 sm:py-6"
                    >
                      <span className="font-display text-lg font-medium tracking-[-0.01em] text-fog-100 sm:text-xl">
                        {item.q}
                      </span>
                      <span
                        className={cn(
                          "grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-all duration-500",
                          isOpen
                            ? "rotate-45 border-saffron-400/50 bg-saffron-400/15 text-saffron-300"
                            : "border-white/10 text-fog-300",
                        )}
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </button>
                  </h3>
                  <div
                    id={`faq-a-${i}`}
                    role="region"
                    aria-labelledby={`faq-q-${i}`}
                    className={cn(
                      "grid transition-[grid-template-rows,visibility] duration-500 ease-out",
                      isOpen ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]",
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-6 text-[15px] leading-relaxed text-fog-300 sm:px-7 sm:pb-7 sm:pr-20">{item.a}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
