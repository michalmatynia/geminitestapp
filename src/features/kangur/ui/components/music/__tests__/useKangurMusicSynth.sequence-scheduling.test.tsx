/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import * as synthSupport from '../useKangurMusicSynth.test-support';

const { createdContexts } = synthSupport;

const useKangurMusicSynth = <T extends string>() => synthSupport.useKangurMusicSynth<T>();

describe('useKangurMusicSynth sequence scheduling', () => {
  synthSupport.registerUseKangurMusicSynthTestLifecycle();

  it('pre-schedules note starts against AudioContext time for melody playback', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    let sequencePromise: Promise<boolean> | null = null;

    await act(async () => {
      sequencePromise = result.current.playSequence(
        [
          { durationMs: 420, frequencyHz: 261.63, id: 'do' },
          { durationMs: 420, frequencyHz: 293.66, id: 're' },
        ],
        { gapMs: 120 }
      );
      await Promise.resolve();
    });

    const context = createdContexts[0];
    expect(context).toBeDefined();
    expect(context?.oscillators[0]?.start).toHaveBeenCalledWith(0);
    expect(context?.oscillators[3]?.start).toHaveBeenCalledWith(0.54);

    await act(async () => {
      vi.advanceTimersByTime(1_080);
      await sequencePromise;
    });

    await expect(sequencePromise).resolves.toBe(true);
  });

  it('fires step callbacks on the scheduled playback timeline instead of immediately', async () => {
    vi.useFakeTimers();
    const onStepStart = vi.fn();
    const onComplete = vi.fn();
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    let sequencePromise: Promise<boolean> | null = null;

    await act(async () => {
      sequencePromise = result.current.playSequence(
        [
          { durationMs: 420, frequencyHz: 261.63, id: 'do' },
          { durationMs: 420, frequencyHz: 293.66, id: 're' },
        ],
        {
          gapMs: 120,
          onComplete,
          onStepStart,
        }
      );
      await Promise.resolve();
    });

    expect(onStepStart).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(0);
      await Promise.resolve();
    });
    expect(onStepStart).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: 'do' }),
      0
    );

    await act(async () => {
      vi.advanceTimersByTime(539);
      await Promise.resolve();
    });
    expect(onStepStart).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(onStepStart).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 're' }),
      1
    );

    await act(async () => {
      vi.advanceTimersByTime(540);
      await sequencePromise;
    });

    await expect(sequencePromise).resolves.toBe(true);
    expect(onComplete).toHaveBeenCalledWith(true);
  });
});
