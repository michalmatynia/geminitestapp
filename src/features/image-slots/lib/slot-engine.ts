import type { ImageFileSelection } from '@/shared/contracts/files';
import type { ManagedImageSlot } from '@/shared/contracts/image-slots';

export const DEFAULT_IMAGE_SLOT_COUNT = 15;

export const createManagedSlotId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const buildEmptySlots = (total: number): ManagedImageSlot[] =>
  Array.from({ length: Math.max(0, total) }, () => null);

export const createFileImageSlot = (file: File): ManagedImageSlot => ({
  type: 'file',
  data: file,
  previewUrl: URL.createObjectURL(file),
  slotId: createManagedSlotId(),
});

export const createExistingImageSlot = (file: ImageFileSelection): ManagedImageSlot => ({
  type: 'existing',
  data: file,
  previewUrl: file.filepath ?? '',
  slotId: file.id,
});

export const swapSlots = (
  slots: ManagedImageSlot[],
  fromIndex: number,
  toIndex: number
): ManagedImageSlot[] => {
  const next = [...slots];
  const temp = next[fromIndex];
  next[fromIndex] = next[toIndex]!;
  next[toIndex] = temp!;
  return next;
};

