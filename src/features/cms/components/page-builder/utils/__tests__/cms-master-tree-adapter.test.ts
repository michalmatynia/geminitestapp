import { describe, expect, it, vi } from 'vitest';

import {
  buildCmsMasterNodes,
  toCmsSectionNodeId,
  toCmsZoneFooterNodeId,
  toCmsZoneNodeId,
} from '@/features/cms/components/page-builder/utils/cms-master-tree';
import { createCmsMasterTreeAdapter } from '@/features/cms/components/page-builder/utils/cms-master-tree-adapter';
import type { SectionInstance } from '@/shared/contracts/cms';
import type { MasterFolderTreePersistContext } from '@/shared/contracts/master-folder-tree';

const createSection = (overrides: Partial<SectionInstance>): SectionInstance =>
  ({
    id: 'section-default',
    type: 'Hero',
    zone: 'template',
    parentSectionId: null,
    settings: {},
    blocks: [],
    ...overrides,
  }) as SectionInstance;

const createContext = (
  previousSections: SectionInstance[],
  nextSections: SectionInstance[]
): MasterFolderTreePersistContext => ({
  previousNodes: buildCmsMasterNodes(previousSections),
  nextNodes: buildCmsMasterNodes(nextSections),
});

const applyOperation = async (
  adapter: ReturnType<typeof createCmsMasterTreeAdapter>,
  operation: {
    type: 'move' | 'reorder';
    [key: string]: unknown;
  },
  context: MasterFolderTreePersistContext
): Promise<void> => {
  const tx = {
    id: `tx_${Date.now()}`,
    version: 1,
    createdAt: Date.now(),
    operation,
    previousNodes: context.previousNodes,
    nextNodes: context.nextNodes,
  };
  await adapter.apply(tx, await adapter.prepare(tx));
};

