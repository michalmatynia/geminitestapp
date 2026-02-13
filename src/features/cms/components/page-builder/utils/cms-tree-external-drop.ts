import type { PageZone } from '../../../types/page-builder';

export type CmsSectionDropPosition = 'above' | 'below';

export const resolveCmsSectionTargetIndex = ({
  sectionIndex,
  dropPosition,
}: {
  sectionIndex: number;
  dropPosition: CmsSectionDropPosition | null;
}): number => (dropPosition === 'below' ? sectionIndex + 1 : sectionIndex);

export const isCmsSectionSamePositionDrop = ({
  draggedZone,
  draggedIndex,
  targetZone,
  targetIndex,
}: {
  draggedZone: PageZone | null;
  draggedIndex: number | null;
  targetZone: PageZone;
  targetIndex: number;
}): boolean =>
  draggedZone === targetZone &&
  draggedIndex !== null &&
  (targetIndex === draggedIndex || targetIndex === draggedIndex + 1);
