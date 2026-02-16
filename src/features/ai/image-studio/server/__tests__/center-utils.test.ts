import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import {
  buildCenterFingerprint,
  buildCenterFingerprintRelationType,
  buildCenterRequestRelationType,
  centerObjectByAlpha,
  normalizeCenterBoundsForFingerprint,
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
});
