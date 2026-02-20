import { describe, expect, it } from 'vitest';

import { resolveCaseResolverTreeWorkspace } from '@/features/case-resolver/components/case-resolver-tree-workspace';
import {
  createCaseResolverAssetFile,
  createCaseResolverFile,
  createEmptyCaseResolverRelationGraph,
} from '@/features/case-resolver/settings';
import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver';

const buildWorkspaceFixture = (): CaseResolverWorkspace => {
  const caseA = createCaseResolverFile({
    id: 'case-a',
    name: 'Case A',
    fileType: 'case',
    folder: '',
  });
  const caseB = createCaseResolverFile({
    id: 'case-b',
    name: 'Case B',
    fileType: 'case',
    folder: '',
  });
  const docA = createCaseResolverFile({
    id: 'doc-a',
    name: 'Document A',
    folder: 'old-folder',
    parentCaseId: 'case-a',
  });
  const docB = createCaseResolverFile({
    id: 'doc-b',
    name: 'Document B',
    folder: 'new-folder',
    parentCaseId: 'case-b',
    graph: {
      nodes: [
        {
          id: 'node-b',
          type: 'prompt',
          title: 'Node B',
          description: '',
          inputs: ['input'],
          outputs: ['output'],
          position: { x: 0, y: 0 },
          config: { prompt: { template: '' } },
        },
      ],
      edges: [],
      nodeMeta: {},
      edgeMeta: {},
      nodeFileAssetIdByNode: {
        'node-b': 'asset-node-b',
      },
    },
  });

  return {
    version: 2,
    workspaceRevision: 0,
    lastMutationId: null,
    lastMutationAt: null,
    folders: ['old-folder', 'new-folder'],
    folderRecords: [
      { path: 'old-folder', ownerCaseId: 'case-a' },
      { path: 'new-folder', ownerCaseId: 'case-b' },
    ],
    folderTimestamps: {
      'old-folder': { createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
      'new-folder': { createdAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' },
    },
    files: [caseA, caseB, docA, docB],
    assets: [
      createCaseResolverAssetFile({
        id: 'asset-a',
        name: 'a.png',
        folder: 'old-folder',
        kind: 'image',
        filepath: '/uploads/a.png',
        sourceFileId: 'doc-a',
      }),
      createCaseResolverAssetFile({
        id: 'asset-b',
        name: 'b.png',
        folder: 'new-folder',
        kind: 'image',
        filepath: '/uploads/b.png',
        sourceFileId: 'doc-b',
      }),
      createCaseResolverAssetFile({
        id: 'asset-node-b',
        name: 'Node File B',
        folder: 'new-folder',
        kind: 'node_file',
        filepath: null,
        sourceFileId: null,
        textContent: '{}',
        description: 'Node snapshot',
      }),
    ],
    relationGraph: createEmptyCaseResolverRelationGraph(),
    activeFileId: 'case-a',
  };
};

describe('resolveCaseResolverTreeWorkspace', () => {
  it('returns an empty scoped workspace when URL requested file is missing', () => {
    const workspace = buildWorkspaceFixture();
    const scoped = resolveCaseResolverTreeWorkspace({
      selectedFileId: 'case-a',
      requestedFileId: 'case-missing',
      workspace,
    });

    expect(scoped.files).toEqual([]);
    expect(scoped.assets).toEqual([]);
    expect(scoped.folders).toEqual([]);
    expect(scoped.folderRecords).toEqual([]);
    expect(scoped.activeFileId).toBeNull();
  });

  it('prioritizes URL requested case scope over stale selected file state', () => {
    const workspace = buildWorkspaceFixture();
    const scoped = resolveCaseResolverTreeWorkspace({
      selectedFileId: 'case-a',
      requestedFileId: 'case-b',
      workspace,
    });

    expect(scoped.files.map((file) => file.id).sort()).toEqual(['case-b', 'doc-b']);
    expect(scoped.assets.map((asset) => asset.id).sort()).toEqual(['asset-b', 'asset-node-b']);
    expect(scoped.folders).toEqual(['new-folder']);
    expect(scoped.activeFileId).toBe('case-b');
  });

  it('clears folders as well when selected file is missing from workspace', () => {
    const workspace = buildWorkspaceFixture();
    const scoped = resolveCaseResolverTreeWorkspace({
      selectedFileId: 'case-missing',
      requestedFileId: null,
      workspace,
    });

    expect(scoped.files).toEqual([]);
    expect(scoped.assets).toEqual([]);
    expect(scoped.folders).toEqual([]);
    expect(scoped.folderRecords).toEqual([]);
  });
});
