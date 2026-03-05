import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CASE_RESOLVER_WORKSPACE_KEY,
  createCaseResolverAssetFile,
  createCaseResolverFile,
  createDefaultCaseResolverWorkspace,
  parseCaseResolverWorkspace,
} from '@/features/case-resolver/settings';
import {
  compactCaseResolverWorkspaceForPersist,
  computeCaseResolverConflictRetryDelayMs,
  fetchCaseResolverWorkspaceMetadata,
  getCaseResolverWorkspaceMaxPayloadBytes,
  isCaseResolverWorkspacePayloadTooLarge,
} from '@/features/case-resolver/workspace-persistence';

const NODE_FILE_SNAPSHOT_STORAGE_KEY = 'nodeFileSnapshotStorage';

const toJsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });

describe('case-resolver workspace persistence compaction and metadata', () => {
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
            '{"kind":"case_resolver_node_file_snapshot_v2","nodes":[{"id":"legacy-node"}]}',
        }),
      ],
    };

    expect(() => compactCaseResolverWorkspaceForPersist(workspace)).toThrowError(
      /Case Resolver inline node-file snapshots are unsupported\./i
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
