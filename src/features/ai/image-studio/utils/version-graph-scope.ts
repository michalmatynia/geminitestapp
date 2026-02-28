import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';

import { readMeta } from './metadata';

const resolveSourceIds = (
  slot: ImageStudioSlotRecord,
  slotById: Map<string, ImageStudioSlotRecord>
): string[] => {
  const meta = readMeta(slot);
  const ordered: string[] = [];

  if (Array.isArray(meta.sourceSlotIds)) {
    for (const id of meta.sourceSlotIds) {
      if (typeof id !== 'string') continue;
      if (!slotById.has(id)) continue;
      if (ordered.includes(id)) continue;
      ordered.push(id);
    }
  }

  if (
    typeof meta.sourceSlotId === 'string' &&
    slotById.has(meta.sourceSlotId) &&
    !ordered.includes(meta.sourceSlotId)
  ) {
    ordered.push(meta.sourceSlotId);
  }

  return ordered;
};

/**
 * Scope the visible graph to the full connected lineage component of an active slot.
 * This includes all ancestors and descendants (and siblings reachable through shared ancestors).
 */
export const resolveScopedVersionGraphSlots = (
  slots: ImageStudioSlotRecord[],
  activeSlotId: string | null
): ImageStudioSlotRecord[] => {
  if (!activeSlotId) return [];

  const slotById = new Map(slots.map((slot) => [slot.id, slot]));
  if (!slotById.has(activeSlotId)) return [];

  const childrenBySource = new Map<string, string[]>();
  const parentsByTarget = new Map<string, string[]>();

  for (const slot of slots) {
    const sourceIds = resolveSourceIds(slot, slotById);
    if (sourceIds.length === 0) continue;
    parentsByTarget.set(slot.id, sourceIds);
    for (const sourceId of sourceIds) {
      const existingChildren = childrenBySource.get(sourceId);
      if (existingChildren) {
        existingChildren.push(slot.id);
      } else {
        childrenBySource.set(sourceId, [slot.id]);
      }
    }
  }

  const includedIds = new Set<string>([activeSlotId]);
  const queue: string[] = [activeSlotId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) break;
    const relatedIds = [
      ...(parentsByTarget.get(currentId) ?? []),
      ...(childrenBySource.get(currentId) ?? []),
    ];
    for (const relatedId of relatedIds) {
      if (includedIds.has(relatedId)) continue;
      includedIds.add(relatedId);
      queue.push(relatedId);
    }
  }

  return slots.filter((slot) => includedIds.has(slot.id));
};
