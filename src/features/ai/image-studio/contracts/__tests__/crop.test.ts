import { describe, expect, it } from 'vitest';

import { imageStudioCropRequestSchema } from '@/features/ai/image-studio/contracts/crop';

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

  it('requires polygon points for polygon mode', () => {
    const parsed = imageStudioCropRequestSchema.safeParse({
      mode: 'server_polygon',
      polygon: [{ x: 0.1, y: 0.2 }, { x: 0.8, y: 0.2 }],
    });
    expect(parsed.success).toBe(false);
  });
});
