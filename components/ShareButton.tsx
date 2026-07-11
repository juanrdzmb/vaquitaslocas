"use client";

import { useEffect, useRef, useState } from "react";

type ShareStatus = "idle" | "sharing" | "shared" | "copied" | "error";

function wasShareCancelled(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "name" in error &&
      (error as { name?: unknown }).name === "AbortError"
  );
}

async function copyUrl(url: string): Promise<boolean> {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      // Fall back for Safari and browsers with denied clipboard permission.
    }
  }

  const textarea = document.createElement("textarea");
  const previouslyFocused = document.activeElement;
  textarea.value = url;
  textarea.readOnly = true;
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.inset = "-9999px auto auto -9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);

  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
    if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
  }
}

export default function ShareButton({ tripId }: { tripId: string }) {
  const [status, setStatus] = useState<ShareStatus>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    []
  );

  function showTemporaryStatus(nextStatus: Exclude<ShareStatus, "sharing">) {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setStatus(nextStatus);
    resetTimer.current = setTimeout(() => setStatus("idle"), 2400);
  }

  async function share() {
    if (status === "sharing") return;
    const url = new URL(
      `/trip/${encodeURIComponent(tripId)}`,
      window.location.origin
    ).toString();
    const shareData: ShareData = {
      title: document.title || "Mi viaje",
      text: "Mira este viaje",
      url,
    };

    setStatus("sharing");
    let canUseNativeShare = typeof navigator.share === "function";
    if (canUseNativeShare && typeof navigator.canShare === "function") {
      try {
        canUseNativeShare = navigator.canShare(shareData);
      } catch {
        canUseNativeShare = false;
      }
    }

    if (canUseNativeShare) {
      try {
        await navigator.share(shareData);
        showTemporaryStatus("shared");
        return;
      } catch (error) {
        if (wasShareCancelled(error)) {
          setStatus("idle");
          return;
        }
        // A failed native share can still fall back to copying the URL.
      }
    }

    const copied = await copyUrl(url);
    showTemporaryStatus(copied ? "copied" : "error");
  }

  const label =
    status === "sharing"
      ? "Abriendo…"
      : status === "shared"
        ? "Compartido"
        : status === "copied"
          ? "Enlace copiado"
          : status === "error"
            ? "No se pudo copiar"
            : "Compartir viaje";
  const completed = status === "shared" || status === "copied";

  return (
    <button
      type="button"
      onClick={share}
      disabled={status === "sharing"}
      aria-busy={status === "sharing"}
      aria-label={label}
      className="btn-ghost min-h-[44px] px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:cursor-wait disabled:opacity-60"
    >
      {completed ? (
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
        </svg>
      )}
      <span aria-live="polite">{label}</span>
    </button>
  );
}
