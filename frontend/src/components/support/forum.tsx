"use client";

import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";

export type Post = {
  id: number;
  author: string;
  body: string;
  replies: string[];
};

export const FORUM_SEED: Post[] = [
  {
    id: 1,
    author: "Maya · East Campus",
    body: "Does anyone know a quiet way to get notes when you have lost your voice?",
    replies: [
      "I use a shared doc and send one short message to a class group.",
    ],
  },
];

const STORAGE_KEY = "freshman-flu-forum";

function isPost(x: unknown): x is Post {
  if (typeof x !== "object" || x === null) return false;
  const p = x as Record<string, unknown>;
  return (
    typeof p.id === "number" &&
    typeof p.author === "string" &&
    typeof p.body === "string" &&
    Array.isArray(p.replies) &&
    p.replies.every((r) => typeof r === "string")
  );
}

export function loadForumPosts(): Post[] {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "null",
    );
    return Array.isArray(parsed) && parsed.every(isPost) ? parsed : FORUM_SEED;
  } catch {
    return FORUM_SEED;
  }
}

export function storeForumPosts(posts: Post[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch {
    // storage blocked or full: posts live in workspace state for this visit
  }
}

export function Forum({
  posts,
  onChange,
}: {
  posts: Post[];
  onChange: (posts: Post[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyDraft, setReplyDraft] = useState("");

  const submit = () => {
    if (!draft.trim()) return;
    onChange([
      ...posts,
      { id: Date.now(), author: "You · MIT", body: draft.trim(), replies: [] },
    ]);
    setDraft("");
  };
  const submitReply = (postId: number) => {
    if (!replyDraft.trim()) return;
    onChange(
      posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              replies: [...post.replies, "You · MIT: " + replyDraft.trim()],
            }
          : post,
      ),
    );
    setReplyDraft("");
    setReplyTo(null);
  };

  return (
    <div className="support-columns">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Ask the community</h2>
            <p>Posts are saved in this browser only during the demo.</p>
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
            {replyTo === p.id ? (
              <div className="forum-reply-form">
                <label className="field-label" htmlFor={"reply-" + p.id}>
                  Your reply
                </label>
                <textarea
                  id={"reply-" + p.id}
                  className="text-input"
                  rows={2}
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  placeholder="Write a helpful reply…"
                />
                <div className="support-actions">
                  <button
                    className="button primary"
                    disabled={!replyDraft.trim()}
                    onClick={() => submitReply(p.id)}
                  >
                    <Send size={14} /> Send reply
                  </button>
                  <button
                    className="button"
                    onClick={() => {
                      setReplyTo(null);
                      setReplyDraft("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="button"
                onClick={() => {
                  setReplyTo(p.id);
                  setReplyDraft("");
                }}
              >
                <MessageCircle size={14} /> Reply
              </button>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
