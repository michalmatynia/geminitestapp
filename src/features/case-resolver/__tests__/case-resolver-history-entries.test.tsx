import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CaseResolverDocumentHistoryEntry } from '@/shared/contracts/case-resolver/history';
import { CaseResolverHistoryEntries } from '@/features/case-resolver/components/page/CaseResolverHistoryEntries';
import { CaseResolverHistoryEntriesRuntimeProvider } from '@/features/case-resolver/components/page/CaseResolverHistoryEntriesRuntimeContext';

const buildHistoryEntry = (
  overrides: Partial<CaseResolverDocumentHistoryEntry> = {}
): CaseResolverDocumentHistoryEntry => ({
  id: 'history-1',
  savedAt: '2026-02-24T12:00:00.000Z',
  documentContentVersion: 12,
  activeDocumentVersion: 'original',
  editorType: 'wysiwyg',
  documentContent: '',
  documentContentMarkdown: '',
  documentContentHtml: '',
  documentContentPlainText: '',
  ...overrides,
});

describe('CaseResolverHistoryEntries', () => {
  it('supports the shared runtime context path when explicit props are omitted', () => {
    render(
      <CaseResolverHistoryEntriesRuntimeProvider
        value={{
          entries: [
            buildHistoryEntry({
              documentContentPlainText: 'Runtime preview text',
            }),
          ],
          formatTimestamp: (value: string): string => `CTX:${value}`,
          onRestore: vi.fn(),
          isRestoreDisabled: false,
        }}
      >
        <CaseResolverHistoryEntries />
      </CaseResolverHistoryEntriesRuntimeProvider>
    );

    expect(screen.getByText('CTX:2026-02-24T12:00:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('Runtime preview text')).toBeInTheDocument();
  });

  it('renders preview text for revision entries', () => {
    render(
      <CaseResolverHistoryEntries
        entries={[
          buildHistoryEntry({
            documentContentPlainText: 'Revision preview text',
          }),
        ]}
        formatTimestamp={(value: string): string => `TS:${value}`}
        onRestore={vi.fn()}
        isRestoreDisabled={false}
      />
    );

    expect(screen.getByText('TS:2026-02-24T12:00:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('Revision preview text')).toBeInTheDocument();
  });

  it('renders fallback label when preview is empty', () => {
    render(
      <CaseResolverHistoryEntries
        entries={[buildHistoryEntry()]}
        formatTimestamp={(value: string): string => value}
        onRestore={vi.fn()}
        isRestoreDisabled={false}
      />
    );

    expect(screen.getByText('No preview text.')).toBeInTheDocument();
  });

  it('keeps restore action available and calls callback with selected entry', () => {
    const onRestore = vi.fn();
    const entry = buildHistoryEntry({ id: 'history-restore' });

    render(
      <CaseResolverHistoryEntries
        entries={[entry]}
        formatTimestamp={(value: string): string => value}
        onRestore={onRestore}
        isRestoreDisabled={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(onRestore).toHaveBeenCalledWith(entry);
  });
});
