import { describe, expect, it } from 'vitest';
import { resolveCaseResolverPdfExtractionTemplate } from '../constants';

describe('Case Resolver Constants', () => {
  describe('resolveCaseResolverPdfExtractionTemplate', () => {
    it('should return the template for a known preset', () => {
      const template = resolveCaseResolverPdfExtractionTemplate('plain_text');
      expect(template).toContain('Extract the complete text content');
    });

    it('should return the default template for an unknown preset', () => {
      // @ts-expect-error -- testing invalid input
      const template = resolveCaseResolverPdfExtractionTemplate('invalid');
      expect(template).toContain('Extract the complete text content');
    });
  });
});
