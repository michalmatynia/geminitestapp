import {
  countryCodes,
  defaultCountries,
  countryMappings,
} from "@/features/internationalization/lib/internationalizationDefaults";
import { describe, it, expect } from "vitest";

describe("internationalizationDefaults", () => {
  it("should have correct country codes", () => {
    expect(countryCodes).toContain("PL");
    expect(countryCodes).toContain("DE");
    expect(countryCodes).toContain("GB");
    expect(countryCodes).toContain("SE");
  });

  it("should have matching default countries", () => {
    expect(defaultCountries).toHaveLength(countryCodes.length);
    defaultCountries.forEach((country) => {
      expect(countryCodes).toContain(country.code);
    });
  });

  it("should have matching country mappings", () => {
    expect(countryMappings).toHaveLength(countryCodes.length);
    countryMappings.forEach((mapping) => {
      expect(countryCodes).toContain(mapping.countryCode);
      expect(mapping.languageCodes.length).toBeGreaterThan(0);
    });
  });
});
