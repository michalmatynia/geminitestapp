import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CASE_RESOLVER_WORKSPACE_KEY,
  createCaseResolverFile,
  createDefaultCaseResolverWorkspace,
} from '@/features/case-resolver/settings';
import { CASE_RESOLVER_WORKSPACE_HISTORY_KEY } from '@/features/case-resolver/utils/workspace-settings-persistence-helpers';
import {
  fetchCaseResolverWorkspaceRecordDetailed,
  fetchCaseResolverWorkspaceRecord,
  fetchCaseResolverWorkspaceSnapshot,
} from '@/features/case-resolver/workspace-persistence';

const toJsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });

describe('case-resolver workspace persistence required file and fallback behavior', () => {
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
      schema: 'case_resolver_workspace_detached_history_v2',
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

});
