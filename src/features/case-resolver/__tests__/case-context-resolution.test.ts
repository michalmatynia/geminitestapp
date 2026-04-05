import { describe, expect, it } from 'vitest';

import {
  isCaseResolverCreateContextReady,
  resolveCaseScopedFolderTarget,
  resolveCaseContainerIdForFileId,
  resolveCaseContainerIdForFolderPath,
  resolveCaseResolverActiveCaseId,
  serializeWorkspaceForUnsavedChangesCheck,
} from '@/features/case-resolver/hooks/useCaseResolverState.helpers';
import {
  buildRequestedContextRequestKey,
  hasRequestedCaseFile,
  hasValidRequestedContextInFlight,
  resolveRequestedCaseIssueAfterRefresh,
  shouldQueueRequestedContextAutoClear,
  shouldStartRequestedContextFetch,
  stripCaseContextQueryParams,
} from '@/features/case-resolver/hooks/useCaseResolverState.helpers.requested-context';
import { createCaseResolverFile } from '@/features/case-resolver/settings';
import type { CaseResolverFile, CaseResolverFolderRecord } from '@/shared/contracts/case-resolver/file';
import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver/workspace';

const buildFilesById = (files: CaseResolverFile[]): Map<string, CaseResolverFile> =>
  new Map(files.map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file]));

