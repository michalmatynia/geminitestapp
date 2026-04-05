import { describe, expect, it } from 'vitest';

import { imageStudioEnsureSlotFromUploadResponseSchema, imageStudioSlotDeleteResponseSchema, imageStudioSlotResponseSchema, imageStudioSlotScreenshotResponseSchema, studioSlotsResponseSchema } from '@/shared/contracts/image-studio/slot';

const sampleSlot = {
  id: 'slot-1',
  projectId: 'project-1',
  name: 'Slot 1',
  folderPath: 'variants',
  position: 1,
  filename: 'slot-1.png',
  filepath: '/uploads/studio/slot-1.png',
  mimetype: 'image/png',
  size: 1024,
  width: 512,
  height: 512,
  imageFileId: 'file-1',
  imageUrl: '/uploads/studio/slot-1.png',
  imageBase64: null,
  asset3dId: null,
  screenshotFileId: null,
  metadata: null,
  imageFile: null,
  screenshotFile: null,
  asset3d: null,
  createdAt: '2026-03-11T10:00:00.000Z',
  updatedAt: '2026-03-11T10:05:00.000Z',
};

describe('image studio slot response contracts', () => {
  it('parses slot list and single slot envelopes', () => {
    expect(
      studioSlotsResponseSchema.parse({
        slots: [sampleSlot],
      }).slots
    ).toHaveLength(1);

    expect(
      imageStudioSlotResponseSchema.parse({
        slot: sampleSlot,
      }).slot.id
    ).toBe('slot-1');
  });

  it('parses ensure-from-upload and delete envelopes', () => {
    expect(
      imageStudioEnsureSlotFromUploadResponseSchema.parse({
        slot: sampleSlot,
        created: false,
        action: 'reused_existing',
      }).action
    ).toBe('reused_existing');

    expect(
      imageStudioSlotDeleteResponseSchema.parse({
        ok: true,
        deletedSlotIds: ['slot-1', 'slot-2'],
      }).deletedSlotIds
    ).toHaveLength(2);
  });

  it('parses screenshot response envelopes', () => {
    expect(
      imageStudioSlotScreenshotResponseSchema.parse({
        slot: {
          ...sampleSlot,
          screenshotFileId: 'file-2',
        },
        screenshot: {
          id: 'file-2',
          filename: 'slot-1-screenshot.png',
          filepath: '/uploads/studio/screenshots/slot-1/shot.png',
          url: '/uploads/studio/screenshots/slot-1/shot.png',
          mimetype: 'image/png',
          size: 2048,
          width: 512,
          height: 512,
          createdAt: '2026-03-11T10:06:00.000Z',
          updatedAt: '2026-03-11T10:06:00.000Z',
          tags: [],
          metadata: null,
        },
      }).screenshot.id
    ).toBe('file-2');
  });
});
