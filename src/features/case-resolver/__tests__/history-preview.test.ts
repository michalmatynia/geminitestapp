import { describe, expect, it } from 'vitest';

import type { CaseResolverDocumentHistoryEntry } from '@/shared/contracts/case-resolver';
import { resolveCaseResolverHistoryEntryPreview } from '@/features/case-resolver/utils/caseResolverUtils';

const buildHistoryEntry = (
  overrides: Partial<CaseResolverDocumentHistoryEntry> = {}
): CaseResolverDocumentHistoryEntry => ({
  id: 'history-1',
  savedAt: '2026-02-24T12:00:00.000Z',
  documentContentVersion: 1,
  activeDocumentVersion: 'original',
  editorType: 'wysiwyg',
  documentContent: '',
  documentContentMarkdown: '',
  documentContentHtml: '',
  documentContentPlainText: '',
  ...overrides,
});

describe('resolveCaseResolverHistoryEntryPreview', () => {
  it('prefers documentContentPlainText when available', () => {
    const entry = buildHistoryEntry({
      documentContentPlainText: 'Plain text value',
      documentContentMarkdown: '# Heading',
      documentContentHtml: '<p>Html value</p>',
      documentContent: '<p>Raw value</p>',
    });

    expect(resolveCaseResolverHistoryEntryPreview(entry)).toBe('Plain text value');
  });

  it('falls back to markdown when plain text is missing', () => {
    const entry = buildHistoryEntry({
      documentContentPlainText: '',
      documentContentMarkdown: '## Heading\n\nParagraph with **bold** [link](https://example.com)',
      documentContentHtml: '',
      documentContent: '',
    });

    const preview = resolveCaseResolverHistoryEntryPreview(entry);
    expect(preview).toContain('Heading');
    expect(preview).toContain('Paragraph with bold link');
    expect(preview).not.toContain('**');
  });

  it('falls back to stripped html when plain text and markdown are missing', () => {
    const entry = buildHistoryEntry({
      documentContentPlainText: '',
      documentContentMarkdown: '',
      documentContentHtml: '<p>Alpha&nbsp;<strong>Beta</strong></p><p>Gamma</p>',
      documentContent: '',
    });

    expect(resolveCaseResolverHistoryEntryPreview(entry)).toBe('Alpha Beta\nGamma');
  });

  it('falls back to raw content when other fields are empty', () => {
    const entry = buildHistoryEntry({
      documentContentPlainText: '',
      documentContentMarkdown: '',
      documentContentHtml: '',
      documentContent: 'Raw fallback content',
    });

    expect(resolveCaseResolverHistoryEntryPreview(entry)).toBe('Raw fallback content');
  });

  it('truncates to max chars and appends ellipsis', () => {
    const entry = buildHistoryEntry({
      documentContentPlainText: 'A'.repeat(400),
    });

    const preview = resolveCaseResolverHistoryEntryPreview(entry, 240);
    expect(preview).toHaveLength(240);
    expect(preview.endsWith('...')).toBe(true);
  });

  it('returns empty string for blank inputs', () => {
    const entry = buildHistoryEntry({
      documentContentPlainText: ' \n  ',
      documentContentMarkdown: '',
      documentContentHtml: '<p><br></p>',
      documentContent: '',
    });

    expect(resolveCaseResolverHistoryEntryPreview(entry)).toBe('');
  });
});
