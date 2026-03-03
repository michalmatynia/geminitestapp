import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDocumentRelationSearch } from '@/features/case-resolver/relation-search/hooks/useDocumentRelationSearch';
import { parseCaseResolverWorkspace } from '@/features/case-resolver/settings';

const workspace = parseCaseResolverWorkspace(
  JSON.stringify({
    files: [
      {
        id: 'case-1',
        fileType: 'case',
        name: 'Case A',
        caseIdentifierId: 'id-1',
      },
      {
        id: 'doc-1',
        fileType: 'document',
        name: 'Document A',
        parentCaseId: 'case-1',
        folder: '',
      },
      {
        id: 'scan-1',
        fileType: 'scanfile',
        name: 'Scan A',
        parentCaseId: 'case-1',
        folder: '',
      },
    ],
  })
);

describe('useDocumentRelationSearch initial file type', () => {
  it('applies document default filter on first mount and allows switching to all', () => {
    const { result } = renderHook(() =>
      useDocumentRelationSearch({
        workspace,
        activeCaseId: null,
        caseResolverIdentifiers: [{ id: 'id-1', label: 'SIG/1' }],
        excludeFileIds: [],
        initialScope: 'all_cases',
        initialFileType: 'document',
      })
    );

    expect(result.current.fileTypeFilter).toBe('document');
    expect(result.current.visibleDocumentSearchRows.map((row) => row.file.id)).toEqual(['doc-1']);

    act(() => {
      result.current.setFileTypeFilter('all');
    });

    expect(result.current.fileTypeFilter).toBe('all');
    expect(new Set(result.current.visibleDocumentSearchRows.map((row) => row.file.id))).toEqual(
      new Set(['doc-1', 'scan-1'])
    );
  });

  it('applies scanfile default filter on first mount', () => {
    const { result } = renderHook(() =>
      useDocumentRelationSearch({
        workspace,
        activeCaseId: null,
        caseResolverIdentifiers: [{ id: 'id-1', label: 'SIG/1' }],
        excludeFileIds: [],
        initialScope: 'all_cases',
        initialFileType: 'scanfile',
      })
    );

    expect(result.current.fileTypeFilter).toBe('scanfile');
    expect(result.current.visibleDocumentSearchRows.map((row) => row.file.id)).toEqual(['scan-1']);
  });
});
