import { describe, expect, it } from 'vitest';

import {
  imageStudioCropRequestSchema,
  imageStudioCropResponseSchema,
} from '@/features/ai/image-studio/contracts/crop';

describe('imageStudioCropRequestSchema', () => {
  it('requires cropRect for bbox modes', () => {
    const parsed = imageStudioCropRequestSchema.safeParse({
      mode: 'client_bbox',
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts bbox payload with cropRect and request id', () => {
    const parsed = imageStudioCropRequestSchema.safeParse({
      mode: 'server_bbox',
      cropRect: { x: 10, y: 12, width: 120, height: 80 },
      requestId: 'crop_request_123456',
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts bbox payload with canvas context', () => {
    const parsed = imageStudioCropRequestSchema.safeParse({
      mode: 'server_bbox',
      cropRect: { x: 10, y: 12, width: 120, height: 80 },
      canvasContext: {
        canvasWidth: 1600,
        canvasHeight: 2400,
        imageFrame: {
          x: 0.1,
          y: 0.2,
          width: 0.7,
          height: 0.6,
        },
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('requires polygon points for polygon mode', () => {
    const parsed = imageStudioCropRequestSchema.safeParse({
      mode: 'server_polygon',
      polygon: [{ x: 0.1, y: 0.2 }, { x: 0.8, y: 0.2 }],
    });
    expect(parsed.success).toBe(false);
  });
});

describe('imageStudioCropResponseSchema', () => {
  it('accepts a crop response payload', () => {
    const parsed = imageStudioCropResponseSchema.safeParse({
      sourceSlotId: 'slot_source_123',
      mode: 'server_bbox',
      effectiveMode: 'server_bbox',
      slot: {
        id: 'slot_crop_123',
        projectId: 'project_123',
        name: 'Crop slot',
        folderPath: null,
        imageFileId: 'file_crop_123',
        imageUrl: '/uploads/studio/crops/project_123/slot_source_123/crop.png',
        imageBase64: null,
        metadata: null,
      },
      imageFile: {
        id: 'file_crop_123',
        filename: 'crop.png',
        filepath: '/uploads/studio/crops/project_123/slot_source_123/crop.png',
        mimetype: 'image/png',
        size: 2048,
        width: 800,
        height: 600,
      },
      cropRect: { x: 10, y: 12, width: 120, height: 80 },
      canvasContext: {
        canvasWidth: 1600,
        canvasHeight: 2400,
        imageFrame: {
          x: 0.1,
          y: 0.2,
          width: 0.7,
          height: 0.6,
        },
      },
      requestId: 'crop_request_123456',
      fingerprint: 'crop_fp_123',
      deduplicated: false,
      lifecycle: {
        state: 'persisted',
        durationMs: 221,
      },
      pipelineVersion: 'v2',
    });
    expect(parsed.success).toBe(true);
  });
});
