import { describe, it, expect } from 'vitest';

import { coerceStatus, normalizeSteps } from '@/shared/lib/integrations/utils/connections';

describe('integrations connection utils', () => {
  describe('coerceStatus', () => {
    it('should return valid status', () => {
      expect(coerceStatus('ok')).toBe('ok');
      expect(coerceStatus('pending')).toBe('pending');
      expect(coerceStatus('failed')).toBe('failed');
    });

    it('should fallback to failed for invalid status', () => {
      expect(coerceStatus('unknown')).toBe('failed');
      expect(coerceStatus(null)).toBe('failed');
    });
  });

  describe('normalizeSteps', () => {
    it('should return empty array for non-array input', () => {
      expect(normalizeSteps(null)).toEqual([]);
    });

    it('should normalize step entries', () => {
      const input = [
        { step: 'Step 1', status: 'ok', timestamp: '2026-01-01T00:00:00Z' },
        { step: 2, status: 'pending' },
        { step: { complex: true }, status: 'invalid' },
      ];
      const result = normalizeSteps(input);

      expect(result).toHaveLength(3);
      expect(result[0]!.step).toBe('Step 1');
      expect(result[0]!.status).toBe('ok');

      expect(result[1]!.step).toBe('2');
      expect(result[1]!.status).toBe('pending');
      expect(result[1]!.timestamp).toBeDefined();

      expect(result[2]!.step).toBe(JSON.stringify({ complex: true }));
      expect(result[2]!.status).toBe('failed');
    });
  });
});
