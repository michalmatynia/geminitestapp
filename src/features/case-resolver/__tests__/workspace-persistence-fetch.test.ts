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
