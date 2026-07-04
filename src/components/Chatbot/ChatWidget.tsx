"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CHATBOT_CONFIG } from "@/lib/chatbot/config";

type Role = "user" | "assistant";
type Message = { role: Role; content: string; at: number };

const STORAGE_KEY = "wc:chat-history";
const MAX_STORED_MESSAGES = 40;

function loadHistory(): Message[] {
  if (!CHATBOT_CONFIG.features.persistHistory) return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveHistory(messages: Message[]) {
  if (!CHATBOT_CONFIG.features.persistHistory) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
  } catch {
    /* storage unavailable - non-fatal, history just won't persist */
  }
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Kept outside the component so timestamping a message isn't read as an
// impure call inside component/hook render logic - it only ever runs from
// event handlers (form submit / suggested-question click).
function makeMessage(role: Role, content: string): Message {
  return { role, content, at: Date.now() };
}

export default function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Deferred a tick so this reads as "react to mount", not a synchronous
    // setState-in-effect - sessionStorage isn't available during SSR anyway.
    Promise.resolve().then(() => setMessages(loadHistory()));
  }, []);

  useEffect(() => {
    if (messages.length) saveHistory(messages);
  }, [messages]);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, sending]);

  if (!CHATBOT_CONFIG.enabled) return null;

  function openWidget() {
    setOpen(true);
    setEverOpened(true);
  }

  async function send(text: string) {
    const trimmed = text.trim().slice(0, CHATBOT_CONFIG.limits.maxMessageLength);
    if (!trimmed || sending) return;

    setError(false);
    setLastFailedMessage(null);
    const userMsg = makeMessage("user", trimmed);
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          page: pathname,
          history: history
            .slice(-CHATBOT_CONFIG.limits.maxHistoryTurns * 2)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok && res.status !== 200) throw new Error("bad_status");
      const data = await res.json();
      if (!data.reply) throw new Error("empty_reply");

      setMessages((prev) => [...prev, makeMessage("assistant", data.reply)]);
    } catch {
      setError(true);
      setLastFailedMessage(trimmed);
    } finally {
      setSending(false);
    }
  }

  function retry() {
    if (lastFailedMessage) send(lastFailedMessage);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <>
      <button
        onClick={() => (open ? setOpen(false) : openWidget())}
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-[90] grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-violet-900/30 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 sm:bottom-6 sm:right-6"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
      </button>

      <div
        role="dialog"
        aria-label="WorkflowCrate assistant"
        aria-hidden={!open}
        className={`fixed bottom-24 right-5 z-[90] flex h-[min(600px,calc(100vh-7rem))] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#0c0c12] shadow-2xl shadow-black/50 transition-all duration-200 sm:bottom-28 sm:right-6 ${
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-zinc-800 bg-gradient-to-r from-indigo-600/20 to-violet-600/20 px-4 py-3">
          <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            W
          </span>
          <div>
            <p className="text-sm font-semibold text-zinc-100">WorkflowCrate Assistant</p>
            <p className="text-xs text-zinc-500">Usually replies instantly</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Minimize chat"
            className="ml-auto rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"
          >
            &#8722;
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {everOpened && messages.length === 0 && (
            <div className="space-y-3">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-zinc-800/70 px-3 py-2 text-sm text-zinc-100">
                {CHATBOT_CONFIG.welcomeMessage}
              </div>
              {CHATBOT_CONFIG.features.suggestedQuestions && (
                <div className="flex flex-wrap gap-2">
                  {CHATBOT_CONFIG.suggestedQuestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-violet-500 hover:text-zinc-100"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "rounded-tr-sm bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
                    : "rounded-tl-sm bg-zinc-800/70 text-zinc-100"
                }`}
              >
                {m.content}
              </div>
              <span className="mt-1 px-1 text-[10px] text-zinc-600">{formatTime(m.at)}</span>
            </div>
          ))}

          {sending && (
            <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-zinc-800/70 px-3 py-2.5 w-fit">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-start gap-1.5">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-red-500/10 px-3 py-2 text-sm text-red-300">
                Something went wrong sending that message.
              </div>
              <button
                onClick={retry}
                className="rounded-full border border-red-500/40 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-zinc-800 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            maxLength={CHATBOT_CONFIG.limits.maxMessageLength}
            aria-label="Message"
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            aria-label="Send message"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
            </svg>
          </button>
        </form>
      </div>
    </>
  );
}
