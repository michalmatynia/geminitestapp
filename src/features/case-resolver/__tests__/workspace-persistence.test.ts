import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CASE_RESOLVER_WORKSPACE_KEY, createDefaultCaseResolverWorkspace } from '@/features/case-resolver/settings';
import {
  computeCaseResolverConflictRetryDelayMs,
  fetchCaseResolverWorkspaceMetadata,
  fetchCaseResolverWorkspaceSnapshot,
  getCaseResolverWorkspaceMaxPayloadBytes,
  getCaseResolverWorkspaceRevision,
  isCaseResolverWorkspacePayloadTooLarge,
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
});
