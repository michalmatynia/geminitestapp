import { describe, expect, it } from 'vitest';

import {
  imageStudioCenterRequestSchema,
  imageStudioCenterResponseSchema,
} from '@/features/ai/image-studio/contracts/center';

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

  it('accepts an object layouting payload with layout config', () => {
    const parsed = imageStudioCenterRequestSchema.safeParse({
      mode: 'server_object_layout',
      requestId: 'center_request_layout_1234',
      layout: {
        paddingPercent: 12.5,
        paddingXPercent: 10,
        paddingYPercent: 15,
        fillMissingCanvasWhite: true,
        targetCanvasWidth: 2048,
        targetCanvasHeight: 2048,
        whiteThreshold: 20,
        chromaThreshold: 9,
        shadowPolicy: 'exclude_shadow',
        detection: 'white_bg_first_colored_pixel',
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects legacy object layout mode aliases', () => {
    const parsed = imageStudioCenterRequestSchema.safeParse({
      mode: 'server_object_layout_v1',
      requestId: 'center_request_layout_alias_1234',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects unknown centering mode', () => {
    const parsed = imageStudioCenterRequestSchema.safeParse({
      mode: 'server_bbox',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects invalid layout padding', () => {
    const parsed = imageStudioCenterRequestSchema.safeParse({
      mode: 'server_object_layout',
      layout: {
        paddingXPercent: 75,
      },
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects invalid target canvas dimensions', () => {
    const parsed = imageStudioCenterRequestSchema.safeParse({
      mode: 'server_object_layout',
      layout: {
        fillMissingCanvasWhite: true,
        targetCanvasWidth: 50_000,
      },
    });
    expect(parsed.success).toBe(false);
  });
});

describe('imageStudioCenterResponseSchema', () => {
  it('accepts a center response payload', () => {
    const parsed = imageStudioCenterResponseSchema.safeParse({
      sourceSlotId: 'slot_source_123',
      mode: 'server_object_layout',
      effectiveMode: 'server_object_layout',
      slot: {
        id: 'slot_output_123',
        projectId: 'project_123',
        name: 'Centered slot',
        folderPath: null,
        imageFileId: 'file_123',
        imageUrl: '/uploads/studio/center/project_123/slot_source_123/center.png',
        imageBase64: null,
        metadata: null,
      },
      output: {
        id: 'file_123',
        filename: 'center.png',
        filepath: '/uploads/studio/center/project_123/slot_source_123/center.png',
        mimetype: 'image/png',
        size: 1024,
        width: 1024,
        height: 1024,
      },
      sourceObjectBounds: {
        left: 120,
        top: 130,
        width: 520,
        height: 610,
      },
      targetObjectBounds: {
        left: 130,
        top: 140,
        width: 500,
        height: 590,
      },
      layout: {
        paddingPercent: 8,
        paddingXPercent: 8,
        paddingYPercent: 8,
        fillMissingCanvasWhite: true,
        targetCanvasWidth: 1024,
        targetCanvasHeight: 1024,
        whiteThreshold: 16,
        chromaThreshold: 10,
        shadowPolicy: 'auto',
        detectionUsed: 'white_bg_first_colored_pixel',
        scale: 1.1234,
      },
      detectionUsed: 'white_bg_first_colored_pixel',
      confidenceBefore: 0.9123,
      detectionDetails: {
        shadowPolicyRequested: 'auto',
        shadowPolicyApplied: 'exclude_shadow',
        componentCount: 3,
        coreComponentCount: 2,
        selectedComponentPixels: 1104,
        selectedComponentCoverage: 0.8624,
        foregroundPixels: 1402,
        corePixels: 1220,
        touchesBorder: false,
        maskSource: 'core',
      },
      scale: 1.1234,
      requestId: 'center_request_123456',
      fingerprint: 'abc123',
      deduplicated: false,
      lifecycle: {
        state: 'persisted',
        durationMs: 234,
      },
      pipelineVersion: 'v2',
    });
    expect(parsed.success).toBe(true);
  });
});
