import { describe, expect, it } from 'vitest';

import {
  resolveCaseResolverPromptExploderTarget,
} from '@/features/case-resolver/hooks/useCaseResolverState.prompt-exploder-sync';
import { createCaseResolverFile } from '@/features/case-resolver/settings';

describe('case resolver prompt exploder target resolution', () => {
  const caseFile = createCaseResolverFile({
    id: 'case-1',
    fileType: 'case',
    name: 'Case',
  });
  const documentFile = createCaseResolverFile({
    id: 'doc-1',
    fileType: 'document',
    name: 'Document',
    parentCaseId: 'case-1',
  });
  const alternateFile = createCaseResolverFile({
    id: 'doc-2',
    fileType: 'document',
    name: 'Alternate Document',
    parentCaseId: 'case-1',
  });

  it('uses payload context file when it exists in workspace', () => {
    expect(
      resolveCaseResolverPromptExploderTarget({
        workspaceActiveFileId: alternateFile.id,
        workspaceFiles: [caseFile, documentFile, alternateFile],
        payloadContextFileId: documentFile.id,
      })
    ).toEqual({
      status: 'ready',
      targetFileId: documentFile.id,
      usedActiveFallback: false,
    });
  });

  it('falls back to active file when context file is missing', () => {
    expect(
      resolveCaseResolverPromptExploderTarget({
        workspaceActiveFileId: alternateFile.id,
        workspaceFiles: [caseFile, alternateFile],
        payloadContextFileId: documentFile.id,
      })
    ).toEqual({
      status: 'ready',
      targetFileId: alternateFile.id,
      usedActiveFallback: true,
    });
  });

  it('waits when workspace has not loaded files yet', () => {
    expect(
      resolveCaseResolverPromptExploderTarget({
        workspaceActiveFileId: null,
        workspaceFiles: [],
        payloadContextFileId: documentFile.id,
      })
    ).toEqual({
      status: 'pending',
      reason: 'waiting-for-files',
    });
  });

  it('reports missing context when workspace is loaded but context is absent', () => {
    expect(
      resolveCaseResolverPromptExploderTarget({
        workspaceActiveFileId: null,
        workspaceFiles: [caseFile, alternateFile],
        payloadContextFileId: documentFile.id,
      })
    ).toEqual({
      status: 'pending',
      reason: 'context-missing',
    });
  });

  it('reports missing target when no context and no active file are available', () => {
    expect(
      resolveCaseResolverPromptExploderTarget({
        workspaceActiveFileId: null,
        workspaceFiles: [caseFile, alternateFile],
        payloadContextFileId: null,
      })
    ).toEqual({
      status: 'pending',
      reason: 'no-target',
    });
  });

  it('uses active file when payload has no context file id', () => {
    expect(
      resolveCaseResolverPromptExploderTarget({
        workspaceActiveFileId: alternateFile.id,
        workspaceFiles: [caseFile, alternateFile],
        payloadContextFileId: null,
      })
    ).toEqual({
      status: 'ready',
      targetFileId: alternateFile.id,
      usedActiveFallback: false,
    });
  });
});
