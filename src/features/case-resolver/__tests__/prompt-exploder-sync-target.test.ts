import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  applyPendingPromptExploderPayloadToCaseResolver,
  discardPendingCaseResolverPromptExploderPayload,
  readCaseResolverPromptExploderPayloadState,
  readPendingCaseResolverPromptExploderPayload,
  resolvePromptExploderPendingPayloadIdentity,
} from '@/features/case-resolver/hooks/useCaseResolverState.prompt-exploder-sync';
import {
  createCaseResolverFile,
  parseCaseResolverWorkspace,
} from '@/features/case-resolver/settings';
import { parseCaseResolverCaptureSettings } from '@/features/case-resolver-capture/public';
import { parseFilemakerDatabase } from '@/features/filemaker/public';
import { savePromptExploderApplyPromptForCaseResolver } from '@/shared/lib/prompt-exploder/bridge';
import type {
  CaseResolverFile,
  CaseResolverFileEditDraft,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';

import type { Dispatch, SetStateAction } from 'react';

type StorageMock = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const createLocalStorageMock = (): StorageMock => {
  const map = new Map<string, string>();
  return {
    getItem: (key: string): string | null => map.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      map.set(key, value);
    },
    removeItem: (key: string): void => {
      map.delete(key);
    },
  };
};

