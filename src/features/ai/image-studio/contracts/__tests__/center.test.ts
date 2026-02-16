import { describe, expect, it } from 'vitest';

import { imageStudioCenterRequestSchema } from '@/features/ai/image-studio/contracts/center';

describe('imageStudioCenterRequestSchema', () => {
  it('accepts a server centering payload', () => {
    const parsed = imageStudioCenterRequestSchema.safeParse({
      mode: 'server_alpha_bbox',
      requestId: 'center_request_123456',
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts a client centering payload with dataUrl', () => {
    const parsed = imageStudioCenterRequestSchema.safeParse({
      mode: 'client_alpha_bbox',
      dataUrl: 'data:image/png;base64,abc',
      requestId: 'center_request_abcdef',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects unknown centering mode', () => {
    const parsed = imageStudioCenterRequestSchema.safeParse({
      mode: 'server_bbox',
    });
    expect(parsed.success).toBe(false);
  });
});
