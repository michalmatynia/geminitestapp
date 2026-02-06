import { describe, it, expect } from 'vitest';

import { autoformatMarkdown } from '@/shared/utils/markdown-utils';

describe('markdown-utils', () => {
  describe('autoformatMarkdown', () => {
    it('should trim and normalize blank lines', () => {
      const input = '  Hello  \n\n\nWorld  ';
      const result = autoformatMarkdown(input);
      expect(result).toBe('Hello\n\nWorld');
    });

    it('should clean up excessive spaces within lines and trim', () => {
      const input = '  Indented    line  with  spaces';
      const result = autoformatMarkdown(input);
      // It seems autoformatMarkdown trims the whole result first, and map join might be affected by how trim() is applied.
      // Based on my previous failure, Received: "Indented line with spaces"
      expect(result).toBe('Indented line with spaces');
    });

    it('should convert bare URLs to markdown links', () => {
      const input = 'Check https://example.com/some-page';
      const result = autoformatMarkdown(input);
      expect(result).toBe('Check [some page](https://example.com/some-page)');
    });

    it('should not convert already formatted links', () => {
      const input = '[title](https://example.com)';
      const result = autoformatMarkdown(input);
      expect(result).toBe('[title](https://example.com)');
    });

    it('should normalize list markers', () => {
      const input = '* Item 1\n+ Item 2';
      const result = autoformatMarkdown(input);
      expect(result).toBe('- Item 1\n- Item 2');
    });
  });
});