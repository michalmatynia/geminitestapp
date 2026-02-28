import { describe, expect, it } from 'vitest';

import { type ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import { buildRunRequestPreview } from '@/features/ai/image-studio/utils/run-request-preview';
import { parseImageStudioSettings } from '@/features/ai/image-studio/utils/studio-settings';

const baseStudioSettings = parseImageStudioSettings(null);

const createSlot = (overrides: Partial<ImageStudioSlotRecord> = {}): ImageStudioSlotRecord => ({
  id: 'slot-1',
  projectId: 'proj',
  name: 'Base',
  folderPath: '',
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
  ...overrides,
});

describe('buildRunRequestPreview', () => {
  it('builds prompt-only payload when no working slot is selected', () => {
    const preview = buildRunRequestPreview({
      projectId: 'proj',
      workingSlot: null,
      slots: [],
      compositeAssetIds: [],
      promptText: 'Generate a studio product hero image',
      paramsState: null,
      maskShapes: [],
      maskInvert: false,
      maskFeather: 0,
      studioSettings: baseStudioSettings,
    });

    expect(preview.errors).toEqual([]);
    expect(preview.payload).toBeTruthy();
    expect(preview.payload?.projectId).toBe('proj');
    expect(preview.payload?.prompt).toBe('Generate a studio product hero image');
    expect(preview.payload?.asset).toBeUndefined();
    expect(preview.images).toEqual([]);
  });

  it('keeps source asset in payload when working slot has an image', () => {
    const sourceSlot = createSlot({
      id: 'slot-source',
      name: 'Source',
      imageFile: {
        id: 'file-source',
        name: 'source.png',
        filename: 'source.png',
        filepath: '/uploads/studio/proj/source.png',
        url: '/uploads/studio/proj/source.png',
        mimetype: 'image/png',
        size: 12,
        width: 2,
        height: 2,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      },
    });

    const preview = buildRunRequestPreview({
      projectId: 'proj',
      workingSlot: sourceSlot,
      slots: [sourceSlot],
      compositeAssetIds: [],
      promptText: 'Add soft cinematic lighting',
      paramsState: null,
      maskShapes: [],
      maskInvert: false,
      maskFeather: 0,
      studioSettings: baseStudioSettings,
    });

    expect(preview.errors).toEqual([]);
    expect(preview.payload?.asset).toEqual({
      id: 'slot-source',
      filepath: '/uploads/studio/proj/source.png',
    });
    expect(preview.images).toHaveLength(1);
    expect(preview.images[0]?.kind).toBe('base');
  });
});
