import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import {
  analyzeImageByAutoScalerLayout,
  autoScaleObjectByAnalysis,
  buildAutoScalerFingerprint,
  buildAutoScalerFingerprintRelationType,
  buildAutoScalerLayoutSignature,
  buildAutoScalerRequestRelationType,
  normalizeAutoScalerBoundsForFingerprint,
  normalizeAutoScalerLayoutConfig,
  validateAutoScalerOutputDimensions,
  validateAutoScalerSourceDimensions,
} from '@/features/ai/image-studio/server/auto-scaler-utils';
import { centerAndScaleObjectByLayout } from '@/features/ai/image-studio/server/center-utils';

const createWhiteProductImage = async (params: {
  width: number;
  height: number;
  objectLeft: number;
  objectTop: number;
  objectWidth: number;
  objectHeight: number;
  withBorderNoise?: boolean;
}): Promise<Buffer> => {
  const composites: sharp.OverlayOptions[] = [
    {
      input: await sharp({
        create: {
          width: params.objectWidth,
          height: params.objectHeight,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer(),
      left: params.objectLeft,
      top: params.objectTop,
    },
  ];

  if (params.withBorderNoise) {
    composites.push({
      input: await sharp({
        create: {
          width: 1,
          height: 1,
          channels: 4,
          background: { r: 200, g: 200, b: 200, alpha: 1 },
        },
      })
        .png()
        .toBuffer(),
      left: 0,
      top: params.height - 1,
    });
  }

  return sharp({
    create: {
      width: params.width,
      height: params.height,
      channels: 4,
      background: { r: 250, g: 250, b: 250, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
};

describe('auto-scaler-utils', () => {
  it('normalizes object bounds values for deterministic fingerprints', () => {
    expect(
      normalizeAutoScalerBoundsForFingerprint({
        left: 14.9,
        top: 8.2,
        width: 99.9,
        height: 55.4,
      })
    ).toEqual({
      left: 14,
      top: 8,
      width: 99,
      height: 55,
    });
  });

  it('produces identical fingerprint for client and server auto scaler modes', () => {
    const sourceSignature = 'slot-1|project-1|file-1';

    const clientFingerprint = buildAutoScalerFingerprint({
      sourceSignature,
      mode: 'client_auto_scaler_v1',
    });
    const serverFingerprint = buildAutoScalerFingerprint({
      sourceSignature,
      mode: 'server_auto_scaler_v1',
    });

    expect(clientFingerprint).toBe(serverFingerprint);
    expect(buildAutoScalerFingerprintRelationType(clientFingerprint)).toMatch(
      /^autoscale:output:[a-f0-9]{20}$/
    );
  });

  it('uses stable layout/request signatures for idempotency and dedupe links', () => {
    const signatureA = buildAutoScalerLayoutSignature({
      paddingPercent: 8,
      paddingXPercent: 12,
    });
    const signatureB = buildAutoScalerLayoutSignature({
      paddingPercent: 8,
      paddingXPercent: 12,
    });
    const signatureC = buildAutoScalerLayoutSignature({
      paddingPercent: 12,
      paddingXPercent: 12,
    });

    expect(signatureA).toBe(signatureB);
    expect(signatureA).not.toBe(signatureC);
    expect(buildAutoScalerRequestRelationType('autoscale_req_123456789')).toMatch(
      /^autoscale:request:[a-f0-9]{20}$/
    );
  });

  it('validates source/output image limits', () => {
    expect(validateAutoScalerSourceDimensions(2048, 2048).ok).toBe(true);
    expect(validateAutoScalerSourceDimensions(0, 2048).ok).toBe(false);
    expect(validateAutoScalerOutputDimensions(4096, 4096)).toBe(true);
    expect(validateAutoScalerOutputDimensions(20000, 20000)).toBe(false);
  });

  it('normalizes layout config with optional axis padding overrides', () => {
    expect(
      normalizeAutoScalerLayoutConfig({
        paddingPercent: 12,
        paddingXPercent: 18.5,
        fillMissingCanvasWhite: true,
        targetCanvasWidth: 1200,
        targetCanvasHeight: 1800,
      })
    ).toEqual({
      paddingPercent: 12,
      paddingXPercent: 18.5,
      paddingYPercent: 12,
      fillMissingCanvasWhite: true,
      targetCanvasWidth: 1200,
      targetCanvasHeight: 1800,
      whiteThreshold: 16,
      chromaThreshold: 10,
      shadowPolicy: 'auto',
      detection: 'auto',
    });
  });

  it('returns image analysis summary with detection telemetry and suggested plan', async () => {
    const source = await createWhiteProductImage({
      width: 24,
      height: 24,
      objectLeft: 2,
      objectTop: 3,
      objectWidth: 6,
      objectHeight: 6,
      withBorderNoise: true,
    });

    const analysis = await analyzeImageByAutoScalerLayout(source, {
      paddingXPercent: 20,
      paddingYPercent: 10,
      detection: 'white_bg_first_colored_pixel',
    });

    expect(analysis.width).toBe(24);
    expect(analysis.height).toBe(24);
    expect(analysis.detectionUsed).toBe('white_bg_first_colored_pixel');
    expect(analysis.confidence).toBeGreaterThan(0);
    expect(analysis.detectionDetails).not.toBeNull();
    expect(analysis.sourceObjectBounds).toEqual({ left: 2, top: 3, width: 6, height: 6 });
    expect(analysis.suggestedPlan.outputWidth).toBe(24);
    expect(analysis.suggestedPlan.outputHeight).toBe(24);
    expect(analysis.suggestedPlan.targetObjectBounds.left).toBeGreaterThan(0);
    expect(analysis.suggestedPlan.targetObjectBounds.top).toBeGreaterThan(0);
  });

  it('auto scales object by analysis and expands to target canvas when requested', async () => {
    const source = await createWhiteProductImage({
      width: 20,
      height: 20,
      objectLeft: 1,
      objectTop: 1,
      objectWidth: 6,
      objectHeight: 6,
    });

    const scaled = await autoScaleObjectByAnalysis(
      source,
      {
        paddingPercent: 10,
        detection: 'white_bg_first_colored_pixel',
        fillMissingCanvasWhite: true,
        targetCanvasWidth: 40,
        targetCanvasHeight: 30,
      },
      { preferTargetCanvas: true }
    );

    expect(scaled.width).toBe(40);
    expect(scaled.height).toBe(30);
    expect(scaled.sourceWidth).toBe(20);
    expect(scaled.sourceHeight).toBe(20);
    expect(scaled.detectionUsed).toBe('white_bg_first_colored_pixel');
    expect(scaled.confidenceBefore).toBeGreaterThan(0);
    expect(scaled.detectionDetails).not.toBeNull();
    expect(scaled.sourceObjectBounds).toEqual({ left: 1, top: 1, width: 6, height: 6 });
    expect(scaled.targetObjectBounds.left).toBeGreaterThanOrEqual(0);
    expect(scaled.targetObjectBounds.top).toBeGreaterThanOrEqual(0);
    expect(scaled.scale).toBeGreaterThan(1);
    expect(scaled.objectAreaPercentAfter).toBeGreaterThan(scaled.objectAreaPercentBefore);

    const outputMeta = await sharp(scaled.outputBuffer).metadata();
    expect(outputMeta.width).toBe(40);
    expect(outputMeta.height).toBe(30);
  });

  it('keeps object-layout center and autoscaler outputs aligned for same layout plan', async () => {
    const source = await createWhiteProductImage({
      width: 24,
      height: 24,
      objectLeft: 2,
      objectTop: 3,
      objectWidth: 6,
      objectHeight: 6,
      withBorderNoise: true,
    });

    const layout = {
      paddingXPercent: 20,
      paddingYPercent: 10,
      detection: 'white_bg_first_colored_pixel' as const,
      fillMissingCanvasWhite: true,
      targetCanvasWidth: 36,
      targetCanvasHeight: 24,
    };

    const centered = await centerAndScaleObjectByLayout(source, layout);
    const autoscaled = await autoScaleObjectByAnalysis(source, layout, {
      preferTargetCanvas: false,
    });

    expect(autoscaled.width).toBe(centered.width);
    expect(autoscaled.height).toBe(centered.height);
    expect(autoscaled.sourceObjectBounds).toEqual(centered.sourceObjectBounds);
    expect(autoscaled.targetObjectBounds).toEqual(centered.targetObjectBounds);
    expect(autoscaled.scale).toBe(centered.scale);
    expect(autoscaled.detectionUsed).toBe(centered.detectionUsed);
    expect(autoscaled.confidenceBefore).toBeCloseTo(centered.confidenceBefore, 6);
    expect(autoscaled.detectionDetails).toEqual(centered.detectionDetails);
  });
});
