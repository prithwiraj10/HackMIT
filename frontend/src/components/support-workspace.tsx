"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  HeartPulse,
  MapPin,
  MessageCircle,
  Mic,
  ShoppingBag,
  Trash2,
  Utensils,
  Volume2,
} from "lucide-react";
import { SYMPTOMS, type CheckIn } from "@/lib/support-data";
import { AcademicTriage } from "./support/academic-triage";
import { CheckIns } from "./support/check-ins";
import { FoodSupport } from "./support/food-support";
import { Forum } from "./support/forum";
import { LostVoice } from "./support/lost-voice";
import { ThemeToggle } from "./theme-toggle";
import "./support.css";

type Tab = "home" | "food" | "academics" | "voice" | "tracking" | "forum";

const NAV: { id: Tab; label: string; Icon: typeof Activity }[] = [
  { id: "home", label: "Overview", Icon: Activity },
  { id: "food", label: "Food support", Icon: Utensils },
  { id: "academics", label: "Academic triage", Icon: BookOpen },
  { id: "voice", label: "Lost voice", Icon: Mic },
  { id: "tracking", label: "Check-ins", Icon: CalendarDays },
  { id: "forum", label: "Forum", Icon: MessageCircle },
];

const HEADINGS: Record<Tab, { crumb: string; title: string; lede: string }> = {
  home: {
    crumb: "OVERVIEW",
    title: "Make a sick day more manageable.",
    lede: "Understand what can wait, communicate clearly, and ask for practical support.",
  },
  food: {
    crumb: "FOOD SUPPORT",
    title: "Food ideas that match your energy.",
    lede: "Gentle choices, nearby spots, and a board for asking someone to pick something up.",
  },
  academics: {
    crumb: "ACADEMIC TRIAGE",
    title: "Policy-grounded triage for every class.",
    lede: "Pull in your Canvas courses and syllabi, then let the assistant rank what matters and draft the emails.",
  },
  voice: {
    crumb: "LOST VOICE",
    title: "Let your computer help speak.",
    lede: "Whisper-to-loud for the room, and a call proxy for the phone.",
  },
  tracking: {
    crumb: "CHECK-INS",
    title: "A small log can make a hard day clearer.",
    lede: "Track symptoms and energy over time and get general next-step support.",
  },
  forum: {
    crumb: "FORUM",
    title: "Practical help from people who get it.",
    lede: "Ask other students for notes, study strategies, and quiet workarounds.",
  },
};

const STORAGE_KEY = "freshman-flu-checkins";

function loadCheckIns(): CheckIn[] {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "null",
    );
    return Array.isArray(parsed) ? (parsed as CheckIn[]) : [];
  } catch {
    return [];
  }
}

