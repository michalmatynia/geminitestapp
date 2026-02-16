import { describe, expect, it } from 'vitest';

import {
  convertHtmlToMarkdown,
  deriveDocumentContentSync,
  normalizeRawDocumentModeFromContent,
  stripHtmlToPlainText,
} from '@/features/document-editor/content-format';

describe('document-editor content-format', () => {
  it('derives markdown payloads into html and plain text', () => {
    const derived = deriveDocumentContentSync({
      mode: 'markdown',
      value: '# Title\n\n- Item',
    });

    expect(derived.mode).toBe('markdown');
    expect(derived.markdown).toContain('# Title');
    expect(derived.html).toContain('<h1>');
    expect(derived.html).toContain('<ul>');
    expect(derived.plainText).toContain('Title');
  });

  it('sanitizes wysiwyg html payloads', () => {
    const derived = deriveDocumentContentSync({
      mode: 'wysiwyg',
      value: '<h2>Header</h2><script>alert(1)</script><p>Body</p>',
    });

    expect(derived.mode).toBe('wysiwyg');
    expect(derived.html).not.toContain('<script');
    expect(derived.plainText).toContain('Header');
    expect(derived.plainText).toContain('Body');
  });

  it('detects fallback mode from raw content', () => {
    expect(normalizeRawDocumentModeFromContent({ rawContent: '<p>Hello</p>' })).toBe('wysiwyg');
    expect(normalizeRawDocumentModeFromContent({ rawContent: '## Header' })).toBe('markdown');
    expect(normalizeRawDocumentModeFromContent({ mode: 'code' })).toBe('code');
  });

  it('converts html to markdown asynchronously', async () => {
    const converted = await convertHtmlToMarkdown('<h2>Header</h2><p>Body</p>');
    expect(converted.markdown.toLowerCase()).toContain('header');
    expect(converted.markdown.toLowerCase()).toContain('body');
  });

  it('strips html to plain text with line breaks preserved', () => {
    const plain = stripHtmlToPlainText('<p>Line A</p><p>Line B<br/>Line C</p>');
    expect(plain).toContain('Line A');
    expect(plain).toContain('Line B');
    expect(plain).toContain('Line C');
  });
});
