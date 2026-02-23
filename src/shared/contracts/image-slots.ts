import { z } from 'zod';

import { imageFileSelectionSchema, type ImageFileSelection } from './files';

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

export interface ManagedImageSlotFile {
  type: 'file';
  data: unknown; // Browser File object
  previewUrl: string;
  slotId: string;
  originalIndex?: number;
}

export interface ManagedImageSlotExisting {
  type: 'existing';
  data: ImageFileSelection;
  previewUrl: string;
  slotId: string;
  originalIndex?: number;
}

export type ManagedImageSlot = ManagedImageSlotFile | ManagedImageSlotExisting | null;

export type ManagedImageSlotDto = ManagedImageSlot;

