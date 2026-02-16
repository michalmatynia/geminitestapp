import { describe, expect, it } from 'vitest';

import { imageStudioUpscaleRequestSchema } from '@/features/ai/image-studio/contracts/upscale';

describe('imageStudioUpscaleRequestSchema', () => {
  it('accepts server upscale payload with scale and request id', () => {
    const parsed = imageStudioUpscaleRequestSchema.safeParse({
      mode: 'server_sharp',
      strategy: 'scale',
      scale: 2,
      requestId: 'upscale_request_123456',
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts client upscale payload with smoothing quality', () => {
    const parsed = imageStudioUpscaleRequestSchema.safeParse({
      mode: 'client_data_url',
      strategy: 'scale',
      scale: 1.5,
      smoothingQuality: 'high',
      dataUrl: 'data:image/png;base64,abc',
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts target resolution upscale payload', () => {
    const parsed = imageStudioUpscaleRequestSchema.safeParse({
      mode: 'server_sharp',
      strategy: 'target_resolution',
      targetWidth: 4096,
      targetHeight: 3072,
      requestId: 'upscale_request_654321',
    });
    expect(parsed.success).toBe(true);
  });

  it('infers target resolution strategy when target dimensions are provided', () => {
    const parsed = imageStudioUpscaleRequestSchema.safeParse({
      mode: 'server_sharp',
      targetWidth: 2048,
      targetHeight: 1536,
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid scale values', () => {
    const parsed = imageStudioUpscaleRequestSchema.safeParse({
      mode: 'server_sharp',
      strategy: 'scale',
      scale: 0.5,
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects target resolution payload missing one side', () => {
    const parsed = imageStudioUpscaleRequestSchema.safeParse({
      mode: 'server_sharp',
      strategy: 'target_resolution',
      targetWidth: 2048,
    });
    expect(parsed.success).toBe(false);
  });
});
