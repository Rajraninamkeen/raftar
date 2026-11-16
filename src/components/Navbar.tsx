import { useEffect, useRef, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "./ui";
import { cn } from "../utils/cn";

const LINKS = [
  { href: "#exams", label: "Exams" },
  { href: "#planner", label: "Plan builder" },
  { href: "#learn", label: "Learn" },
  { href: "#live-test", label: "Live test" },
  { href: "#progress", label: "Progress" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  const barRef = useRef<HTMLDivElement>(null);

  // Glass state + scroll progress
  useEffect(() => {
    let raf = 0;
    const update = () => {
      const y = window.scrollY;
      setScrolled(y > 12);
      if (y < 320) setActive("");
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      }
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Scroll spy
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    LINKS.forEach((l) => {
      const el = document.getElementById(l.href.slice(1));
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  // Close the mobile menu on Escape or when the viewport grows
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onResize = () => window.innerWidth >= 1024 && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
      <div
        ref={barRef}
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-linear-to-r from-saffron-200 via-saffron-400 to-saffron-600"
      />

      <nav
        aria-label="Primary"
        className={cn(
          "mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full border pl-4 pr-2 transition-all duration-500",
          scrolled || open
            ? "border-white/10 bg-ink-900/75 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl backdrop-saturate-150"
            : "border-transparent bg-transparent",
        )}
      >
        <a href="#top" aria-label="Raftaar home" className="rounded-full" onClick={() => setOpen(false)}>
          <Logo />
        </a>

        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => {
            const isActive = active === l.href.slice(1);
            return (
              <li key={l.href}>
                <a
                  href={l.href}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-300",
                    isActive ? "bg-white/[0.07] text-fog-100" : "text-fog-400 hover:text-fog-100",
                  )}
                >
                  {l.label}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <a href="#planner" className="btn btn-primary hidden h-10 px-4 text-sm min-[380px]:inline-flex sm:px-5">
            Build my plan
            <ArrowRight className="nudge h-4 w-4" aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-fog-100 transition-colors hover:bg-white/10 lg:hidden"
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      <div
        id="mobile-menu"
        className={cn(
          "mx-auto mt-2 max-w-6xl origin-top rounded-3xl border border-white/10 bg-ink-900/90 p-3 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-all duration-300 lg:hidden",
          open ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-2 opacity-0",
        )}
      >
        <ul className="grid gap-1">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-base font-medium text-fog-200 transition-colors hover:bg-white/[0.06]"
              >
                {l.label}
                <ArrowRight className="h-4 w-4 text-fog-500" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
        <a href="#planner" onClick={() => setOpen(false)} className="btn btn-primary mt-2 h-12 w-full text-[15px]">
          Build my plan
          <ArrowRight className="nudge h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </header>
  );
}
