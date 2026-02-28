import { describe, expect, it } from 'vitest';

import {
  applyCaseResolverFileMutationAndRebaseDraft,
  resolveCaptureTargetFile,
} from '@/features/case-resolver/hooks/useCaseResolverState.helpers';
import {
  createCaseResolverFile,
  parseCaseResolverWorkspace,
} from '@/features/case-resolver/settings';
import type {
  CaseResolverFileEditDraft,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';

import type { Dispatch, SetStateAction } from 'react';

describe('case resolver capture target resolution', () => {
  it('resolves proposal target before fallback context ids', () => {
    const proposalFile = createCaseResolverFile({
      id: 'proposal-file',
      fileType: 'document',
      name: 'Proposal File',
    });
    const contextFile = createCaseResolverFile({
      id: 'context-file',
      fileType: 'document',
      name: 'Context File',
    });

    const result = resolveCaptureTargetFile({
      workspaceFiles: [proposalFile, contextFile],
      proposalTargetFileId: 'proposal-file',
      contextFileId: 'context-file',
      editingDraftFileId: 'context-file',
    });

    expect(result.file?.id).toBe('proposal-file');
    expect(result.resolution).toBe('proposal_target');
  });

  it('returns precheck failure when capture target is missing before mutation', () => {
    const documentFile = createCaseResolverFile({
      id: 'doc-1',
      fileType: 'document',
      name: 'Document',
    });
    let workspace: CaseResolverWorkspace = {
      ...parseCaseResolverWorkspace(null),
      files: [documentFile],
      activeFileId: documentFile.id,
    };
    const updateWorkspace = (
      updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace
    ): void => {
      workspace = updater(workspace);
    };
    const setEditingDocumentDraft: Dispatch<
      SetStateAction<CaseResolverFileEditDraft | null>
    > = () => {};

    const result = applyCaseResolverFileMutationAndRebaseDraft({
      fileId: 'missing-file',
      precheckWorkspaceFiles: workspace.files,
      allowFallbackOnMissing: false,
      updateWorkspace,
      setEditingDocumentDraft,
      source: 'capture_mapping_apply_test',
      mutate: () => ({ name: 'Updated Name' }),
    });

    expect(result.ok).toBe(false);
    expect(result.stage).toBe('precheck');
    expect(result.fileFound).toBe(false);
  });

  it('returns mutation failure when target disappears between precheck and mutation', () => {
    const documentFile = createCaseResolverFile({
      id: 'doc-1',
      fileType: 'document',
      name: 'Document',
    });
    let workspace: CaseResolverWorkspace = {
      ...parseCaseResolverWorkspace(null),
      files: [],
      activeFileId: null,
    };
    const updateWorkspace = (
      updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace
    ): void => {
      workspace = updater(workspace);
    };
    const setEditingDocumentDraft: Dispatch<
      SetStateAction<CaseResolverFileEditDraft | null>
    > = () => {};

    const result = applyCaseResolverFileMutationAndRebaseDraft({
      fileId: documentFile.id,
      precheckWorkspaceFiles: [documentFile],
      allowFallbackOnMissing: false,
      updateWorkspace,
      setEditingDocumentDraft,
      source: 'capture_mapping_apply_test',
      mutate: () => ({ name: 'Updated Name' }),
    });

    expect(result.ok).toBe(false);
    expect(result.stage).toBe('mutation');
    expect(result.fileFound).toBe(false);
    expect(result.resolvedTargetFileId).toBe(documentFile.id);
    expect(workspace.files).toHaveLength(0);
  });

  it('preserves parentCaseId when mutation patch passes parentCaseId as undefined', () => {
    const caseFile = createCaseResolverFile({
      id: 'case-1',
      fileType: 'case',
      name: 'Case 1',
    });
    const documentFile = createCaseResolverFile({
      id: 'doc-1',
      fileType: 'document',
      name: 'Document',
      parentCaseId: caseFile.id,
    });
    let workspace: CaseResolverWorkspace = {
      ...parseCaseResolverWorkspace(null),
      files: [caseFile, documentFile],
      activeFileId: documentFile.id,
    };
    const updateWorkspace = (
      updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace
    ): void => {
      workspace = updater(workspace);
    };
    const setEditingDocumentDraft: Dispatch<
      SetStateAction<CaseResolverFileEditDraft | null>
    > = () => {};

    const result = applyCaseResolverFileMutationAndRebaseDraft({
      fileId: documentFile.id,
      updateWorkspace,
      setEditingDocumentDraft,
      source: 'capture_mapping_apply_test',
      mutate: () => ({
        name: 'Document Renamed',
        parentCaseId: undefined,
      }),
    });

    expect(result.ok).toBe(true);
    expect(result.nextFile?.parentCaseId).toBe(caseFile.id);
    expect(workspace.files.find((file) => file.id === documentFile.id)?.parentCaseId).toBe(
      caseFile.id
    );
  });
});
