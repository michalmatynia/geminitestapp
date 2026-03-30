import { describe, expect, it } from 'vitest';

import {
  imageStudioCenterLayoutMetadataSchema,
  imageStudioCenterRequestSchema,
  imageStudioCropRequestSchema,
  imageStudioDetectionDetailsSchema,
  imageStudioUpscaleRequestSchema,
  normalizeImageStudioCenterMode,
} from '@/shared/contracts/image-studio-transform-contracts';

describe('image studio transform contract runtime', () => {
  it('requires cropRect for bounding-box crop modes', () => {
    expect(() =>
      imageStudioCropRequestSchema.parse({
        mode: 'client_bbox',
      })
    ).toThrow(/cropRect/i);

    expect(() =>
      imageStudioCropRequestSchema.parse({
        mode: 'server_bbox',
      })
    ).toThrow(/cropRect/i);
  });

  it('requires a polygon for server polygon crop requests', () => {
    expect(() =>
      imageStudioCropRequestSchema.parse({
        mode: 'server_polygon',
      })
    ).toThrow(/Polygon crop requires at least 3 points/i);
  });

  it('parses valid crop requests with canvas context and diagnostics', () => {
    const parsed = imageStudioCropRequestSchema.parse({
      mode: 'server_polygon',
      polygon: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0.5, y: 1 },
      ],
      canvasContext: {
        canvasWidth: 800,
        canvasHeight: 600,
        imageFrame: {
          x: 0,
          y: 0,
          width: 800,
          height: 600,
        },
      },
      diagnostics: {
        rawCanvasBounds: null,
        mappedImageBounds: {
          x: 10,
          y: 20,
          width: 300,
          height: 200,
        },
        imageContentFrame: {
          x: 5,
          y: 5,
          width: 790,
          height: 590,
        },
        usedImageContentFrameMapping: true,
      },
      requestId: 'crop-request-1',
    });

    expect(parsed.canvasContext?.canvasWidth).toBe(800);
    expect(parsed.diagnostics?.usedImageContentFrameMapping).toBe(true);
  });

  it('requires both dimensions for target-resolution upscales', () => {
    expect(() =>
      imageStudioUpscaleRequestSchema.parse({
        strategy: 'target_resolution',
        targetWidth: 1200,
      })
    ).toThrow(/targetHeight is required/i);

    expect(() =>
      imageStudioUpscaleRequestSchema.parse({
        targetHeight: 1200,
      })
    ).toThrow(/targetWidth is required/i);
  });

  it('parses scale upscales with default server mode', () => {
    const parsed = imageStudioUpscaleRequestSchema.parse({
      scale: 2,
      smoothingQuality: 'high',
      requestId: 'upscale-req',
    });

    expect(parsed.mode).toBe('server_sharp');
    expect(parsed.scale).toBe(2);
  });

  it('normalizes center mode inputs and parses layout metadata', () => {
    expect(normalizeImageStudioCenterMode(' client_alpha_bbox ')).toBe('client_alpha_bbox');
    expect(normalizeImageStudioCenterMode('unsupported')).toBeNull();
    expect(normalizeImageStudioCenterMode(undefined)).toBeNull();

    const metadata = imageStudioCenterLayoutMetadataSchema.parse({
      paddingPercent: 8,
      targetCanvasWidth: 1200,
      targetCanvasHeight: 1200,
      shadowPolicy: 'exclude_shadow',
      detectionUsed: 'alpha_bbox',
      scale: 1.25,
    });

    expect(metadata.targetCanvasWidth).toBe(1200);
  });

  it('parses center requests and detection details payloads', () => {
    const details = imageStudioDetectionDetailsSchema.parse({
      shadowPolicyRequested: 'auto',
      shadowPolicyApplied: 'exclude_shadow',
      componentCount: 3,
      coreComponentCount: 1,
      selectedComponentPixels: 800,
      selectedComponentCoverage: 0.75,
      foregroundPixels: 1200,
      corePixels: 900,
      touchesBorder: false,
      maskSource: 'foreground',
      policyVersion: 'v1',
      policyReason: 'Selected central component',
      fallbackApplied: false,
      candidateDetections: {
        alpha_bbox: {
          confidence: 0.92,
          area: 900,
        },
        white_bg_first_colored_pixel: null,
      },
    });

    const request = imageStudioCenterRequestSchema.parse({
      mode: 'server_object_layout',
      requestId: 'center-request-1',
      layout: {
        paddingPercent: 12,
        targetCanvasWidth: 1400,
        targetCanvasHeight: 1400,
        whiteThreshold: 16,
        chromaThreshold: 10,
        detection: 'auto',
      },
    });

    expect(details.candidateDetections?.alpha_bbox?.confidence).toBe(0.92);
    expect(request.layout?.targetCanvasWidth).toBe(1400);
  });
});
