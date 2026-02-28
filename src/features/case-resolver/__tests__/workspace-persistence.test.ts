import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CASE_RESOLVER_WORKSPACE_KEY,
  createCaseResolverFile,
  createDefaultCaseResolverWorkspace,
  parseCaseResolverWorkspace,
} from '@/features/case-resolver/settings';
import {
  compactCaseResolverWorkspaceForPersist,
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
    const workspace = {
      ...createDefaultCaseResolverWorkspace(),
      files: [scanfile, documentFile],
    };

    const compacted = compactCaseResolverWorkspaceForPersist(workspace);
    const compactedScan = compacted.files.find((file) => file.id === 'scan-persist-1');
    const compactedDoc = compacted.files.find((file) => file.id === 'doc-persist-1');

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
    expect(compactedDoc?.documentContentHtml).toBe('<p>Hello</p>');
    const docHistory = compactedDoc?.documentHistory?.[0] as Record<string, unknown> | undefined;
    expect(docHistory).toBeDefined();
    expect(docHistory && 'documentContentMarkdown' in docHistory).toBe(false);
    expect(docHistory && 'documentContentPlainText' in docHistory).toBe(false);
    expect(docHistory?.['documentContentHtml']).toBe('<p>History</p>');
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
