import { describe, expect, it } from 'vitest';

import { resolveCaseResolverTreeWorkspace } from '@/features/case-resolver/components/case-resolver-tree-workspace';
import {
  createCaseResolverAssetFile,
  createCaseResolverFile,
  createEmptyCaseResolverRelationGraph,
} from '@/features/case-resolver/settings';
import type {
  CaseResolverWorkspace,
  CaseResolverFile,
  CaseResolverAssetFile,
  CaseResolverGraph,
} from '@/shared/contracts/case-resolver';

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
    } as CaseResolverGraph,
  });

  return {
    id: 'test-workspace',
    name: 'Test Workspace',
    ownerId: 'owner-1',
    isPublic: false,
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
      'old-folder': {
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      'new-folder': {
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
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

const buildNestedCaseWorkspaceFixture = (): CaseResolverWorkspace => {
  const parentCase = createCaseResolverFile({
    id: 'case-parent',
    name: 'Case Parent',
    fileType: 'case',
    folder: '',
  });
  const childCase = createCaseResolverFile({
    id: 'case-child',
    name: 'Case Child',
    fileType: 'case',
    folder: '',
    parentCaseId: 'case-parent',
  });
  const grandchildCase = createCaseResolverFile({
    id: 'case-grandchild',
    name: 'Case Grandchild',
    fileType: 'case',
    folder: '',
    parentCaseId: 'case-child',
  });
  const parentDoc = createCaseResolverFile({
    id: 'doc-parent',
    name: 'Parent Doc',
    folder: 'parent-folder',
    parentCaseId: 'case-parent',
  });
  const childDoc = createCaseResolverFile({
    id: 'doc-child',
    name: 'Child Doc',
    folder: 'child-folder',
    parentCaseId: 'case-child',
  });
  const grandchildDoc = createCaseResolverFile({
    id: 'doc-grandchild',
    name: 'Grandchild Doc',
    folder: 'grandchild-folder',
    parentCaseId: 'case-grandchild',
  });

  return {
    id: 'nested-workspace',
    name: 'Nested Workspace',
    ownerId: 'owner-1',
    isPublic: false,
    version: 2,
    workspaceRevision: 0,
    lastMutationId: null,
    lastMutationAt: null,
    folders: ['parent-folder', 'child-folder', 'grandchild-folder'],
    folderRecords: [
      { path: 'parent-folder', ownerCaseId: 'case-parent' },
      { path: 'child-folder', ownerCaseId: 'case-child' },
      { path: 'grandchild-folder', ownerCaseId: 'case-grandchild' },
    ],
    folderTimestamps: {
      'parent-folder': {
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      'child-folder': {
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
      'grandchild-folder': {
        createdAt: '2026-01-03T00:00:00.000Z',
        updatedAt: '2026-01-03T00:00:00.000Z',
      },
    },
    files: [parentCase, childCase, grandchildCase, parentDoc, childDoc, grandchildDoc],
    assets: [
      createCaseResolverAssetFile({
        id: 'asset-parent',
        name: 'parent.pdf',
        folder: 'parent-folder',
        kind: 'pdf',
        filepath: '/uploads/parent.pdf',
        sourceFileId: 'doc-parent',
      }),
      createCaseResolverAssetFile({
        id: 'asset-child',
        name: 'child.pdf',
        folder: 'child-folder',
        kind: 'pdf',
        filepath: '/uploads/child.pdf',
        sourceFileId: 'doc-child',
      }),
      createCaseResolverAssetFile({
        id: 'asset-grandchild',
        name: 'grandchild.pdf',
        folder: 'grandchild-folder',
        kind: 'pdf',
        filepath: '/uploads/grandchild.pdf',
        sourceFileId: 'doc-grandchild',
      }),
    ],
    relationGraph: createEmptyCaseResolverRelationGraph(),
    activeFileId: 'case-parent',
  };
};

describe('resolveCaseResolverTreeWorkspace', () => {
  it('falls back to current workspace when URL requested file is missing', () => {
    const workspace = buildWorkspaceFixture();
    const scoped = resolveCaseResolverTreeWorkspace({
      selectedFileId: 'case-a',
      requestedFileId: 'case-missing',
      workspace,
    });

    expect(scoped.files.map((file: CaseResolverFile) => file.id).sort()).toEqual(
      workspace.files.map((file: CaseResolverFile) => file.id).sort()
    );
    expect(scoped.assets.map((asset: CaseResolverAssetFile) => asset.id).sort()).toEqual(
      workspace.assets.map((asset: CaseResolverAssetFile) => asset.id).sort()
    );
    expect(scoped.folders).toEqual(workspace.folders);
    expect(scoped.folderRecords).toEqual(workspace.folderRecords);
    expect(scoped.activeFileId).toBe(workspace.activeFileId);
  });

  it('prioritizes URL requested case scope over stale selected file state', () => {
    const workspace = buildWorkspaceFixture();
    const scoped = resolveCaseResolverTreeWorkspace({
      selectedFileId: 'case-a',
      requestedFileId: 'case-b',
      workspace,
    });

    expect(scoped.files.map((file: CaseResolverFile) => file.id).sort()).toEqual([
      'case-b',
      'doc-b',
    ]);
    expect(scoped.assets.map((asset: CaseResolverAssetFile) => asset.id).sort()).toEqual([
      'asset-b',
      'asset-node-b',
    ]);

    expect(scoped.folders).toEqual(['new-folder']);
    expect(scoped.activeFileId).toBe('case-b');
  });

  it('falls back to current workspace when selected file is missing from workspace', () => {
    const workspace = buildWorkspaceFixture();
    const scoped = resolveCaseResolverTreeWorkspace({
      selectedFileId: 'case-missing',
      requestedFileId: null,
      workspace,
    });

    expect(scoped.files.map((file: CaseResolverFile) => file.id).sort()).toEqual(
      workspace.files.map((file: CaseResolverFile) => file.id).sort()
    );
    expect(scoped.assets.map((asset: CaseResolverAssetFile) => asset.id).sort()).toEqual(
      workspace.assets.map((asset: CaseResolverAssetFile) => asset.id).sort()
    );
    expect(scoped.folders).toEqual(workspace.folders);
    expect(scoped.folderRecords).toEqual(workspace.folderRecords);
    expect(scoped.activeFileId).toBe(workspace.activeFileId);
  });

  it('shows full workspace when no explicit case context is selected, even if activeFileId exists', () => {
    const workspace = buildWorkspaceFixture();
    const scoped = resolveCaseResolverTreeWorkspace({
      selectedFileId: null,
      requestedFileId: null,
      activeCaseId: null,
      workspace: {
        ...workspace,
        activeFileId: 'case-a',
      },
    });

    expect(scoped.files.map((file: CaseResolverFile) => file.id).sort()).toEqual(
      workspace.files.map((file: CaseResolverFile) => file.id).sort()
    );
    expect(scoped.assets.map((asset: CaseResolverAssetFile) => asset.id).sort()).toEqual(
      workspace.assets.map((asset: CaseResolverAssetFile) => asset.id).sort()
    );
    expect(scoped.folders).toEqual(workspace.folders);
  });

  it('uses explicit activeCaseId to scope workspace when file selection is empty', () => {
    const workspace = buildWorkspaceFixture();
    const scoped = resolveCaseResolverTreeWorkspace({
      selectedFileId: null,
      requestedFileId: null,
      activeCaseId: 'case-b',
      workspace: {
        ...workspace,
        activeFileId: null,
      },
    });

    expect(scoped.files.map((file: CaseResolverFile) => file.id).sort()).toEqual([
      'case-b',
      'doc-b',
    ]);
    expect(scoped.assets.map((asset: CaseResolverAssetFile) => asset.id).sort()).toEqual([
      'asset-b',
      'asset-node-b',
    ]);
    expect(scoped.folders).toEqual(['new-folder']);
  });

  it('includes descendant case scope by default', () => {
    const workspace = buildNestedCaseWorkspaceFixture();
    const scoped = resolveCaseResolverTreeWorkspace({
      selectedFileId: 'case-parent',
      requestedFileId: null,
      workspace,
    });

    expect(scoped.files.map((file: CaseResolverFile) => file.id).sort()).toEqual([
      'case-child',
      'case-grandchild',
      'case-parent',
      'doc-child',
      'doc-grandchild',
      'doc-parent',
    ]);
    expect(scoped.assets.map((asset: CaseResolverAssetFile) => asset.id).sort()).toEqual([
      'asset-child',
      'asset-grandchild',
      'asset-parent',
    ]);
    expect(scoped.folders).toEqual(['child-folder', 'grandchild-folder', 'parent-folder']);
  });

  it('scopes folder tree to parent case only when descendant scope is disabled', () => {
    const workspace = buildNestedCaseWorkspaceFixture();
    const scoped = resolveCaseResolverTreeWorkspace({
      selectedFileId: 'case-parent',
      requestedFileId: null,
      workspace,
      includeDescendantCaseScope: false,
    });

    expect(scoped.files.map((file: CaseResolverFile) => file.id).sort()).toEqual([
      'case-parent',
      'doc-parent',
    ]);
    expect(scoped.assets.map((asset: CaseResolverAssetFile) => asset.id)).toEqual(['asset-parent']);
    expect(scoped.folders).toEqual(['parent-folder']);
    expect(scoped.folderRecords).toEqual([{ path: 'parent-folder', ownerCaseId: 'case-parent' }]);
  });

  it('includes legacy documents in scoped case when folder ownership matches but parentCaseId is missing', () => {
    const workspace = buildWorkspaceFixture();
    const legacyDoc = createCaseResolverFile({
      id: 'doc-legacy',
      name: 'Legacy Doc',
      folder: 'old-folder/legacy',
      parentCaseId: null,
    });
    const legacyAsset = createCaseResolverAssetFile({
      id: 'asset-legacy',
      name: 'legacy.pdf',
      folder: 'old-folder/legacy',
      kind: 'pdf',
      filepath: '/uploads/legacy.pdf',
      sourceFileId: 'doc-legacy',
    });

    const scoped = resolveCaseResolverTreeWorkspace({
      selectedFileId: 'case-a',
      requestedFileId: null,
      workspace: {
        ...workspace,
        folderRecords: [
          ...(workspace.folderRecords ?? []),
          { path: 'old-folder/legacy', ownerCaseId: 'case-a' },
        ],
        files: [...workspace.files, legacyDoc],
        assets: [...workspace.assets, legacyAsset],
      },
    });

    expect(scoped.files.map((file: CaseResolverFile) => file.id)).toContain('doc-legacy');
    expect(scoped.assets.map((asset: CaseResolverAssetFile) => asset.id)).toContain('asset-legacy');
  });

  it('includes unresolved documents in scoped case when related links point into scope', () => {
    const workspace = buildWorkspaceFixture();
    const unresolvedRelatedDoc = createCaseResolverFile({
      id: 'doc-unassigned-linked',
      name: 'Unassigned Linked',
      folder: 'unassigned-folder',
      parentCaseId: null,
      relatedFileIds: ['doc-a'],
    });

    const scoped = resolveCaseResolverTreeWorkspace({
      selectedFileId: 'case-a',
      requestedFileId: null,
      workspace: {
        ...workspace,
        files: [...workspace.files, unresolvedRelatedDoc],
      },
    });

    expect(scoped.files.map((file: CaseResolverFile) => file.id)).toContain(
      'doc-unassigned-linked'
    );
  });

  it('keeps unrelated unresolved documents out of scoped case when no ownership or relations match', () => {
    const workspace = buildWorkspaceFixture();
    const unresolvedUnrelatedDoc = createCaseResolverFile({
      id: 'doc-unassigned-unrelated',
      name: 'Unassigned Unrelated',
      folder: 'unassigned-folder',
      parentCaseId: null,
      relatedFileIds: ['doc-b'],
    });

    const scoped = resolveCaseResolverTreeWorkspace({
      selectedFileId: 'case-a',
      requestedFileId: null,
      workspace: {
        ...workspace,
        files: [...workspace.files, unresolvedUnrelatedDoc],
      },
    });

    expect(scoped.files.map((file: CaseResolverFile) => file.id)).not.toContain(
      'doc-unassigned-unrelated'
    );
  });
});
