import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  createCaseResolverFile,
  createDefaultCaseResolverWorkspace,
} from '@/features/case-resolver/settings';
import { useCaseResolverCaseSearchIndex } from '@/features/case-resolver/hooks/useCaseResolverCaseSearchIndex';

describe('useCaseResolverCaseSearchIndex', () => {
  const createWorkspace = () => {
    const caseFile = createCaseResolverFile({
      id: 'case-a',
      fileType: 'case',
      name: 'Case A',
    });
    const documentFile = createCaseResolverFile({
      id: 'doc-a',
      fileType: 'document',
      name: 'Document A',
      parentCaseId: caseFile.id,
      documentContent: '<p>Needle content</p>',
      documentContentHtml: '<p>Needle content</p>',
      documentContentPlainText: 'Needle content',
    });
    return {
      ...createDefaultCaseResolverWorkspace(),
      id: 'workspace-search',
      files: [caseFile, documentFile],
    };
  };

  it('escalates metadata mode to full-text matching for all-scope content searches', () => {
    const { result } = renderHook(() =>
      useCaseResolverCaseSearchIndex({
        workspace: createWorkspace(),
        caseSearchQuery: 'needle',
        caseSearchScope: 'all',
        indexMode: 'metadata_only',
        caseFileTypeFilter: 'all',
        caseFilterTagIds: [],
        caseFilterCaseIdentifierIds: [],
        caseFilterCategoryIds: [],
        caseFilterFolder: '__all__',
        caseFilterStatus: 'all',
        caseFilterLocked: 'all',
        caseFilterSent: 'all',
        caseFilterHierarchy: 'all',
        caseFilterReferences: 'all',
        caseTagPathById: new Map(),
        caseIdentifierPathById: new Map(),
        caseCategoryPathById: new Map(),
      })
    );

    expect(result.current.matchedCaseIds.has('case-a')).toBe(true);
  });

  it('keeps metadata-only matching for name scope without building full-text matches', () => {
    const { result } = renderHook(() =>
      useCaseResolverCaseSearchIndex({
        workspace: createWorkspace(),
        caseSearchQuery: 'needle',
        caseSearchScope: 'name',
        indexMode: 'metadata_only',
        caseFileTypeFilter: 'all',
        caseFilterTagIds: [],
        caseFilterCaseIdentifierIds: [],
        caseFilterCategoryIds: [],
        caseFilterFolder: '__all__',
        caseFilterStatus: 'all',
        caseFilterLocked: 'all',
        caseFilterSent: 'all',
        caseFilterHierarchy: 'all',
        caseFilterReferences: 'all',
        caseTagPathById: new Map(),
        caseIdentifierPathById: new Map(),
        caseCategoryPathById: new Map(),
      })
    );

    expect(result.current.matchedCaseIds.has('case-a')).toBe(false);
  });
});
