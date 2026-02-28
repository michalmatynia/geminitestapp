import { describe, it, expect } from 'vitest';

import {
  jsonValueToRecord,
  reminderList,
  buildSelfImprovementPlaybook,
} from '@/features/ai/agent-runtime/core/utils';

describe('Agent Runtime - Core Utils', () => {
  describe('jsonValueToRecord', () => {
    it('should convert object to record', () => {
      const input = { a: 1 };
      expect(jsonValueToRecord(input)).toEqual(input);
    });

    it('should return null for non-objects', () => {
      expect(jsonValueToRecord(null)).toBeNull();
      expect(jsonValueToRecord('string')).toBeNull();
      expect(jsonValueToRecord([])).toBeNull();
    });
  });

  describe('reminderList', () => {
    it('should format list correctly', () => {
      expect(reminderList('Label', ['A', 'B'])).toBe('Label: A | B');
    });

    it('should return null for empty list', () => {
      expect(reminderList('Label', [])).toBeNull();
    });
  });

  describe('buildSelfImprovementPlaybook', () => {
    it('should aggregate data from multiple items', () => {
      const items = [
        {
          summary: 'First learn',
          metadata: {
            mistakes: ['Error 1'],
            improvements: ['Better A'],
          },
        },
        {
          summary: 'Second learn',
          metadata: {
            mistakes: ['Error 2'],
            improvements: ['Better B'],
            guardrails: ['Guard 1'],
          },
        },
      ];

      const result = buildSelfImprovementPlaybook(items);
      expect(result).toContain('Recent learning: First learn | Second learn');
      expect(result).toContain('Avoid: Error 1 | Error 2');
      expect(result).toContain('Improve: Better A | Better B');
      expect(result).toContain('Guardrails: Guard 1');
    });

    it('should return null for empty items', () => {
      expect(buildSelfImprovementPlaybook([])).toBeNull();
    });

    it('should handle missing metadata fields', () => {
      const result = buildSelfImprovementPlaybook([{ summary: 'Simple' }]);
      expect(result).toContain('Recent learning: Simple');
      expect(result).not.toContain('Avoid:');
    });
  });
});
