"use client";

import { useState } from "react";
import { MapPin, ShoppingBag, Trash2 } from "lucide-react";
import {
  FOOD_AREAS,
  FOOD_SPOTS,
  SYMPTOMS,
  foodGuidance,
  type FoodArea,
} from "@/lib/support-data";

type Request = { id: number; title: string; spot: string; amount: number };

export function FoodSupport({ todaySymptoms }: { todaySymptoms: string[] }) {
  const [symptom, setSymptom] = useState<string>("Sore throat");
  const [area, setArea] = useState<FoodArea>("MIT campus");
  const [guidance, setGuidance] = useState("");
  const [requests, setRequests] = useState<Request[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("Soup + tea pickup");
  const [spot, setSpot] = useState(FOOD_SPOTS["MIT campus"][0]);
  const [amount, setAmount] = useState(12);

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
          <strong className="support-credits">100 credits</strong>
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
              setRequests((a) => [
                ...a,
                {
                  id: Date.now(),
                  title,
                  spot,
                  amount: Math.max(1, Number(amount) || 1),
                },
              ]);
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
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </label>
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
                    {r.spot} · {r.amount} mock credits · awaiting volunteer
                  </small>
                </div>
                <button
                  className="button"
                  onClick={() =>
                    setRequests((a) => a.filter((x) => x.id !== r.id))
                  }
                >
                  <Trash2 size={14} /> Remove
                </button>
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
