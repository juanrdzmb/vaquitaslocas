"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, ShareNetworkIcon } from "@phosphor-icons/react";
import { canonicalTripUrl } from "@/lib/app-url";

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

export default function ShareButton({
  tripId,
  title,
  destination,
}: {
  tripId: string;
  title?: string;
  destination?: string;
}) {
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
    const url = canonicalTripUrl(tripId, window.location.origin);
    const shareData: ShareData = {
      title: title ? `${title} · VaquitasLocas` : document.title || "Mi viaje",
      text: destination
        ? `Amanda, te dejo aquí el viaje a ${destination}. Hasta compartirlo funciona; mi heroísmo no conoce límites.`
        : "Amanda, te dejo aquí el viaje. Hasta compartirlo funciona; mi heroísmo no conoce límites.",
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
        <CheckIcon size={17} weight="bold" aria-hidden />
      ) : (
        <ShareNetworkIcon size={17} weight="duotone" aria-hidden />
      )}
      <span aria-live="polite">{label}</span>
    </button>
  );
}
