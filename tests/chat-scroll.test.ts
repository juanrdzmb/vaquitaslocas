import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../components/ChatPanel.tsx", import.meta.url), "utf8");

function readClassConstant(name: string): string {
  const match = source.match(new RegExp(`export const ${name} =\\s*\\n\\s*"([^"]+)";`));
  if (!match) throw new Error(`The ${name} class constant could not be found.`);
  return match[1];
}

function readNearBottomExpression(): (viewport: { scrollHeight: number; scrollTop: number; clientHeight: number }, threshold: number) => boolean {
  const match = source.match(/return (viewport\.scrollHeight - viewport\.scrollTop - viewport\.clientHeight <= threshold);/);
  if (!match) throw new Error("The chat bottom-proximity expression could not be found.");
  return new Function("viewport", "threshold", `return ${match[1]};`) as ReturnType<typeof readNearBottomExpression>;
}

describe("chat scrolling", () => {
  it("keeps following the stream only while the reader is near the bottom", () => {
    const isNearBottom = readNearBottomExpression();
    expect(isNearBottom({ scrollHeight: 1_200, scrollTop: 605, clientHeight: 500 }, 96)).toBe(true);
    expect(isNearBottom({ scrollHeight: 1_200, scrollTop: 450, clientHeight: 500 }, 96)).toBe(false);
    expect(isNearBottom({ scrollHeight: 400, scrollTop: 0, clientHeight: 600 }, 96)).toBe(true);
  });

  it("preserves the mobile flex column and the one dedicated scroll viewport", () => {
    const dialogClass = readClassConstant("CHAT_DIALOG_CLASS");
    const scrollClass = readClassConstant("CHAT_SCROLL_CONTAINER_CLASS");
    expect(dialogClass).toContain("flex-col");
    expect(dialogClass).toContain("min-h-0");
    expect(dialogClass).toContain("overflow-hidden");
    expect(scrollClass).toContain("min-h-0");
    expect(scrollClass).toContain("overflow-y-auto");
    expect(scrollClass).toContain("overscroll-contain");
    expect(source).toContain('onScroll={(event) =>');
    expect(source).toContain("stickToBottomRef.current = isChatNearBottom(event.currentTarget)");
  });

  it("does not drag the reader back down after they scroll away", () => {
    expect(source).toContain("(!stickToBottomRef.current && !forceScrollRef.current)");
    expect(source).toContain("forceScrollRef.current = true");
  });

  it("contains unbroken URLs, code and other very long message content", () => {
    const messageClass = readClassConstant("CHAT_MESSAGE_CLASS");
    expect(messageClass).toContain("min-w-0");
    expect(messageClass).toContain("overflow-hidden");
    expect(messageClass).toContain("[overflow-wrap:anywhere]");
    expect(source).toContain('className="break-all font-medium');
    expect(source).toContain('overflow-x-auto rounded-xl');
  });
});
