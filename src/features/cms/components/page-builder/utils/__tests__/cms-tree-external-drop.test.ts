import { describe, expect, it } from 'vitest';

import {
  isCmsSectionSamePositionDrop,
  resolveCmsSectionTargetIndex,
} from '@/features/cms/components/page-builder/utils/cms-tree-external-drop';

describe('cms-tree-external-drop', () => {
  it('resolves target index based on relative section drop position', () => {
    expect(resolveCmsSectionTargetIndex({ sectionIndex: 3, dropPosition: 'above' })).toBe(3);
    expect(resolveCmsSectionTargetIndex({ sectionIndex: 3, dropPosition: 'below' })).toBe(4);
    expect(resolveCmsSectionTargetIndex({ sectionIndex: 3, dropPosition: null })).toBe(3);
  });

  it('detects same-position section drops in same zone', () => {
    expect(
      isCmsSectionSamePositionDrop({
        draggedZone: 'template',
        draggedIndex: 2,
        targetZone: 'template',
        targetIndex: 2,
      })
    ).toBe(true);

    expect(
      isCmsSectionSamePositionDrop({
        draggedZone: 'template',
        draggedIndex: 2,
        targetZone: 'template',
        targetIndex: 3,
      })
    ).toBe(true);
  });

  it('allows cross-zone or different-index moves', () => {
    expect(
      isCmsSectionSamePositionDrop({
        draggedZone: 'header',
        draggedIndex: 1,
        targetZone: 'template',
        targetIndex: 1,
      })
    ).toBe(false);

    expect(
      isCmsSectionSamePositionDrop({
        draggedZone: 'template',
        draggedIndex: 1,
        targetZone: 'template',
        targetIndex: 4,
      })
    ).toBe(false);
  });
});
