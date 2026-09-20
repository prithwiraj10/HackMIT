import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Activity } from "lucide-react";
import "./landing.css";

const STATS = [
  { value: "32", label: "Campus locations" },
  { value: "8,515", label: "Students modeled" },
  { value: "21", label: "Days simulated" },
];

export default function Page() {
  return (
    <div className="landing">
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
          <Link href="/simulation">Simulation</Link>
        </div>
      </nav>

      <header className="landing-hero">
        <svg
          className="hero-trail"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M-40 210 C 180 120, 300 330, 520 300 S 900 120, 1180 220 1480 160 1480 160"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="12 12"
          />
          <path
            d="M-40 720 C 220 700, 300 520, 560 560 S 980 800, 1240 700 1480 620 1480 620"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="12 12"
          />
        </svg>

        <div className="hero-copy">
          <h1>
            Outrun the outbreak
            <span className="caret" />
          </h1>
          <p>
            We simulate 21 days of flu across MIT so you can see it coming
            before it reaches you.
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

        <div className="hero-stats">
          {STATS.map((s) => (
            <div key={s.label}>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </header>

      <section className="landing-section students" id="students">
        <div className="section-copy">
          <span className="eyebrow">FOR STUDENTS</span>
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
          <span className="eyebrow">FOR ADMINISTRATORS</span>
          <h2>Plan the response before the first case.</h2>
          <p>
            Model isolation policies, transmission rates and cross-campus mixing
            across all 32 locations, then compare the outcomes side by side.
          </p>
          <Link className="landing-cta" href="/admin">
            Sign in to the admin view <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <span>
          Built at HackMIT 2026 · Illustrative model, not medical advice
        </span>
        <Link href="/simulation">Campus simulation</Link>
      </footer>
    </div>
  );
}
