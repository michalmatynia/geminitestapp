import { describe, expect, it } from 'vitest';

import {
  buildCropFingerprint,
  buildCropFingerprintRelationType,
  buildCropRequestRelationType,
  clampCropRect,
  normalizeCropRectForFingerprint,
  validateCropOutputDimensions,
  validateCropSourceDimensions,
} from '@/features/ai/image-studio/server/crop-utils';

describe('crop-utils', () => {
  it('normalizes crop rect values for deterministic fingerprints', () => {
    expect(
      normalizeCropRectForFingerprint({
        x: 14.9,
        y: 8.2,
        width: 99.9,
        height: 55.4,
      })
    ).toEqual({
      x: 14,
      y: 8,
      width: 99,
      height: 55,
    });
  });

  it('produces identical bbox fingerprint for client and server bbox modes', () => {
    const sourceSignature = 'slot-1|project-1|file-1';
    const rect = { x: 10, y: 20, width: 100, height: 80 };

    const clientFingerprint = buildCropFingerprint({
      sourceSignature,
      mode: 'client_bbox',
      cropRect: rect,
    });
    const serverFingerprint = buildCropFingerprint({
      sourceSignature,
      mode: 'server_bbox',
      cropRect: rect,
    });

    expect(clientFingerprint).toBe(serverFingerprint);
    expect(buildCropFingerprintRelationType(clientFingerprint)).toMatch(/^crop:output:[a-f0-9]{20}$/);
  });

  it('uses request id relation hashing for idempotency links', () => {
    const relation = buildCropRequestRelationType('req_123456789');
    expect(relation).toMatch(/^crop:request:[a-f0-9]{20}$/);
  });

  it('clamps crop rectangles inside source bounds', () => {
    expect(
      clampCropRect(
        {
          x: 900,
          y: 900,
          width: 500,
          height: 400,
        },
        1024,
        1024
      )
    ).toEqual({
      left: 900,
      top: 900,
      width: 124,
      height: 124,
    });
  });

  it('validates source/output image limits', () => {
    expect(validateCropSourceDimensions(2048, 2048).ok).toBe(true);
    expect(validateCropSourceDimensions(0, 2048).ok).toBe(false);
    expect(validateCropOutputDimensions(4096, 4096)).toBe(true);
    expect(validateCropOutputDimensions(20000, 20000)).toBe(false);
  });
});
