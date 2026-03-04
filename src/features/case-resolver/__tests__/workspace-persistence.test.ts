import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CASE_RESOLVER_WORKSPACE_KEY,
  createCaseResolverAssetFile,
  createCaseResolverFile,
  createDefaultCaseResolverWorkspace,
  parseCaseResolverWorkspace,
} from '@/features/case-resolver/settings';
import {
  CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY,
  CASE_RESOLVER_WORKSPACE_HISTORY_KEY,
} from '@/features/case-resolver/utils/workspace-settings-persistence-helpers';
import {
  compactCaseResolverWorkspaceForPersist,
  computeCaseResolverConflictRetryDelayMs,
  fetchCaseResolverWorkspaceMetadata,
  fetchCaseResolverWorkspaceRecordDetailed,
  fetchCaseResolverWorkspaceRecord,
  fetchCaseResolverWorkspaceIfStale,
  fetchCaseResolverWorkspaceSnapshot,
  getCaseResolverWorkspaceMaxPayloadBytes,
  getCaseResolverWorkspaceRevision,
  isCaseResolverWorkspacePayloadTooLarge,
  persistCaseResolverWorkspaceSnapshot,
  stampCaseResolverWorkspaceMutation,
} from '@/features/case-resolver/workspace-persistence';

const NODE_FILE_SNAPSHOT_STORAGE_KEY = 'nodeFileSnapshotStorage';

const toJsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });

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
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

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
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

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
      .mockResolvedValueOnce(toJsonResponse(200, { key: CASE_RESOLVER_WORKSPACE_HISTORY_KEY, value: 'ok' }))
      .mockImplementationOnce(async (_url: string, init?: RequestInit): Promise<Response> => {
        const body = JSON.parse(String(init?.body ?? '{}')) as { key?: string; value?: string };
        return toJsonResponse(200, {
          key: body.key,
          value: body.value,
        });
      });
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

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
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

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

  it('rejects deprecated inline node-file snapshots before persist', async () => {
    const workspace = {
      ...createDefaultCaseResolverWorkspace(),
      assets: [
        createCaseResolverAssetFile({
          id: 'node-file-inline',
          name: 'Inline Snapshot Asset',
          kind: 'node_file',
          textContent:
            '{"kind":"case_resolver_node_file_snapshot_v1","nodes":[{"id":"node-inline"}]}',
        }),
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue(toJsonResponse(200, { ok: true }));
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await persistCaseResolverWorkspaceSnapshot({
      workspace,
      expectedRevision: 0,
      mutationId: 'mutation-inline',
      source: 'test',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/no longer supported/i);
    }
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it('requests fresh settings snapshots for workspace recovery reads', async () => {
    const workspace = createDefaultCaseResolverWorkspace();
    const fetchMock = vi.fn().mockResolvedValue(
      toJsonResponse(200, [
        {
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: JSON.stringify(workspace),
        },
      ])
    );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await fetchCaseResolverWorkspaceSnapshot('test_source');

    expect(result).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `/api/settings?scope=light&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`
    );
    expect(options).toMatchObject({
      method: 'GET',
      cache: 'no-store',
    });
  });

  it('falls back to cached key endpoint when fresh key fetch fails', async () => {
    const workspace = createDefaultCaseResolverWorkspace();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(toJsonResponse(500, { error: 'fresh key failed' }))
      .mockResolvedValueOnce(
        toJsonResponse(200, [
          {
            key: CASE_RESOLVER_WORKSPACE_KEY,
            value: JSON.stringify(workspace),
          },
        ])
      );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await fetchCaseResolverWorkspaceSnapshot('test_source');

    expect(result).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `/api/settings?scope=light&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `/api/settings?scope=light&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`
    );
  });

  it('falls back to keyed heavy endpoint when keyed light returns no workspace record', async () => {
    const workspace = createDefaultCaseResolverWorkspace();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(toJsonResponse(200, []))
      .mockResolvedValueOnce(toJsonResponse(200, []))
      .mockResolvedValueOnce(
        toJsonResponse(200, [
          {
            key: CASE_RESOLVER_WORKSPACE_KEY,
            value: JSON.stringify(workspace),
          },
        ])
      );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await fetchCaseResolverWorkspaceSnapshot('test_source');

    expect(result).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `/api/settings?scope=light&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `/api/settings?scope=light&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`
    );
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      `/api/settings?scope=heavy&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`
    );
  });

  it('returns no_record when v2 workspace key is missing', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(toJsonResponse(200, []))
      .mockResolvedValueOnce(toJsonResponse(200, []))
      .mockResolvedValueOnce(toJsonResponse(200, []))
      .mockResolvedValueOnce(toJsonResponse(200, []));
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await fetchCaseResolverWorkspaceRecordDetailed('test_source', {
      requiredFileId: null,
    });

    expect(result.status).toBe('no_record');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('supports cached-only heavy fallback when fresh mode is disabled', async () => {
    const workspace = createDefaultCaseResolverWorkspace();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(toJsonResponse(200, []))
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: JSON.stringify(workspace),
        })
      );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await fetchCaseResolverWorkspaceRecord('test_source', {
      fresh: false,
    });

    expect(result).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `/api/settings?scope=light&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `/api/settings?scope=heavy&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`
    );
  });

  it('uses context_fast attempt profile order for context-critical fetches', async () => {
    const workspace = {
      ...createDefaultCaseResolverWorkspace(),
      id: 'workspace-context-fast',
      workspaceRevision: 1,
      lastMutationId: 'context-fast-hit',
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(toJsonResponse(500, { error: 'light fresh failed' }))
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: JSON.stringify(workspace),
        })
      );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await fetchCaseResolverWorkspaceRecordDetailed('test_source', {
      attemptProfile: 'context_fast',
      requiredFileId: null,
    });

    expect(result.status).toBe('resolved');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `/api/settings?scope=light&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `/api/settings?scope=heavy&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`
    );
  });

  it('hydrates detached history sidecar when explicitly requested', async () => {
    const workspace = {
      ...createDefaultCaseResolverWorkspace(),
      workspaceRevision: 12,
      files: [
        createCaseResolverFile({
          id: 'doc-history-detached',
          fileType: 'document',
          name: 'Doc Detached',
          documentContent: '<p>Hello</p>',
          documentContentHtml: '<p>Hello</p>',
          documentHistory: [],
        }),
      ],
    };
    const detachedHistoryPayload = {
      schema: 'case_resolver_workspace_detached_history_v1',
      workspaceRevision: 12,
      files: [
        {
          id: 'doc-history-detached',
          documentHistory: [
            {
              id: 'detached-1',
              savedAt: '2026-03-01T12:00:00.000Z',
              documentContentVersion: 1,
              activeDocumentVersion: 'original',
              editorType: 'wysiwyg',
              documentContent: '<p>Detached</p>',
              documentContentMarkdown: 'Detached',
              documentContentHtml: '<p>Detached</p>',
              documentContentPlainText: 'Detached',
            },
          ],
        },
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: JSON.stringify(workspace),
        })
      )
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_HISTORY_KEY,
          value: JSON.stringify(detachedHistoryPayload),
        })
      );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await fetchCaseResolverWorkspaceRecordDetailed('test_source', {
      includeDetachedHistory: true,
      requiredFileId: null,
      strategy: 'light_only',
    });

    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') {
      const file = result.workspace.files.find((entry) => entry.id === 'doc-history-detached');
      expect(file?.documentHistory.length).toBe(1);
      expect(file?.documentHistory[0]?.id).toBe('detached-1');
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `/api/settings?scope=light&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_HISTORY_KEY)}`
    );
  });

  it('hydrates detached documents sidecar when explicitly requested', async () => {
    const workspace = {
      ...createDefaultCaseResolverWorkspace(),
      workspaceRevision: 12,
      lastMutationId: 'doc-mutation-1',
      files: [
        createCaseResolverFile({
          id: 'doc-body-detached',
          fileType: 'document',
          name: 'Doc Detached',
          documentContent: '',
          documentContentHtml: '',
          documentContentPlainText: '',
        }),
      ],
    };
    const detachedDocumentsPayload = {
      schema: 'case_resolver_workspace_detached_documents_v1',
      workspaceRevision: 12,
      lastMutationId: 'doc-mutation-1',
      files: [
        {
          id: 'doc-body-detached',
          documentContentHtml: '<p>Detached body</p>',
          documentContentPlainText: 'Detached body',
        },
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: JSON.stringify(workspace),
        })
      )
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY,
          value: JSON.stringify(detachedDocumentsPayload),
        })
      );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await fetchCaseResolverWorkspaceRecordDetailed('test_source', {
      includeDetachedDocuments: true,
      requiredFileId: null,
      strategy: 'light_only',
    });

    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') {
      const file = result.workspace.files.find((entry) => entry.id === 'doc-body-detached');
      expect(file?.documentContentHtml).toBe('<p>Detached body</p>');
      expect(file?.documentContentPlainText).toBe('Detached body');
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `/api/settings?scope=light&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY)}`
    );
  });

  it('requests detached sidecars with caseResolverFileId when required file is provided', async () => {
    const workspace = {
      ...createDefaultCaseResolverWorkspace(),
      workspaceRevision: 14,
      lastMutationId: 'required-file-1',
      files: [
        createCaseResolverFile({
          id: 'doc-target',
          fileType: 'document',
          name: 'Target',
          documentContent: '',
          documentContentHtml: '',
          documentHistory: [],
        }),
        createCaseResolverFile({
          id: 'doc-other',
          fileType: 'document',
          name: 'Other',
          documentContent: '',
          documentContentHtml: '',
          documentHistory: [],
        }),
      ],
    };
    const detachedDocumentsPayload = {
      schema: 'case_resolver_workspace_detached_documents_v1',
      workspaceRevision: 14,
      lastMutationId: 'required-file-1',
      files: [
        {
          id: 'doc-target',
          documentContentHtml: '<p>Target body</p>',
          documentContentPlainText: 'Target body',
        },
      ],
    };
    const detachedHistoryPayload = {
      schema: 'case_resolver_workspace_detached_history_v1',
      workspaceRevision: 14,
      lastMutationId: 'required-file-1',
      files: [
        {
          id: 'doc-target',
          documentHistory: [
            {
              id: 'target-history-1',
              savedAt: '2026-03-02T10:00:00.000Z',
              documentContentVersion: 1,
              activeDocumentVersion: 'original',
              editorType: 'wysiwyg',
              documentContent: '<p>Target body</p>',
              documentContentMarkdown: 'Target body',
              documentContentHtml: '<p>Target body</p>',
              documentContentPlainText: 'Target body',
            },
          ],
        },
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: JSON.stringify(workspace),
        })
      )
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY,
          value: JSON.stringify(detachedDocumentsPayload),
        })
      )
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_HISTORY_KEY,
          value: JSON.stringify(detachedHistoryPayload),
        })
      );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await fetchCaseResolverWorkspaceRecordDetailed('test_source', {
      includeDetachedDocuments: true,
      includeDetachedHistory: true,
      requiredFileId: 'doc-target',
      strategy: 'light_only',
    });

    expect(result.status).toBe('resolved');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `/api/settings?scope=light&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY)}&caseResolverFileId=doc-target`
    );
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      `/api/settings?scope=light&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_HISTORY_KEY)}&caseResolverFileId=doc-target`
    );
  });

  it('passes caseResolverFileId when conditionally fetching detached sidecars', async () => {
    const workspace = {
      ...createDefaultCaseResolverWorkspace(),
      workspaceRevision: 19,
      lastMutationId: 'conditional-1',
      files: [
        createCaseResolverFile({
          id: 'doc-conditional',
          fileType: 'document',
          name: 'Conditional',
          documentContent: '',
          documentContentHtml: '',
          documentHistory: [],
        }),
      ],
    };
    const detachedDocumentsPayload = {
      schema: 'case_resolver_workspace_detached_documents_v1',
      workspaceRevision: 19,
      lastMutationId: 'conditional-1',
      files: [
        {
          id: 'doc-conditional',
          documentContentHtml: '<p>Conditional body</p>',
          documentContentPlainText: 'Conditional body',
        },
      ],
    };
    const detachedHistoryPayload = {
      schema: 'case_resolver_workspace_detached_history_v1',
      workspaceRevision: 19,
      lastMutationId: 'conditional-1',
      files: [
        {
          id: 'doc-conditional',
          documentHistory: [
            {
              id: 'conditional-history-1',
              savedAt: '2026-03-02T12:00:00.000Z',
              documentContentVersion: 1,
              activeDocumentVersion: 'original',
              editorType: 'wysiwyg',
              documentContent: '<p>Conditional body</p>',
              documentContentMarkdown: 'Conditional body',
              documentContentHtml: '<p>Conditional body</p>',
              documentContentPlainText: 'Conditional body',
            },
          ],
        },
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: JSON.stringify(workspace),
        })
      )
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY,
          value: JSON.stringify(detachedDocumentsPayload),
        })
      )
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_HISTORY_KEY,
          value: JSON.stringify(detachedHistoryPayload),
        })
      );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await fetchCaseResolverWorkspaceIfStale('test_source', 1, {
      includeDetachedDocuments: true,
      includeDetachedHistory: true,
      requiredFileId: 'doc-conditional',
    });

    expect(result.updated).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `/api/settings?scope=light&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY)}&caseResolverFileId=doc-conditional`
    );
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      `/api/settings?scope=light&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_HISTORY_KEY)}&caseResolverFileId=doc-conditional`
    );
  });

  it('skips detached sidecar fetches when required file is a case', async () => {
    const workspace = {
      ...createDefaultCaseResolverWorkspace(),
      workspaceRevision: 21,
      files: [
        createCaseResolverFile({
          id: 'case-required',
          fileType: 'case',
          name: 'Required Case',
        }),
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: JSON.stringify(workspace),
        })
      );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await fetchCaseResolverWorkspaceRecordDetailed('test_source', {
      includeDetachedDocuments: true,
      includeDetachedHistory: true,
      requiredFileId: 'case-required',
      strategy: 'light_only',
    });

    expect(result.status).toBe('resolved');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `/api/settings?scope=light&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`
    );
  });

  it('skips conditional detached sidecar fetches when required file is a case', async () => {
    const workspace = {
      ...createDefaultCaseResolverWorkspace(),
      workspaceRevision: 25,
      files: [
        createCaseResolverFile({
          id: 'case-conditional',
          fileType: 'case',
          name: 'Conditional Case',
        }),
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: JSON.stringify(workspace),
        })
      );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await fetchCaseResolverWorkspaceIfStale('test_source', 1, {
      includeDetachedDocuments: true,
      includeDetachedHistory: true,
      requiredFileId: 'case-conditional',
    });

    expect(result.updated).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `/api/settings?key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}&fresh=1&ifRevisionGt=1`
    );
  });

  it('skips detached history hydration when mutation id does not match workspace mutation', async () => {
    const workspace = {
      ...createDefaultCaseResolverWorkspace(),
      workspaceRevision: 22,
      lastMutationId: 'server-mutation',
      files: [
        createCaseResolverFile({
          id: 'doc-history-detached-mismatch',
          fileType: 'document',
          name: 'Doc Detached Mismatch',
          documentContent: '<p>Hello</p>',
          documentContentHtml: '<p>Hello</p>',
          documentHistory: [],
        }),
      ],
    };
    const detachedHistoryPayload = {
      schema: 'case_resolver_workspace_detached_history_v1',
      workspaceRevision: 22,
      lastMutationId: 'stale-mutation',
      files: [
        {
          id: 'doc-history-detached-mismatch',
          documentHistory: [
            {
              id: 'detached-stale-1',
              savedAt: '2026-03-01T12:00:00.000Z',
              documentContentVersion: 1,
              activeDocumentVersion: 'original',
              editorType: 'wysiwyg',
              documentContent: '<p>Detached stale</p>',
              documentContentMarkdown: 'Detached stale',
              documentContentHtml: '<p>Detached stale</p>',
              documentContentPlainText: 'Detached stale',
            },
          ],
        },
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: JSON.stringify(workspace),
        })
      )
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_HISTORY_KEY,
          value: JSON.stringify(detachedHistoryPayload),
        })
      );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await fetchCaseResolverWorkspaceRecordDetailed('test_source', {
      includeDetachedHistory: true,
      requiredFileId: null,
      strategy: 'light_only',
    });

    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') {
      const file = result.workspace.files.find(
        (entry) => entry.id === 'doc-history-detached-mismatch'
      );
      expect(file?.documentHistory.length).toBe(0);
    }
  });

  it('continues to keyed heavy when keyed light workspace is missing the required file', async () => {
    const lightWorkspace = createDefaultCaseResolverWorkspace();
    const targetCase = createCaseResolverFile({
      id: 'case-required-1',
      fileType: 'case',
      name: 'Required Case',
    });
    const heavyWorkspace = {
      ...createDefaultCaseResolverWorkspace(),
      files: [targetCase],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: JSON.stringify(lightWorkspace),
        })
      )
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: JSON.stringify(lightWorkspace),
        })
      )
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: JSON.stringify(heavyWorkspace),
        })
      );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await fetchCaseResolverWorkspaceRecord('test_source', {
      requiredFileId: targetCase.id,
    });

    expect(result).not.toBeNull();
    expect(result?.files.some((file) => file.id === targetCase.id)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      `/api/settings?scope=heavy&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`
    );
  });

  it('returns missing_required_file when all keyed records exist but none include required file', async () => {
    const workspaceWithoutRequired = createDefaultCaseResolverWorkspace();
    const requiredFileId = 'case-required-404';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: JSON.stringify(workspaceWithoutRequired),
        })
      )
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: JSON.stringify(workspaceWithoutRequired),
        })
      )
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: JSON.stringify(workspaceWithoutRequired),
        })
      )
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: JSON.stringify(workspaceWithoutRequired),
        })
      );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await fetchCaseResolverWorkspaceRecordDetailed('test_source', {
      requiredFileId,
    });

    expect(result.status).toBe('missing_required_file');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('returns null when required file is unavailable in canonical v2 workspace reads', async () => {
    const workspaceWithoutRequired = createDefaultCaseResolverWorkspace();
    const requiredFile = createCaseResolverFile({
      id: 'case-required-v2-only',
      fileType: 'case',
      name: 'Required Case',
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: JSON.stringify(workspaceWithoutRequired),
        })
      )
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: JSON.stringify(workspaceWithoutRequired),
        })
      )
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: JSON.stringify(workspaceWithoutRequired),
        })
      )
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: JSON.stringify(workspaceWithoutRequired),
        })
      );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await fetchCaseResolverWorkspaceRecord('test_source', {
      requiredFileId: requiredFile.id,
    });

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('returns unavailable with budget_exhausted when fetch chain exceeds context budget', async () => {
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          setTimeout(() => resolve(toJsonResponse(500, { error: 'slow failure' })), 5);
        })
    );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await fetchCaseResolverWorkspaceRecordDetailed('test_source', {
      attemptProfile: 'context_fast',
      maxTotalMs: 3,
      attemptTimeoutMs: 10,
      requiredFileId: 'case-a',
    });

    expect(result.status).toBe('unavailable');
    if (result.status === 'unavailable') {
      expect(result.reason).toBe('budget_exhausted');
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('supports object payload shape for key snapshot fetch responses', async () => {
    const workspace = createDefaultCaseResolverWorkspace();
    const fetchMock = vi.fn().mockResolvedValue(
      toJsonResponse(200, {
        key: CASE_RESOLVER_WORKSPACE_KEY,
        value: JSON.stringify(workspace),
      })
    );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await fetchCaseResolverWorkspaceSnapshot('test_source');

    expect(result).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not fall back to broad scope reads when keyed workspace fetches fail', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(toJsonResponse(500, { error: 'fresh key failed' }))
      .mockResolvedValueOnce(toJsonResponse(500, { error: 'cached key failed' }))
      .mockResolvedValueOnce(toJsonResponse(500, { error: 'heavy fresh key failed' }))
      .mockResolvedValueOnce(toJsonResponse(500, { error: 'heavy cached key failed' }));
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await fetchCaseResolverWorkspaceSnapshot('test_source');

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `/api/settings?scope=light&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `/api/settings?scope=light&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`
    );
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      `/api/settings?scope=heavy&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`
    );
    expect(fetchMock.mock.calls[3]?.[0]).toBe(
      `/api/settings?scope=heavy&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`
    );
  });

  it('fetches workspace metadata via key meta endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      toJsonResponse(200, {
        key: CASE_RESOLVER_WORKSPACE_KEY,
        revision: 7,
        lastMutationId: 'mutation-meta',
        exists: true,
      })
    );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await fetchCaseResolverWorkspaceMetadata('test_source');

    expect(result).toEqual({
      revision: 7,
      lastMutationId: 'mutation-meta',
      exists: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `/api/settings?scope=light&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}&meta=1`
    );
    expect(options).toMatchObject({
      method: 'GET',
      cache: 'no-store',
    });
  });

  it('computes exponential conflict retry delays with bounded jitter', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const attemptOne = computeCaseResolverConflictRetryDelayMs(1, {
      baseDelayMs: 100,
      maxDelayMs: 1_000,
      jitterMs: 40,
    });
    const attemptThree = computeCaseResolverConflictRetryDelayMs(3, {
      baseDelayMs: 100,
      maxDelayMs: 1_000,
      jitterMs: 40,
    });

    expect(attemptOne).toBe(120);
    expect(attemptThree).toBe(420);
    randomSpy.mockRestore();
  });

  it('flags payload sizes above configured workspace threshold', () => {
    const maxPayload = getCaseResolverWorkspaceMaxPayloadBytes();
    expect(isCaseResolverWorkspacePayloadTooLarge(maxPayload - 1)).toBe(false);
    expect(isCaseResolverWorkspacePayloadTooLarge(maxPayload)).toBe(false);
    expect(isCaseResolverWorkspacePayloadTooLarge(maxPayload + 1)).toBe(true);
  });

  it('compacts scanfile payload by removing redundant persisted fields', () => {
    const scanfile = createCaseResolverFile({
      id: 'scan-persist-1',
      fileType: 'scanfile',
      name: 'Scan Persist',
      documentContent: '# Header\n\nLine one',
      documentContentMarkdown: '# Header\n\nLine one',
      documentContentHtml: '<h1>Header</h1><p>Line one</p>',
      documentContentPlainText: 'Header\nLine one',
      originalDocumentContent: '# Header\n\nLine one',
      explodedDocumentContent: '# Header\n\nLine one',
      documentHistory: [
        {
          id: 'scan-history-1',
          savedAt: '2026-02-26T10:00:00.000Z',
          documentContentVersion: 1,
          editorType: 'markdown',
          activeDocumentVersion: 'original',
          documentContent: '# History',
          documentContentMarkdown: '# History',
          documentContentHtml: '<h1>History</h1>',
          documentContentPlainText: 'History',
        },
      ],
    });
    const documentFile = createCaseResolverFile({
      id: 'doc-persist-1',
      fileType: 'document',
      name: 'Doc Persist',
      documentContent: '<p>Hello</p>',
      documentContentHtml: '<p>Hello</p>',
      documentContentMarkdown: 'Hello',
      documentContentPlainText: 'Hello',
      documentHistory: [
        {
          id: 'doc-history-1',
          savedAt: '2026-02-26T10:00:00.000Z',
          documentContentVersion: 1,
          editorType: 'wysiwyg',
          activeDocumentVersion: 'original',
          documentContent: '<p>History</p>',
          documentContentMarkdown: 'History',
          documentContentHtml: '<p>History</p>',
          documentContentPlainText: 'History',
        },
      ],
    });
    const migratedNodeFileAsset = createCaseResolverAssetFile({
      id: 'node-asset-keyed',
      name: 'Migrated Node File',
      folder: '',
      kind: 'node_file',
      textContent: '',
      metadata: {
        [NODE_FILE_SNAPSHOT_STORAGE_KEY]: 'keyed',
      },
    });
    const workspace = {
      ...createDefaultCaseResolverWorkspace(),
      files: [scanfile, documentFile],
      assets: [migratedNodeFileAsset],
    };

    const compacted = compactCaseResolverWorkspaceForPersist(workspace);
    const compactedScan = compacted.files.find((file) => file.id === 'scan-persist-1');
    const compactedDoc = compacted.files.find((file) => file.id === 'doc-persist-1');
    const compactedMigratedNodeAsset = compacted.assets.find(
      (asset) => asset.id === 'node-asset-keyed'
    );

    expect(compactedScan).toBeDefined();
    expect(compactedDoc).toBeDefined();
    expect(compactedScan && 'documentContent' in compactedScan).toBe(false);
    expect(compactedScan && 'documentContentHtml' in compactedScan).toBe(false);
    expect(compactedScan && 'documentContentPlainText' in compactedScan).toBe(false);
    expect(compactedScan && 'originalDocumentContent' in compactedScan).toBe(false);
    expect(compactedScan && 'explodedDocumentContent' in compactedScan).toBe(false);
    expect(compactedScan?.documentContentMarkdown).toBe('# Header\n\nLine one');
    const scanHistory = compactedScan?.documentHistory?.[0] as Record<string, unknown> | undefined;
    expect(scanHistory).toBeDefined();
    expect(scanHistory && 'documentContent' in scanHistory).toBe(false);
    expect(scanHistory && 'documentContentHtml' in scanHistory).toBe(false);
    expect(scanHistory && 'documentContentPlainText' in scanHistory).toBe(false);
    expect(scanHistory?.['documentContentMarkdown']).toBe('# History');

    expect(compactedDoc && 'documentContentMarkdown' in compactedDoc).toBe(false);
    expect(compactedDoc && 'documentContentPlainText' in compactedDoc).toBe(false);
    expect(compactedDoc && 'documentContent' in compactedDoc).toBe(false);
    expect(compactedDoc?.documentContentHtml).toBe('<p>Hello</p>');
    const docHistory = compactedDoc?.documentHistory?.[0] as Record<string, unknown> | undefined;
    expect(docHistory).toBeDefined();
    expect(docHistory && 'documentContent' in docHistory).toBe(false);
    expect(docHistory && 'documentContentMarkdown' in docHistory).toBe(false);
    expect(docHistory && 'documentContentPlainText' in docHistory).toBe(false);
    expect(docHistory?.['documentContentHtml']).toBe('<p>History</p>');

    expect(compactedMigratedNodeAsset && 'textContent' in compactedMigratedNodeAsset).toBe(false);
    expect(compactedMigratedNodeAsset?.metadata?.[NODE_FILE_SNAPSHOT_STORAGE_KEY]).toBe('keyed');
  });

  it('caps persisted document history and strips verbose history metadata fields', () => {
    const largeHistory = Array.from({ length: 20 }, (_, index) => ({
      id: `doc-history-${index + 1}`,
      savedAt: `2026-02-26T10:${String(index).padStart(2, '0')}:00.000Z`,
      documentContentVersion: index + 1,
      editorType: 'wysiwyg' as const,
      activeDocumentVersion: 'original' as const,
      documentContent: `<p>History ${index + 1}</p>`,
      documentContentMarkdown: `History ${index + 1}`,
      documentContentHtml: `<p>History ${index + 1}</p>`,
      documentContentPlainText: `History ${index + 1}`,
      changes: {
        before: 'a'.repeat(200),
        after: 'b'.repeat(200),
      },
      userId: 'user-1',
      documentId: 'doc-1',
      action: 'autosave',
      timestamp: `2026-02-26T10:${String(index).padStart(2, '0')}:00.000Z`,
    }));
    const documentFile = createCaseResolverFile({
      id: 'doc-history-heavy',
      fileType: 'document',
      name: 'Doc History Heavy',
      documentContent: '<p>Hello</p>',
      documentContentHtml: '<p>Hello</p>',
      documentHistory: largeHistory,
    });

    const compacted = compactCaseResolverWorkspaceForPersist({
      ...createDefaultCaseResolverWorkspace(),
      files: [documentFile],
    });
    const compactedDoc = compacted.files.find((file) => file.id === 'doc-history-heavy');
    const compactedHistory = compactedDoc?.documentHistory ?? [];
    const firstHistoryEntry = compactedHistory[0] as Record<string, unknown> | undefined;

    expect(compactedHistory.length).toBeLessThan(largeHistory.length);
    expect(compactedHistory.length).toBeLessThanOrEqual(12);
    expect(firstHistoryEntry).toBeDefined();
    expect(firstHistoryEntry && 'changes' in firstHistoryEntry).toBe(false);
    expect(firstHistoryEntry && 'userId' in firstHistoryEntry).toBe(false);
    expect(firstHistoryEntry && 'documentId' in firstHistoryEntry).toBe(false);
    expect(firstHistoryEntry && 'action' in firstHistoryEntry).toBe(false);
    expect(firstHistoryEntry && 'timestamp' in firstHistoryEntry).toBe(false);
  });

  it('rejects inline node-file snapshot text during workspace compaction', () => {
    const workspace = {
      ...createDefaultCaseResolverWorkspace(),
      assets: [
        createCaseResolverAssetFile({
          id: 'node-asset-inline',
          name: 'Legacy Node File',
          folder: '',
          kind: 'node_file',
          textContent:
            '{"kind":"case_resolver_node_file_snapshot_v1","nodes":[{"id":"legacy-node"}]}',
        }),
      ],
    };

    expect(() => compactCaseResolverWorkspaceForPersist(workspace)).toThrowError(
      /no longer supported/i
    );
  });

  it('drops empty node-file snapshot text field during workspace compaction', () => {
    const workspace = {
      ...createDefaultCaseResolverWorkspace(),
      assets: [
        createCaseResolverAssetFile({
          id: 'node-asset-empty',
          name: 'Node File',
          folder: '',
          kind: 'node_file',
          textContent: '',
        }),
      ],
    };

    const compacted = compactCaseResolverWorkspaceForPersist(workspace);
    expect(compacted.assets[0] && 'textContent' in compacted.assets[0]).toBe(false);
  });

  it('rehydrates compacted scanfile payload as markdown-authoritative content', () => {
    const scanfile = createCaseResolverFile({
      id: 'scan-rehydrate-1',
      fileType: 'scanfile',
      name: 'Scan Rehydrate',
      documentContentMarkdown: 'Alpha\n\nBeta',
      documentContentHtml: '<p>Legacy html ignored</p>',
      documentContentPlainText: 'Alpha Beta',
    });
    const workspace = {
      ...createDefaultCaseResolverWorkspace(),
      files: [scanfile],
      activeFileId: scanfile.id,
    };

    const compacted = compactCaseResolverWorkspaceForPersist(workspace);
    const reparsed = parseCaseResolverWorkspace(JSON.stringify(compacted));
    const restored = reparsed.files.find((file) => file.id === scanfile.id);

    expect(restored?.fileType).toBe('scanfile');
    expect(restored?.editorType).toBe('markdown');
    expect(restored?.documentContentMarkdown).toBe('Alpha\n\nBeta');
    expect(restored?.documentContent).toBe('Alpha\n\nBeta');
    expect(restored?.documentContentMarkdown).not.toContain('<p>');
    expect(restored?.documentContentHtml).toContain('<p>Alpha</p>');
  });
});
