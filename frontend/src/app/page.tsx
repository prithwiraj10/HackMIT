import Image from "next/image";
import Link from "next/link";
import { Fraunces } from "next/font/google";
import { ArrowRight, Activity } from "lucide-react";
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
        <span className="landing-brand">
          <span className="landing-mark">
            <Activity size={19} strokeWidth={2.6} />
          </span>
          <span>
            Freshman<em>Flu</em>
          </span>
        </span>
        <div className="landing-switch">
          <a href="#students">Students</a>
          <a href="#admin">Admin</a>
        </div>
      </nav>

      <header className="landing-hero">
        <div className="hero-copy">
          <h1>Outrun the outbreak</h1>
          <p>
            Twenty-one days of simulated flu across 32 MIT buildings and 8,515
            students, so you can see it coming before it reaches you.
          </p>
          <div className="hero-actions">
            <a className="solid" href="#students">
              I&apos;m a student <ArrowRight size={17} />
            </a>
            <a className="ghost" href="#admin">
              I&apos;m an administrator
            </a>
          </div>
        </div>

        <div className="hero-cards">
          <figure className="card-back">
            <Image
              src="/landing/students.jpg"
              alt="Students crossing campus between classes"
              width={1024}
              height={1024}
            />
          </figure>
          <figure className="card-front">
            <Image
              src="/landing/hero.jpg"
              alt="MIT campus and the Charles River at sunset"
              width={1536}
              height={1024}
              priority
            />
          </figure>
        </div>
      </header>

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
