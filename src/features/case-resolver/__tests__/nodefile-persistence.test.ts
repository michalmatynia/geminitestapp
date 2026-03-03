import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCaseResolverAssetFile,
  createDefaultCaseResolverWorkspace,
  createEmptyNodeFileSnapshot,
} from '@/features/case-resolver/settings';
import {
  buildCaseResolverNodeFileSnapshotKey,
  deleteCaseResolverNodeFileSnapshot,
  fetchCaseResolverNodeFileSnapshot,
  persistCaseResolverNodeFileSnapshot,
  persistCaseResolverWorkspaceSnapshot,
} from '@/features/case-resolver/workspace-persistence';

const toJsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });

describe('case resolver nodefile persistence', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('persists and fetches keyed nodefile snapshots', async () => {
    const snapshot = createEmptyNodeFileSnapshot();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(toJsonResponse(200, { ok: true }))
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: buildCaseResolverNodeFileSnapshotKey('asset-1'),
          value: JSON.stringify(snapshot),
        })
      );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const didPersist = await persistCaseResolverNodeFileSnapshot({
      assetId: 'asset-1',
      snapshot,
      source: 'test',
    });
    const resolvedSnapshot = await fetchCaseResolverNodeFileSnapshot('asset-1', 8_000, 'test');

    expect(didPersist).toBe(true);
    expect(resolvedSnapshot).toMatchObject({
      kind: 'case_resolver_node_file_snapshot_v1',
      nodes: [],
      edges: [],
    });
  });

  it('treats blank keyed nodefile snapshot records as missing', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      toJsonResponse(200, {
        key: buildCaseResolverNodeFileSnapshotKey('asset-1'),
        value: '',
      })
    );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const resolvedSnapshot = await fetchCaseResolverNodeFileSnapshot('asset-1', 8_000, 'test');

    expect(resolvedSnapshot).toBeNull();
  });

  it('migrates legacy keyed nodefile snapshots with legacy edge keys to canonical payload', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        toJsonResponse(200, {
          key: buildCaseResolverNodeFileSnapshotKey('asset-legacy'),
          value: JSON.stringify({
            kind: 'case_resolver_node_file_snapshot_v1',
            source: 'manual',
            nodes: [
              {
                id: 'node-a',
                type: 'prompt',
                title: 'Node A',
                description: '',
                inputs: ['wysiwygText'],
                outputs: ['wysiwygText'],
                position: { x: 0, y: 0 },
                config: { prompt: { template: '' } },
                data: {},
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
              },
              {
                id: 'node-b',
                type: 'prompt',
                title: 'Node B',
                description: '',
                inputs: ['plaintextContent'],
                outputs: ['plaintextContent'],
                position: { x: 32, y: 0 },
                config: { prompt: { template: '' } },
                data: {},
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
              },
            ],
            edges: [
              {
                id: 'edge-legacy',
                from: 'node-a',
                to: 'node-b',
                fromPort: 'textfield',
                toPort: 'content',
              },
            ],
            nodeMeta: {},
            edgeMeta: {},
            nodeFileMeta: {},
          }),
        })
      )
      .mockResolvedValueOnce(toJsonResponse(200, { ok: true }));
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const resolvedSnapshot = await fetchCaseResolverNodeFileSnapshot(
      'asset-legacy',
      8_000,
      'test'
    );

    expect(resolvedSnapshot?.edges[0]).toMatchObject({
      source: 'node-a',
      target: 'node-b',
      sourceHandle: 'wysiwygText',
      targetHandle: 'plaintextContent',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({
      key: buildCaseResolverNodeFileSnapshotKey('asset-legacy'),
    });
  });

  it('purges invalid keyed nodefile snapshots and treats them as missing', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      toJsonResponse(200, {
        key: buildCaseResolverNodeFileSnapshotKey('asset-1'),
        value: JSON.stringify({
          kind: 'case_resolver_node_file_snapshot_v1',
          source: 'manual',
          nodeId: 'legacy-node',
          sourceFileId: 'doc-legacy',
        }),
      })
    );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const resolvedSnapshot = await fetchCaseResolverNodeFileSnapshot('asset-1', 8_000, 'test');

    expect(resolvedSnapshot).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({
      key: buildCaseResolverNodeFileSnapshotKey('asset-1'),
      value: '',
    });
  });

  it('clears keyed nodefile snapshots via blank writes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(toJsonResponse(200, { ok: true }));
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const didDelete = await deleteCaseResolverNodeFileSnapshot('asset-1', 'test');

    expect(didDelete).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      key: buildCaseResolverNodeFileSnapshotKey('asset-1'),
      value: '',
    });
  });

  it('rejects inline nodefile snapshots during workspace persist', async () => {
    const inlineSnapshot = JSON.stringify({
      kind: 'case_resolver_node_file_snapshot_v1',
      source: 'manual',
      nodes: [
        {
          id: 'node-1',
          type: 'prompt',
          title: 'Node 1',
          description: '',
          inputs: ['prompt'],
          outputs: ['result'],
          position: { x: 0, y: 0 },
          config: { prompt: { template: '' } },
          data: {},
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      edges: [],
      nodeMeta: {},
      edgeMeta: {},
      nodeFileMeta: {},
    });
    const workspace = {
      ...createDefaultCaseResolverWorkspace(),
      assets: [
        createCaseResolverAssetFile({
          id: 'asset-1',
          name: 'Legacy Node File',
          folder: '',
          kind: 'node_file',
          textContent: inlineSnapshot,
        }),
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue(
      toJsonResponse(200, {
        key: 'case_resolver_workspace',
        value: JSON.stringify(workspace),
      })
    );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await persistCaseResolverWorkspaceSnapshot({
      workspace,
      expectedRevision: 0,
      mutationId: 'mutation-nodefile-externalize',
      source: 'test',
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const parsedPersistedWorkspace = JSON.parse(String(body.value)) as {
      assets: Array<{ id: string; textContent?: string }>;
    };
    expect(parsedPersistedWorkspace.assets[0]?.id).toBe('asset-1');
    expect(parsedPersistedWorkspace.assets[0]).not.toHaveProperty('textContent');
  });
});
