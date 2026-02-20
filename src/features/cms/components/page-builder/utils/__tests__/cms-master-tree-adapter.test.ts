import { describe, expect, it, vi } from 'vitest';

import {
  buildCmsMasterNodes,
  toCmsSectionNodeId,
  toCmsZoneFooterNodeId,
  toCmsZoneNodeId,
} from '@/features/cms/components/page-builder/utils/cms-master-tree';
import { createCmsMasterTreeAdapter } from '@/features/cms/components/page-builder/utils/cms-master-tree-adapter';
import type { MasterFolderTreePersistContext } from '@/shared/contracts/master-folder-tree';
import type { SectionInstance } from '@/shared/contracts/cms';

const createSection = (overrides: Partial<SectionInstance>): SectionInstance =>
  ({
    id: 'section-default',
    type: 'Hero',
    zone: 'template',
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

describe('createCmsMasterTreeAdapter', () => {
  it('maps root-top section move to zone index 0', async () => {
    const applySectionMoveByZoneIndex = vi.fn();
    const adapter = createCmsMasterTreeAdapter(applySectionMoveByZoneIndex);

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

    await adapter.applyOperation?.(
      {
        type: 'move',
        nodeId: toCmsSectionNodeId('template-1'),
        targetParentId: toCmsZoneNodeId('header'),
        targetIndex: 0,
      },
      context
    );

    expect(applySectionMoveByZoneIndex).toHaveBeenCalledTimes(1);
    expect(applySectionMoveByZoneIndex).toHaveBeenCalledWith('template-1', 'header', 0);
  });

  it('applies explicit move target index from operation', async () => {
    const applySectionMoveByZoneIndex = vi.fn();
    const adapter = createCmsMasterTreeAdapter(applySectionMoveByZoneIndex);

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

    await adapter.applyOperation?.(
      {
        type: 'move',
        nodeId: toCmsSectionNodeId('template-1'),
        targetParentId: toCmsZoneNodeId('header'),
        targetIndex: 1,
      },
      context
    );

    expect(applySectionMoveByZoneIndex).toHaveBeenCalledTimes(1);
    expect(applySectionMoveByZoneIndex).toHaveBeenCalledWith('template-1', 'header', 1);
  });

  it('derives move index from next nodes when targetIndex is omitted', async () => {
    const applySectionMoveByZoneIndex = vi.fn();
    const adapter = createCmsMasterTreeAdapter(applySectionMoveByZoneIndex);

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

    await adapter.applyOperation?.(
      {
        type: 'move',
        nodeId: toCmsSectionNodeId('header-1'),
        targetParentId: toCmsZoneNodeId('header'),
      },
      context
    );

    expect(applySectionMoveByZoneIndex).toHaveBeenCalledTimes(1);
    expect(applySectionMoveByZoneIndex).toHaveBeenCalledWith('header-1', 'header', 1);
  });

  it('maps reorder before/after operations to zone indexes', async () => {
    const applySectionMoveByZoneIndex = vi.fn();
    const adapter = createCmsMasterTreeAdapter(applySectionMoveByZoneIndex);

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

    await adapter.applyOperation?.(
      {
        type: 'reorder',
        nodeId: toCmsSectionNodeId('header-2'),
        targetId: toCmsSectionNodeId('header-1'),
        position: 'before',
      },
      context
    );

    await adapter.applyOperation?.(
      {
        type: 'reorder',
        nodeId: toCmsSectionNodeId('header-1'),
        targetId: toCmsSectionNodeId('header-2'),
        position: 'after',
      },
      context
    );

    expect(applySectionMoveByZoneIndex).toHaveBeenCalledTimes(2);
    expect(applySectionMoveByZoneIndex).toHaveBeenNthCalledWith(1, 'header-2', 'header', 0);
    expect(applySectionMoveByZoneIndex).toHaveBeenNthCalledWith(2, 'header-1', 'header', 2);
  });

  it('maps cross-zone reorder operations to target section zone and index', async () => {
    const applySectionMoveByZoneIndex = vi.fn();
    const adapter = createCmsMasterTreeAdapter(applySectionMoveByZoneIndex);

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

    await adapter.applyOperation?.(
      {
        type: 'reorder',
        nodeId: toCmsSectionNodeId('header-1'),
        targetId: toCmsSectionNodeId('template-2'),
        position: 'before',
      },
      context
    );

    expect(applySectionMoveByZoneIndex).toHaveBeenCalledTimes(1);
    expect(applySectionMoveByZoneIndex).toHaveBeenCalledWith('header-1', 'template', 1);
  });

  it('ignores moves targeting non-zone ids', async () => {
    const applySectionMoveByZoneIndex = vi.fn();
    const adapter = createCmsMasterTreeAdapter(applySectionMoveByZoneIndex);

    const context = createContext(
      [createSection({ id: 'header-1', zone: 'header' })],
      [createSection({ id: 'header-1', zone: 'header' })]
    );

    await adapter.applyOperation?.(
      {
        type: 'move',
        nodeId: toCmsSectionNodeId('header-1'),
        targetParentId: toCmsZoneFooterNodeId('header'),
        targetIndex: 0,
      },
      context
    );

    expect(applySectionMoveByZoneIndex).not.toHaveBeenCalled();
  });
});
