"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CHATBOT_CONFIG } from "@/lib/chatbot/config";
import { hasFreeAccess } from "@/lib/entitlements";
import { useAuth } from "@/components/AuthProvider";
import UpgradeModal from "./UpgradeModal";

type Role = "user" | "assistant";
type Message = { role: Role; content: string; at: number };
type UsageState = { subscriptionActive: boolean; freeRemaining: number; bonusRemaining: number };

const STORAGE_KEY = "wc:chat-history";
const MAX_STORED_MESSAGES = 40;
const TOGGLE_POSITION_KEY = "wc:chat-toggle-pos";
const TOGGLE_SIZE = 56;
const VIEWPORT_MARGIN = 8;
const DRAG_THRESHOLD = 5;

type ToggleCoords = { x: number; y: number };

function clampToggleCoords(pos: ToggleCoords): ToggleCoords {
  const maxX = Math.max(window.innerWidth - TOGGLE_SIZE - VIEWPORT_MARGIN, VIEWPORT_MARGIN);
  const maxY = Math.max(window.innerHeight - TOGGLE_SIZE - VIEWPORT_MARGIN, VIEWPORT_MARGIN);
  return {
    x: Math.min(Math.max(pos.x, VIEWPORT_MARGIN), maxX),
    y: Math.min(Math.max(pos.y, VIEWPORT_MARGIN), maxY),
  };
}

function loadTogglePosition(): ToggleCoords | null {
  try {
    const raw = localStorage.getItem(TOGGLE_POSITION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
      return clampToggleCoords(parsed);
    }
    return null;
  } catch {
    return null;
  }
}

type Persisted = { messages: Message[]; token: string | null };

function loadPersisted(): Persisted {
  if (!CHATBOT_CONFIG.features.persistHistory) return { messages: [], token: null };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { messages: [], token: null };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { messages: parsed, token: null }; // legacy format
    if (parsed && typeof parsed === "object") {
      return {
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        token: typeof parsed.token === "string" ? parsed.token : null,
      };
    }
    return { messages: [], token: null };
  } catch {
    return { messages: [], token: null };
  }
}

function savePersisted(messages: Message[], token: string | null) {
  if (!CHATBOT_CONFIG.features.persistHistory) return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ messages: messages.slice(-MAX_STORED_MESSAGES), token }),
    );
  } catch {
    /* storage unavailable - non-fatal, history just won't persist */
  }
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function base64UrlDecode(str: string): string {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/").padEnd(str.length + ((4 - (str.length % 4)) % 4), "=");
  return atob(padded);
}

// The conversation token is HMAC-signed, not encrypted - its payload
// (including the running message count) is readable client-side without a
// secret. Only used here for a cosmetic "conversation is getting long" hint;
// the server independently re-verifies and enforces the real limit, so a
// tampered/garbled read here can't bypass anything, just misdraw the hint.
function decodeConversationMessageCount(token: string | null): number {
  if (!token) return 0;
  try {
    const [data] = token.split(".");
    if (!data) return 0;
    const parsed = JSON.parse(base64UrlDecode(data));
    return typeof parsed?.n === "number" ? parsed.n : 0;
  } catch {
    return 0;
  }
}

// Kept outside the component so timestamping a message isn't read as an
// impure call inside component/hook render logic - it only ever runs from
// event handlers (form submit / suggested-question click).
function makeMessage(role: Role, content: string): Message {
  return { role, content, at: Date.now() };
}

