import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';

type SlotImageFileLike = {
  url?: string | null | undefined;
  filepath?: string | null | undefined;
};

type SlotWithImageLike = {
  imageBase64?: string | null | undefined;
  imageUrl?: string | null | undefined;
  imageFile?: SlotImageFileLike | null | undefined;
};

const SLOT_ID_PREFIXES = ['slot:', 'card:'] as const;

const asTrimmedString = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const normalizeStudioSlotId = (value: string | null | undefined): string | null => {
  const normalized = asTrimmedString(value);
  if (!normalized) return null;

  for (const prefix of SLOT_ID_PREFIXES) {
    if (!normalized.startsWith(prefix)) continue;
    const withoutPrefix = asTrimmedString(normalized.slice(prefix.length));
    return withoutPrefix ?? null;
  }

  return normalized;
};

export const resolveStudioSlotIdCandidates = (value: string | null | undefined): string[] => {
  const normalized = normalizeStudioSlotId(value);
  if (!normalized) return [];

  const candidates = new Set<string>([normalized]);
  for (const prefix of SLOT_ID_PREFIXES) {
    candidates.add(`${prefix}${normalized}`);
  }
  return Array.from(candidates);
};

export const slotHasRenderableImage = (slot: SlotWithImageLike | null | undefined): boolean => {
  if (!slot) return false;

  const base64 = asTrimmedString(slot.imageBase64);
  if (base64) return true;

  const filePath = asTrimmedString(slot.imageFile?.url ?? slot.imageFile?.filepath);
  if (filePath) return true;

  return Boolean(asTrimmedString(slot.imageUrl));
};

export const resolveRenderableSlotById = (
  slots: ImageStudioSlotRecord[],
  slotId: string | null | undefined
): ImageStudioSlotRecord | null => {
  if (!Array.isArray(slots) || slots.length === 0) return null;
  const byId = new Map<string, ImageStudioSlotRecord>(
    slots.map((slot: ImageStudioSlotRecord): [string, ImageStudioSlotRecord] => [slot.id, slot])
  );

  const candidates = resolveStudioSlotIdCandidates(slotId);
  for (const candidateId of candidates) {
    const slot = byId.get(candidateId) ?? null;
    if (!slot || !slotHasRenderableImage(slot)) continue;
    return slot;
  }
  return null;
};
