import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, GraduationCap, ShieldCheck } from "lucide-react";
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
          <span className="landing-dot" />
          <span>
            freshman<em>flu</em>
          </span>
        </span>
        <div className="landing-switch">
          <a href="#students">Students</a>
          <a href="#admin">Admin</a>
        </div>
      </nav>

      <header className="landing-hero">
        <Image
          src="/landing/hero.jpg"
          alt="MIT campus and the Charles River at sunset"
          fill
          priority
          sizes="100vw"
        />
        <div className="hero-copy">
          <h1>
            The flu moves fast.
            <br />
            <span>Move first.</span>
          </h1>
          <p>
            A live 21-day simulation of how illness spreads between the dorms,
            labs and dining halls of MIT — built on real walking distances
            between all 32 campus locations.
          </p>
          <div className="hero-actions">
            <a className="solid" href="#students">
              I&apos;m a student <ArrowRight size={17} />
            </a>
            <a className="ghost" href="#admin">
              I&apos;m an administrator <ArrowRight size={17} />
            </a>
          </div>
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
        <figure>
          <Image
            src="/landing/students.jpg"
            alt="Students crossing campus between classes"
            width={1024}
            height={1024}
          />
        </figure>
        <div className="section-copy">
          <span className="eyebrow">
            <GraduationCap size={14} /> FOR STUDENTS
          </span>
          <h2>Know your campus before it knows you.</h2>
          <p>
            See how an outbreak moves through the places you actually spend your
            day — your dorm, your lecture hall, the dining hall you always end
            up in at 7pm.
          </p>
          <ul className="section-points">
            <li>
              <Check size={17} /> Risk for every building you visit, day by day
            </li>
            <li>
              <Check size={17} /> Watch 21 days of spread play out from one
              first case
            </li>
            <li>
              <Check size={17} /> Find the quiet hours and the crowded ones
            </li>
          </ul>
          <Link className="landing-cta" href="/students">
            Open the student view <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <section className="landing-section admin" id="admin">
        <figure>
          <Image
            src="/landing/admin.jpg"
            alt="Aerial view of campus buildings linked by a network"
            width={1024}
            height={1024}
          />
        </figure>
        <div className="section-copy">
          <span className="eyebrow">
            <ShieldCheck size={14} /> FOR ADMINISTRATORS
          </span>
          <h2>Plan the response before the first case.</h2>
          <p>
            Model isolation policies, transmission rates and cross-campus mixing
            across all 32 locations, then compare the outcomes side by side.
          </p>
          <ul className="section-points">
            <li>
              <Check size={17} /> Tune seven parameters and rerun instantly
            </li>
            <li>
              <Check size={17} /> Compare two scenarios on peak load and total
              exposure
            </li>
            <li>
              <Check size={17} /> Rank the hotspots that need staff first
            </li>
          </ul>
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
