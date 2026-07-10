"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage, Trip } from "@/lib/schema";
import { cn } from "@/lib/utils";

type Props = { trip: Trip };

const SUGGESTIONS = [
  "Juance, ¿qué hago si me pierde la lluvia un día?",
  "Reorganiza el día 3 pa' ir más despacio",
  "¿Dónde hay librerías bacanas por el centro?",
  "Parce, ¿cómo nos movemos en transporte público?",
];

export default function ChatPanel({ trip }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setError(null);

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };
    const history = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setStreaming(true);

    const assistantId = `a-${Date.now()}`;
    setMessages((m) => [
      ...m,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: trip.id,
          history,
          message: trimmed,
        }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || `Error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: acc } : m
          )
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error de conexión";
      setError(msg);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `⚠️ ${msg}` }
            : m
        )
      );
    } finally {
      setStreaming(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Hablar con Juan"
        className="fixed bottom-6 right-6 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-[var(--fg)] text-[var(--bg)] shadow-xl transition-all hover:scale-105 hover:bg-[var(--accent)]"
        style={{
          bottom: "calc(1.5rem + env(safe-area-inset-bottom))",
          right: "calc(1.5rem + env(safe-area-inset-right))",
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.svg
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </motion.svg>
          ) : (
            <motion.svg
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </motion.svg>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-[9998] flex flex-col overflow-hidden border border-[var(--line)] bg-[var(--bg)] shadow-2xl inset-2 sm:inset-auto sm:bottom-24 sm:right-4 sm:h-[min(70vh,560px)] sm:w-[min(94vw,400px)] sm:rounded-2xl rounded-2xl"
            style={{
              top: "max(0.5rem, env(safe-area-inset-top))",
              bottom: "max(5rem, calc(5rem + env(safe-area-inset-bottom)))",
              left: "max(0.5rem, env(safe-area-inset-left))",
              right: "max(0.5rem, env(safe-area-inset-right))",
            }}
          >
            <header className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
              <div>
                <p className="font-display text-lg leading-none tracking-tightest">
                  Juan — el guía
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-[var(--fg-muted)]">
                  Sobre tu viaje
                </p>
              </div>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-40" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
              </span>
            </header>

            <div
              ref={scrollRef}
              className="flex-1 space-y-4 overflow-y-auto px-5 py-5 no-scrollbar"
            >
              {messages.length === 0 && (
                <div className="space-y-4">
                  <div className="rounded-2xl rounded-tl-sm bg-[var(--bg-alt)] px-4 py-3 text-sm">
                    ¡A la orden, parce! Soy Juan, tu guía. Contame qué querés
                    saber sobre <span className="font-medium">{trip.title}</span>:
                    planes, transporte, dónde comer, librerías, lo que sea.
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-xl border border-[var(--line)] px-3 py-2 text-left text-xs text-[var(--fg-muted)] transition-colors hover:border-[var(--fg)] hover:text-[var(--fg)]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex",
                    m.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      m.role === "user"
                        ? "rounded-br-sm bg-[var(--fg)] text-[var(--bg)]"
                        : "rounded-tl-sm bg-[var(--bg-alt)] text-[var(--fg)]"
                    )}
                  >
                    {m.content || (
                      <span className="inline-flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--fg-muted)] [animation-delay:-0.3s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--fg-muted)] [animation-delay:-0.15s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--fg-muted)]" />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="border-t border-[var(--line)] p-3"
            >
              {error && (
                <p className="mb-2 px-2 text-xs text-[var(--accent)]">{error}</p>
              )}
              <div className="flex items-end gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pregúntale a Juan…"
                  disabled={streaming}
                  className="flex-1 rounded-full border border-[var(--line)] bg-[var(--bg)] px-4 py-2.5 text-sm outline-none focus:border-[var(--fg)]"
                />
                <button
                  type="submit"
                  disabled={streaming || !input.trim()}
                  aria-label="Enviar"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--fg)] text-[var(--bg)] transition-colors hover:bg-[var(--accent)] disabled:opacity-40"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
