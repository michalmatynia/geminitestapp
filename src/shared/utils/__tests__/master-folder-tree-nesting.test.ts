import { describe, expect, it } from 'vitest';

import {
  defaultFolderTreeProfilesV2,
} from '@/shared/utils/folder-tree-profiles-v2';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import {
  canDropMasterTreeNode,
  moveMasterTreeNode,
} from '@/shared/utils/master-folder-tree-engine';

const node = (overrides: Partial<MasterTreeNode> & Pick<MasterTreeNode, 'id' | 'name'>): MasterTreeNode => ({
  id: overrides.id,
  type: overrides.type ?? 'file',
  kind: overrides.kind ?? 'file',
  parentId: overrides.parentId ?? null,
  name: overrides.name,
  path: overrides.path ?? overrides.name.toLowerCase(),
  sortOrder: overrides.sortOrder ?? 0,
  icon: overrides.icon ?? null,
  metadata: overrides.metadata,
});

describe('cross-profile nesting rules', () => {
  describe('image_studio profile', () => {
    const profile = defaultFolderTreeProfilesV2.image_studio;

    const baseNodes: MasterTreeNode[] = [
      node({ id: 'folder-a', type: 'folder', kind: 'folder', name: 'Folder A' }),
      node({ id: 'folder-b', type: 'folder', kind: 'folder', name: 'Folder B' }),
      node({ id: 'card-1', type: 'file', kind: 'card', name: 'Card 1' }),
      node({ id: 'card-2', type: 'file', kind: 'card', name: 'Card 2', parentId: 'folder-a' }),
    ];

    it('allows card drop inside folder', () => {
      const result = canDropMasterTreeNode({
        nodes: baseNodes,
        nodeId: 'card-1',
        targetId: 'folder-a',
        position: 'inside',
        profile,
      });
      expect(result.ok).toBe(true);
      expect(result.resolvedParentId).toBe('folder-a');
    });

    it('allows folder drop inside another folder', () => {
      const result = canDropMasterTreeNode({
        nodes: baseNodes,
        nodeId: 'folder-b',
        targetId: 'folder-a',
        position: 'inside',
        profile,
      });
      expect(result.ok).toBe(true);
      expect(result.resolvedParentId).toBe('folder-a');
    });

    it('rejects card drop inside another card', () => {
      const result = canDropMasterTreeNode({
        nodes: baseNodes,
        nodeId: 'card-1',
        targetId: 'card-2',
        position: 'inside',
        profile,
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('TARGET_NOT_FOLDER');
    });

    it('allows card drop to root', () => {
      const result = canDropMasterTreeNode({
        nodes: baseNodes,
        nodeId: 'card-2',
        targetId: null,
        position: 'inside',
        profile,
      });
      expect(result.ok).toBe(true);
      expect(result.resolvedParentId).toBeNull();
    });

    it('allows folder drop to root', () => {
      const nestedNodes: MasterTreeNode[] = [
        node({ id: 'folder-parent', type: 'folder', kind: 'folder', name: 'Parent' }),
        node({ id: 'folder-child', type: 'folder', kind: 'folder', name: 'Child', parentId: 'folder-parent' }),
      ];
      const result = canDropMasterTreeNode({
        nodes: nestedNodes,
        nodeId: 'folder-child',
        targetId: null,
        position: 'inside',
        profile,
      });
      expect(result.ok).toBe(true);
    });

    it('moves card into folder and updates parentId', () => {
      const result = moveMasterTreeNode({
        nodes: baseNodes,
        nodeId: 'card-1',
        targetParentId: 'folder-a',
        profile,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const moved = result.nodes.find((n: MasterTreeNode) => n.id === 'card-1');
      expect(moved?.parentId).toBe('folder-a');
    });
  });

  describe('case_resolver profile', () => {
    const profile = defaultFolderTreeProfilesV2.case_resolver;

    const baseNodes: MasterTreeNode[] = [
      node({ id: 'folder:docs', type: 'folder', kind: 'folder', name: 'Documents' }),
      node({ id: 'folder:evidence', type: 'folder', kind: 'folder', name: 'Evidence' }),
      node({ id: 'file:case-1', type: 'file', kind: 'case_file', name: 'Case 1' }),
      node({ id: 'asset:img-1', type: 'file', kind: 'asset_image', name: 'Photo 1' }),
      node({ id: 'asset:pdf-1', type: 'file', kind: 'asset_pdf', name: 'Report.pdf' }),
      node({ id: 'asset:node-1', type: 'file', kind: 'node_file', name: 'Node Script' }),
    ];

    it('allows case_file drop inside folder', () => {
      const result = canDropMasterTreeNode({
        nodes: baseNodes,
        nodeId: 'file:case-1',
        targetId: 'folder:docs',
        position: 'inside',
        profile,
      });
      expect(result.ok).toBe(true);
    });

    it('allows asset_image drop inside folder', () => {
      const result = canDropMasterTreeNode({
        nodes: baseNodes,
        nodeId: 'asset:img-1',
        targetId: 'folder:evidence',
        position: 'inside',
        profile,
      });
      expect(result.ok).toBe(true);
    });

    it('allows asset_pdf drop inside folder', () => {
      const result = canDropMasterTreeNode({
        nodes: baseNodes,
        nodeId: 'asset:pdf-1',
        targetId: 'folder:docs',
        position: 'inside',
        profile,
      });
      expect(result.ok).toBe(true);
    });

    it('allows node_file drop inside folder', () => {
      const result = canDropMasterTreeNode({
        nodes: baseNodes,
        nodeId: 'asset:node-1',
        targetId: 'folder:docs',
        position: 'inside',
        profile,
      });
      expect(result.ok).toBe(true);
    });

    it('allows folder nesting inside another folder', () => {
      const result = canDropMasterTreeNode({
        nodes: baseNodes,
        nodeId: 'folder:evidence',
        targetId: 'folder:docs',
        position: 'inside',
        profile,
      });
      expect(result.ok).toBe(true);
    });

    it('allows file drop to root', () => {
      const nestedNodes: MasterTreeNode[] = [
        node({ id: 'folder:a', type: 'folder', kind: 'folder', name: 'A' }),
        node({ id: 'file:x', type: 'file', kind: 'case_file', name: 'X', parentId: 'folder:a' }),
      ];
      const result = canDropMasterTreeNode({
        nodes: nestedNodes,
        nodeId: 'file:x',
        targetId: null,
        position: 'inside',
        profile,
      });
      expect(result.ok).toBe(true);
    });

    it('prevents dropping folder into its own subtree', () => {
      const nestedNodes: MasterTreeNode[] = [
        node({ id: 'folder:parent', type: 'folder', kind: 'folder', name: 'Parent' }),
        node({ id: 'folder:child', type: 'folder', kind: 'folder', name: 'Child', parentId: 'folder:parent' }),
      ];
      const result = canDropMasterTreeNode({
        nodes: nestedNodes,
        nodeId: 'folder:parent',
        targetId: 'folder:child',
        position: 'inside',
        profile,
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('TARGET_IN_SUBTREE');
    });
  });

  describe('notes profile', () => {
    const profile = defaultFolderTreeProfilesV2.notes;

    const baseNodes: MasterTreeNode[] = [
      node({ id: 'folder-1', type: 'folder', kind: 'folder', name: 'Work' }),
      node({ id: 'note-1', type: 'file', kind: 'note', name: 'Meeting notes' }),
    ];

    it('allows note drop inside folder', () => {
      const result = canDropMasterTreeNode({
        nodes: baseNodes,
        nodeId: 'note-1',
        targetId: 'folder-1',
        position: 'inside',
        profile,
      });
      expect(result.ok).toBe(true);
    });

    it('allows folder nesting inside another folder', () => {
      const nodes: MasterTreeNode[] = [
        node({ id: 'folder-a', type: 'folder', kind: 'folder', name: 'A' }),
        node({ id: 'folder-b', type: 'folder', kind: 'folder', name: 'B' }),
      ];
      const result = canDropMasterTreeNode({
        nodes,
        nodeId: 'folder-b',
        targetId: 'folder-a',
        position: 'inside',
        profile,
      });
      expect(result.ok).toBe(true);
    });
  });

  describe('product_categories profile', () => {
    const profile = defaultFolderTreeProfilesV2.product_categories;

    it('allows category nesting inside another category', () => {
      const nodes: MasterTreeNode[] = [
        node({ id: 'cat-electronics', type: 'folder', kind: 'category', name: 'Electronics' }),
        node({ id: 'cat-phones', type: 'folder', kind: 'category', name: 'Phones' }),
      ];
      const result = canDropMasterTreeNode({
        nodes,
        nodeId: 'cat-phones',
        targetId: 'cat-electronics',
        position: 'inside',
        profile,
      });
      expect(result.ok).toBe(true);
    });

    it('rejects file drop into category folder', () => {
      const nodes: MasterTreeNode[] = [
        node({ id: 'cat-root', type: 'folder', kind: 'category', name: 'Root' }),
        node({ id: 'file-product', type: 'file', kind: 'product', name: 'Product' }),
      ];
      const result = canDropMasterTreeNode({
        nodes,
        nodeId: 'file-product',
        targetId: 'cat-root',
        position: 'inside',
        profile,
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('PROFILE_RULE_BLOCKED');
    });
  });

  describe('cms_page_builder profile', () => {
    const profile = defaultFolderTreeProfilesV2.cms_page_builder;

    it('allows section drop inside zone folder', () => {
      const nodes: MasterTreeNode[] = [
        node({ id: 'zone-header', type: 'folder', kind: 'zone', name: 'Header' }),
        node({ id: 'section-hero', type: 'file', kind: 'section', name: 'Hero' }),
      ];
      const result = canDropMasterTreeNode({
        nodes,
        nodeId: 'section-hero',
        targetId: 'zone-header',
        position: 'inside',
        profile,
      });
      expect(result.ok).toBe(true);
    });
  });
});
