import Link from "next/link";
import { Fraunces } from "next/font/google";
import { ArrowRight, Activity } from "lucide-react";
import { LandingHero } from "@/components/landing-hero";
import { ThemeToggle } from "@/components/theme-toggle";
import "./landing.css";

const display = Fraunces({
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz", "SOFT"],
  variable: "--font-display",
});

export default function Page() {
  return (
    <div className={`landing ${display.variable}`}>
      <nav className="landing-nav" aria-label="Choose an audience">
        <Link className="landing-brand" href="/" aria-label="Freshman Flu home">
          <span className="landing-mark">
            <Activity size={19} strokeWidth={2.6} />
          </span>
          <span>
            Freshman<em>Flu</em>
          </span>
        </Link>
        <div className="landing-switch">
          <a href="#students">Students</a>
          <a href="#admin">Admin</a>
          <ThemeToggle className="landing-theme" />
        </div>
      </nav>

      <LandingHero />

      <section className="landing-section students" id="students">
        <div className="section-copy">
          <h2>Know your campus before it knows you.</h2>
          <p>
            See how an outbreak moves through the places you actually spend your
            day — your dorm, your lecture hall, the dining hall you always end
            up in at 7pm.
          </p>
          <Link className="landing-cta" href="/students">
            Open the student view <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <section className="landing-section admin" id="admin">
        <div className="section-copy">
          <h2>Plan the response before the first case.</h2>
          <p>
            Model isolation policies, transmission rates and cross-campus mixing
            across all 32 locations, then compare the outcomes side by side.
          </p>
          <Link className="landing-cta" href="/admin">
            Open the admin view <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <span>
          Built at HackMIT 2026 · Illustrative model, not medical advice
        </span>
      </footer>
    </div>
  );
}
