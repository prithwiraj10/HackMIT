import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";

const AUDIENCES = [
  {
    id: "students",
    eyebrow: "FOR STUDENTS",
    title: "Know your campus.",
    line: "See how a simulated outbreak moves through the places you actually spend your day.",
    href: "/students",
    cta: "Open the student view",
  },
  {
    id: "admin",
    eyebrow: "FOR ADMINISTRATORS",
    title: "Plan ahead.",
    line: "Model interventions across all 32 campus locations before the first case appears.",
    href: "/admin",
    cta: "Sign in to the admin view",
  },
];

export default function Page() {
  return (
    <div className="landing">
      <nav className="landing-nav" aria-label="Choose an audience">
        <span className="landing-brand">
          freshman<span>flu</span>
        </span>
        <div className="landing-switch">
          <a href="#students">Students</a>
          <a href="#admin">Admin</a>
        </div>
      </nav>
      <header className="landing-hero">
        <h1>
          A campus.
          <br />
          In motion.
        </h1>
        <p>
          A 21-day simulated view of illness across MIT. Two ways in — pick
          yours.
        </p>
        <a className="landing-scroll" href="#students" aria-label="Scroll down">
          <ChevronDown size={20} />
        </a>
      </header>
      {AUDIENCES.map((a) => (
        <section className="landing-section" id={a.id} key={a.id}>
          <span className="eyebrow">{a.eyebrow}</span>
          <h2>{a.title}</h2>
          <p>{a.line}</p>
          <Link className="landing-cta" href={a.href}>
            {a.cta} <ArrowRight size={17} />
          </Link>
        </section>
      ))}
      <footer className="landing-footer">
        <span>Built at HackMIT 2026</span>
        <Link href="/simulation">Campus simulation</Link>
      </footer>
    </div>
  );
}