describe('case resolver prompt exploder manual apply flow', () => {
  beforeEach(() => {
    const localStorage = createLocalStorageMock();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: {
        localStorage,
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
  });

  const createWorkspaceHarness = (): {
    getWorkspace: () => CaseResolverWorkspace;
    updateWorkspace: (updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace) => void;
    setEditingDocumentDraft: Dispatch<SetStateAction<CaseResolverFileEditDraft | null>>;
  } => {
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
    let draft: CaseResolverFileEditDraft | null = null;
    const updateWorkspace = (
      updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace
    ): void => {
      workspace = updater(workspace);
    };
    const setEditingDocumentDraft: Dispatch<SetStateAction<CaseResolverFileEditDraft | null>> = (
      updater
    ): void => {
      if (typeof updater === 'function') {
        draft = (
          updater as (current: CaseResolverFileEditDraft | null) => CaseResolverFileEditDraft | null
        )(draft);
        return;
      }
      draft = updater;
    };
    return {
      getWorkspace: () => workspace,
      updateWorkspace,
      setEditingDocumentDraft,
    };
  };

  it('keeps payload pending until explicit apply is invoked', () => {
    savePromptExploderApplyPromptForCaseResolver('Pending content', {
      fileId: 'doc-1',
      fileName: 'Document',
    });

    const firstRead = readPendingCaseResolverPromptExploderPayload();
    const secondRead = readPendingCaseResolverPromptExploderPayload();

    expect(firstRead?.prompt).toBe('Pending content');
    expect(secondRead?.prompt).toBe('Pending content');
    if (firstRead && secondRead) {
      expect(resolvePromptExploderPendingPayloadIdentity(firstRead)).toBe(
        resolvePromptExploderPendingPayloadIdentity(secondRead)
      );
    }
  });

  it('applies pending payload only on explicit apply call and then consumes it', () => {
    const harness = createWorkspaceHarness();
    const initialDocument = harness.getWorkspace().files[0];
    expect(initialDocument?.documentContentPlainText).toBe('');

    savePromptExploderApplyPromptForCaseResolver('Exploded output body', {
      fileId: 'doc-1',
      fileName: 'Document',
    });

    const result = applyPendingPromptExploderPayloadToCaseResolver({
      workspaceFiles: harness.getWorkspace().files,
      updateWorkspace: harness.updateWorkspace,
      setEditingDocumentDraft: harness.setEditingDocumentDraft,
      filemakerDatabase: parseFilemakerDatabase(null),
      caseResolverCaptureSettings: parseCaseResolverCaptureSettings(null),
    });

    expect(result.applied).toBe(true);
    if (result.applied) {
      expect(result.workspaceChanged).toBe(true);
      expect(result.diagnostics.resolutionStrategy).toBe('requested_id');
      expect(result.diagnostics.proposalBuilt).toBe(false);
      expect(result.diagnostics.proposalReason).toBe('no_capture_payload');
      expect(typeof result.diagnostics.transferId).toBe('string');
      expect(result.diagnostics.payloadVersion).toBe(2);
      expect(result.diagnostics.payloadStatus).toBe('pending');
    }

    const updatedDocument = harness
      .getWorkspace()
      .files.find((file: CaseResolverFile) => file.id === 'doc-1');
    expect(updatedDocument?.name).toBe('Document');

    expect(updatedDocument?.documentContentPlainText).toContain('Exploded output body');
    expect(readPendingCaseResolverPromptExploderPayload()).toBeNull();
  });

  it('does not consume payload when bridge payload has no target context', () => {
    const harness = createWorkspaceHarness();
    savePromptExploderApplyPromptForCaseResolver('Exploded output body', null);

    const result = applyPendingPromptExploderPayloadToCaseResolver({
      workspaceFiles: harness.getWorkspace().files,
      updateWorkspace: harness.updateWorkspace,
      setEditingDocumentDraft: harness.setEditingDocumentDraft,
      filemakerDatabase: parseFilemakerDatabase(null),
      caseResolverCaptureSettings: parseCaseResolverCaptureSettings(null),
    });

    expect(result.applied).toBe(false);
    if (!result.applied) {
      expect(result.reason).toBe('missing_context_file_id');
      expect(result.diagnostics.resolutionStrategy).toBe('unresolved');
    }
    expect(readPendingCaseResolverPromptExploderPayload()?.prompt).toBe('Exploded output body');
  });

  it('does not apply payload to a locked document', () => {
    const lockedDocument = createCaseResolverFile({
      id: 'doc-1',
      fileType: 'document',
      name: 'Document',
      isLocked: true,
    });
    let workspace: CaseResolverWorkspace = {
      ...parseCaseResolverWorkspace(null),
      files: [lockedDocument],
      activeFileId: lockedDocument.id,
    };
    const updateWorkspace = (
      updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace
    ): void => {
      workspace = updater(workspace);
    };
    const setEditingDocumentDraft: Dispatch<
      SetStateAction<CaseResolverFileEditDraft | null>
    > = () => {};

    savePromptExploderApplyPromptForCaseResolver('Locked payload', {
      fileId: 'doc-1',
      fileName: 'Document',
    });

    const result = applyPendingPromptExploderPayloadToCaseResolver({
      workspaceFiles: workspace.files,
      updateWorkspace,
      setEditingDocumentDraft,
      filemakerDatabase: parseFilemakerDatabase(null),
      caseResolverCaptureSettings: parseCaseResolverCaptureSettings(null),
    });

    expect(result.applied).toBe(false);
    if (!result.applied) {
      expect(result.reason).toBe('target_file_locked');
      expect(result.diagnostics.resolutionStrategy).toBe('requested_id');
      expect(result.diagnostics.resolvedTargetFileId).toBe('doc-1');
    }
    expect(readPendingCaseResolverPromptExploderPayload()?.prompt).toBe('Locked payload');
  });

  it('does not rely on synchronous updateWorkspace execution to resolve target diagnostics', () => {
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
    let queuedUpdater: ((current: CaseResolverWorkspace) => CaseResolverWorkspace) | null = null;
    const updateWorkspace = (
      updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace
    ): void => {
      queuedUpdater = updater;
    };
    const setEditingDocumentDraft: Dispatch<
      SetStateAction<CaseResolverFileEditDraft | null>
    > = () => {};

    savePromptExploderApplyPromptForCaseResolver('Deferred mutation payload', {
      fileId: 'doc-1',
      fileName: 'Document',
    });
    const result = applyPendingPromptExploderPayloadToCaseResolver({
      workspaceFiles: workspace.files,
      updateWorkspace,
      setEditingDocumentDraft,
      filemakerDatabase: parseFilemakerDatabase(null),
      caseResolverCaptureSettings: parseCaseResolverCaptureSettings(null),
    });

    expect(result.applied).toBe(true);
    if (result.applied) {
      expect(result.diagnostics.precheckResolutionStrategy).toBe('requested_id');
      expect(result.diagnostics.mutationResolutionStrategy).toBe('requested_id');
    }
    expect(queuedUpdater).not.toBeNull();
    if (queuedUpdater) {
      const applyQueuedUpdater: (current: CaseResolverWorkspace) => CaseResolverWorkspace =
        queuedUpdater;
      workspace = applyQueuedUpdater(workspace);
    }
    const updatedDocument = workspace.files.find((file: CaseResolverFile) => file.id === 'doc-1');
    expect(updatedDocument?.documentContentPlainText).toContain('Deferred mutation payload');
  });

  it('fails when live mutation snapshot no longer has the prechecked target file', () => {
    const precheckDocument = createCaseResolverFile({
      id: 'doc-1',
      fileType: 'document',
      name: 'Document',
    });
    let liveWorkspace: CaseResolverWorkspace = {
      ...parseCaseResolverWorkspace(null),
      files: [],
      activeFileId: null,
    };
    const updateWorkspace = (
      updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace
    ): void => {
      liveWorkspace = updater(liveWorkspace);
    };
    const setEditingDocumentDraft: Dispatch<
      SetStateAction<CaseResolverFileEditDraft | null>
    > = () => {};

    savePromptExploderApplyPromptForCaseResolver('Recovered from precheck snapshot', {
      fileId: 'doc-1',
      fileName: 'Document',
    });
    const result = applyPendingPromptExploderPayloadToCaseResolver({
      workspaceFiles: [precheckDocument],
      updateWorkspace,
      setEditingDocumentDraft,
      filemakerDatabase: parseFilemakerDatabase(null),
      caseResolverCaptureSettings: parseCaseResolverCaptureSettings(null),
    });

    expect(result.applied).toBe(false);
    if (!result.applied) {
      expect(result.reason).toBe('target_missing_in_live_workspace_after_precheck');
      expect(result.diagnostics.precheckResolutionStrategy).toBe('requested_id');
      expect(result.diagnostics.mutationResolutionStrategy).toBe('unresolved');
      expect(result.diagnostics.mutationMissingAfterPrecheck).toBe(true);
    }
    const updatedDocument = liveWorkspace.files.find(
      (file: CaseResolverFile) => file.id === 'doc-1'
    );
    expect(updatedDocument).toBeUndefined();
    expect(readPendingCaseResolverPromptExploderPayload()?.prompt).toBe(
      'Recovered from precheck snapshot'
    );
  });

  it('discards pending payload explicitly', () => {
    savePromptExploderApplyPromptForCaseResolver('Discard me', {
      fileId: 'doc-1',
      fileName: 'Document',
    });

    const discarded = discardPendingCaseResolverPromptExploderPayload();
    expect(discarded?.prompt).toBe('Discard me');
    expect(readPendingCaseResolverPromptExploderPayload()).toBeNull();
  });

  it('keeps expired payload out of pending flow but allows explicit discard recovery', () => {
    savePromptExploderApplyPromptForCaseResolver(
      'Expired payload',
      {
        fileId: 'doc-1',
        fileName: 'Document',
      },
      undefined,
      undefined,
      {
        createdAt: '2026-01-01T00:00:00.000Z',
        expiresAt: '2026-01-01T00:05:00.000Z',
        transferId: 'pe-transfer-expired-test',
      }
    );

    const state = readCaseResolverPromptExploderPayloadState();
    expect(state.pendingPayload).toBeNull();
    expect(state.expiredPayload?.prompt).toBe('Expired payload');

    const discarded = discardPendingCaseResolverPromptExploderPayload();
    expect(discarded?.transferId).toBe('pe-transfer-expired-test');
    expect(readCaseResolverPromptExploderPayloadState().expiredPayload).toBeNull();
  });

  it('resolves target ids using normalized id lookup', () => {
    const documentFile = createCaseResolverFile({
      id: '  doc-spaced  ',
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

    savePromptExploderApplyPromptForCaseResolver('Normalized payload', {
      fileId: 'doc-spaced',
      fileName: 'Document',
    });
    const result = applyPendingPromptExploderPayloadToCaseResolver({
      workspaceFiles: workspace.files,
      updateWorkspace,
      setEditingDocumentDraft,
      filemakerDatabase: parseFilemakerDatabase(null),
      caseResolverCaptureSettings: parseCaseResolverCaptureSettings(null),
    });

    expect(result.applied).toBe(true);
    if (result.applied) {
      expect(result.diagnostics.resolutionStrategy).toBe('requested_id');
    }
    const updatedDocument = workspace.files.find(
      (file: CaseResolverFile) => file.id === '  doc-spaced  '
    );
    expect(updatedDocument?.documentContentPlainText).toContain('Normalized payload');
  });

  it('uses payload context target when it points to an existing file', () => {
    const harness = createWorkspaceHarness();
    savePromptExploderApplyPromptForCaseResolver('Context fallback payload', {
      fileId: 'doc-1',
      fileName: 'Document',
    });

    const result = applyPendingPromptExploderPayloadToCaseResolver({
      workspaceFiles: harness.getWorkspace().files,
      updateWorkspace: harness.updateWorkspace,
      setEditingDocumentDraft: harness.setEditingDocumentDraft,
      filemakerDatabase: parseFilemakerDatabase(null),
      caseResolverCaptureSettings: parseCaseResolverCaptureSettings(null),
    });

    expect(result.applied).toBe(true);
    if (result.applied) {
      expect(result.diagnostics.resolutionStrategy).toBe('requested_id');
    }
    const updatedDocument = harness
      .getWorkspace()
      .files.find((file: CaseResolverFile) => file.id === 'doc-1');
    expect(updatedDocument?.documentContentPlainText).toContain('Context fallback payload');
    expect(readPendingCaseResolverPromptExploderPayload()).toBeNull();
  });

  it('fails when workspace snapshot is missing explicit target', () => {
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

    savePromptExploderApplyPromptForCaseResolver('Recovered payload body', {
      fileId: 'doc-recover',
      fileName: 'Recovered Document',
    });
    const result = applyPendingPromptExploderPayloadToCaseResolver({
      workspaceFiles: workspace.files,
      updateWorkspace,
      setEditingDocumentDraft,
      filemakerDatabase: parseFilemakerDatabase(null),
      caseResolverCaptureSettings: parseCaseResolverCaptureSettings(null),
    });

    expect(result.applied).toBe(false);
    if (!result.applied) {
      expect(result.reason).toBe('target_file_missing_precheck');
      expect(result.diagnostics.resolutionStrategy).toBe('unresolved');
    }
    expect(readPendingCaseResolverPromptExploderPayload()?.prompt).toBe('Recovered payload body');
  });

  it('fails when payload context is missing (no selector fallback path)', () => {
    const harness = createWorkspaceHarness();
    savePromptExploderApplyPromptForCaseResolver('Name fallback payload', null);

    const result = applyPendingPromptExploderPayloadToCaseResolver({
      workspaceFiles: harness.getWorkspace().files,
      updateWorkspace: harness.updateWorkspace,
      setEditingDocumentDraft: harness.setEditingDocumentDraft,
      filemakerDatabase: parseFilemakerDatabase(null),
      caseResolverCaptureSettings: parseCaseResolverCaptureSettings(null),
    });

    expect(result.applied).toBe(false);
    if (!result.applied) {
      expect(result.reason).toBe('missing_context_file_id');
      expect(result.diagnostics.resolutionStrategy).toBe('unresolved');
    }
    expect(readPendingCaseResolverPromptExploderPayload()?.prompt).toBe('Name fallback payload');
  });

  it('returns no proposal when mappings are disabled but capture payload exists', () => {
    const harness = createWorkspaceHarness();
    savePromptExploderApplyPromptForCaseResolver(
      'Exploded output with parties',
      {
        fileId: 'doc-1',
        fileName: 'Document',
      },
      {
        addresser: {
          id: 'cand-1',
          name: 'Michał Matynia',
          score: 1,
          role: 'addresser',
          displayName: 'Michał Matynia',
          rawText: 'Michał Matynia\nFioletowa 71/2\n70-781 Szczecin',
        },
        addressee: {
          id: 'cand-2',
          name: 'Inspektorat ZUS w Gryficach',
          score: 1,
          role: 'addressee',
          displayName: 'Inspektorat ZUS w Gryficach',
          rawText: 'Inspektorat ZUS w Gryficach\nDąbskiego 5\n72-300 Gryfice',
        },
      }
    );

    const disabledMappings = parseCaseResolverCaptureSettings(
      JSON.stringify({
        enabled: true,
        autoOpenProposalModal: true,
        roleMappings: {
          addresser: {
            enabled: false,
            targetRole: 'addresser',
            defaultAction: 'keepText',
            autoMatchPartyReference: false,
            autoMatchAddress: false,
          },
          addressee: {
            enabled: false,
            targetRole: 'addressee',
            defaultAction: 'keepText',
            autoMatchPartyReference: false,
            autoMatchAddress: false,
          },
        },
      })
    );

    const result = applyPendingPromptExploderPayloadToCaseResolver({
      workspaceFiles: harness.getWorkspace().files,
      updateWorkspace: harness.updateWorkspace,
      setEditingDocumentDraft: harness.setEditingDocumentDraft,
      filemakerDatabase: parseFilemakerDatabase(null),
      caseResolverCaptureSettings: disabledMappings,
    });

    expect(result.applied).toBe(true);
    if (result.applied) {
      expect(result.proposalState).toBeNull();
      expect(result.diagnostics.proposalBuilt).toBe(false);
      expect(result.diagnostics.proposalReason).toBe('proposal_builder_returned_null');
    }
  });
});
