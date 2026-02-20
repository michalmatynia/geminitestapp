import { describe, expect, it } from 'vitest';

import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import {
  buildMasterNodesFromStudioTree,
  findMasterNodeAncestorIds,
  fromFolderMasterNodeId,
  fromSlotMasterNodeId,
  resolveFolderTargetPathForMasterNode,
  toFolderMasterNodeId,
  toSlotMasterNodeId,
} from '@/features/ai/image-studio/utils/master-folder-tree';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const createSlot = (
  overrides: Partial<ImageStudioSlotRecord>
): ImageStudioSlotRecord => ({
  id: 'slot-1',
  createdAt: '',
  updatedAt: null,
  projectId: 'project-1',
  name: 'Slot',
  folderPath: null,
  metadata: null,
  ...overrides,
});

describe('image-studio master-folder-tree utils', () => {
  it('converts folder and slot ids to master ids and back', () => {
    const folderNodeId = toFolderMasterNodeId('A/B');
    const slotNodeId = toSlotMasterNodeId('slot-123');

    expect(folderNodeId).toBe('folder:A/B');
    expect(slotNodeId).toBe('card:slot-123');
    expect(fromFolderMasterNodeId(folderNodeId)).toBe('A/B');
    expect(fromSlotMasterNodeId(slotNodeId)).toBe('slot-123');
  });

  it('builds master nodes including derived card children', () => {
    const nodes = buildMasterNodesFromStudioTree(
      [
        createSlot({ id: 'base', name: 'Base', folderPath: 'variants' }),
        createSlot({
          id: 'derived',
          name: 'Derived',
          folderPath: 'variants',
          metadata: { sourceSlotId: 'base', role: 'variant' } as unknown as ImageStudioSlotRecord['metadata'],
        }),
      ],
      ['variants']
    );

    const byId = new Map(nodes.map((node: MasterTreeNode) => [node.id, node]));
    const folder = byId.get('folder:variants');
    const base = byId.get('card:base');
    const derived = byId.get('card:derived');

    expect(folder).toBeDefined();
    expect(base).toBeDefined();
    expect(derived).toBeDefined();
    expect(base?.parentId).toBe('folder:variants');
    expect(derived?.parentId).toBe('card:base');
    expect(derived?.metadata?.['roleLabel']).toBe('variant');
  });

  it('resolves ancestor ids and folder target path', () => {
    const nodes = buildMasterNodesFromStudioTree(
      [
        createSlot({ id: 'base', name: 'Base', folderPath: 'root/sub' }),
        createSlot({
          id: 'derived',
          name: 'Derived',
          folderPath: 'root/sub',
          metadata: { sourceSlotId: 'base', role: 'version' } as unknown as ImageStudioSlotRecord['metadata'],
        }),
      ],
      ['root/sub']
    );

    expect(findMasterNodeAncestorIds(nodes, 'card:derived')).toEqual([
      'folder:root',
      'folder:root/sub',
      'card:base',
    ]);
    expect(resolveFolderTargetPathForMasterNode(nodes, 'folder:root/sub')).toBe('root/sub');
    expect(resolveFolderTargetPathForMasterNode(nodes, 'card:derived')).toBe('root/sub');
    expect(resolveFolderTargetPathForMasterNode(nodes, null)).toBe('');
  });
});
