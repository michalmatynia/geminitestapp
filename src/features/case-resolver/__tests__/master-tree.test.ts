import { describe, expect, it } from 'vitest';

import { buildMasterNodesFromCaseResolverWorkspace } from '@/features/case-resolver/master-tree';
import {
  createCaseResolverAssetFile,
  createCaseResolverFile,
  createEmptyCaseResolverRelationGraph,
} from '@/features/case-resolver/settings';
import type { CaseResolverWorkspace } from '@/features/case-resolver/types';
import { buildMasterTree } from '@/shared/utils/master-folder-tree-engine';

describe('case-resolver master tree', () => {
  it('orders siblings by type first (folders first) then alphabetically', () => {
    const workspace: CaseResolverWorkspace = {
      version: 2,
      workspaceRevision: 0,
      lastMutationId: null,
      lastMutationAt: null,
      folders: ['beta', 'alpha', 'alpha/sub'],
      folderTimestamps: {},
      files: [
        createCaseResolverFile({ id: 'case-root-hidden', name: 'Case Root', fileType: 'case', folder: '' }),
        createCaseResolverFile({ id: 'file-root-z', name: 'zeta', folder: '' }),
        createCaseResolverFile({ id: 'file-root-a', name: 'apple', folder: '' }),
        createCaseResolverFile({ id: 'file-alpha-z', name: 'zulu', folder: 'alpha' }),
      ],
      assets: [
        createCaseResolverAssetFile({
          id: 'asset-root-m',
          name: 'middle.png',
          folder: '',
          kind: 'image',
          filepath: '/uploads/case-resolver/assets/middle.png',
        }),
        createCaseResolverAssetFile({ id: 'asset-alpha-a', name: 'able.pdf', folder: 'alpha', kind: 'pdf' }),
      ],
      relationGraph: createEmptyCaseResolverRelationGraph(),
      activeFileId: 'file-root-a',
    };

    const nodes = buildMasterNodesFromCaseResolverWorkspace(workspace);
    const tree = buildMasterTree(nodes);

    expect(tree.roots.map((node) => node.name)).toEqual([
      'alpha',
      'beta',
      'apple',
      'middle.png',
      'zeta',
    ]);

    const alphaNode = tree.roots.find((node) => node.name === 'alpha');
    expect(alphaNode?.children.map((node) => node.name)).toEqual([
      'sub',
      'able.pdf',
      'zulu',
    ]);
  });

  it('hides image placeholders without uploaded file paths', () => {
    const workspace: CaseResolverWorkspace = {
      version: 2,
      workspaceRevision: 0,
      lastMutationId: null,
      lastMutationAt: null,
      folders: ['alpha'],
      folderTimestamps: {},
      files: [
        createCaseResolverFile({ id: 'case-root-hidden', name: 'Case Root', fileType: 'case', folder: '' }),
      ],
      assets: [
        createCaseResolverAssetFile({ id: 'asset-placeholder', name: 'placeholder.png', folder: 'alpha', kind: 'image' }),
        createCaseResolverAssetFile({
          id: 'asset-uploaded',
          name: 'uploaded.png',
          folder: 'alpha',
          kind: 'image',
          filepath: '/uploads/case-resolver/assets/uploaded.png',
        }),
      ],
      relationGraph: createEmptyCaseResolverRelationGraph(),
      activeFileId: null,
    };

    const nodes = buildMasterNodesFromCaseResolverWorkspace(workspace);
    const tree = buildMasterTree(nodes);
    const alphaNode = tree.roots.find((node) => node.name === 'alpha');

    expect(alphaNode?.children.map((node) => node.name)).toEqual(['uploaded.png']);
  });
});
