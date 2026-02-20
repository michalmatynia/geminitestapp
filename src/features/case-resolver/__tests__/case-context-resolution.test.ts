import { describe, expect, it } from 'vitest';

import {
  isCaseResolverCreateContextReady,
  resolveCaseScopedFolderTarget,
  resolveCaseContainerIdForFileId,
  resolveCaseResolverActiveCaseId,
  serializeWorkspaceForUnsavedChangesCheck,
} from '@/features/case-resolver/hooks/useCaseResolverState.helpers';
import { createCaseResolverFile } from '@/features/case-resolver/settings';
import type { CaseResolverFile } from '@/shared/contracts/case-resolver';

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
      }),
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
      }),
    ).toBe(true);
  });

  it('keeps folder target when it belongs to the active case', () => {
    expect(
      resolveCaseScopedFolderTarget({
        targetFolderPath: 'case-a/folder',
        ownerCaseId: 'case-a',
        folderRecords: [
          { path: 'case-a/folder', ownerCaseId: 'case-a' },
          { path: 'case-b/folder', ownerCaseId: 'case-b' },
        ],
      }),
    ).toBe('case-a/folder');
  });

  it('resets folder target to root when stale selection belongs to another case', () => {
    expect(
      resolveCaseScopedFolderTarget({
        targetFolderPath: 'case-b/folder',
        ownerCaseId: 'case-a',
        folderRecords: [
          { path: 'case-a/folder', ownerCaseId: 'case-a' },
          { path: 'case-b/folder', ownerCaseId: 'case-b' },
        ],
      }),
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
    const baseWorkspace = {
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

    expect(serializeWorkspaceForUnsavedChangesCheck(baseWorkspace)).toBe(
      serializeWorkspaceForUnsavedChangesCheck(selectedOtherFileWorkspace)
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
    const baseWorkspace = {
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

    expect(serializeWorkspaceForUnsavedChangesCheck(baseWorkspace)).toBe(
      serializeWorkspaceForUnsavedChangesCheck(revisionOnlyWorkspace)
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
    const baseWorkspace = {
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

    expect(serializeWorkspaceForUnsavedChangesCheck(baseWorkspace)).toBe(
      serializeWorkspaceForUnsavedChangesCheck(reorderedWorkspace)
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
    const baseWorkspace = {
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

    expect(serializeWorkspaceForUnsavedChangesCheck(baseWorkspace)).not.toBe(
      serializeWorkspaceForUnsavedChangesCheck(renamedDocumentWorkspace)
    );
  });
});
