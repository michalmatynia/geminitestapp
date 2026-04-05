import { describe, it, expect, vi } from 'vitest';

import {
  formatDocumentationTooltip,
  getDocumentationTooltip,
  getDocumentationTooltipForElement,
} from '@/features/tooltip-engine/tooltip-content';
import * as documentationRegistry from '@/shared/lib/documentation/registry';

vi.mock('@/shared/lib/documentation/registry');

describe('tooltip-content', () => {
  describe('formatDocumentationTooltip', () => {
    it('should format entry with title and content', () => {
      const entry = { title: 'Test Title', content: 'Test content' } as any;
      expect(formatDocumentationTooltip(entry)).toBe('Test Title: Test content');
    });
  });

  describe('getDocumentationTooltip', () => {
    it('should return formatted tooltip for valid entry', () => {
      vi.mocked(documentationRegistry.getDocumentationEntry).mockReturnValue({
        title: 'Test',
        content: 'Content',
      } as any);

      const result = getDocumentationTooltip('products', 'test-id');
      expect(result).toBe('Test: Content');
    });

    it('should return null if entry not found', () => {
      vi.mocked(documentationRegistry.getDocumentationEntry).mockReturnValue(null);

      const result = getDocumentationTooltip('products', 'invalid-id');
      expect(result).toBeNull();
    });
  });

  describe('getDocumentationTooltipForElement', () => {
    it('should resolve from element', () => {
      const element = document.createElement('div');
      vi.mocked(documentationRegistry.resolveDocumentationEntryFromElement).mockReturnValue({
        title: 'Element Doc',
        content: 'Element content',
      } as any);

      const result = getDocumentationTooltipForElement('products', element);
      expect(result).toBe('Element Doc: Element content');
    });

    it('should use fallback if element resolution fails', () => {
      const element = document.createElement('div');
      vi.mocked(documentationRegistry.resolveDocumentationEntryFromElement).mockReturnValue(null);
      vi.mocked(documentationRegistry.getDocumentationEntry).mockReturnValue({
        title: 'Fallback',
        content: 'Fallback content',
      } as any);

      const result = getDocumentationTooltipForElement('products', element, 'fallback-id');
      expect(result).toBe('Fallback: Fallback content');
    });

    it('should return null if no entry found', () => {
      const element = document.createElement('div');
      vi.mocked(documentationRegistry.resolveDocumentationEntryFromElement).mockReturnValue(null);
      vi.mocked(documentationRegistry.getDocumentationEntry).mockReturnValue(null);

      const result = getDocumentationTooltipForElement('products', element);
      expect(result).toBeNull();
    });
  });
});
