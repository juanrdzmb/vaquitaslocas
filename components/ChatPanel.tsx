"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage, Trip } from "@/lib/schema";
import { cn } from "@/lib/utils";

const CHAT_BOTTOM_THRESHOLD = 96;

export function isChatNearBottom(
  viewport: Pick<HTMLElement, "scrollHeight" | "scrollTop" | "clientHeight">,
  threshold = CHAT_BOTTOM_THRESHOLD
): boolean {
  return viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= threshold;
}

export const CHAT_SCROLL_CONTAINER_CLASS =
  "min-h-0 flex-1 touch-pan-y space-y-4 overflow-y-auto overscroll-contain px-4 py-5 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch] sm:px-5";

export const CHAT_MESSAGE_CLASS =
  "min-w-0 max-w-[calc(100%_-_2.5rem)] overflow-hidden break-words rounded-2xl px-4 py-3 text-[15px] leading-relaxed [overflow-wrap:anywhere] [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-xl";

export const CHAT_DIALOG_CLASS =
  "fixed inset-x-2 z-[10001] flex min-h-0 flex-col overflow-hidden rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] shadow-2xl top-[max(0.5rem,env(safe-area-inset-top))] bottom-[calc(0.5rem+env(safe-area-inset-bottom))] sm:inset-auto sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] sm:right-[calc(1.5rem+env(safe-area-inset-right))] sm:h-[min(76dvh,650px)] sm:w-[min(430px,calc(100vw-3rem))]";

const SUGGESTIONS = [
  "¿Qué harías hoy si llueve?",
  "Dime dónde comer vegetariano sin caer en la ensalada triste",
  "¿Qué librería me queda mejor en la ruta?",
  "Reordéname un día para caminar menos",
];

function messageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function ChatPanel({ trip }: { trip: Trip }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stickToBottomRef = useRef(true);
  const forceScrollRef = useRef(false);
  const scrollFrameRef = useRef<number | null>(null);
  const userScrollingRef = useRef(false);
  const [liveStatus, setLiveStatus] = useState("");
  const storageKey = `vaquitas-chat:${trip.id}`;

  const cancelScheduledScroll = useCallback(() => {
    if (scrollFrameRef.current === null) return;
    cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = null;
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as unknown;
      if (Array.isArray(saved)) {
        setMessages(
          saved
            .filter(
              (item): item is ChatMessage =>
                Boolean(item) &&
                typeof item === "object" &&
                "role" in item &&
                ((item as ChatMessage).role === "user" || (item as ChatMessage).role === "assistant") &&
                typeof (item as ChatMessage).content === "string"
            )
            .slice(-30)
        );
      }
    } catch {
      // Ignore corrupt local chat history.
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated || streaming) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(messages.filter((message) => message.content).slice(-30))
      );
    } catch {
      // Safari privado o una cuota llena no deben romper el chat.
    }
  }, [hydrated, messages, storageKey, streaming]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      cancelScheduledScroll();
    },
    [cancelScheduledScroll]
  );

  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener("open-juan-chat", openChat);
    return () => window.removeEventListener("open-juan-chat", openChat);
  }, []);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 80);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], textarea:not([disabled])")];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    stickToBottomRef.current = true;
    forceScrollRef.current = true;
    cancelScheduledScroll();
    scrollFrameRef.current = requestAnimationFrame(() => {
      const viewport = scrollRef.current;
      scrollFrameRef.current = null;
      if (!viewport) return;
      viewport.scrollTop = viewport.scrollHeight;
      forceScrollRef.current = false;
    });
    return cancelScheduledScroll;
  }, [cancelScheduledScroll, open]);

  useEffect(() => {
    const viewport = scrollRef.current;
    if (
      !viewport ||
      userScrollingRef.current ||
      (!stickToBottomRef.current && !forceScrollRef.current)
    ) return;
    cancelScheduledScroll();
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      // The reader can start a swipe between React scheduling this frame and
      // the browser painting it. Check the lock again so a streamed token
      // never drags them back to the bottom mid-read.
      if (
        userScrollingRef.current ||
        (!stickToBottomRef.current && !forceScrollRef.current)
      ) return;
      viewport.scrollTop = viewport.scrollHeight;
      stickToBottomRef.current = true;
      forceScrollRef.current = false;
    });
    return cancelScheduledScroll;
  }, [cancelScheduledScroll, messages, streaming]);

  async function send(value: string) {
    const trimmed = value.trim();
    if (!trimmed || streaming) return;
    setError(null);
    const history = messages
      .filter((message) => message.content)
      .slice(-12)
      .map(({ role, content }) => ({ role, content }));
    const userMessage: ChatMessage = { id: messageId("u"), role: "user", content: trimmed, createdAt: Date.now() };
    const assistantId = messageId("j");
    stickToBottomRef.current = true;
    forceScrollRef.current = true;
    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantId, role: "assistant", content: "", createdAt: Date.now() },
    ]);
    setInput("");
    setStreaming(true);
    setLiveStatus("Juan está preparando la respuesta.");

    const controller = new AbortController();
    abortRef.current = controller;
    let completionStatus = "Respuesta de Juan lista.";
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: trip.id, history, message: trimmed }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const detail = await response.text().catch(() => "");
        throw new Error(detail || `El chat respondió ${response.status}.`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        answer += decoder.decode(chunk, { stream: true });
        setMessages((current) => current.map((message) => (message.id === assistantId ? { ...message, content: answer } : message)));
      }
      if (!answer.trim()) {
        setMessages((current) => current.map((message) => (message.id === assistantId ? { ...message, content: "Me quedé mirando el mapa como colombiano buscando una dirección sin nomenclatura. Repíteme eso 😅" } : message)));
      }
    } catch (reason) {
      if (reason instanceof Error && reason.name === "AbortError") {
        completionStatus = "Respuesta detenida.";
        setMessages((current) => current.map((message) => (message.id === assistantId && !message.content ? { ...message, content: "Me frenaste a tiempo. Iba por el tercer párrafo, qué peligro." } : message)));
      } else {
        const message = reason instanceof Error ? reason.message : "No pude conectar con Juan de bolsillo.";
        completionStatus = "No pude completar la respuesta.";
        setError(message);
        setMessages((current) => current.map((item) => (item.id === assistantId ? { ...item, content: `⚠️ ${message}` } : item)));
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setStreaming(false);
      setLiveStatus(completionStatus);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Abrir Juan de bolsillo"
        aria-expanded={open}
        aria-controls="juan-chat-dialog"
        className="fixed right-[max(0.75rem,env(safe-area-inset-right))] z-[9999] flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--fg)] text-[var(--bg)] shadow-2xl transition hover:-translate-y-1 hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] bottom-[calc(0.6rem+env(safe-area-inset-bottom))] sm:right-[max(1.5rem,env(safe-area-inset-right))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
      >
        <span className="font-display text-xl" aria-hidden>{open ? "×" : "J"}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Cerrar chat"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10000] bg-black/35 backdrop-blur-[2px]"
            />
            <motion.div
              ref={dialogRef}
              id="juan-chat-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="juan-chat-title"
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 28, scale: 0.98 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className={CHAT_DIALOG_CLASS}
            >
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <header className="flex shrink-0 items-center justify-between border-b border-[var(--line)] px-4 py-3 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] font-display text-xl text-[var(--accent-ink)]">J</span>
                    <div className="min-w-0">
                      <h2 id="juan-chat-title" className="truncate font-display text-xl leading-none tracking-tightest">Juan de bolsillo</h2>
                      <p className="mt-1 truncate text-[10px] text-[var(--fg-muted)]">Copiloto digital · no Juan escribiendo en vivo</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] text-xl transition hover:border-[var(--accent)]">×</button>
                </header>

                <div
                  ref={scrollRef}
                  className={CHAT_SCROLL_CONTAINER_CLASS}
                  aria-label="Conversación con Juan de bolsillo"
                  aria-busy={streaming}
                  onScroll={(event) => {
                    stickToBottomRef.current = isChatNearBottom(event.currentTarget);
                    if (!stickToBottomRef.current) cancelScheduledScroll();
                  }}
                  onTouchStart={() => {
                    userScrollingRef.current = true;
                    cancelScheduledScroll();
                  }}
                  onTouchEnd={(event) => {
                    userScrollingRef.current = false;
                    stickToBottomRef.current = isChatNearBottom(event.currentTarget);
                  }}
                  onTouchCancel={(event) => {
                    userScrollingRef.current = false;
                    stickToBottomRef.current = isChatNearBottom(event.currentTarget);
                  }}
                  onWheel={(event) => {
                    if (event.deltaY >= 0) return;
                    stickToBottomRef.current = false;
                    cancelScheduledScroll();
                  }}
                >
                  {messages.length === 0 && (
                    <div className="space-y-5">
                      <div className="flex gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] font-display text-sm text-[var(--accent-ink)]">J</span>
                        <div className="min-w-0 break-words rounded-2xl rounded-tl-sm bg-[var(--bg-alt)] px-4 py-3 text-sm leading-relaxed [overflow-wrap:anywhere]">
                          Amanda, ya me sé <strong>{trip.title}</strong>. Pregúntame por rutas, comida vegetariana, librerías, reservas o cómo salvar un día cuando el clima decida sabotear el romance.
                        </div>
                      </div>
                      <div className="grid gap-2">
                        {SUGGESTIONS.map((suggestion) => (
                          <button key={suggestion} type="button" onClick={() => send(suggestion)} className="min-h-11 rounded-xl border border-[var(--line)] px-3 py-2 text-left text-xs leading-relaxed text-[var(--fg-muted)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]">{suggestion}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((message) => (
                    <div key={message.id} className={cn("flex gap-2", message.role === "user" ? "justify-end" : "justify-start")}>
                      {message.role === "assistant" && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] font-display text-sm text-[var(--accent-ink)]">J</span>}
                      <div className={cn(CHAT_MESSAGE_CLASS, message.role === "user" ? "rounded-br-sm bg-[var(--fg)] text-[var(--bg)]" : "rounded-tl-sm bg-[var(--bg-alt)]")}>
                        {message.content ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-[var(--accent)] underline underline-offset-2">{children}</a>,
                              ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
                              ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
                              p: ({ children }) => <p className="mb-2 min-w-0 break-words last:mb-0 [overflow-wrap:anywhere]">{children}</p>,
                              pre: ({ children }) => <pre className="my-3 max-w-full overflow-x-auto rounded-xl bg-black/10 p-3 text-xs leading-relaxed overscroll-x-contain">{children}</pre>,
                              code: ({ className, children }) => className ? (
                                <code className={cn("block min-w-max whitespace-pre font-mono", className)}>{children}</code>
                              ) : (
                                <code className="break-words rounded bg-black/10 px-1 py-0.5 font-mono text-[0.88em] [overflow-wrap:anywhere]">{children}</code>
                              ),
                              table: ({ children }) => <table className="my-3 block max-w-full overflow-x-auto whitespace-nowrap text-left text-xs">{children}</table>,
                              blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-[var(--accent)] pl-3 text-[var(--fg-muted)]">{children}</blockquote>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        ) : (
                          <span className="inline-flex gap-1" aria-label="Juan está escribiendo">
                            {[0, 1, 2].map((dot) => <span key={dot} className="h-2 w-2 animate-bounce rounded-full bg-[var(--fg-muted)]" style={{ animationDelay: `${dot * 120}ms` }} />)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                  {liveStatus}
                </p>

                <form
                  onSubmit={(event) => { event.preventDefault(); send(input); }}
                  className="shrink-0 border-t border-[var(--line)] bg-[var(--bg)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
                >
                  {error && <p className="mb-2 px-2 text-xs text-[var(--accent)]" role="alert">{error}</p>}
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={inputRef}
                      rows={1}
                      value={input}
                      onChange={(event) => setInput(event.target.value.slice(0, 2_000))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          send(input);
                        }
                      }}
                      placeholder="Pregúntale a Juan…"
                      disabled={streaming}
                      className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-[var(--line)] bg-[var(--bg-alt)] px-4 py-3 text-base outline-none transition focus:border-[var(--accent)]"
                    />
                    {streaming ? (
                      <button type="button" onClick={() => abortRef.current?.abort()} className="flex h-11 min-w-11 items-center justify-center rounded-2xl bg-[var(--accent)] px-3 text-xs text-[var(--accent-ink)]">Parar</button>
                    ) : (
                      <button type="submit" disabled={!input.trim()} aria-label="Enviar" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--fg)] text-[var(--bg)] transition hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] disabled:opacity-35">↑</button>
                    )}
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