export function SupportWorkspace() {
  const [tab, setTab] = useState<Tab>("home");
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const main = useRef<HTMLElement>(null);

  useEffect(() => {
    setCheckIns(loadCheckIns());
  }, []);

  const navigate = (next: Tab) => {
    setTab(next);
    main.current?.scrollIntoView({ block: "start" });
  };
  const saveCheckIn = (item: CheckIn) => {
    const next = [...checkIns, item];
    setCheckIns(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const todayKey = new Date().toLocaleDateString("en-CA");
  const todaySymptoms = [
    ...new Set(
      checkIns.filter((x) => x.date === todayKey).flatMap((x) => x.symptoms),
    ),
  ];
  const heading = HEADINGS[tab];

  return (
    <div className="app-shell support">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="app-header">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <Activity size={22} />
          </span>
          <span>
            freshman<span className="brand-light">flu</span>
            <small>STUDENT SUPPORT WORKSPACE</small>
          </span>
        </Link>
        <div className="header-context">
          <span className="divider" />
          <MapPin size={15} />
          <span>MIT · Cambridge, MA</span>
          <ChevronDown size={13} />
        </div>
        <div className="header-actions">
          <span className="simulation-label">
            <i /> General support · not medical advice
          </span>
          <Link className="button quiet" href="/students">
            <Activity size={16} />
            <span>Campus simulation</span>
          </Link>
          <ThemeToggle />
          <a
            className="github-link"
            href="https://github.com/prithwiraj10/HackMIT"
            target="_blank"
            rel="noreferrer"
            aria-label="Open the HackMIT repository"
          >
            <ArrowUpRight size={19} />
          </a>
        </div>
      </header>
      <aside className="sidebar">
        <span className="eyebrow sidebar-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              aria-label={label}
              onClick={() => navigate(id)}
              className={tab === id ? "nav-button active" : "nav-button"}
              aria-current={tab === id ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={1.7} />
              <span>{label}</span>
              {tab === id && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <HeartPulse size={18} />
            <p>
              Feeling rough?
              <br />
              Start with a check-in.
            </p>
            <span>
              A short log helps the food, academic and voice tools meet you
              where you are today.
            </span>
            <button onClick={() => navigate("tracking")}>
              Log how you feel <ArrowRight size={14} />
            </button>
          </div>
          <span className="sidebar-footer">Built at HackMIT 2026</span>
        </div>
      </aside>
      <main id="main-content" className="workspace" ref={main}>
        <div className="page-heading">
          <div>
            <div className="breadcrumb">
              WORKSPACE <ChevronRight size={11} /> {heading.crumb}
            </div>
            <h1>{heading.title}</h1>
            <p>{heading.lede}</p>
          </div>
          {todaySymptoms.length > 0 && (
            <span className="support-today">
              Today: {todaySymptoms.join(", ")}
            </span>
          )}
        </div>
        {tab === "home" && (
          <Overview onNavigate={navigate} hasCheckIn={checkIns.length > 0} />
        )}
        {tab === "food" && <FoodSupport todaySymptoms={todaySymptoms} />}
        {tab === "academics" && <AcademicTriage />}
        {tab === "voice" && <LostVoice />}
        {tab === "tracking" && (
          <CheckIns checkIns={checkIns} onSave={saveCheckIn} />
        )}
        {tab === "forum" && <Forum />}
      </main>
    </div>
  );
}

function Overview({
  onNavigate,
  hasCheckIn,
}: {
  onNavigate: (tab: Tab) => void;
  hasCheckIn: boolean;
}) {
  const tools: {
    tab: Tab;
    Icon: typeof Activity;
    title: string;
    body: string;
  }[] = [
    {
      tab: "academics",
      Icon: BookOpen,
      title: "Academic triage",
      body: "Rank deadlines by policy risk and draft the emails to professors.",
    },
    {
      tab: "food",
      Icon: Utensils,
      title: "Food support",
      body: "Gentle choices, nearby spots, and pickup help from other students.",
    },
    {
      tab: "voice",
      Icon: Mic,
      title: "Lost voice",
      body: "Whisper-to-loud for the room and a proxy for phone calls.",
    },
    {
      tab: "tracking",
      Icon: CalendarDays,
      title: "Check-ins",
      body: "A 28-day symptom log with general next-step support.",
    },
    {
      tab: "forum",
      Icon: MessageCircle,
      title: "Forum",
      body: "Practical tips from students who have been there.",
    },
  ];
  return (
    <div className="support-overview">
      <div className="support-tools">
        {tools.map(({ tab, Icon, title, body }) => (
          <button
            key={tab}
            className="panel support-tool"
            onClick={() => onNavigate(tab)}
          >
            <span className="preset-icon">
              <Icon size={17} />
            </span>
            <span>
              <strong>{title}</strong>
              <p>{body}</p>
            </span>
            <ArrowUpRight size={16} />
          </button>
        ))}
      </div>
      <section className="experiment-note">
        <ShoppingBag size={21} />
        <h3>Built around a sick day, not a diagnosis.</h3>
        <p>
          Everything here is general support: what can wait, who to tell, what
          to eat, how to be heard. Nothing replaces campus health or a
          clinician.
        </p>
        <p>
          {hasCheckIn
            ? "Your check-ins stay in this browser only."
            : "Start with a check-in so the other tools can use today's symptoms."}
        </p>
        <p className="support-symptom-list">
          Tracked symptoms: {SYMPTOMS.join(", ")}.
        </p>
      </section>
    </div>
  );
}
