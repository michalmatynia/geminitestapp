import { describe, expect, it } from 'vitest';

import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import {
  normalizeStudioSlotId,
  resolveRenderableSlotById,
  resolveStudioSlotIdCandidates,
  slotHasRenderableImage,
} from '@/features/ai/image-studio/utils/sequence-slot-resolution';

const createSlot = (overrides: Partial<ImageStudioSlotRecord> = {}): ImageStudioSlotRecord => ({
  id: 'slot-1',
  projectId: 'proj',
  name: 'Slot',
  folderPath: null,
  position: null,
  imageFileId: null,
  imageUrl: null,
  imageBase64: null,
  asset3dId: null,
  screenshotFileId: null,
  metadata: null,
  imageFile: null,
  screenshotFile: null,
  asset3d: null,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  ...overrides,
});

describe('sequence-slot-resolution', () => {
  it('normalizes prefixed slot ids and produces canonical candidates', () => {
    expect(normalizeStudioSlotId('slot:abc')).toBe('abc');
    expect(normalizeStudioSlotId('card:abc')).toBe('abc');
    expect(normalizeStudioSlotId(' abc ')).toBe('abc');
    expect(normalizeStudioSlotId('')).toBeNull();

    expect(resolveStudioSlotIdCandidates('card:abc')).toEqual([
      'abc',
      'slot:abc',
      'card:abc',
    ]);
  });

  it('detects renderable slots from base64, image file path, or image url', () => {
    expect(slotHasRenderableImage(createSlot({ imageBase64: 'data:image/png;base64,AAA=' }))).toBe(true);
    expect(
      slotHasRenderableImage(
        createSlot({
          imageFile: {
            id: 'file-1',
            name: 'image.png',
            filename: 'image.png',
            filepath: '/uploads/studio/proj/image.png',
            url: '/uploads/studio/proj/image.png',
            mimetype: 'image/png',
            size: 123,
            width: 100,
            height: 100,
            createdAt: new Date(0).toISOString(),
            updatedAt: new Date(0).toISOString(),
          },
        }),
      ),
    ).toBe(true);
    expect(slotHasRenderableImage(createSlot({ imageUrl: '/uploads/studio/proj/image-2.png' }))).toBe(true);
    expect(slotHasRenderableImage(createSlot())).toBe(false);
  });

  it('resolves the first renderable slot matching candidate ids', () => {
    const slots = [
      createSlot({ id: 'slot-a', imageUrl: '/uploads/studio/proj/a.png' }),
      createSlot({ id: 'slot-b', imageUrl: null }),
      createSlot({
        id: 'slot-c',
        imageFile: {
          id: 'file-c',
          name: 'c.png',
          filename: 'c.png',
          filepath: '/uploads/studio/proj/c.png',
          url: '/uploads/studio/proj/c.png',
          mimetype: 'image/png',
          size: 123,
          width: 50,
          height: 50,
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
        },
      }),
    ];

    expect(resolveRenderableSlotById(slots, 'card:slot-c')?.id).toBe('slot-c');
    expect(resolveRenderableSlotById(slots, 'slot:slot-b')).toBeNull();
    expect(resolveRenderableSlotById(slots, 'slot-z')).toBeNull();
  });
});
