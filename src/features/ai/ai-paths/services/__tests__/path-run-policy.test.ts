import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { evaluateDisabledNodeTypesPolicy, formatDisabledNodeTypesPolicyMessage } from '../path-run-policy';

describe('AI Paths Run Policy', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('evaluateDisabledNodeTypesPolicy', () => {
    it('returns empty violations if no node types are disabled', () => {
      process.env['AI_PATHS_DISABLED_NODE_TYPES'] = '';
      const nodes = [{ id: 'n1', type: 'model' }] as any;
      
      const result = evaluateDisabledNodeTypesPolicy(nodes);
      expect(result.violations).toHaveLength(0);
    });

    it('returns violations if nodes match disabled types', () => {
      process.env['AI_PATHS_DISABLED_NODE_TYPES'] = 'model,database';
      const nodes = [
        { id: 'n1', type: 'model', title: 'GPT' },
        { id: 'n2', type: 'trigger' },
        { id: 'n3', type: 'DATABASE' },
      ] as any;

      const result = evaluateDisabledNodeTypesPolicy(nodes);
      expect(result.violations).toHaveLength(2);
      expect(result.violations[0]).toMatchObject({ nodeId: 'n1', nodeType: 'model' });
      expect(result.violations[1]).toMatchObject({ nodeId: 'n3', nodeType: 'DATABASE' });
    });
  });

  describe('formatDisabledNodeTypesPolicyMessage', () => {
    it('formats a clear message with unique node types', () => {
      const violations = [
        { nodeId: 'n1', nodeType: 'model' },
        { nodeId: 'n2', nodeType: 'model' },
        { nodeId: 'n3', nodeType: 'database' },
      ] as any;

      const message = formatDisabledNodeTypesPolicyMessage(violations);
      expect(message).toBe('Path blocked by node policy: disabled node types detected (model, database).');
    });
  });
});
