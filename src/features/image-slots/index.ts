export type { ManagedImageSlot } from '@/shared/contracts/image-slots';
export {
  DEFAULT_IMAGE_SLOT_COUNT,
  createManagedSlotId,
  buildEmptySlots,
  createFileImageSlot,
  createExistingImageSlot,
  swapSlots,
} from './lib/slot-engine';

