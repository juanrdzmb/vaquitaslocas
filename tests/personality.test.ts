import { describe, expect, it } from "vitest";
import {
  CHAT_VOICE_GUIDE,
  JUAN_VOICE,
  STRUCTURE_VOICE_GUIDE,
} from "../config/juan-personality";
import { humanizeGeneratedCopy } from "../lib/deepseek";

describe("Juan voice contract", () => {
  it("bans the robotic travel-copy phrases that were leaking into trips", () => {
    expect(JUAN_VOICE.forbidden).toEqual(
      expect.arrayContaining(["parce", "sumérgete", "vibrante", "experiencia inolvidable"])
    );
    expect(STRUCTURE_VOICE_GUIDE).toContain("Esto no es una revista de turismo");
    expect(STRUCTURE_VOICE_GUIDE).toContain("Mal:");
    expect(STRUCTURE_VOICE_GUIDE).toContain("Bien:");
  });

  it("keeps the private Amanda tone useful, intimate and bounded", () => {
    expect(CHAT_VOICE_GUIDE).toContain("solo con Amanda");
    expect(CHAT_VOICE_GUIDE).toContain("Empieza respondiendo");
    expect(CHAT_VOICE_GUIDE).toContain("No uses \"parce\"");
    expect(CHAT_VOICE_GUIDE).toContain("Nunca escribas una cita literal");
  });

  it("cleans model clichés without touching operational facts", () => {
    expect(
      humanizeGeneratedCopy(
        "Dos ubicaciones en DC. Perfecto para un almuerzo ligero en 476 5th Ave a las 14:15."
      )
    ).toBe(
      "Dos ubicaciones en DC. Te viene bien para un almuerzo ligero en 476 5th Ave a las 14:15."
    );
    expect(humanizeGeneratedCopy("Un café perfecto para leer en una ciudad vibrante.")).toBe(
      "Un café que te viene bien para leer en una ciudad con vida."
    );
    expect(humanizeGeneratedCopy("Sumérgete en una experiencia inolvidable, parce.")).toBe(
      "Entra en un plan que vale el tiempo."
    );
  });
});
