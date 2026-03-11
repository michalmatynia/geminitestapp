import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CASE_RESOLVER_WORKSPACE_KEY,
  createCaseResolverAssetFile,
  createCaseResolverFile,
  createDefaultCaseResolverWorkspace,
} from '@/features/case-resolver/settings';
import {
  CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY,
  CASE_RESOLVER_WORKSPACE_HISTORY_KEY,
} from '@/features/case-resolver/utils/workspace-settings-persistence-helpers';
import {
  getCaseResolverWorkspaceRevision,
  persistCaseResolverWorkspaceSnapshot,
  stampCaseResolverWorkspaceMutation,
} from '@/features/case-resolver/workspace-persistence';

const toJsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });

const installFetchMock = (fetchMock: ReturnType<typeof vi.fn>): void => {
  globalThis.fetch = fetchMock as typeof globalThis.fetch;
};

describe('case-resolver workspace persistence', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    }
    vi.restoreAllMocks();
  });

  it('stamps workspace mutations with monotonic revision metadata', () => {
    const workspace = createDefaultCaseResolverWorkspace();
    const first = stampCaseResolverWorkspaceMutation(workspace, {
      baseRevision: 0,
      mutationId: 'mutation-a',
      timestamp: '2026-02-17T18:00:00.000Z',
    });
    const second = stampCaseResolverWorkspaceMutation(first, {
      baseRevision: first.workspaceRevision,
      mutationId: 'mutation-b',
      timestamp: '2026-02-17T18:01:00.000Z',
    });

    expect(first.workspaceRevision).toBe(1);
    expect(first.lastMutationId).toBe('mutation-a');
    expect(first.lastMutationAt).toBe('2026-02-17T18:00:00.000Z');
    expect(second.workspaceRevision).toBe(2);
    expect(second.lastMutationId).toBe('mutation-b');
    expect(getCaseResolverWorkspaceRevision(second)).toBe(2);
  });

  it('returns conflict details with server workspace on CAS mismatch', async () => {
    const localWorkspace = stampCaseResolverWorkspaceMutation(
      createDefaultCaseResolverWorkspace(),
      { baseRevision: 0, mutationId: 'mutation-local' }
    );
    const serverWorkspace = stampCaseResolverWorkspaceMutation(
      createDefaultCaseResolverWorkspace(),
      { baseRevision: 2, mutationId: 'mutation-server' }
    );

    const fetchMock = vi.fn().mockResolvedValue(
      toJsonResponse(409, {
        key: CASE_RESOLVER_WORKSPACE_KEY,
        value: JSON.stringify(serverWorkspace),
        conflict: true,
        currentRevision: serverWorkspace.workspaceRevision,
      })
    );
    installFetchMock(fetchMock);

    const result = await persistCaseResolverWorkspaceSnapshot({
      workspace: localWorkspace,
      expectedRevision: 0,
      mutationId: 'mutation-local',
      source: 'test',
    });

    expect(result.ok).toBe(false);
    if (!result.ok && result.conflict) {
      expect(result.currentRevision).toBe(serverWorkspace.workspaceRevision);
      expect(result.workspace.lastMutationId).toBe('mutation-server');
    }
  });

  it('treats idempotent server acknowledgement as success', async () => {
    const localWorkspace = stampCaseResolverWorkspaceMutation(
      createDefaultCaseResolverWorkspace(),
      { baseRevision: 0, mutationId: 'mutation-repeat' }
    );

    const fetchMock = vi.fn().mockResolvedValue(
      toJsonResponse(200, {
        key: CASE_RESOLVER_WORKSPACE_KEY,
        value: JSON.stringify(localWorkspace),
        idempotent: true,
      })
    );
    installFetchMock(fetchMock);

    const result = await persistCaseResolverWorkspaceSnapshot({
      workspace: localWorkspace,
      expectedRevision: 0,
      mutationId: 'mutation-repeat',
      source: 'test',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.idempotent).toBe(true);
      expect(result.workspace.lastMutationId).toBe('mutation-repeat');
    }
  });

  it('persists detached history/documents sidecars and keeps primary payload lightweight', async () => {
    const workspaceWithHistory = {
      ...createDefaultCaseResolverWorkspace(),
      workspaceRevision: 5,
      files: [
        createCaseResolverFile({
          id: 'doc-with-history',
          fileType: 'document',
          name: 'Doc With History',
          documentContent: '<p>Hello</p>',
          documentContentHtml: '<p>Hello</p>',
          documentHistory: [
            {
              id: 'doc-history-1',
              savedAt: '2026-03-01T10:00:00.000Z',
              documentContentVersion: 1,
              activeDocumentVersion: 'original',
              editorType: 'wysiwyg',
              documentContent: '<p>History</p>',
              documentContentMarkdown: 'History',
              documentContentHtml: '<p>History</p>',
              documentContentPlainText: 'History',
            },
          ],
        }),
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        toJsonResponse(200, { key: CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY, value: 'ok' })
      )
      .mockResolvedValueOnce(
        toJsonResponse(200, { key: CASE_RESOLVER_WORKSPACE_HISTORY_KEY, value: 'ok' })
      )
      .mockImplementationOnce(async (_url: string, init?: RequestInit): Promise<Response> => {
        const body = JSON.parse(String(init?.body ?? '{}')) as { key?: string; value?: string };
        return toJsonResponse(200, {
          key: body.key,
          value: body.value,
        });
      });
    installFetchMock(fetchMock);

    const result = await persistCaseResolverWorkspaceSnapshot({
      workspace: workspaceWithHistory,
      expectedRevision: 4,
      mutationId: 'mutation-with-history',
      source: 'test',
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const detachedDocumentsBody = JSON.parse(
      String((fetchMock.mock.calls[0]?.[1] as RequestInit)?.body ?? '{}')
    ) as {
      key?: string;
      value?: string;
    };
    expect(detachedDocumentsBody.key).toBe(CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY);
    const detachedDocumentsPayload = JSON.parse(detachedDocumentsBody.value ?? '{}') as {
      workspaceRevision?: number;
      files?: Array<{ id: string; documentContentHtml?: string }>;
    };
    expect(detachedDocumentsPayload.workspaceRevision).toBe(5);
    expect(detachedDocumentsPayload.files?.[0]?.id).toBe('doc-with-history');
    expect(typeof detachedDocumentsPayload.files?.[0]?.documentContentHtml).toBe('string');

    const detachedHistoryBody = JSON.parse(
      String((fetchMock.mock.calls[1]?.[1] as RequestInit)?.body ?? '{}')
    ) as {
      key?: string;
      value?: string;
    };
    expect(detachedHistoryBody.key).toBe(CASE_RESOLVER_WORKSPACE_HISTORY_KEY);
    const detachedHistoryPayload = JSON.parse(detachedHistoryBody.value ?? '{}') as {
      workspaceRevision?: number;
      files?: Array<{ id: string; documentHistory: unknown[] }>;
    };
    expect(detachedHistoryPayload.workspaceRevision).toBe(5);
    expect(detachedHistoryPayload.files?.[0]?.id).toBe('doc-with-history');
    expect(detachedHistoryPayload.files?.[0]?.documentHistory?.length).toBeGreaterThan(0);

    const primaryWorkspaceBody = JSON.parse(
      String((fetchMock.mock.calls[2]?.[1] as RequestInit)?.body ?? '{}')
    ) as {
      key?: string;
      value?: string;
    };
    expect(primaryWorkspaceBody.key).toBe(CASE_RESOLVER_WORKSPACE_KEY);
    const primaryWorkspacePayload = JSON.parse(primaryWorkspaceBody.value ?? '{}') as {
      files?: Array<Record<string, unknown>>;
    };
    expect(primaryWorkspacePayload.files?.[0]).not.toHaveProperty('documentHistory');
    expect(primaryWorkspacePayload.files?.[0]).not.toHaveProperty('documentContentHtml');

    if (result.ok) {
      const restoredFile = result.workspace.files.find((file) => file.id === 'doc-with-history');
      const restoredHistory = restoredFile?.documentHistory;
      expect(restoredHistory?.length).toBeGreaterThan(0);
      expect(typeof restoredFile?.documentContentHtml).toBe('string');
    }
  });

  it('does not rewrite detached documents sidecar when workspace contains only lightweight text fields', async () => {
    const lightweightWorkspace = {
      ...createDefaultCaseResolverWorkspace(),
      workspaceRevision: 9,
      files: [
        createCaseResolverFile({
          id: 'doc-lightweight-only',
          fileType: 'document',
          name: 'Doc Lightweight',
          documentContent: '',
          documentContentHtml: '',
          documentContentMarkdown: '',
          documentContentPlainText: 'search-only text',
        }),
      ],
    };
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async (_url: string, init?: RequestInit): Promise<Response> => {
        const body = JSON.parse(String(init?.body ?? '{}')) as { key?: string; value?: string };
        return toJsonResponse(200, {
          key: body.key,
          value: body.value,
        });
      });
    installFetchMock(fetchMock);

    const result = await persistCaseResolverWorkspaceSnapshot({
      workspace: lightweightWorkspace,
      expectedRevision: 8,
      mutationId: 'mutation-lightweight-only',
      source: 'test',
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const primaryWorkspaceBody = JSON.parse(
      String((fetchMock.mock.calls[0]?.[1] as RequestInit)?.body ?? '{}')
    ) as { key?: string };
    expect(primaryWorkspaceBody.key).toBe(CASE_RESOLVER_WORKSPACE_KEY);
  });

  it('rejects inline node-file snapshots before persist', async () => {
    const workspace = {
      ...createDefaultCaseResolverWorkspace(),
      assets: [
        createCaseResolverAssetFile({
          id: 'node-file-inline',
          name: 'Inline Snapshot Asset',
          kind: 'node_file',
          textContent:
            '{"kind":"case_resolver_node_file_snapshot_v2","nodes":[{"id":"node-inline"}]}',
        }),
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue(toJsonResponse(200, { ok: true }));
    installFetchMock(fetchMock);

    const result = await persistCaseResolverWorkspaceSnapshot({
      workspace,
      expectedRevision: 0,
      mutationId: 'mutation-inline',
      source: 'test',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Case Resolver inline node-file snapshots are unsupported.');
    }
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });
});
