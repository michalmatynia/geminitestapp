import { describe, it, expect } from 'vitest';
import { aiNodeTypeSchema, aiPathsValidationRuleSchema } from '../base';

describe('AI-Paths Core Base Contracts', () => {
  describe('aiNodeTypeSchema', () => {
    it('validates known node types', () => {
      expect(aiNodeTypeSchema.parse('trigger')).toBe('trigger');
      expect(aiNodeTypeSchema.parse('model')).toBe('model');
      expect(aiNodeTypeSchema.parse('database')).toBe('database');
    });

    it('rejects unknown node types', () => {
      expect(() => aiNodeTypeSchema.parse('unknown_type')).toThrow();
    });
  });

  describe('aiPathsValidationRuleSchema', () => {
    it('validates a valid rule', () => {
      const validRule = {
        id: 'rule-1',
        title: 'Test Rule',
        enabled: true,
        severity: 'error',
        module: 'graph',
        conditions: [
          {
            id: 'cond-1',
            operator: 'exists',
          },
        ],
      };
      expect(aiPathsValidationRuleSchema.parse(validRule)).toEqual(validRule);
    });

    it('rejects rule with empty conditions', () => {
      const invalidRule = {
        id: 'rule-1',
        title: 'Test Rule',
        enabled: true,
        severity: 'error',
        module: 'graph',
        conditions: [],
      };
      expect(() => aiPathsValidationRuleSchema.parse(invalidRule)).toThrow();
    });
  });
});
