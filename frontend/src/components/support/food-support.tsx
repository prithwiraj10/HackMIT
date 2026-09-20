"use client";

import { useEffect, useState } from "react";
import { MapPin, ShoppingBag, Trash2 } from "lucide-react";
import {
  FOOD_AREAS,
  FOOD_SPOTS,
  SYMPTOMS,
  foodGuidance,
  type FoodArea,
} from "@/lib/support-data";

type Request = {
  id: number;
  title: string;
  spot: string;
  amount: number;
  requester: string;
  claimedBy?: string;
};
type Balances = Record<string, number>;
const BOARD_KEY = "flu-u-food-board";
const CREDITS_KEY = "flu-u-student-credits";
const STARTING_CREDITS = 100;

function isRequest(x: unknown): x is Request {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.id === "number" &&
    typeof r.title === "string" &&
    typeof r.spot === "string" &&
    typeof r.amount === "number" &&
    typeof r.requester === "string" &&
    (r.claimedBy === undefined || typeof r.claimedBy === "string")
  );
}

function loadBoard(): Request[] {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(BOARD_KEY) ?? "null",
    );
    return Array.isArray(parsed) ? parsed.filter(isRequest) : [];
  } catch {
    return [];
  }
}

function loadBalances(): Balances {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(CREDITS_KEY) ?? "null",
    );
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
      return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, number] => typeof entry[1] === "number",
      ),
    );
  } catch {
    return {};
  }
}

function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked or full: the board still works for this page */
  }
}

export function FoodSupport({
  todaySymptoms,
  studentName,
}: {
  todaySymptoms: string[];
  studentName: string;
}) {
  const [symptom, setSymptom] = useState<string>("Sore throat");
  const [area, setArea] = useState<FoodArea>("MIT campus");
  const [guidance, setGuidance] = useState("");
  const [requests, setRequests] = useState<Request[]>([]);
  const [credits, setCredits] = useState(STARTING_CREDITS);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("Soup + tea pickup");
  const [spot, setSpot] = useState(FOOD_SPOTS["MIT campus"][0]);
  const [amount, setAmount] = useState("12");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setRequests(loadBoard());
    setCredits(loadBalances()[studentName] ?? STARTING_CREDITS);
  }, [studentName]);

  const saveBoard = (next: Request[]) => {
    setRequests(next);
    store(BOARD_KEY, next);
  };

  const claim = (r: Request) => {
    const balances = loadBalances();
    balances[r.requester] =
      (balances[r.requester] ?? STARTING_CREDITS) - r.amount;
    balances[studentName] =
      (balances[studentName] ?? STARTING_CREDITS) + r.amount;
    store(CREDITS_KEY, balances);
    setCredits(balances[studentName]);
    saveBoard(
      requests.map((x) =>
        x.id === r.id ? { ...x, claimedBy: studentName } : x,
      ),
    );
  };

  const recommend = () =>
    setGuidance(foodGuidance(symptom === "today" ? todaySymptoms : [symptom]));

  return (
    <div className="support-columns">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>What sounds manageable?</h2>
            <p>Pick how you feel and where you can get to.</p>
          </div>
          <strong className="support-credits">{credits} credits</strong>
        </div>
        <label className="field-label" htmlFor="food-area">
          Where should we look for food?
        </label>
        <select
          id="food-area"
          className="text-input"
          value={area}
          onChange={(e) => {
            const next = e.target.value as FoodArea;
            setArea(next);
            setSpot(FOOD_SPOTS[next][0]);
          }}
        >
          {FOOD_AREAS.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <span className="field-label">Main symptom</span>
        <div className="support-chips" role="group" aria-label="Main symptom">
          {SYMPTOMS.map((x) => (
            <button
              key={x}
              type="button"
              className={symptom === x ? "selected" : ""}
              aria-pressed={symptom === x}
              onClick={() => setSymptom(x)}
            >
              {x}
            </button>
          ))}
          {todaySymptoms.length > 0 && (
            <button
              type="button"
              className={symptom === "today" ? "selected" : ""}
              aria-pressed={symptom === "today"}
              onClick={() => setSymptom("today")}
            >
              Use today’s check-in
            </button>
          )}
        </div>
        <div className="support-actions">
          <button className="button primary" onClick={recommend}>
            Recommend food
          </button>
        </div>
        {guidance && (
          <div className="support-result">
            <span className="eyebrow">GENERAL FOOD GUIDANCE</span>
            <p>{guidance}</p>
            <h3>Nearby options in {area}</h3>
            <ul>
              {FOOD_SPOTS[area].map((x) => (
                <li key={x}>
                  <MapPin size={14} /> {x}
                </li>
              ))}
            </ul>
            <small>
              Not medical advice. Mock credits only — no real payment.
            </small>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Food run board</h2>
            <p>Ask another student to pick something up for you.</p>
          </div>
          <button
            className="button primary"
            onClick={() => setShowForm((v) => !v)}
          >
            <ShoppingBag size={15} /> Ask for a pickup
          </button>
        </div>
        {showForm && (
          <form
            className="support-request"
            onSubmit={(e) => {
              e.preventDefault();
              const credits = Number(amount);
              if (
                !/^\d+$/.test(amount.trim()) ||
                credits < 1 ||
                credits > 100
              ) {
                setFormError("Offer between 1 and 100 credits.");
                return;
              }
              saveBoard([
                ...requests,
                {
                  id: Date.now(),
                  title,
                  spot,
                  amount: credits,
                  requester: studentName,
                },
              ]);
              setFormError("");
              setShowForm(false);
            }}
          >
            <input
              className="text-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you need?"
              aria-label="What do you need?"
            />
            <input
              className="text-input"
              value={spot}
              onChange={(e) => setSpot(e.target.value)}
              placeholder="Pickup spot — e.g. Maseeh Dining or Lobdell"
              aria-label="Pickup spot"
            />
            <label className="support-amount">
              Credits offered
              <input
                className="text-input"
                type="number"
                min={1}
                max={100}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            {formError && <p className="status-message">{formError}</p>}
            <button className="button primary" type="submit">
              Post request
            </button>
          </form>
        )}
        {requests.length ? (
          <ul className="support-list">
            {requests.map((r) => (
              <li key={r.id}>
                <div>
                  <strong>{r.title}</strong>
                  <small>
                    {r.spot} · {r.amount} mock credits ·{" "}
                    {r.requester === studentName
                      ? "your request"
                      : `requested by ${r.requester}`}
                    {r.claimedBy
                      ? ` · claimed by ${r.claimedBy}`
                      : " · awaiting volunteer"}
                  </small>
                </div>
                {r.requester === studentName ? (
                  <button
                    className="button"
                    onClick={() =>
                      saveBoard(requests.filter((x) => x.id !== r.id))
                    }
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                ) : r.claimedBy ? null : (
                  <button className="button primary" onClick={() => claim(r)}>
                    Claim · +{r.amount}
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="support-empty">No open requests yet.</p>
        )}
      </section>
    </div>
  );
}
