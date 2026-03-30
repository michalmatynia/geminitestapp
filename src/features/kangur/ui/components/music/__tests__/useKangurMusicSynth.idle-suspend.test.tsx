/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import * as synthSupport from '../useKangurMusicSynth.test-support';

const { createdContexts } = synthSupport;

const useKangurMusicSynth = <T extends string>() => synthSupport.useKangurMusicSynth<T>();

describe('useKangurMusicSynth idle suspend', () => {
  synthSupport.registerUseKangurMusicSynthTestLifecycle();

  it('suspends the audio context after transient playback stays idle', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.playNote({
        durationMs: 240,
        frequencyHz: 261.63,
        id: 'do',
      });
    });

    const context = createdContexts[0];
    expect(context).toBeDefined();

    act(() => {
      context?.oscillators[0]?.onended?.();
    });

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(context?.suspend).toHaveBeenCalledTimes(1);
    expect(context?.state).toBe('suspended');
  });

  it('resumes the suspended audio context instead of recreating it on the next note', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.playNote({
        durationMs: 240,
        frequencyHz: 261.63,
        id: 'do',
      });
    });

    const context = createdContexts[0];
    act(() => {
      context?.oscillators[0]?.onended?.();
    });

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(context?.state).toBe('suspended');

    await act(async () => {
      await result.current.playNote({
        durationMs: 240,
        frequencyHz: 293.66,
        id: 're',
      });
    });

    expect(createdContexts).toHaveLength(1);
    expect(context?.resume).toHaveBeenCalledTimes(1);
    expect(context?.state).toBe('running');
  });

  it('keeps the context running while a sustained note is held and suspends after release', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          frequencyHz: 261.63,
          id: 'hold',
          waveform: 'sawtooth',
        },
        { interactionId: 'hold-interaction' }
      );
    });

    const context = createdContexts[0];

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(context?.suspend).not.toHaveBeenCalled();

    act(() => {
      result.current.stopSustainedNote('hold-interaction', { immediate: true });
    });

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(context?.suspend).toHaveBeenCalledTimes(1);
    expect(context?.state).toBe('suspended');
  });
});
