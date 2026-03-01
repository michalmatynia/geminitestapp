import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCaseResolverPromptExploder } from '@/features/case-resolver/hooks/useCaseResolverState.prompt-exploder-actions';
import { createCaseResolverFile, createDefaultCaseResolverWorkspace } from '@/features/case-resolver/settings';
import type { CaseResolverPromptExploderPayloadReadState } from '@/features/case-resolver/hooks/useCaseResolverState.prompt-exploder-sync';
import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver';

const readPayloadStateRef: { current: CaseResolverPromptExploderPayloadReadState } = {
  current: {
    pendingPayload: null,
    expiredPayload: null,
    expiresAt: null,
  },
};

const applyPayloadMock = vi.fn();

vi.mock('@/features/case-resolver/hooks/useCaseResolverState.prompt-exploder-sync', () => ({
  discardPendingCaseResolverPromptExploderPayload: vi.fn(() => null),
  readCaseResolverPromptExploderPayloadState: vi.fn(() => readPayloadStateRef.current),
  resolvePromptExploderPendingPayloadIdentity: vi.fn((payload: { transferId?: string | null; createdAt?: string | null }) =>
    `${payload.transferId ?? 'no-transfer'}|${payload.createdAt ?? 'no-created-at'}`
  ),
  applyPendingPromptExploderPayloadToCaseResolver: vi.fn(
    (...args: unknown[]) => applyPayloadMock(...args)
  ),
}));

const createWorkspaceWithDocument = (documentId: string): CaseResolverWorkspace => {
  const documentFile = createCaseResolverFile({
    id: documentId,
    fileType: 'document',
    name: 'Document A',
  });
  return {
    ...createDefaultCaseResolverWorkspace(),
    files: [documentFile],
  };
};

const createPendingPayload = ({
  fileId,
  sessionId,
}: {
  fileId: string;
  sessionId: string;
}) =>
  ({
    target: 'case-resolver',
    prompt: 'Segmented text',
    createdAt: '2026-03-01T10:30:00.000Z',
    transferId: 'transfer-1',
    status: 'pending',
    payloadVersion: 1,
    checksum: 'checksum-1',
    caseResolverContext: {
      fileId,
      sessionId,
      fileName: 'Document A',
      documentVersionAtStart: 1,
    },
    caseResolverParties: {
      addresser: null,
      addressee: null,
      recipient: null,
    },
    caseResolverMetadata: {
      placeDate: null,
    },
  }) as const;

describe('case resolver prompt exploder return flow', () => {
  beforeEach(() => {
    readPayloadStateRef.current = {
      pendingPayload: null,
      expiredPayload: null,
      expiresAt: null,
    };
    applyPayloadMock.mockReset();
  });

  it('auto-applies pending payload once on valid return flow and opens capture proposal', async () => {
    const requestedFileId = 'doc-1';
    const requestedSessionId = 'session-1';
    const workspace = createWorkspaceWithDocument(requestedFileId);
    const workspaceRef = { current: workspace };

    readPayloadStateRef.current = {
      pendingPayload: createPendingPayload({
        fileId: requestedFileId,
        sessionId: requestedSessionId,
      }) as never,
      expiredPayload: null,
      expiresAt: null,
    };

    applyPayloadMock.mockReturnValue({
      applied: true,
      proposalState: {
        targetFileId: requestedFileId,
        addresser: null,
        addressee: null,
        documentDate: null,
      },
      workspaceChanged: true,
      diagnostics: {
        transferId: 'transfer-1',
        applyAttemptId: 'attempt-1',
      },
    } as never);

    const { result, rerender } = renderHook(() =>
      useCaseResolverPromptExploder({
        workspace,
        workspaceRef,
        updateWorkspace: vi.fn(),
        setEditingDocumentDraft: vi.fn(),
        filemakerDatabase: {} as never,
        caseResolverCaptureSettings: {
          enabled: true,
          autoOpenProposalModal: true,
          roleMappings: {
            addresser: { action: 'keepText' },
            addressee: { action: 'keepText' },
            subject: { action: 'keepText' },
            reference: { action: 'keepText' },
            other: { action: 'keepText' },
          },
        } as never,
        requestedFileId,
        shouldOpenEditorFromQuery: true,
        requestedPromptExploderSessionId: requestedSessionId,
        toast: vi.fn() as never,
        flushWorkspacePersist: vi.fn(),
      })
    );

    await waitFor(() => {
      expect(applyPayloadMock).toHaveBeenCalledTimes(1);
    });
    rerender();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(applyPayloadMock).toHaveBeenCalledTimes(1);
    expect(result.current.isPromptExploderPartyProposalOpen).toBe(true);
  });

  it('does not auto-apply when return flow session binding mismatches', async () => {
    const requestedFileId = 'doc-1';
    const workspace = createWorkspaceWithDocument(requestedFileId);
    const workspaceRef = { current: workspace };

    readPayloadStateRef.current = {
      pendingPayload: createPendingPayload({
        fileId: requestedFileId,
        sessionId: 'different-session',
      }) as never,
      expiredPayload: null,
      expiresAt: null,
    };

    renderHook(() =>
      useCaseResolverPromptExploder({
        workspace,
        workspaceRef,
        updateWorkspace: vi.fn(),
        setEditingDocumentDraft: vi.fn(),
        filemakerDatabase: {} as never,
        caseResolverCaptureSettings: {
          enabled: true,
          autoOpenProposalModal: true,
          roleMappings: {
            addresser: { action: 'keepText' },
            addressee: { action: 'keepText' },
            subject: { action: 'keepText' },
            reference: { action: 'keepText' },
            other: { action: 'keepText' },
          },
        } as never,
        requestedFileId,
        shouldOpenEditorFromQuery: true,
        requestedPromptExploderSessionId: 'session-1',
        toast: vi.fn() as never,
        flushWorkspacePersist: vi.fn(),
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(applyPayloadMock).not.toHaveBeenCalled();
  });
});
