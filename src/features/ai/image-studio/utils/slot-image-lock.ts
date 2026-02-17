import type { ImageStudioSlotRecord } from '../types';

export const IMAGE_STUDIO_SLOT_IMAGE_LOCK_KEY = 'imageLockedToCard';

function asMetadataRecord(
  value: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value;
}

export function isImageStudioSlotImageLocked(
  slot: Pick<ImageStudioSlotRecord, 'metadata'> | null | undefined
): boolean {
  const metadata = asMetadataRecord(slot?.metadata);
  return metadata?.[IMAGE_STUDIO_SLOT_IMAGE_LOCK_KEY] === true;
}

export function setImageStudioSlotImageLocked(
  metadata: Record<string, unknown> | null | undefined,
  locked: boolean
): Record<string, unknown> | null {
  const base = asMetadataRecord(metadata);

  if (locked) {
    return {
      ...(base ?? {}),
      [IMAGE_STUDIO_SLOT_IMAGE_LOCK_KEY]: true,
    };
  }

  if (!base || !(IMAGE_STUDIO_SLOT_IMAGE_LOCK_KEY in base)) {
    return base ?? null;
  }

  const next = { ...base };
  delete next[IMAGE_STUDIO_SLOT_IMAGE_LOCK_KEY];
  return Object.keys(next).length > 0 ? next : null;
}