export default function ChatWidget() {
  const pathname = usePathname();
  const { user, session, openLogin } = useAuth();
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationToken, setConversationToken] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageState | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [togglePos, setTogglePos] = useState<ToggleCoords | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const dragStateRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);
  const draggedRef = useRef(false);

  useEffect(() => {
    // Deferred a tick so this reads as "react to mount", not a synchronous
    // setState-in-effect - sessionStorage isn't available during SSR anyway.
    Promise.resolve().then(() => {
      const { messages, token } = loadPersisted();
      setMessages(messages);
      setConversationToken(token);
    });
  }, []);

  useEffect(() => {
    if (messages.length) savePersisted(messages, conversationToken);
  }, [messages, conversationToken]);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, sending]);

  useEffect(() => {
    const saved = loadTogglePosition();
    if (saved) setTogglePos(saved);
  }, []);

  useEffect(() => {
    function handleResize() {
      setTogglePos((prev) => (prev ? clampToggleCoords(prev) : prev));
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Refreshes the usage banner whenever the widget opens (and once the user
  // signs in), so it's accurate even if the user subscribed/topped up
  // elsewhere or in another tab.
  useEffect(() => {
    if (!user || !session || !open) return;
    let cancelled = false;
    fetch("/api/chatbot/usage", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setUsage({
          subscriptionActive: !!data.subscriptionActive,
          freeRemaining: Number(data.freeRemaining) || 0,
          bonusRemaining: Number(data.bonusRemaining) || 0,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, session, open]);

  if (!CHATBOT_CONFIG.enabled) return null;

  // Free-access accounts (see src/lib/entitlements.ts) skip the
  // per-conversation cap server-side too, so never show them these hints.
  const unlimitedConversation = hasFreeAccess(user?.email);
  const conversationMessageCount = decodeConversationMessageCount(conversationToken);
  const messagesRemaining = CHATBOT_CONFIG.limits.maxMessagesPerConversation - conversationMessageCount;
  const conversationAtLimit = !unlimitedConversation && messagesRemaining <= 0 && messages.length > 0;
  const conversationNearLimit =
    !unlimitedConversation &&
    !conversationAtLimit &&
    messagesRemaining <= CHATBOT_CONFIG.limits.conversationWarningBuffer &&
    messages.length > 0;

  function openWidget() {
    setOpen(true);
    setEverOpened(true);
  }

  function newChat() {
    setMessages([]);
    setConversationToken(null);
    setLimitNotice(null);
    setError(false);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable - non-fatal */
    }
  }

  function refreshUsage() {
    if (!session) return;
    fetch("/api/chatbot/usage", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setUsage({
          subscriptionActive: !!data.subscriptionActive,
          freeRemaining: Number(data.freeRemaining) || 0,
          bonusRemaining: Number(data.bonusRemaining) || 0,
        });
      })
      .catch(() => {});
  }

  async function send(text: string) {
    const trimmed = text.trim().slice(0, CHATBOT_CONFIG.limits.maxMessageLength);
    if (!trimmed || sending) return;

    if (!user || !session) {
      openLogin({ force: true });
      return;
    }

    if (conversationAtLimit) {
      setLimitNotice(CHATBOT_CONFIG.conversationLimitReachedMessage);
      return;
    }

    // Client-side pre-check purely for UX (skip a doomed round-trip) - the
    // server enforces this independently and is the only thing that matters
    // for correctness.
    const isNewConversation = messages.length === 0;
    if (isNewConversation && usage && !usage.subscriptionActive && usage.freeRemaining + usage.bonusRemaining <= 0) {
      setShowUpgrade(true);
      return;
    }

    setError(false);
    setLimitNotice(null);
    setLastFailedMessage(null);
    const preSendMessages = messages;
    const userMsg = makeMessage("user", trimmed);
    const history = [...preSendMessages, userMsg];
    setMessages(history);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          message: trimmed,
          page: pathname,
          history: history
            .slice(-CHATBOT_CONFIG.limits.maxHistoryTurns * 2)
            .map((m) => ({ role: m.role, content: m.content })),
          conversationToken,
        }),
      });

      if (res.status === 401) {
        setMessages(preSendMessages);
        openLogin({ force: true });
        return;
      }
      if (res.status === 402) {
        setMessages(preSendMessages);
        setShowUpgrade(true);
        const data = await res.json().catch(() => null);
        if (data?.usage) {
          setUsage({
            subscriptionActive: !!data.usage.subscriptionActive,
            freeRemaining: Number(data.usage.freeRemaining) || 0,
            bonusRemaining: Number(data.usage.bonusRemaining) || 0,
          });
        }
        return;
      }
      if (res.status === 409) {
        setMessages(preSendMessages);
        setLimitNotice(CHATBOT_CONFIG.conversationLimitReachedMessage);
        return;
      }

      if (!res.ok && res.status !== 200) throw new Error("bad_status");
      const data = await res.json();
      if (!data.reply) throw new Error("empty_reply");

      setMessages((prev) => [...prev, makeMessage("assistant", data.reply)]);
      if (typeof data.conversationToken === "string") setConversationToken(data.conversationToken);
      if (data.usage) {
        setUsage({
          subscriptionActive: !!data.usage.subscriptionActive,
          freeRemaining: Number(data.usage.freeRemaining) || 0,
          bonusRemaining: Number(data.usage.bonusRemaining) || 0,
        });
      }
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

  function handleTogglePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.button !== undefined && e.button !== 0) return;
    const rect = toggleRef.current?.getBoundingClientRect();
    if (!rect) return;
    draggedRef.current = false;
    dragStateRef.current = { startX: e.clientX, startY: e.clientY, posX: rect.left, posY: rect.top };
    toggleRef.current?.setPointerCapture(e.pointerId);
  }

  function handleTogglePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragStateRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!draggedRef.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    draggedRef.current = true;
    setTogglePos(clampToggleCoords({ x: drag.posX + dx, y: drag.posY + dy }));
  }

  function handleTogglePointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragStateRef.current) return;
    dragStateRef.current = null;
    if (draggedRef.current) {
      setTogglePos((prev) => {
        if (prev) {
          try {
            localStorage.setItem(TOGGLE_POSITION_KEY, JSON.stringify(prev));
          } catch {
            /* storage unavailable - non-fatal, position just won't persist */
          }
        }
        return prev;
      });
    }
    toggleRef.current?.releasePointerCapture(e.pointerId);
  }

  function handleToggleClick() {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    open ? setOpen(false) : openWidget();
  }

  const showLowBalanceBanner =
    !!user && !!usage && !usage.subscriptionActive && usage.freeRemaining <= CHATBOT_CONFIG.limits.lowBalanceThreshold;

  return (
    <>
      <button
        ref={toggleRef}
        onClick={handleToggleClick}
        onPointerDown={handleTogglePointerDown}
        onPointerMove={handleTogglePointerMove}
        onPointerUp={handleTogglePointerUp}
        onPointerCancel={handleTogglePointerUp}
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        style={{ touchAction: "none", ...(togglePos ? { left: togglePos.x, top: togglePos.y } : {}) }}
        className={`fixed z-[90] grid h-14 w-14 cursor-grab place-items-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-violet-900/30 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 active:cursor-grabbing ${
          togglePos ? "" : "bottom-5 right-5 sm:bottom-6 sm:right-6"
        }`}
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
          <div className="ml-auto flex items-center gap-1">
            {!!user && messages.length > 0 && (
              <button
                onClick={newChat}
                className="rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
              >
                New chat
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              aria-label="Minimize chat"
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"
            >
              &#8722;
            </button>
          </div>
        </div>

        {showLowBalanceBanner && (
          <div className="border-b border-zinc-800 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
            {usage!.freeRemaining} free conversation{usage!.freeRemaining === 1 ? "" : "s"} left this month
            {usage!.bonusRemaining > 0 ? ` (+${usage!.bonusRemaining} top-up)` : ""}
          </div>
        )}

        {conversationNearLimit && !conversationAtLimit && (
          <div className="border-b border-zinc-800 bg-indigo-500/10 px-4 py-2 text-xs text-indigo-300">
            {CHATBOT_CONFIG.conversationLimitWarningMessage}
          </div>
        )}

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

          {limitNotice && (
            <div className="flex flex-col items-start gap-1.5">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                {limitNotice}
              </div>
              <button
                onClick={newChat}
                className="rounded-full border border-amber-500/40 px-3 py-1 text-xs text-amber-300 hover:bg-amber-500/10"
              >
                New chat
              </button>
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

        {!user ? (
          <div className="border-t border-zinc-800 p-4 text-center">
            <p className="text-sm text-zinc-400">Sign in to chat with the assistant.</p>
            <button
              onClick={() => openLogin({ force: true })}
              className="mt-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-medium text-white hover:opacity-95"
            >
              Sign in
            </button>
          </div>
        ) : conversationAtLimit ? (
          <div className="border-t border-zinc-800 p-4 text-center">
            <p className="text-sm text-zinc-400">{CHATBOT_CONFIG.conversationLimitReachedMessage}</p>
            <button
              onClick={newChat}
              className="mt-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-medium text-white hover:opacity-95"
            >
              Start new chat
            </button>
          </div>
        ) : (
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
        )}
      </div>

      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onUnlocked={() => {
          setShowUpgrade(false);
          refreshUsage();
        }}
      />
    </>
  );
}
