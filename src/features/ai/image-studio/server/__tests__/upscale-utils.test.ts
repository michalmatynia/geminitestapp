import { describe, expect, it } from 'vitest';

import {
  buildUpscaleFingerprint,
  buildUpscaleFingerprintRelationType,
  buildUpscaleRequestRelationType,
  deriveUpscaleScaleFromOutputDimensions,
  normalizeUpscaleScale,
  resolveUpscaleExecutionDimensions,
  resolveUpscaleOutputDimensionsByResolution,
  resolveUpscaleOutputDimensions,
  validateUpscaleOutputDimensions,
  validateUpscaleSourceDimensions,
} from '@/features/ai/image-studio/server/upscale-utils';

describe('upscale-utils', () => {
  it('normalizes scale to stable precision', () => {
    expect(normalizeUpscaleScale(1.234567)).toBe(1.2346);
  });

  it('produces identical fingerprint for client and server modes on same source/scale', () => {
    const sourceSignature = 'slot-1|project-1|file-1';
    const clientFingerprint = buildUpscaleFingerprint({
      sourceSignature,
      mode: 'client_data_url',
      strategy: 'scale',
      scale: 2,
      smoothingQuality: 'high',
    });
    const serverFingerprint = buildUpscaleFingerprint({
      sourceSignature,
      mode: 'server_sharp',
      strategy: 'scale',
      scale: 2,
    });
    expect(clientFingerprint).toBe(serverFingerprint);
    expect(buildUpscaleFingerprintRelationType(clientFingerprint)).toMatch(
      /^upscale:output:[a-f0-9]{20}$/
    );
  });

  it('changes fingerprint when client payload signature changes', () => {
    const sourceSignature = 'slot-1|project-1|file-1';
    const first = buildUpscaleFingerprint({
      sourceSignature,
      mode: 'client_data_url',
      strategy: 'scale',
      scale: 2,
      clientPayloadSignature: 'upload:aaa',
    });
    const second = buildUpscaleFingerprint({
      sourceSignature,
      mode: 'client_data_url',
      strategy: 'scale',
      scale: 2,
      clientPayloadSignature: 'upload:bbb',
    });
    expect(first).not.toBe(second);
  });

  it('changes fingerprint when target resolution differs', () => {
    const sourceSignature = 'slot-1|project-1|file-1';
    const first = buildUpscaleFingerprint({
      sourceSignature,
      mode: 'server_sharp',
      strategy: 'target_resolution',
      targetWidth: 2048,
      targetHeight: 1536,
    });
    const second = buildUpscaleFingerprint({
      sourceSignature,
      mode: 'server_sharp',
      strategy: 'target_resolution',
      targetWidth: 4096,
      targetHeight: 3072,
    });
    expect(first).not.toBe(second);
  });

  it('uses request id relation hashing for idempotency links', () => {
    const relation = buildUpscaleRequestRelationType('upscale_req_123456789');
    expect(relation).toMatch(/^upscale:request:[a-f0-9]{20}$/);
  });

  it('validates source/output limits and derived dimensions', () => {
    expect(validateUpscaleSourceDimensions(2048, 2048).ok).toBe(true);
    expect(validateUpscaleSourceDimensions(0, 2048).ok).toBe(false);
    expect(resolveUpscaleOutputDimensions(1024, 512, 2)).toEqual({ width: 2048, height: 1024 });
    expect(resolveUpscaleOutputDimensionsByResolution(1024, 512, 3000, 1500)).toEqual({
      width: 3000,
      height: 1500,
      scale: 2.9297,
    });
    expect(
      deriveUpscaleScaleFromOutputDimensions({
        sourceWidth: 1024,
        sourceHeight: 512,
        outputWidth: 3000,
        outputHeight: 1500,
      })
    ).toBe(2.9297);
    expect(validateUpscaleOutputDimensions(8192, 8192)).toBe(true);
    expect(validateUpscaleOutputDimensions(30000, 30000)).toBe(false);
  });

  it('resolves execution dimensions for scale and target-resolution strategies', () => {
    expect(
      resolveUpscaleExecutionDimensions({
        sourceWidth: 1024,
        sourceHeight: 512,
        strategy: 'scale',
        scale: 2,
      })
    ).toEqual({
      width: 2048,
      height: 1024,
      scale: 2,
    });

    expect(
      resolveUpscaleExecutionDimensions({
        sourceWidth: 1024,
        sourceHeight: 512,
        strategy: 'target_resolution',
        targetWidth: 3000,
        targetHeight: 1500,
      })
    ).toEqual({
      width: 3000,
      height: 1500,
      scale: 2.9297,
    });
  });
});
