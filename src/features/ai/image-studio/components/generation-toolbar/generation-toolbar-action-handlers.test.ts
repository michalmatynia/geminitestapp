import { describe, expect, it, vi } from 'vitest';

import {
  buildUpscaleSuccessToastMessage,
  resolveUpscaleRequestPayload,
} from './generation-toolbar-action-handlers';

describe('generation-toolbar-action-handlers resolveUpscaleRequestPayload', () => {
  it('accepts a valid scale request without reading source dimensions', async () => {
    const resolveUpscaleSourceDimensions = vi.fn(async () => ({ width: 1200, height: 900 }));

    await expect(
      resolveUpscaleRequestPayload({
        resolveUpscaleSourceDimensions,
        upscaleMaxOutputSide: 4096,
        upscaleScale: '2.5',
        upscaleStrategy: 'scale',
        upscaleTargetHeight: '',
        upscaleTargetWidth: '',
      })
    ).resolves.toEqual({
      errorMessage: null,
      payload: { strategy: 'scale', scale: 2.5 },
    });

    expect(resolveUpscaleSourceDimensions).not.toHaveBeenCalled();
  });

  it('rejects a scale request outside the supported range', async () => {
    await expect(
      resolveUpscaleRequestPayload({
        resolveUpscaleSourceDimensions: async () => ({ width: 1200, height: 900 }),
        upscaleMaxOutputSide: 4096,
        upscaleScale: '9',
        upscaleStrategy: 'scale',
        upscaleTargetHeight: '',
        upscaleTargetWidth: '',
      })
    ).resolves.toEqual({
      errorMessage: 'Upscale multiplier must be greater than 1 and at most 8.',
      payload: null,
    });
  });

  it('rejects target-resolution requests that do not upscale either side', async () => {
    await expect(
      resolveUpscaleRequestPayload({
        resolveUpscaleSourceDimensions: async () => ({ width: 1200, height: 900 }),
        upscaleMaxOutputSide: 4096,
        upscaleScale: '',
        upscaleStrategy: 'target_resolution',
        upscaleTargetHeight: '900',
        upscaleTargetWidth: '1200',
      })
    ).resolves.toEqual({
      errorMessage:
        'Target resolution must upscale at least one side and not reduce source dimensions.',
      payload: null,
    });
  });

  it('accepts target-resolution requests that upscale one side without shrinking the other', async () => {
    await expect(
      resolveUpscaleRequestPayload({
        resolveUpscaleSourceDimensions: async () => ({ width: 1200, height: 900 }),
        upscaleMaxOutputSide: 4096,
        upscaleScale: '',
        upscaleStrategy: 'target_resolution',
        upscaleTargetHeight: '900',
        upscaleTargetWidth: '1800',
      })
    ).resolves.toEqual({
      errorMessage: null,
      payload: {
        strategy: 'target_resolution',
        targetHeight: 900,
        targetWidth: 1800,
      },
    });
  });
});

describe('generation-toolbar-action-handlers buildUpscaleSuccessToastMessage', () => {
  it('prefers the created slot name and effective client mode', () => {
    expect(
      buildUpscaleSuccessToastMessage({
        request: { strategy: 'scale', scale: 2 },
        resolvedMode: 'server_sharp',
        response: {
          effectiveMode: 'client_data_url',
          scale: 2,
          slot: { id: 'slot-2', name: 'Hero upscale' },
          strategy: 'scale',
        } as never,
      })
    ).toBe('Created Hero upscale (Client upscale).');
  });

  it('falls back to the requested target resolution when the response omits it', () => {
    expect(
      buildUpscaleSuccessToastMessage({
        request: {
          strategy: 'target_resolution',
          targetHeight: 1600,
          targetWidth: 2400,
        },
        resolvedMode: 'server_sharp',
        response: {
          effectiveMode: undefined,
          slot: { id: 'slot-3', name: '   ' },
          strategy: 'target_resolution',
          targetHeight: null,
          targetWidth: null,
        } as never,
      })
    ).toBe('Created Upscale 2400x1600 (Server upscale).');
  });

  it('formats scale labels with trimmed trailing zeros', () => {
    expect(
      buildUpscaleSuccessToastMessage({
        request: { strategy: 'scale', scale: 2.345 },
        resolvedMode: 'server_sharp',
        response: {
          effectiveMode: undefined,
          scale: 2.345,
          slot: null,
          strategy: 'scale',
        } as never,
      })
    ).toBe('Created Upscale 2.35x (Server upscale).');
  });
});
