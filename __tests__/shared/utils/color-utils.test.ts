import { darkenColor } from "@/shared/utils/color-utils";
import { describe, it, expect } from "vitest";

describe("color-utils", () => {
  describe("darkenColor", () => {
    it("should darken a color by a percentage", () => {
      // White (#ffffff) darkened by 10%
      // 10% of 255 is ~25.5 -> 26
      // 255 - 26 = 229 (#e5)
      expect(darkenColor("#ffffff", 10)).toBe("#e5e5e5");
    });

    it("should handle black color", () => {
      expect(darkenColor("#000000", 10)).toBe("#000000");
    });

    it("should darken a specific color correctly", () => {
        // #ff0000 (red) darkened by 20%
        // 20% of 255 is 51
        // 255 - 51 = 204 (#cc)
        expect(darkenColor("#ff0000", 20)).toBe("#cc0000");
    });
  });
});