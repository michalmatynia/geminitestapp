import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import {
  buildCenterFingerprint,
  buildCenterFingerprintRelationType,
  buildCenterLayoutSignature,
  buildCenterRequestRelationType,
  centerAndScaleObjectByLayout,
  centerObjectByAlpha,
  normalizeCenterBoundsForFingerprint,
  normalizeCenterLayoutConfig,
  validateCenterOutputDimensions,
  validateCenterSourceDimensions,
} from '@/features/ai/image-studio/server/center-utils';

describe('center-utils', () => {
  it('normalizes object bounds values for deterministic fingerprints', () => {
    expect(
      normalizeCenterBoundsForFingerprint({
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

  it('produces identical fingerprint for client and server modes', () => {
    const sourceSignature = 'slot-1|project-1|file-1';

    const clientFingerprint = buildCenterFingerprint({
      sourceSignature,
      mode: 'client_alpha_bbox',
    });
    const serverFingerprint = buildCenterFingerprint({
      sourceSignature,
      mode: 'server_alpha_bbox',
    });

    expect(clientFingerprint).toBe(serverFingerprint);
    expect(buildCenterFingerprintRelationType(clientFingerprint)).toMatch(/^center:output:[a-f0-9]{20}$/);
  });

  it('produces distinct fingerprints for alpha-center and object-layout pipelines', () => {
    const sourceSignature = 'slot-2|project-2|file-2';
    const alphaFingerprint = buildCenterFingerprint({
      sourceSignature,
      mode: 'server_alpha_bbox',
    });
    const objectLayoutFingerprint = buildCenterFingerprint({
      sourceSignature,
      mode: 'server_object_layout_v1',
      layoutSignature: buildCenterLayoutSignature({ paddingPercent: 8 }),
    });

    expect(alphaFingerprint).not.toBe(objectLayoutFingerprint);
  });

  it('uses request id relation hashing for idempotency links', () => {
    const relation = buildCenterRequestRelationType('center_req_123456789');
    expect(relation).toMatch(/^center:request:[a-f0-9]{20}$/);
  });

  it('validates source/output image limits', () => {
    expect(validateCenterSourceDimensions(2048, 2048).ok).toBe(true);
    expect(validateCenterSourceDimensions(0, 2048).ok).toBe(false);
    expect(validateCenterOutputDimensions(4096, 4096)).toBe(true);
    expect(validateCenterOutputDimensions(20000, 20000)).toBe(false);
  });

  it('normalizes layout config with optional axis padding overrides', () => {
    expect(
      normalizeCenterLayoutConfig({
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
      detection: 'auto',
    });
  });

  it('centers alpha-bounded object inside transparent canvas', async () => {
    const sprite = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 2,
              height: 2,
              channels: 4,
              background: { r: 255, g: 0, b: 0, alpha: 1 },
            },
          })
            .png()
            .toBuffer(),
          left: 0,
          top: 0,
        },
      ])
      .png()
      .toBuffer();

    const centered = await centerObjectByAlpha(sprite);
    expect(centered.width).toBe(10);
    expect(centered.height).toBe(10);
    expect(centered.sourceObjectBounds).toEqual({ left: 0, top: 0, width: 2, height: 2 });
    expect(centered.targetObjectBounds).toEqual({ left: 4, top: 4, width: 2, height: 2 });

    const outputMeta = await sharp(centered.outputBuffer).metadata();
    expect(outputMeta.width).toBe(10);
    expect(outputMeta.height).toBe(10);
  });

  it('layouts white-background object with padding and center scaling', async () => {
    const source = await sharp({
      create: {
        width: 24,
        height: 24,
        channels: 4,
        background: { r: 250, g: 250, b: 250, alpha: 1 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 6,
              height: 6,
              channels: 4,
              background: { r: 255, g: 0, b: 0, alpha: 1 },
            },
          })
            .png()
            .toBuffer(),
          left: 2,
          top: 3,
        },
        {
          // Stray noise on border should not become the object bound.
          input: await sharp({
            create: {
              width: 1,
              height: 1,
              channels: 4,
              background: { r: 180, g: 180, b: 180, alpha: 1 },
            },
          })
            .png()
            .toBuffer(),
          left: 0,
          top: 23,
        },
      ])
      .png()
      .toBuffer();

    const laidOut = await centerAndScaleObjectByLayout(source, {
      paddingXPercent: 20,
      paddingYPercent: 10,
      detection: 'white_bg_first_colored_pixel',
    });
    expect(laidOut.width).toBe(24);
    expect(laidOut.height).toBe(24);
    expect(laidOut.detectionUsed).toBe('white_bg_first_colored_pixel');
    expect(laidOut.sourceObjectBounds).toEqual({ left: 2, top: 3, width: 6, height: 6 });
    expect(laidOut.targetObjectBounds.left).toBeGreaterThan(0);
    expect(laidOut.targetObjectBounds.top).toBeGreaterThan(0);
    expect(laidOut.scale).toBeGreaterThan(1);
  });

  it('fills missing area with white when target canvas is larger than source', async () => {
    const source = await sharp({
      create: {
        width: 20,
        height: 20,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 6,
              height: 6,
              channels: 4,
              background: { r: 255, g: 0, b: 0, alpha: 1 },
            },
          })
            .png()
            .toBuffer(),
          left: 1,
          top: 1,
        },
      ])
      .png()
      .toBuffer();

    const laidOut = await centerAndScaleObjectByLayout(source, {
      paddingPercent: 10,
      detection: 'white_bg_first_colored_pixel',
      fillMissingCanvasWhite: true,
      targetCanvasWidth: 40,
      targetCanvasHeight: 30,
    });

    expect(laidOut.width).toBe(40);
    expect(laidOut.height).toBe(30);
    expect(laidOut.targetObjectBounds.left).toBeGreaterThanOrEqual(0);
    expect(laidOut.targetObjectBounds.top).toBeGreaterThanOrEqual(0);

    const outputMeta = await sharp(laidOut.outputBuffer).metadata();
    expect(outputMeta.width).toBe(40);
    expect(outputMeta.height).toBe(30);
  });
});
