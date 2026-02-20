import { z } from 'zod';

import { imageFileSelectionSchema } from './files';

/**
 * Image Slots DTOs
 */

export const managedImageSlotFileSchema = z.object({
  type: z.literal('file'),
  data: z.any(), // Browser File object
  previewUrl: z.string(),
  slotId: z.string(),
  originalIndex: z.number().optional(),
});

export const managedImageSlotExistingSchema = z.object({
  type: z.literal('existing'),
  data: imageFileSelectionSchema,
  previewUrl: z.string(),
  slotId: z.string(),
  originalIndex: z.number().optional(),
});

export const managedImageSlotSchema = z.union([
  managedImageSlotFileSchema,
  managedImageSlotExistingSchema,
]).nullable();

export type ManagedImageSlotDto = z.infer<typeof managedImageSlotSchema>;
export type ManagedImageSlot = ManagedImageSlotDto;
