import { DRAG_KEYS, getFirstDragValue } from '@/shared/utils/drag-drop';

import type { CaseResolverAssetKind } from './types';

export type CaseResolverTreeDragPayload = {
  source: 'case_resolver_tree';
  entity: 'asset';
  assetId: string;
  assetKind: CaseResolverAssetKind;
  name: string;
  folder: string;
  filepath: string | null;
  mimeType: string | null;
  size: number | null;
  textContent: string;
  description: string;
};

export const parseCaseResolverTreeDropPayload = (
  dataTransfer: DataTransfer
): CaseResolverTreeDragPayload | null => {
  const raw = getFirstDragValue(dataTransfer, [DRAG_KEYS.CASE_RESOLVER_ITEM]);
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw) as CaseResolverTreeDragPayload;
    if (payload.source !== 'case_resolver_tree' || payload.entity !== 'asset') return null;
    if (typeof payload.assetId !== 'string' || payload.assetId.trim().length === 0) return null;
    return payload;
  } catch {
    return null;
  }
};
