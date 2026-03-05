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
  fetchCaseResolverWorkspaceRecordDetailed,
  fetchCaseResolverWorkspaceRecord,
  fetchCaseResolverWorkspaceIfStale,
  fetchCaseResolverWorkspaceSnapshot,
  getCaseResolverWorkspaceRevision,
  persistCaseResolverWorkspaceSnapshot,
  stampCaseResolverWorkspaceMutation,
} from '@/features/case-resolver/workspace-persistence';

const CASE_RESOLVER_WORKSPACE_DETACHED_HISTORY_SCHEMA_V1 =
  'case_resolver_workspace_detached_history_v1';
const CASE_RESOLVER_WORKSPACE_DETACHED_DOCUMENTS_SCHEMA_V1 =
  'case_resolver_workspace_detached_documents_v1';

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
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

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
      schema: 'case_resolver_workspace_detached_history_v2',
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

  it('skips detached history sidecar hydration for legacy v1 schema payloads', async () => {
    const workspace = {
      ...createDefaultCaseResolverWorkspace(),
      workspaceRevision: 12,
      files: [
        createCaseResolverFile({
          id: 'doc-history-legacy',
          fileType: 'document',
          name: 'Doc History Legacy',
          documentContent: '<p>Hello</p>',
          documentContentHtml: '<p>Hello</p>',
          documentHistory: [],
        }),
      ],
    };
    const detachedHistoryPayload = {
      schema: CASE_RESOLVER_WORKSPACE_DETACHED_HISTORY_SCHEMA_V1,
      workspaceRevision: 12,
      files: [
        {
          id: 'doc-history-legacy',
          documentHistory: [
            {
              id: 'detached-legacy',
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
      const file = result.workspace.files.find((entry) => entry.id === 'doc-history-legacy');
      expect(file?.documentHistory.length).toBe(0);
    }
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
      schema: 'case_resolver_workspace_detached_documents_v2',
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

  it('skips detached documents sidecar hydration for legacy v1 schema payloads', async () => {
    const workspace = {
      ...createDefaultCaseResolverWorkspace(),
      workspaceRevision: 12,
      lastMutationId: 'doc-mutation-legacy',
      files: [
        createCaseResolverFile({
          id: 'doc-body-legacy',
          fileType: 'document',
          name: 'Doc Legacy',
          documentContent: '',
          documentContentHtml: '',
          documentContentPlainText: '',
        }),
      ],
    };
    const detachedDocumentsPayload = {
      schema: CASE_RESOLVER_WORKSPACE_DETACHED_DOCUMENTS_SCHEMA_V1,
      workspaceRevision: 12,
      lastMutationId: 'doc-mutation-legacy',
      files: [
        {
          id: 'doc-body-legacy',
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
      const file = result.workspace.files.find((entry) => entry.id === 'doc-body-legacy');
      expect(file?.documentContentHtml).toBe('');
      expect(file?.documentContentPlainText).toBe('');
    }
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
      schema: 'case_resolver_workspace_detached_documents_v2',
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
      schema: 'case_resolver_workspace_detached_history_v2',
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
      schema: 'case_resolver_workspace_detached_documents_v2',
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
      schema: 'case_resolver_workspace_detached_history_v2',
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

  it('fetches detached sidecars without caseResolverFileId when required file is a case', async () => {
    const workspace = {
      ...createDefaultCaseResolverWorkspace(),
      workspaceRevision: 21,
      lastMutationId: 'case-required-1',
      files: [
        createCaseResolverFile({
          id: 'case-required',
          fileType: 'case',
          name: 'Required Case',
        }),
        createCaseResolverFile({
          id: 'doc-under-case',
          fileType: 'document',
          name: 'Doc Under Case',
          parentCaseId: 'case-required',
          documentContent: '',
          documentContentHtml: '',
          documentHistory: [],
        }),
      ],
    };
    const detachedDocumentsPayload = {
      schema: 'case_resolver_workspace_detached_documents_v2',
      workspaceRevision: 21,
      lastMutationId: 'case-required-1',
      files: [
        {
          id: 'doc-under-case',
          documentContentHtml: '<p>Case body</p>',
          documentContentPlainText: 'Case body',
        },
      ],
    };
    const detachedHistoryPayload = {
      schema: 'case_resolver_workspace_detached_history_v2',
      workspaceRevision: 21,
      lastMutationId: 'case-required-1',
      files: [
        {
          id: 'doc-under-case',
          documentHistory: [
            {
              id: 'case-history-1',
              savedAt: '2026-03-02T10:00:00.000Z',
              documentContentVersion: 1,
              activeDocumentVersion: 'original',
              editorType: 'wysiwyg',
              documentContent: '<p>Case body</p>',
              documentContentMarkdown: 'Case body',
              documentContentHtml: '<p>Case body</p>',
              documentContentPlainText: 'Case body',
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
      requiredFileId: 'case-required',
      strategy: 'light_only',
    });

    expect(result.status).toBe('resolved');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `/api/settings?scope=light&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}`
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `/api/settings?scope=light&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY)}`
    );
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      `/api/settings?scope=light&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_HISTORY_KEY)}`
    );
    if (result.status === 'resolved') {
      const hydratedDocument = result.workspace.files.find((file) => file.id === 'doc-under-case');
      expect(hydratedDocument?.documentContentPlainText).toBe('Case body');
      expect(hydratedDocument?.documentHistory.length).toBe(1);
    }
  });

  it('conditionally fetches detached sidecars without caseResolverFileId when required file is a case', async () => {
    const workspace = {
      ...createDefaultCaseResolverWorkspace(),
      workspaceRevision: 25,
      lastMutationId: 'case-conditional-1',
      files: [
        createCaseResolverFile({
          id: 'case-conditional',
          fileType: 'case',
          name: 'Conditional Case',
        }),
        createCaseResolverFile({
          id: 'doc-conditional',
          fileType: 'document',
          name: 'Conditional Doc',
          parentCaseId: 'case-conditional',
          documentContent: '',
          documentContentHtml: '',
          documentHistory: [],
        }),
      ],
    };
    const detachedDocumentsPayload = {
      schema: 'case_resolver_workspace_detached_documents_v2',
      workspaceRevision: 25,
      lastMutationId: 'case-conditional-1',
      files: [
        {
          id: 'doc-conditional',
          documentContentHtml: '<p>Conditional body</p>',
          documentContentPlainText: 'Conditional body',
        },
      ],
    };
    const detachedHistoryPayload = {
      schema: 'case_resolver_workspace_detached_history_v2',
      workspaceRevision: 25,
      lastMutationId: 'case-conditional-1',
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
      requiredFileId: 'case-conditional',
    });

    expect(result.updated).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `/api/settings?key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_KEY)}&fresh=1&ifRevisionGt=1`
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `/api/settings?scope=light&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_DOCUMENTS_KEY)}`
    );
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      `/api/settings?scope=light&fresh=1&key=${encodeURIComponent(CASE_RESOLVER_WORKSPACE_HISTORY_KEY)}`
    );
    if (result.updated) {
      const hydratedDocument = result.workspace.files.find((file) => file.id === 'doc-conditional');
      expect(hydratedDocument?.documentContentPlainText).toBe('Conditional body');
      expect(hydratedDocument?.documentHistory.length).toBe(1);
    }
  });


});
