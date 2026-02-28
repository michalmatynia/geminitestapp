import { listImageStudioSlotLinks } from '@/shared/lib/ai/image-studio/server/slot-link-repository';
import {
  listImageStudioSlots,
  type ImageStudioSlotRecord,
} from '@/shared/lib/ai/image-studio/server/slot-repository';
import { trimString } from './product-studio-service.helpers';

export const sortSlotsNewestFirst = (input: ImageStudioSlotRecord[]): ImageStudioSlotRecord[] => {
  return [...input].sort((a, b) => {
    const bTime = Date.parse(b.updatedAt ?? b.createdAt ?? '') || 0;
    const aTime = Date.parse(a.updatedAt ?? a.createdAt ?? '') || 0;
    return bTime - aTime;
  });
};

export const resolveGenerationVariants = async (params: {
  projectId: string;
  sourceSlotIds: string[];
}): Promise<{
  sourceSlot: ImageStudioSlotRecord | null;
  variants: ImageStudioSlotRecord[];
}> => {
  const [slots, links] = await Promise.all([
    listImageStudioSlots(params.projectId),
    listImageStudioSlotLinks(params.projectId),
  ]);

  const slotById = new Map<string, ImageStudioSlotRecord>(
    slots.map((slot: ImageStudioSlotRecord) => [slot.id, slot])
  );

  const sourceSlotId = params.sourceSlotIds.find((id) => slotById.has(id)) ?? null;
  const sourceSlot = sourceSlotId ? (slotById.get(sourceSlotId) ?? null) : null;
  if (!sourceSlotId) {
    return {
      sourceSlot: null,
      variants: [],
    };
  }

  const linkAdjacency = new Map<string, string[]>();
  links.forEach((link) => {
    const relationType = trimString(link.relationType)?.toLowerCase() ?? '';
    const isOutputRelation =
      relationType.includes('output') ||
      relationType.startsWith('sequence:step:') ||
      relationType.startsWith('generation:output:');
    if (!isOutputRelation) return;
    const sourceId = trimString(link.sourceSlotId);
    const targetId = trimString(link.targetSlotId);
    if (!sourceId || !targetId) return;
    const bucket = linkAdjacency.get(sourceId) ?? [];
    if (!bucket.includes(targetId)) {
      bucket.push(targetId);
      linkAdjacency.set(sourceId, bucket);
    }
  });

  const descendantSlotIds = new Set<string>();
  const visited = new Set<string>([sourceSlotId]);
  const queue: string[] = [sourceSlotId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const neighbors = linkAdjacency.get(current) ?? [];
    neighbors.forEach((neighborId) => {
      if (visited.has(neighborId)) return;
      visited.add(neighborId);
      descendantSlotIds.add(neighborId);
      queue.push(neighborId);
    });
  }

  const variants = slots.filter((slot) => descendantSlotIds.has(slot.id));
  return {
    sourceSlot,
    variants: sortSlotsNewestFirst(variants),
  };
};