describe('createCmsMasterTreeAdapter', () => {
  it('maps root-top section move to zone index 0', async () => {
    const applySectionMoveInTree = vi.fn();
    const adapter = createCmsMasterTreeAdapter(applySectionMoveInTree);

    const context = createContext(
      [
        createSection({ id: 'template-1', zone: 'template' }),
        createSection({ id: 'header-1', zone: 'header' }),
      ],
      [
        createSection({ id: 'template-1', zone: 'header' }),
        createSection({ id: 'header-1', zone: 'header' }),
      ]
    );

    await applyOperation(
      adapter,
      {
        type: 'move',
        nodeId: toCmsSectionNodeId('template-1'),
        targetParentId: toCmsZoneNodeId('header'),
        targetIndex: 0,
      },
      context
    );

    expect(applySectionMoveInTree).toHaveBeenCalledTimes(1);
    expect(applySectionMoveInTree).toHaveBeenCalledWith('template-1', 'header', null, 0);
  });

  it('applies explicit move target index from operation', async () => {
    const applySectionMoveInTree = vi.fn();
    const adapter = createCmsMasterTreeAdapter(applySectionMoveInTree);

    const context = createContext(
      [
        createSection({ id: 'header-1', zone: 'header' }),
        createSection({ id: 'template-1', zone: 'template' }),
      ],
      [
        createSection({ id: 'header-1', zone: 'header' }),
        createSection({ id: 'template-1', zone: 'header' }),
      ]
    );

    await applyOperation(
      adapter,
      {
        type: 'move',
        nodeId: toCmsSectionNodeId('template-1'),
        targetParentId: toCmsZoneNodeId('header'),
        targetIndex: 1,
      },
      context
    );

    expect(applySectionMoveInTree).toHaveBeenCalledTimes(1);
    expect(applySectionMoveInTree).toHaveBeenCalledWith('template-1', 'header', null, 1);
  });

  it('derives move index from next nodes when targetIndex is omitted', async () => {
    const applySectionMoveInTree = vi.fn();
    const adapter = createCmsMasterTreeAdapter(applySectionMoveInTree);

    const context = createContext(
      [
        createSection({ id: 'header-1', zone: 'header' }),
        createSection({ id: 'header-2', zone: 'header' }),
      ],
      [
        createSection({ id: 'header-2', zone: 'header' }),
        createSection({ id: 'header-1', zone: 'header' }),
      ]
    );

    await applyOperation(
      adapter,
      {
        type: 'move',
        nodeId: toCmsSectionNodeId('header-1'),
        targetParentId: toCmsZoneNodeId('header'),
      },
      context
    );

    expect(applySectionMoveInTree).toHaveBeenCalledTimes(1);
    expect(applySectionMoveInTree).toHaveBeenCalledWith('header-1', 'header', null, 1);
  });

  it('maps reorder before/after operations to zone indexes', async () => {
    const applySectionMoveInTree = vi.fn();
    const adapter = createCmsMasterTreeAdapter(applySectionMoveInTree);

    const context = createContext(
      [
        createSection({ id: 'header-1', zone: 'header' }),
        createSection({ id: 'header-2', zone: 'header' }),
      ],
      [
        createSection({ id: 'header-2', zone: 'header' }),
        createSection({ id: 'header-1', zone: 'header' }),
      ]
    );

    await applyOperation(
      adapter,
      {
        type: 'reorder',
        nodeId: toCmsSectionNodeId('header-2'),
        targetId: toCmsSectionNodeId('header-1'),
        position: 'before',
      },
      context
    );

    await applyOperation(
      adapter,
      {
        type: 'reorder',
        nodeId: toCmsSectionNodeId('header-1'),
        targetId: toCmsSectionNodeId('header-2'),
        position: 'after',
      },
      context
    );

    expect(applySectionMoveInTree).toHaveBeenCalledTimes(2);
    expect(applySectionMoveInTree).toHaveBeenNthCalledWith(1, 'header-2', 'header', null, 0);
    expect(applySectionMoveInTree).toHaveBeenNthCalledWith(2, 'header-1', 'header', null, 2);
  });

  it('maps cross-zone reorder operations to target section zone and index', async () => {
    const applySectionMoveInTree = vi.fn();
    const adapter = createCmsMasterTreeAdapter(applySectionMoveInTree);

    const context = createContext(
      [
        createSection({ id: 'header-1', zone: 'header' }),
        createSection({ id: 'template-1', zone: 'template' }),
        createSection({ id: 'template-2', zone: 'template' }),
      ],
      [
        createSection({ id: 'template-1', zone: 'template' }),
        createSection({ id: 'header-1', zone: 'template' }),
        createSection({ id: 'template-2', zone: 'template' }),
      ]
    );

    await applyOperation(
      adapter,
      {
        type: 'reorder',
        nodeId: toCmsSectionNodeId('header-1'),
        targetId: toCmsSectionNodeId('template-2'),
        position: 'before',
      },
      context
    );

    expect(applySectionMoveInTree).toHaveBeenCalledTimes(1);
    expect(applySectionMoveInTree).toHaveBeenCalledWith('header-1', 'template', null, 1);
  });

  it('ignores moves targeting non-zone ids', async () => {
    const applySectionMoveInTree = vi.fn();
    const adapter = createCmsMasterTreeAdapter(applySectionMoveInTree);

    const context = createContext(
      [createSection({ id: 'header-1', zone: 'header' })],
      [createSection({ id: 'header-1', zone: 'header' })]
    );

    await applyOperation(
      adapter,
      {
        type: 'move',
        nodeId: toCmsSectionNodeId('header-1'),
        targetParentId: toCmsZoneFooterNodeId('header'),
        targetIndex: 0,
      },
      context
    );

    expect(applySectionMoveInTree).not.toHaveBeenCalled();
  });

  it('maps move inside a section parent with inherited zone', async () => {
    const applySectionMoveInTree = vi.fn();
    const adapter = createCmsMasterTreeAdapter(applySectionMoveInTree);

    const context = createContext(
      [
        createSection({ id: 'header-parent', zone: 'header' }),
        createSection({ id: 'template-1', zone: 'template' }),
      ],
      [
        createSection({ id: 'header-parent', zone: 'header' }),
        createSection({
          id: 'template-1',
          zone: 'template',
          parentSectionId: 'header-parent',
        }),
      ]
    );

    await applyOperation(
      adapter,
      {
        type: 'move',
        nodeId: toCmsSectionNodeId('template-1'),
        targetParentId: toCmsSectionNodeId('header-parent'),
        targetIndex: 0,
      },
      context
    );

    expect(applySectionMoveInTree).toHaveBeenCalledTimes(1);
    expect(applySectionMoveInTree).toHaveBeenCalledWith('template-1', 'header', 'header-parent', 0);
  });

  it('maps reorder within nested section siblings', async () => {
    const applySectionMoveInTree = vi.fn();
    const adapter = createCmsMasterTreeAdapter(applySectionMoveInTree);

    const context = createContext(
      [
        createSection({ id: 'header-parent', zone: 'header' }),
        createSection({ id: 'child-a', zone: 'header', parentSectionId: 'header-parent' }),
        createSection({ id: 'child-b', zone: 'header', parentSectionId: 'header-parent' }),
      ],
      [
        createSection({ id: 'header-parent', zone: 'header' }),
        createSection({ id: 'child-b', zone: 'header', parentSectionId: 'header-parent' }),
        createSection({ id: 'child-a', zone: 'header', parentSectionId: 'header-parent' }),
      ]
    );

    await applyOperation(
      adapter,
      {
        type: 'reorder',
        nodeId: toCmsSectionNodeId('child-b'),
        targetId: toCmsSectionNodeId('child-a'),
        position: 'before',
      },
      context
    );

    expect(applySectionMoveInTree).toHaveBeenCalledTimes(1);
    expect(applySectionMoveInTree).toHaveBeenCalledWith('child-b', 'header', 'header-parent', 0);
  });
});
