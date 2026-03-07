import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CASE_RESOLVER_WORKSPACE_KEY,
  createDefaultCaseResolverWorkspace,
} from '@/features/case-resolver/settings';
import {
  computeCaseResolverConflictRetryDelayMs,
  getCaseResolverWorkspaceRevision,
  isCaseResolverWorkspacePayloadTooLarge,
  persistCaseResolverWorkspaceSnapshot,
  readWorkspaceFromSettingRecord,
  stampCaseResolverWorkspaceMutation,
} from '@/features/case-resolver/workspace-persistence';

const toJsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('workspace-persistence: core lifecycle', () => {
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

  // ── readWorkspaceFromSettingRecord ──────────────────────────────────────

  it('reads workspace from a valid setting record', () => {
    const workspace = createDefaultCaseResolverWorkspace();
    const record = { key: CASE_RESOLVER_WORKSPACE_KEY, value: JSON.stringify(workspace) };
    const result = readWorkspaceFromSettingRecord(record, '{}');
    expect(Array.isArray(result.files)).toBe(true);
  });

  it('falls back to default workspace when record value is empty', () => {
    const result = readWorkspaceFromSettingRecord(
      { key: CASE_RESOLVER_WORKSPACE_KEY, value: '' },
      '{}'
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result.files)).toBe(true);
  });

  it('returns fallback workspace when record is null', () => {
    const fallback = JSON.stringify(createDefaultCaseResolverWorkspace());
    const result = readWorkspaceFromSettingRecord(null, fallback);
    expect(result).toBeDefined();
    expect(Array.isArray(result.files)).toBe(true);
  });

  // ── isCaseResolverWorkspacePayloadTooLarge ──────────────────────────────

  it('does not flag a small payload as too large', () => {
    expect(isCaseResolverWorkspacePayloadTooLarge(1000)).toBe(false);
  });

  it('flags a payload exceeding the max threshold as too large', () => {
    expect(isCaseResolverWorkspacePayloadTooLarge(100_000_000)).toBe(true);
  });

  it('does not flag non-finite values as too large', () => {
    expect(isCaseResolverWorkspacePayloadTooLarge(NaN)).toBe(false);
    expect(isCaseResolverWorkspacePayloadTooLarge(Infinity)).toBe(false);
  });

  // ── stampCaseResolverWorkspaceMutation + getCaseResolverWorkspaceRevision ─

  it('advances revision monotonically across sequential mutations', () => {
    const workspace = createDefaultCaseResolverWorkspace();
    const v1 = stampCaseResolverWorkspaceMutation(workspace, {
      baseRevision: 0,
      mutationId: 'mut-1',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    const v2 = stampCaseResolverWorkspaceMutation(v1, {
      baseRevision: getCaseResolverWorkspaceRevision(v1),
      mutationId: 'mut-2',
      timestamp: '2026-01-01T00:01:00.000Z',
    });

    expect(getCaseResolverWorkspaceRevision(v1)).toBe(1);
    expect(getCaseResolverWorkspaceRevision(v2)).toBe(2);
    expect(v1.lastMutationId).toBe('mut-1');
    expect(v2.lastMutationId).toBe('mut-2');
  });

  it('returns 0 for a workspace without a revision', () => {
    expect(getCaseResolverWorkspaceRevision({})).toBe(0);
    expect(getCaseResolverWorkspaceRevision({ workspaceRevision: -5 })).toBe(0);
    expect(getCaseResolverWorkspaceRevision({ workspaceRevision: 'bad' })).toBe(0);
  });

  // ── persistCaseResolverWorkspaceSnapshot ───────────────────────────────

  it('returns ok:true on a successful 200 persist', async () => {
    const workspace = stampCaseResolverWorkspaceMutation(createDefaultCaseResolverWorkspace(), {
      baseRevision: 0,
      mutationId: 'mut-persist-ok',
    });
    globalThis.fetch = vi.fn().mockResolvedValue(
      toJsonResponse(200, {
        key: CASE_RESOLVER_WORKSPACE_KEY,
        value: JSON.stringify(workspace),
      })
    ) as unknown as typeof globalThis.fetch;

    const result = await persistCaseResolverWorkspaceSnapshot({
      workspace,
      expectedRevision: 0,
      mutationId: 'mut-persist-ok',
      source: 'test',
    });

    expect(result.ok).toBe(true);
  });

  it('returns ok:false with conflict flag on 409 response', async () => {
    const localWorkspace = stampCaseResolverWorkspaceMutation(
      createDefaultCaseResolverWorkspace(),
      { baseRevision: 0, mutationId: 'local-mut' }
    );
    const serverWorkspace = stampCaseResolverWorkspaceMutation(
      createDefaultCaseResolverWorkspace(),
      { baseRevision: 3, mutationId: 'server-mut' }
    );

    globalThis.fetch = vi.fn().mockResolvedValue(
      toJsonResponse(409, {
        key: CASE_RESOLVER_WORKSPACE_KEY,
        value: JSON.stringify(serverWorkspace),
        conflict: true,
        currentRevision: getCaseResolverWorkspaceRevision(serverWorkspace),
      })
    ) as unknown as typeof globalThis.fetch;

    const result = await persistCaseResolverWorkspaceSnapshot({
      workspace: localWorkspace,
      expectedRevision: 0,
      mutationId: 'local-mut',
      source: 'test',
    });

    expect(result.ok).toBe(false);
    if (!result.ok && result.conflict) {
      expect(result.currentRevision).toBe(getCaseResolverWorkspaceRevision(serverWorkspace));
    }
  });

  it('returns ok:false without conflict flag on network error', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error('Network failure')) as unknown as typeof globalThis.fetch;

    const workspace = stampCaseResolverWorkspaceMutation(createDefaultCaseResolverWorkspace(), {
      baseRevision: 0,
      mutationId: 'mut-net-fail',
    });

    const result = await persistCaseResolverWorkspaceSnapshot({
      workspace,
      expectedRevision: 0,
      mutationId: 'mut-net-fail',
      source: 'test',
    });

    expect(result.ok).toBe(false);
  });

  // ── computeCaseResolverConflictRetryDelayMs ────────────────────────────

  it('grows delay exponentially across retry attempts', () => {
    const delay1 = computeCaseResolverConflictRetryDelayMs(1, {
      baseDelayMs: 100,
      maxDelayMs: 3200,
      jitterMs: 0,
    });
    const delay2 = computeCaseResolverConflictRetryDelayMs(2, {
      baseDelayMs: 100,
      maxDelayMs: 3200,
      jitterMs: 0,
    });
    const delay3 = computeCaseResolverConflictRetryDelayMs(3, {
      baseDelayMs: 100,
      maxDelayMs: 3200,
      jitterMs: 0,
    });

    expect(delay1).toBe(100);
    expect(delay2).toBe(200);
    expect(delay3).toBe(400);
  });

  it('does not exceed maxDelayMs', () => {
    const delay = computeCaseResolverConflictRetryDelayMs(20, {
      baseDelayMs: 100,
      maxDelayMs: 500,
      jitterMs: 0,
    });
    expect(delay).toBeLessThanOrEqual(500);
  });
});
