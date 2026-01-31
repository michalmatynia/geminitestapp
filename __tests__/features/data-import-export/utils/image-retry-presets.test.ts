import { describe, it, expect } from "vitest";
import { 
  getDefaultImageRetryPresets, 
  normalizeImageRetryPresets,
  buildImageRetryPresetLabel
} from "@/features/data-import-export/utils/image-retry-presets";

describe("Image Retry Presets Utils", () => {
  describe("getDefaultImageRetryPresets", () => {
    it("returns default presets", () => {
      const presets = getDefaultImageRetryPresets();
      expect(presets.length).toBeGreaterThan(0);
      expect(presets[0]!.id).toBe("lower-dimension");
    });
  });

  describe("normalizeImageRetryPresets", () => {
    it("returns defaults if input is invalid", () => {
      expect(normalizeImageRetryPresets(null)).toEqual(getDefaultImageRetryPresets());
      expect(normalizeImageRetryPresets([])).toEqual(getDefaultImageRetryPresets());
    });

    it("merges input with defaults", () => {
      const input = [{
        id: "custom-preset",
        label: "Custom Label",
        transform: { maxDimension: 800 }
      }];
      
      const normalized = normalizeImageRetryPresets(input);
      expect(normalized.length).toBe(1);
      expect(normalized[0]!.label).toBe("Custom Label");
      expect(normalized[0]!.transform.maxDimension).toBe(800);
    });

    it("overwrites labels for known IDs based on build rules", () => {
      const input = [{
        id: "lower-dimension",
        label: "Should be overwritten",
        transform: { maxDimension: 1000 }
      }];
      
      const normalized = normalizeImageRetryPresets(input);
      expect(normalized[0]!.label).toBe("Lower max dimension (1000px)");
    });
  });

  describe("buildImageRetryPresetLabel", () => {
    it("builds label correctly for known presets", () => {
      const preset = getDefaultImageRetryPresets()[0]!;
      const label = buildImageRetryPresetLabel(preset);
      expect(label).toContain("Lower max dimension");
    });
  });
});