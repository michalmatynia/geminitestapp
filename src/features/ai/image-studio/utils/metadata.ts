import type { SlotGenerationMetadata } from '@/shared/contracts/image-studio/slot';

/**
 * Safely extract generation metadata from a slot record.
 * Works with both full `ImageStudioSlotRecord` and minimal `{ metadata? }` shapes.
 */
export function readMeta(
  slot?: { metadata?: Record<string, unknown> | null | undefined } | null
): SlotGenerationMetadata {
  if (!slot?.metadata || typeof slot.metadata !== 'object') return {};
  return slot.metadata as SlotGenerationMetadata;
}
