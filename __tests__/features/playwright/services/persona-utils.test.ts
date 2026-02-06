import { describe, it, expect } from 'vitest';

import { defaultPlaywrightSettings } from '@/features/playwright/constants/playwright';
import { 
  normalizePlaywrightPersonas, 
  arePlaywrightSettingsEqual, 
  findPlaywrightPersonaMatch,
  buildPlaywrightSettings 
} from '@/features/playwright/utils/personas';

describe('Playwright Persona Utils', () => {
  describe('normalizePlaywrightPersonas', () => {
    it('returns empty array for invalid input', () => {
      expect(normalizePlaywrightPersonas(null)).toEqual([]);
      expect(normalizePlaywrightPersonas({})).toEqual([]);
    });

    it('filters out personas without names', () => {
      const input = [{ name: '' }, { name: 'Valid' }];
      const result = normalizePlaywrightPersonas(input);
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('Valid');
    });

    it('ensures default settings are applied', () => {
      const input = [{ name: 'Standard' }];
      const result = normalizePlaywrightPersonas(input);
      expect(result[0]!.settings).toEqual(defaultPlaywrightSettings);
    });

    it('assigns IDs if missing', () => {
      const input = [{ name: 'No ID' }];
      const result = normalizePlaywrightPersonas(input);
      expect(result[0]!.id).toBeDefined();
    });
  });

  describe('arePlaywrightSettingsEqual', () => {
    it('returns true for identical settings', () => {
      const s1 = buildPlaywrightSettings({ slowMo: 100 });
      const s2 = buildPlaywrightSettings({ slowMo: 100 });
      expect(arePlaywrightSettingsEqual(s1, s2)).toBe(true);
    });

    it('returns false for different settings', () => {
      const s1 = buildPlaywrightSettings({ slowMo: 100 });
      const s2 = buildPlaywrightSettings({ slowMo: 200 });
      expect(arePlaywrightSettingsEqual(s1, s2)).toBe(false);
    });
  });

  describe('findPlaywrightPersonaMatch', () => {
    it('returns the matching persona', () => {
      const settings = buildPlaywrightSettings({ slowMo: 500 });
      const personas = [
        { id: 'p1', name: 'P1', settings: buildPlaywrightSettings({ slowMo: 100 }) },
        { id: 'p2', name: 'P2', settings: buildPlaywrightSettings({ slowMo: 500 }) },
      ] as any;
      
      const match = findPlaywrightPersonaMatch(settings, personas);
      expect(match?.id).toBe('p2');
    });

    it('returns null if no match', () => {
      const match = findPlaywrightPersonaMatch(defaultPlaywrightSettings, []);
      expect(match).toBeNull();
    });
  });
});
