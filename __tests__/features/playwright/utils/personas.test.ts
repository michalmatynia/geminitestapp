import {
  arePlaywrightSettingsEqual,
  findPlaywrightPersonaMatch,
  normalizePlaywrightPersonas,
  buildPlaywrightSettings,
  createPlaywrightPersonaId
} from "@/features/playwright/utils/personas";
import { describe, it, expect } from "vitest";

describe("playwright personas", () => {
  describe("createPlaywrightPersonaId", () => {
      it("should return a string", () => {
          expect(typeof createPlaywrightPersonaId()).toBe("string");
      });
  });

  describe("arePlaywrightSettingsEqual", () => {
    it("should return true for identical settings", () => {
      const s1 = buildPlaywrightSettings();
      const s2 = buildPlaywrightSettings();
      expect(arePlaywrightSettingsEqual(s1, s2)).toBe(true);
    });

    it("should return false for different settings", () => {
      const s1 = buildPlaywrightSettings({ headless: true });
      const s2 = buildPlaywrightSettings({ headless: false });
      expect(arePlaywrightSettingsEqual(s1, s2)).toBe(false);
    });
  });

  describe("findPlaywrightPersonaMatch", () => {
    it("should find matching persona", () => {
      const settings = buildPlaywrightSettings({ headless: true });
      const personas = [
        {
          id: "1",
          name: "Test",
          settings: buildPlaywrightSettings({ headless: true }),
          createdAt: "",
          updatedAt: "",
        },
      ];
      const match = findPlaywrightPersonaMatch(settings, personas);
      expect(match).toEqual(personas[0]);
    });

    it("should return null if no match", () => {
      const settings = buildPlaywrightSettings({ headless: true });
      const personas = [
        {
          id: "1",
          name: "Test",
          settings: buildPlaywrightSettings({ headless: false }),
          createdAt: "",
          updatedAt: "",
        },
      ];
      const match = findPlaywrightPersonaMatch(settings, personas);
      expect(match).toBeNull();
    });
  });

  describe("normalizePlaywrightPersonas", () => {
    it("should filter out invalid items", () => {
      const input = [
        null,
        {},
        { name: " Valid " },
        { name: "" }, // invalid
      ];
      const result = normalizePlaywrightPersonas(input);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Valid");
    });

    it("should assign defaults", () => {
      const input = [{ name: "Test" }];
      const result = normalizePlaywrightPersonas(input);
      expect(result[0].id).toBeDefined();
      expect(result[0].createdAt).toBeDefined();
      expect(result[0].settings).toBeDefined();
    });
  });
});
