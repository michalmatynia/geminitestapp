import { describe, it, expect } from 'vitest';
import { normalizeImageStudioAutoScalerMode } from '../autoscaler';

describe('Image Studio Autoscaler Contracts', () => {
  describe('normalizeImageStudioAutoScalerMode', () => {
    it('returns the mode if valid', () => {
      expect(normalizeImageStudioAutoScalerMode('client_auto_scaler')).toBe('client_auto_scaler');
      expect(normalizeImageStudioAutoScalerMode('server_auto_scaler')).toBe('server_auto_scaler');
    });

    it('trims whitespace and returns mode if valid', () => {
      expect(normalizeImageStudioAutoScalerMode('  client_auto_scaler  ')).toBe('client_auto_scaler');
    });

    it('returns null for invalid modes', () => {
      expect(normalizeImageStudioAutoScalerMode('invalid_mode')).toBeNull();
      expect(normalizeImageStudioAutoScalerMode('')).toBeNull();
    });

    it('returns null for non-string inputs', () => {
      expect(normalizeImageStudioAutoScalerMode(null)).toBeNull();
      expect(normalizeImageStudioAutoScalerMode(undefined)).toBeNull();
      // @ts-expect-error -- testing invalid input
      expect(normalizeImageStudioAutoScalerMode(123)).toBeNull();
    });
  });
});
