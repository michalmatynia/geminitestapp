import { describe, expect, it } from 'vitest';

import {
  imageStudioUpscaleRequestSchema,
  imageStudioUpscaleResponseSchema,
} from '@/features/ai/image-studio/contracts/upscale';

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

describe('imageStudioUpscaleResponseSchema', () => {
  it('accepts an upscale response payload', () => {
    const parsed = imageStudioUpscaleResponseSchema.safeParse({
      sourceSlotId: 'slot_source_123',
      mode: 'server_sharp',
      effectiveMode: 'server_sharp',
      strategy: 'scale',
      scale: 2,
      targetWidth: null,
      targetHeight: null,
      smoothingQuality: null,
      slot: {
        id: 'slot_upscale_123',
        projectId: 'project_123',
        name: 'Upscale slot',
        folderPath: null,
        imageFileId: 'file_upscale_123',
        imageUrl: '/uploads/studio/upscale/project_123/slot_source_123/upscale.png',
        imageBase64: null,
        metadata: null,
      },
      output: {
        id: 'file_upscale_123',
        filename: 'upscale.png',
        filepath: '/uploads/studio/upscale/project_123/slot_source_123/upscale.png',
        mimetype: 'image/png',
        size: 4096,
        width: 1600,
        height: 1200,
      },
      requestId: 'upscale_request_123456',
      fingerprint: 'upscale_fp_123',
      deduplicated: false,
      lifecycle: {
        state: 'persisted',
        durationMs: 315,
      },
      pipelineVersion: 'v2',
    });
    expect(parsed.success).toBe(true);
  });
});
