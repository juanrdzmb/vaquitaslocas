import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const chat = readFileSync(new URL("../components/ChatPanel.tsx", import.meta.url), "utf8");
const routeBuilder = readFileSync(
  new URL("../components/MapRouteBuilder.tsx", import.meta.url),
  "utf8"
);

function cssRule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  if (!match) throw new Error(`Missing CSS rule for ${selector}`);
  return match[1];
}

describe("narrow mobile containment", () => {
  it("lets the document shrink below the old hard-coded 320px floor", () => {
    const body = cssRule("body");
    expect(body).toContain("min-width: 0");
    expect(body).not.toContain("min-width: 320px");
    expect(body).toContain("overflow-x: clip");
  });

  it("prevents chapter content from defining a desktop-sized grid track", () => {
    const list = cssRule(".trip-chapter-deck__list");
    const chapter = cssRule(".trip-chapter");
    const panel = cssRule(".trip-chapter__panel");
    expect(list).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(list).toContain("min-width: 0");
    expect(chapter).toContain("min-width: 0");
    expect(chapter).toContain("max-width: 100%");
    expect(panel).toContain("min-width: 0");
    expect(panel).toContain("max-width: 100%");
  });

  it("keeps legitimate horizontal rails scrollable inside the viewport", () => {
    expect(cssRule(".trip-day-rail")).toContain("overflow-x: auto");
    expect(cssRule(".travel-library__rail")).toContain("overflow-x: auto");
    expect(cssRule(".source-tabs")).toContain("overflow-x: auto");
  });

  it("allows chat input and route controls to shrink or wrap", () => {
    expect(chat).toContain('className="flex min-w-0 items-end gap-2"');
    expect(chat).toContain("min-h-11 min-w-0 flex-1 resize-none");
    expect(routeBuilder).toContain("route-candidate");
    expect(routeBuilder).toContain("route-order-actions");
    expect(css).toContain(".route-order-actions");
    expect(css).toContain("flex-basis: 100%");
  });
});
