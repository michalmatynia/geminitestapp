import { describe, expect, it } from 'vitest';

import {
  buildMasterNodesFromAiPaths,
  findAiPathMasterNodeAncestorIds,
  fromAiPathFolderNodeId,
  fromAiPathNodeId,
  resolveAiPathFolderTargetPathForNode,
  toAiPathNodeId,
} from './master-folder-tree';

describe('ai paths master tree', () => {
  it('builds nested folder and path nodes from grouped path metadata', () => {
    const nodes = buildMasterNodesFromAiPaths([
      {
        id: 'path_alpha',
        name: 'Alpha',
        folderPath: 'drafts/seo',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'path_beta',
        name: 'Beta',
        folderPath: '',
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    ]);

    expect(nodes.some((node) => fromAiPathFolderNodeId(node.id) === 'drafts')).toBe(true);
    expect(nodes.some((node) => fromAiPathFolderNodeId(node.id) === 'drafts/seo')).toBe(true);
    expect(nodes.some((node) => fromAiPathNodeId(node.id) === 'path_alpha')).toBe(true);
    expect(nodes.some((node) => fromAiPathNodeId(node.id) === 'path_beta')).toBe(true);
  });

  it('resolves ancestor and folder-target paths for grouped path nodes', () => {
    const nodes = buildMasterNodesFromAiPaths([
      {
        id: 'path_alpha',
        name: 'Alpha',
        folderPath: 'drafts/seo',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    expect(findAiPathMasterNodeAncestorIds(nodes, toAiPathNodeId('path_alpha'))).toEqual([
      'ai-path-folder:drafts',
      'ai-path-folder:drafts/seo',
    ]);
    expect(resolveAiPathFolderTargetPathForNode(nodes, toAiPathNodeId('path_alpha'))).toBe(
      'drafts/seo'
    );
  });
});
