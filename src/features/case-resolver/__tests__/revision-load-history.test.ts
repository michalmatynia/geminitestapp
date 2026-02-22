import { describe, expect, it } from 'vitest';

import type {
  CaseResolverDocumentHistoryEntry,
  CaseResolverFileEditDraft,
} from '@/shared/contracts/case-resolver';
import { prependDraftHistorySnapshotForRevisionLoad } from '@/features/case-resolver/utils/caseResolverUtils';

const buildHistoryEntry = (
  overrides: Partial<CaseResolverDocumentHistoryEntry> = {}
): CaseResolverDocumentHistoryEntry => ({
  id: 'history-entry',
  savedAt: '2026-02-22T10:00:00.000Z',
  documentContentVersion: 2,
  activeDocumentVersion: 'original',
  editorType: 'wysiwyg',
  documentContent: '<p>Older text</p>',
  documentContentMarkdown: 'Older text',
  documentContentHtml: '<p>Older text</p>',
  documentContentPlainText: 'Older text',
  ...overrides,
});

const buildDraft = (
  overrides: Partial<CaseResolverFileEditDraft> = {}
): CaseResolverFileEditDraft => ({
  id: 'file-1',
  name: 'Case Document',
  content: '<p>Current text</p>',
  fileType: 'document',
  folder: '',
  activeDocumentVersion: 'original',
  editorType: 'wysiwyg',
  documentContentVersion: 3,
  documentContent: '<p>Current text</p>',
  documentContentMarkdown: 'Current text',
  documentContentHtml: '<p>Current text</p>',
  documentContentPlainText: 'Current text',
  documentHistory: [],
  ...overrides,
});

describe('prependDraftHistorySnapshotForRevisionLoad', () => {
  it('prepends current draft content to history before revision load', () => {
    const draft = buildDraft({
      documentHistory: [buildHistoryEntry({ id: 'history-older' })],
    });
    const loadedEntry = buildHistoryEntry({
      id: 'history-selected',
      documentContentVersion: 1,
      documentContent: '<p>Selected revision</p>',
      documentContentMarkdown: 'Selected revision',
      documentContentHtml: '<p>Selected revision</p>',
      documentContentPlainText: 'Selected revision',
    });

    const nextHistory = prependDraftHistorySnapshotForRevisionLoad({
      draft,
      loadedEntry,
      savedAt: '2026-02-22T12:00:00.000Z',
      historyLimit: 120,
    });

    expect(nextHistory).toBeDefined();
    expect(nextHistory).toHaveLength(2);
    expect(nextHistory?.[0]?.savedAt).toBe('2026-02-22T12:00:00.000Z');
    expect(nextHistory?.[0]?.documentContentVersion).toBe(3);
    expect(nextHistory?.[0]?.documentContent).toBe('<p>Current text</p>');
    expect(nextHistory?.[0]?.documentContentMarkdown).toBe('Current text');
    expect(nextHistory?.[0]?.activeDocumentVersion).toBe('original');
    expect(nextHistory?.[0]?.id.startsWith('case-doc-history-')).toBe(true);
  });

  it('returns existing history reference when selected revision equals current draft', () => {
    const existingHistory = [buildHistoryEntry({ id: 'existing' })];
    const draft = buildDraft({
      documentHistory: existingHistory,
    });
    const loadedEntry = buildHistoryEntry({
      id: 'history-selected',
      documentContentVersion: 9,
      activeDocumentVersion: 'original',
      editorType: 'wysiwyg',
      documentContent: '<p>Current text</p>',
      documentContentMarkdown: 'Current text',
      documentContentHtml: '<p>Current text</p>',
      documentContentPlainText: 'Current text',
    });

    const nextHistory = prependDraftHistorySnapshotForRevisionLoad({
      draft,
      loadedEntry,
      savedAt: '2026-02-22T12:00:00.000Z',
    });

    expect(nextHistory).toBe(existingHistory);
  });

  it('does not duplicate snapshot when top history entry already matches current content', () => {
    const topSnapshot = buildHistoryEntry({
      id: 'top-snapshot',
      documentContentVersion: 3,
      activeDocumentVersion: 'original',
      editorType: 'wysiwyg',
      documentContent: '<p>Current text</p>',
      documentContentMarkdown: 'Current text',
      documentContentHtml: '<p>Current text</p>',
      documentContentPlainText: 'Current text',
    });
    const existingHistory = [topSnapshot, buildHistoryEntry({ id: 'older' })];
    const draft = buildDraft({
      documentHistory: existingHistory,
    });
    const loadedEntry = buildHistoryEntry({
      id: 'selected',
      documentContentVersion: 1,
      documentContent: '<p>Selected revision</p>',
      documentContentMarkdown: 'Selected revision',
      documentContentHtml: '<p>Selected revision</p>',
      documentContentPlainText: 'Selected revision',
    });

    const nextHistory = prependDraftHistorySnapshotForRevisionLoad({
      draft,
      loadedEntry,
      savedAt: '2026-02-22T12:00:00.000Z',
      historyLimit: 120,
    });

    expect(nextHistory).toBe(existingHistory);
  });

  it('applies history limit after adding snapshot', () => {
    const draft = buildDraft({
      documentHistory: [
        buildHistoryEntry({ id: 'history-1' }),
        buildHistoryEntry({ id: 'history-2' }),
      ],
    });
    const loadedEntry = buildHistoryEntry({
      id: 'selected',
      documentContent: '<p>Selected revision</p>',
      documentContentMarkdown: 'Selected revision',
      documentContentHtml: '<p>Selected revision</p>',
      documentContentPlainText: 'Selected revision',
    });

    const nextHistory = prependDraftHistorySnapshotForRevisionLoad({
      draft,
      loadedEntry,
      savedAt: '2026-02-22T12:00:00.000Z',
      historyLimit: 2,
    });

    expect(nextHistory).toBeDefined();
    expect(nextHistory).toHaveLength(2);
    expect(nextHistory?.[0]?.documentContent).toBe('<p>Current text</p>');
    expect(nextHistory?.[1]?.id).toBe('history-1');
  });
});
