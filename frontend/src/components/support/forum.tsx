"use client";

import { useState } from "react";
import { Send } from "lucide-react";

type Post = { id: number; author: string; body: string; replies: string[] };

const SEED: Post[] = [
  {
    id: 1,
    author: "Maya · East Campus",
    body: "Does anyone know a quiet way to get notes when you have lost your voice?",
    replies: [
      "I use a shared doc and send one short message to a class group.",
    ],
  },
];

export function Forum() {
  const [posts, setPosts] = useState<Post[]>(SEED);
  const [draft, setDraft] = useState("");

  const submit = () => {
    if (!draft.trim()) return;
    setPosts((a) => [
      ...a,
      { id: Date.now(), author: "You · MIT", body: draft.trim(), replies: [] },
    ]);
    setDraft("");
  };

  return (
    <div className="support-columns">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Ask the community</h2>
            <p>Posts stay in this browser only during the demo.</p>
          </div>
        </div>
        <label className="field-label" htmlFor="forum-post">
          Your question
        </label>
        <textarea
          id="forum-post"
          className="text-input"
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask for practical advice, notes, or a quiet study strategy…"
        />
        <div className="support-actions">
          <button
            className="button primary"
            disabled={!draft.trim()}
            onClick={submit}
          >
            <Send size={15} /> Post question
          </button>
        </div>
      </section>
      <div className="support-stack">
        {posts.map((p) => (
          <section className="panel support-post" key={p.id}>
            <span className="eyebrow">{p.author}</span>
            <p>{p.body}</p>
            {p.replies.map((x, i) => (
              <p className="support-reply" key={i}>
                ↳ {x}
              </p>
            ))}
            <button
              className="button"
              onClick={() =>
                setPosts((a) =>
                  a.map((x) =>
                    x.id === p.id
                      ? {
                          ...x,
                          replies: [
                            ...x.replies,
                            "Thanks — I hope that makes today a little easier.",
                          ],
                        }
                      : x,
                  ),
                )
              }
            >
              Add a supportive reply
            </button>
          </section>
        ))}
      </div>
    </div>
  );
}