describe('case resolver case context resolution', () => {
  it('resolves case container id for case and document file ids', () => {
    const caseFile = createCaseResolverFile({
      id: 'case-a',
      fileType: 'case',
      name: 'Case A',
    });
    const documentFile = createCaseResolverFile({
      id: 'doc-a',
      fileType: 'document',
      name: 'Doc A',
      parentCaseId: caseFile.id,
    });
    const files = [caseFile, documentFile];
    const filesById = buildFilesById(files);

    expect(resolveCaseContainerIdForFileId(filesById, caseFile.id)).toBe(caseFile.id);
    expect(resolveCaseContainerIdForFileId(filesById, documentFile.id)).toBe(caseFile.id);
  });

  it('resolves case container id only for direct uniquely owned folder paths', () => {
    const caseFile = createCaseResolverFile({
      id: 'case-a',
      fileType: 'case',
      name: 'Case A',
    });
    const filesById = buildFilesById([caseFile]);

    expect(
      resolveCaseContainerIdForFolderPath({
        filesById,
        folderRecords: [
          { path: 'zus', ownerCaseId: caseFile.id },
          { path: 'zus/outgoing', ownerCaseId: caseFile.id },
        ],
        folderPath: 'zus/outgoing',
      })
    ).toBe(caseFile.id);

    expect(
      resolveCaseContainerIdForFolderPath({
        filesById,
        folderRecords: [
          { path: 'zus', ownerCaseId: caseFile.id },
          { path: 'zus/outgoing', ownerCaseId: caseFile.id },
        ],
        folderPath: 'zus/outgoing/contracts',
      })
    ).toBeNull();
  });

  it('keeps active case null while requested case is still missing', () => {
    const caseFile = createCaseResolverFile({
      id: 'case-a',
      fileType: 'case',
      name: 'Case A',
    });
    const files = [caseFile];

    const activeCaseId = resolveCaseResolverActiveCaseId({
      requestedFileId: 'case-missing',
      requestedCaseContainerId: null,
      selectedCaseContainerId: caseFile.id,
      files,
    });

    expect(activeCaseId).toBeNull();
    expect(
      isCaseResolverCreateContextReady({
        activeCaseId,
        requestedFileId: 'case-missing',
        requestedCaseStatus: 'loading',
      })
    ).toBe(false);
  });

  it('enables create context once requested case is available', () => {
    const caseFile = createCaseResolverFile({
      id: 'case-a',
      fileType: 'case',
      name: 'Case A',
    });
    const files = [caseFile];

    const activeCaseId = resolveCaseResolverActiveCaseId({
      requestedFileId: caseFile.id,
      requestedCaseContainerId: caseFile.id,
      selectedCaseContainerId: null,
      files,
    });

    expect(activeCaseId).toBe(caseFile.id);
    expect(
      isCaseResolverCreateContextReady({
        activeCaseId,
        requestedFileId: caseFile.id,
        requestedCaseStatus: 'ready',
      })
    ).toBe(true);
  });

  it('keeps active case unset when no requested or selected case context is present', () => {
    const caseFile = createCaseResolverFile({
      id: 'case-a',
      fileType: 'case',
      name: 'Case A',
    });
    const files = [caseFile];

    const activeCaseId = resolveCaseResolverActiveCaseId({
      requestedFileId: null,
      requestedCaseContainerId: null,
      selectedCaseContainerId: null,
      files,
    });

    expect(activeCaseId).toBeNull();
    expect(
      isCaseResolverCreateContextReady({
        activeCaseId,
        requestedFileId: null,
        requestedCaseStatus: 'ready',
      })
    ).toBe(false);
  });

  it('keeps active case anchored to selected folder ownership when file selection is empty', () => {
    const caseFile = createCaseResolverFile({
      id: 'case-a',
      fileType: 'case',
      name: 'Case A',
    });
    const files = [caseFile];

    const activeCaseId = resolveCaseResolverActiveCaseId({
      requestedFileId: null,
      requestedCaseContainerId: null,
      selectedCaseContainerId: null,
      selectedFolderCaseContainerId: caseFile.id,
      files,
    });

    expect(activeCaseId).toBe(caseFile.id);
  });

  it('detects requested file presence in workspace files', () => {
    const caseFile = createCaseResolverFile({
      id: 'case-a',
      fileType: 'case',
      name: 'Case A',
    });
    const files = [caseFile];
    expect(hasRequestedCaseFile(files, 'case-a')).toBe(true);
    expect(hasRequestedCaseFile(files, 'case-missing')).toBe(false);
  });

  it('resolves requested context issue when refresh cannot find requested file', () => {
    expect(
      resolveRequestedCaseIssueAfterRefresh({
        refreshSucceeded: true,
        hasRequestedFileAfterRefresh: false,
      })
    ).toBe('requested_file_missing');
  });

  it('resolves requested context issue when refresh fails', () => {
    expect(
      resolveRequestedCaseIssueAfterRefresh({
        refreshSucceeded: false,
        hasRequestedFileAfterRefresh: false,
      })
    ).toBe('workspace_unavailable');
  });

  it('strips case-context query parameters and preserves unrelated params', () => {
    expect(
      stripCaseContextQueryParams(
        'fileId=case-a&openEditor=1&promptExploderSessionId=session-1&tab=tree&view=documents'
      )
    ).toBe('tab=tree&view=documents');
  });

  it('builds deterministic request key from file id and retry tick', () => {
    expect(buildRequestedContextRequestKey('case-a', 0)).toBe('case-a|0');
    expect(buildRequestedContextRequestKey(' case-a ', 2)).toBe('case-a|2');
  });

  it('allows re-attempt when prior attempt was canceled and loading is still active', () => {
    const requestKey = buildRequestedContextRequestKey('case-missing', 0);
    expect(
      shouldStartRequestedContextFetch({
        currentRequestKey: requestKey,
        attemptedRequestKey: requestKey,
        inFlightRequestKey: null,
        currentStatus: 'loading',
      })
    ).toBe(true);
  });

  it('prevents duplicate fetch while matching request key is already in flight', () => {
    const requestKey = buildRequestedContextRequestKey('case-missing', 1);
    expect(
      shouldStartRequestedContextFetch({
        currentRequestKey: requestKey,
        attemptedRequestKey: requestKey,
        inFlightRequestKey: requestKey,
        currentStatus: 'loading',
      })
    ).toBe(false);
  });

  it('requires explicit retry key change after terminal missing state', () => {
    const requestKey = buildRequestedContextRequestKey('case-missing', 1);
    expect(
      shouldStartRequestedContextFetch({
        currentRequestKey: requestKey,
        attemptedRequestKey: requestKey,
        inFlightRequestKey: null,
        currentStatus: 'missing',
      })
    ).toBe(false);
  });

  it('queues auto-clear once for missing requested context terminal state', () => {
    const requestKey = buildRequestedContextRequestKey('case-missing', 3);
    expect(
      shouldQueueRequestedContextAutoClear({
        requestedFileId: 'case-missing',
        requestedCaseStatus: 'missing',
        requestedCaseIssue: 'requested_file_missing',
        requestKey,
        lastQueuedRequestKey: null,
      })
    ).toBe(true);
    expect(
      shouldQueueRequestedContextAutoClear({
        requestedFileId: 'case-missing',
        requestedCaseStatus: 'missing',
        requestedCaseIssue: 'requested_file_missing',
        requestKey,
        lastQueuedRequestKey: requestKey,
      })
    ).toBe(false);
  });

  it('does not queue auto-clear while context is still loading', () => {
    const requestKey = buildRequestedContextRequestKey('case-missing', 4);
    expect(
      shouldQueueRequestedContextAutoClear({
        requestedFileId: 'case-missing',
        requestedCaseStatus: 'loading',
        requestedCaseIssue: null,
        requestKey,
        lastQueuedRequestKey: null,
      })
    ).toBe(false);
  });

  it('does not queue auto-clear for workspace_unavailable issue', () => {
    const requestKey = buildRequestedContextRequestKey('case-missing', 5);
    expect(
      shouldQueueRequestedContextAutoClear({
        requestedFileId: 'case-missing',
        requestedCaseStatus: 'missing',
        requestedCaseIssue: 'workspace_unavailable',
        requestKey,
        lastQueuedRequestKey: null,
      })
    ).toBe(false);
  });

  it('treats watchdog in-flight request validity based on key and age', () => {
    expect(
      hasValidRequestedContextInFlight({
        currentRequestKey: 'case-a|1',
        inFlightRequestKey: 'case-a|1',
        startedAtMs: 10_000,
        nowMs: 14_000,
        watchdogMs: 5_000,
      })
    ).toBe(true);
    expect(
      hasValidRequestedContextInFlight({
        currentRequestKey: 'case-a|1',
        inFlightRequestKey: 'case-a|1',
        startedAtMs: 10_000,
        nowMs: 16_500,
        watchdogMs: 5_000,
      })
    ).toBe(false);
    expect(
      hasValidRequestedContextInFlight({
        currentRequestKey: 'case-a|1',
        inFlightRequestKey: 'case-b|1',
        startedAtMs: 10_000,
        nowMs: 12_000,
        watchdogMs: 5_000,
      })
    ).toBe(false);
  });

  it('keeps folder target when it belongs to the active case', () => {
    expect(
      resolveCaseScopedFolderTarget({
        targetFolderPath: 'case-a/folder',
        ownerCaseId: 'case-a',
        folderRecords: [
          { path: 'case-a/folder', ownerCaseId: 'case-a' } as CaseResolverFolderRecord,
          { path: 'case-b/folder', ownerCaseId: 'case-b' } as CaseResolverFolderRecord,
        ],
      })
    ).toBe('case-a/folder');
  });

  it('resets folder target to root when stale selection belongs to another case', () => {
    expect(
      resolveCaseScopedFolderTarget({
        targetFolderPath: 'case-b/folder',
        ownerCaseId: 'case-a',
        folderRecords: [
          { path: 'case-a/folder', ownerCaseId: 'case-a' } as CaseResolverFolderRecord,
          { path: 'case-b/folder', ownerCaseId: 'case-b' } as CaseResolverFolderRecord,
        ],
      })
    ).toBe('');
  });

  it('ignores active file selection in unsaved-change fingerprint', () => {
    const caseFile = createCaseResolverFile({
      id: 'case-a',
      fileType: 'case',
      name: 'Case A',
    });
    const documentFile = createCaseResolverFile({
      id: 'doc-a',
      fileType: 'document',
      name: 'Doc A',
      parentCaseId: caseFile.id,
    });
    const baseWorkspace: Partial<CaseResolverWorkspace> = {
      version: 2 as const,
      workspaceRevision: 0,
      lastMutationId: null,
      lastMutationAt: null,
      folders: [],
      folderRecords: [],
      folderTimestamps: {},
      files: [caseFile, documentFile],
      assets: [],
      relationGraph: { nodes: [], edges: [], nodeMeta: {}, edgeMeta: {} },
      activeFileId: caseFile.id,
    };
    const selectedOtherFileWorkspace = {
      ...baseWorkspace,
      activeFileId: documentFile.id,
    };

    expect(serializeWorkspaceForUnsavedChangesCheck(baseWorkspace as CaseResolverWorkspace)).toBe(
      serializeWorkspaceForUnsavedChangesCheck(selectedOtherFileWorkspace as CaseResolverWorkspace)
    );
  });

  it('ignores workspace revision metadata in unsaved-change fingerprint', () => {
    const caseFile = createCaseResolverFile({
      id: 'case-a',
      fileType: 'case',
      name: 'Case A',
    });
    const documentFile = createCaseResolverFile({
      id: 'doc-a',
      fileType: 'document',
      name: 'Doc A',
      parentCaseId: caseFile.id,
    });
    const baseWorkspace: Partial<CaseResolverWorkspace> = {
      version: 2 as const,
      workspaceRevision: 1,
      lastMutationId: 'mutation-a',
      lastMutationAt: '2026-02-19T00:00:00.000Z',
      folders: [],
      folderRecords: [],
      folderTimestamps: {},
      files: [caseFile, documentFile],
      assets: [],
      relationGraph: { nodes: [], edges: [], nodeMeta: {}, edgeMeta: {} },
      activeFileId: caseFile.id,
    };
    const revisionOnlyWorkspace = {
      ...baseWorkspace,
      workspaceRevision: 2,
      lastMutationId: 'mutation-b',
      lastMutationAt: '2026-02-19T00:05:00.000Z',
    };

    expect(serializeWorkspaceForUnsavedChangesCheck(baseWorkspace as CaseResolverWorkspace)).toBe(
      serializeWorkspaceForUnsavedChangesCheck(revisionOnlyWorkspace as CaseResolverWorkspace)
    );
  });

  it('normalizes object key ordering in unsaved-change fingerprint', () => {
    const caseFile = createCaseResolverFile({
      id: 'case-a',
      fileType: 'case',
      name: 'Case A',
    });
    const folderTimestampA = {
      createdAt: '2026-02-19T00:00:00.000Z',
      updatedAt: '2026-02-19T00:00:00.000Z',
    };
    const folderTimestampB = {
      createdAt: '2026-02-19T00:01:00.000Z',
      updatedAt: '2026-02-19T00:01:00.000Z',
    };
    const baseWorkspace: Partial<CaseResolverWorkspace> = {
      version: 2 as const,
      workspaceRevision: 1,
      lastMutationId: null,
      lastMutationAt: null,
      folders: ['a', 'b'],
      folderRecords: [],
      folderTimestamps: {
        b: folderTimestampB,
        a: folderTimestampA,
      },
      files: [caseFile],
      assets: [],
      relationGraph: { nodes: [], edges: [], nodeMeta: {}, edgeMeta: {} },
      activeFileId: caseFile.id,
    };
    const reorderedWorkspace = {
      ...baseWorkspace,
      folderTimestamps: {
        a: folderTimestampA,
        b: folderTimestampB,
      },
    };

    expect(serializeWorkspaceForUnsavedChangesCheck(baseWorkspace as CaseResolverWorkspace)).toBe(
      serializeWorkspaceForUnsavedChangesCheck(reorderedWorkspace as CaseResolverWorkspace)
    );
  });

  it('still detects real workspace changes in unsaved-change fingerprint', () => {
    const caseFile = createCaseResolverFile({
      id: 'case-a',
      fileType: 'case',
      name: 'Case A',
    });
    const documentFile = createCaseResolverFile({
      id: 'doc-a',
      fileType: 'document',
      name: 'Doc A',
      parentCaseId: caseFile.id,
    });
    const baseWorkspace: Partial<CaseResolverWorkspace> = {
      version: 2 as const,
      workspaceRevision: 0,
      lastMutationId: null,
      lastMutationAt: null,
      folders: [],
      folderRecords: [],
      folderTimestamps: {},
      files: [caseFile, documentFile],
      assets: [],
      relationGraph: { nodes: [], edges: [], nodeMeta: {}, edgeMeta: {} },
      activeFileId: caseFile.id,
    };
    const renamedDocumentWorkspace = {
      ...baseWorkspace,
      files: [
        caseFile,
        {
          ...documentFile,
          name: 'Doc A Updated',
        },
      ],
    };

    expect(
      serializeWorkspaceForUnsavedChangesCheck(baseWorkspace as CaseResolverWorkspace)
    ).not.toBe(
      serializeWorkspaceForUnsavedChangesCheck(renamedDocumentWorkspace as CaseResolverWorkspace)
    );
  });
});
