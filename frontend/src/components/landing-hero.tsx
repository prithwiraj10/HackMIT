"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import { ArrowRight } from "lucide-react";

/* Each glyph is its own span so CSS can reveal it on a per-character delay
   (`--i`) and trail a caret behind it. Words stay unbreakable so the line
   wraps at spaces only; "\n" in the text forces a line break. The full text
   is in the DOM from the first byte. */
function TypedHeading({ text }: { text: string }) {
  const lines = text.split("\n").map((line) => line.split(" "));
  let index = 0;
  return (
    <h1 className="typed" aria-label={text.replace(/\n/g, " ")}>
      {lines.map((words, l) => (
        <span className="typed-line" key={l} aria-hidden="true">
          {words.map((word, w) => (
            <span className="typed-word" key={w}>
              {Array.from(word).map((char, c) => {
                const i = index++;
                return (
                  <span
                    className="typed-char"
                    key={c}
                    style={{ "--i": i } as CSSProperties}
                  >
                    {char}
                  </span>
                );
              })}
              {w < words.length - 1 && (
                <span
                  className="typed-char"
                  style={{ "--i": index++ } as CSSProperties}
                >
                  {" "}
                </span>
              )}
            </span>
          ))}
          {l === lines.length - 1 && (
            <span className="typed-caret" aria-hidden="true" />
          )}
        </span>
      ))}
    </h1>
  );
}

/* Pointer parallax: the two photos drift in opposite directions as the
   cursor moves over the hero, written as CSS variables so the cards' own
   transitions smooth the motion. Skipped for coarse pointers and reduced
   motion. */
function useHeroParallax() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const hero = ref.current;
    if (!hero) return;
    const fine = matchMedia("(pointer: fine)");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduce.matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      frame = 0;
      hero.style.setProperty("--px", x.toFixed(3));
      hero.style.setProperty("--py", y.toFixed(3));
    };
    const move = (e: PointerEvent) => {
      const r = hero.getBoundingClientRect();
      x = ((e.clientX - r.left) / r.width) * 2 - 1;
      y = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const leave = () => {
      x = 0;
      y = 0;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    hero.addEventListener("pointermove", move);
    hero.addEventListener("pointerleave", leave);
    return () => {
      hero.removeEventListener("pointermove", move);
      hero.removeEventListener("pointerleave", leave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return ref;
}

const HEADLINE = "Outrun the\noutbreak";

export function LandingHero() {
  const ref = useHeroParallax();
  return (
    <header
      className="landing-hero"
      ref={ref}
      style={{ "--n": HEADLINE.length } as CSSProperties}
    >
      <div className="hero-copy">
        <TypedHeading text={HEADLINE} />
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
          <div className="card-inner">
            <Image
              src="/landing/stata-center.jpg"
              alt="The Ray and Maria Stata Center at MIT"
              width={1600}
              height={1067}
              sizes="(max-width: 900px) 60vw, 30vw"
            />
          </div>
        </figure>
        <figure className="card-front">
          <div className="card-inner">
            <Image
              src="/landing/great-dome.jpg"
              alt="The Great Dome over Killian Court at MIT"
              width={1200}
              height={800}
              sizes="(max-width: 900px) 80vw, 40vw"
              priority
            />
          </div>
        </figure>
      </div>
    </header>
  );
}
