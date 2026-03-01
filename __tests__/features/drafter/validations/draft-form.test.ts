import { describe, it, expect } from 'vitest';

import { draftSubmitSchema } from '@/features/drafter/validations/draft-form';

describe('draft-form validation', () => {
  describe('draftSubmitSchema', () => {
    it('should validate valid draft with theme color', () => {
      const data = {
        name: 'Test Draft',
        iconColorMode: 'theme' as const,
        openProductFormTab: 'basic' as const,
      };

      const result = draftSubmitSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate valid draft with custom color', () => {
      const data = {
        name: 'Test Draft',
        iconColorMode: 'custom' as const,
        iconColor: '#60a5fa',
        openProductFormTab: 'basic' as const,
      };

      const result = draftSubmitSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const data = {
        name: '',
        iconColorMode: 'theme' as const,
        openProductFormTab: 'basic' as const,
      };

      const result = draftSubmitSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('required');
      }
    });

    it('should trim whitespace from name', () => {
      const data = {
        name: '  Test Draft  ',
        iconColorMode: 'theme' as const,
        openProductFormTab: 'basic' as const,
      };

      const result = draftSubmitSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test Draft');
      }
    });

    it('should reject invalid hex color', () => {
      const data = {
        name: 'Test Draft',
        iconColorMode: 'custom' as const,
        iconColor: 'invalid',
        openProductFormTab: 'basic' as const,
      };

      const result = draftSubmitSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('hex');
      }
    });

    it('should reject short hex color', () => {
      const data = {
        name: 'Test Draft',
        iconColorMode: 'custom' as const,
        iconColor: '#fff',
        openProductFormTab: 'basic' as const,
      };

      const result = draftSubmitSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept uppercase hex color', () => {
      const data = {
        name: 'Test Draft',
        iconColorMode: 'custom' as const,
        iconColor: '#60A5FA',
        openProductFormTab: 'basic' as const,
      };

      const result = draftSubmitSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should not validate color when mode is theme', () => {
      const data = {
        name: 'Test Draft',
        iconColorMode: 'theme' as const,
        iconColor: 'invalid',
        openProductFormTab: 'basic' as const,
      };

      const result = draftSubmitSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});
