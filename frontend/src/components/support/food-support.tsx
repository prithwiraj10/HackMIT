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

type Request = { id: number; title: string; spot: string; amount: number; requester: string; claimedBy?: string };
const BOARD_KEY = "freshman-flu-food-board";
const CREDITS_KEY = "freshman-flu-student-credits";

export function FoodSupport({ todaySymptoms, studentName }: { todaySymptoms: string[]; studentName: string }) {
  const [symptom, setSymptom] = useState<string>("Sore throat");
  const [area, setArea] = useState<FoodArea>("MIT campus");
  const [guidance, setGuidance] = useState("");
  const [requests, setRequests] = useState<Request[]>([]);
  const [credits, setCredits] = useState(100);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("Soup + tea pickup");
  const [spot, setSpot] = useState(FOOD_SPOTS["MIT campus"][0]);
  const [amount, setAmount] = useState("12");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const board = JSON.parse(localStorage.getItem(BOARD_KEY) ?? "[]");
    const balances = JSON.parse(localStorage.getItem(CREDITS_KEY) ?? "{}");
    if (!(studentName in balances)) balances[studentName] = 100;
    setRequests(Array.isArray(board) ? board : []);
    setCredits(balances[studentName]);
    localStorage.setItem(CREDITS_KEY, JSON.stringify(balances));
  }, [studentName]);
  const saveBoard = (next: Request[]) => { setRequests(next); localStorage.setItem(BOARD_KEY, JSON.stringify(next)); };

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
                { id: Date.now(), title, spot, amount: credits, requester: studentName },
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
                    {r.spot} · {r.amount} mock credits · requested by {r.requester}{r.claimedBy ? " · claimed by " + r.claimedBy : ""}
                  </small>
                </div>
                {r.requester === studentName ? <button className="button" onClick={() => saveBoard(requests.filter((x) => x.id !== r.id))}><Trash2 size={14} /> Remove</button> : !r.claimedBy ? <button className="button primary" onClick={() => {
                  const balances = JSON.parse(localStorage.getItem(CREDITS_KEY) ?? "{}");
                  balances[r.requester] = (balances[r.requester] ?? 100) - r.amount;
                  balances[studentName] = (balances[studentName] ?? 100) + r.amount;
                  localStorage.setItem(CREDITS_KEY, JSON.stringify(balances));
                  setCredits(balances[studentName]);
                  saveBoard(requests.map((x) => x.id === r.id ? { ...x, claimedBy: studentName } : x));
                }}>Claim · +{r.amount}</button> : null}
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
