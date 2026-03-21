import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';

export type StudioSlotRecord = ImageStudioSlotRecord;

export type ImageStudioSourceLimitValidationReason =
  | 'non_positive_dimensions'
  | 'max_side_exceeded'
  | 'max_pixels_exceeded';

export type ImageStudioSourceLimitValidation = {
  ok: boolean;
  reason?: ImageStudioSourceLimitValidationReason;
};
