/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import * as synthSupport from '../useKangurMusicSynth.test-support';

const {
  createdContexts,
  findPannerNodeByRampTarget,
  findSustainedFilterNode,
  resolveExpectedSustainedReverbPan,
} = synthSupport;

const useKangurMusicSynth = <T extends string>() => synthSupport.useKangurMusicSynth<T>();

describe('useKangurMusicSynth', () => {
  synthSupport.registerUseKangurMusicSynthTestLifecycle();

  it('preserves the original sustained base gain when live expression updates', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          frequencyHz: 261.63,
          gain: 0.08,
          id: 'quiet',
          velocity: 0.56,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-base-gain' }
      );
    });

    const gainNode = createdContexts[0]?.gains[1];
    expect(gainNode).toBeDefined();

    act(() => {
      result.current.updateSustainedNote({
        brightness: 0.88,
        frequencyHz: 261.63,
        interactionId: 'glide-base-gain',
        velocity: 0.94,
      });
    });

    const lastGainTarget = gainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    expect(typeof lastGainTarget).toBe('number');
    expect(lastGainTarget).toBeCloseTo(0.13, 2);
    expect(lastGainTarget).toBeLessThan(0.2);
  });

  it('widens the sustained unison detune spread as expression gets brighter', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness: 0.24,
          frequencyHz: 261.63,
          id: 'narrow',
          velocity: 0.34,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-detune' }
      );
    });

    const lowerOscillator = createdContexts[0]?.oscillators[1];
    const upperOscillator = createdContexts[0]?.oscillators[3];
    expect(lowerOscillator).toBeDefined();
    expect(upperOscillator).toBeDefined();

    const initialLowerDetune = lowerOscillator?.detune.value ?? 0;
    const initialUpperDetune = upperOscillator?.detune.value ?? 0;

    act(() => {
      result.current.updateSustainedNote({
        brightness: 0.94,
        frequencyHz: 261.63,
        interactionId: 'glide-detune',
        velocity: 0.94,
      });
    });

    expect(lowerOscillator?.detune.value ?? 0).toBeLessThan(initialLowerDetune);
    expect(upperOscillator?.detune.value ?? 0).toBeGreaterThan(initialUpperDetune);
    expect(lowerOscillator?.detune.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      lowerOscillator?.detune.value,
      expect.any(Number)
    );
    expect(upperOscillator?.detune.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      upperOscillator?.detune.value,
      expect.any(Number)
    );
  });

  it('ramps sustained filter resonance when expression brightens mid-glide', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness: 0.22,
          frequencyHz: 261.63,
          id: 'filter-q',
          velocity: 0.34,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-filter-q' }
      );
    });

    const filterNode = findSustainedFilterNode(createdContexts[0]);
    expect(filterNode).toBeDefined();

    act(() => {
      result.current.updateSustainedNote({
        brightness: 0.94,
        frequencyHz: 261.63,
        interactionId: 'glide-filter-q',
        velocity: 0.94,
      });
    });

    expect(filterNode?.Q.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      filterNode?.Q.value,
      expect.any(Number)
    );
    expect(filterNode?.Q.value ?? 0).toBeGreaterThan(1.6);
  });

  it('moves the sustained synth image across the stereo field during X glides', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          frequencyHz: 261.63,
          id: 'do',
          stereoPan: -0.34,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-pan' }
      );
    });

    const stereoPannerNode = findPannerNodeByRampTarget(createdContexts[0], -0.34);
    expect(stereoPannerNode).toBeDefined();
    expect(stereoPannerNode?.pan.linearRampToValueAtTime).toHaveBeenCalledWith(
      -0.34,
      expect.any(Number)
    );

    act(() => {
      result.current.updateSustainedNote({
        frequencyHz: 392,
        interactionId: 'glide-pan',
        stereoPan: 0.33,
      });
    });

    expect(stereoPannerNode?.pan.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      0.33,
      expect.any(Number)
    );
  });

  it('lets the sustained reverb image follow the glide more subtly than the dry signal', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());
    const initialStereoPan = -0.34;

    await act(async () => {
      await result.current.startSustainedNote(
        {
          frequencyHz: 261.63,
          id: 'do',
          stereoPan: initialStereoPan,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-pan-reverb' }
      );
    });

    const reverbPannerNode = findPannerNodeByRampTarget(
      createdContexts[0],
      resolveExpectedSustainedReverbPan(initialStereoPan)
    );
    expect(reverbPannerNode).toBeDefined();
    expect(reverbPannerNode?.pan.linearRampToValueAtTime).toHaveBeenCalledWith(
      -0.13,
      expect.any(Number)
    );

    act(() => {
      result.current.updateSustainedNote({
        frequencyHz: 392,
        interactionId: 'glide-pan-reverb',
        stereoPan: 0.33,
      });
    });

    expect(reverbPannerNode?.pan.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      0.13,
      expect.any(Number)
    );
  });

  it('uses longer portamento ramps for larger sustained pitch glides', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          frequencyHz: 261.63,
          id: 'do',
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-portamento' }
      );
    });

    const leadOscillator = createdContexts[0]?.oscillators[0];
    expect(leadOscillator).toBeDefined();

    act(() => {
      result.current.updateSustainedNote({
        frequencyHz: 277.18,
        interactionId: 'glide-portamento',
      });
    });

    const smallGlideRampTime =
      leadOscillator?.frequency.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;

    act(() => {
      result.current.updateSustainedNote({
        frequencyHz: 392,
        interactionId: 'glide-portamento',
      });
    });

    const largeGlideRampTime =
      leadOscillator?.frequency.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;

    expect(typeof smallGlideRampTime).toBe('number');
    expect(typeof largeGlideRampTime).toBe('number');
    expect(largeGlideRampTime).toBeGreaterThan(smallGlideRampTime);
  });

  it('uses slightly faster portamento for higher sustained glides at the same interval', async () => {
    const lowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await lowHook.result.current.startSustainedNote(
        {
          frequencyHz: 146.83,
          id: 'portamento-low',
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-portamento-low' }
      );
    });

    const lowLeadOscillator = createdContexts.at(-1)?.oscillators[0];
    expect(lowLeadOscillator).toBeDefined();

    act(() => {
      lowHook.result.current.updateSustainedNote({
        frequencyHz: 164.81,
        interactionId: 'glide-portamento-low',
      });
    });

    const lowPortamentoRampTime =
      lowLeadOscillator?.frequency.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;

    lowHook.unmount();
    const highHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await highHook.result.current.startSustainedNote(
        {
          frequencyHz: 523.25,
          id: 'portamento-high',
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-portamento-high' }
      );
    });

    const highLeadOscillator = createdContexts.at(-1)?.oscillators[0];
    expect(highLeadOscillator).toBeDefined();

    act(() => {
      highHook.result.current.updateSustainedNote({
        frequencyHz: 587.33,
        interactionId: 'glide-portamento-high',
      });
    });

    const highPortamentoRampTime =
      highLeadOscillator?.frequency.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;

    expect(lowPortamentoRampTime).toBeGreaterThan(highPortamentoRampTime);
  });

  it('updates sustained vibrato faster for higher synth notes during glides', async () => {
    const lowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await lowHook.result.current.startSustainedNote(
        {
          frequencyHz: 196,
          id: 'vibrato-update-low',
          vibratoDepth: 0.4,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-vibrato-update-low' }
      );
    });

    const lowLfoGainNode = createdContexts.at(-1)?.gains[2];
    expect(lowLfoGainNode).toBeDefined();

    act(() => {
      lowHook.result.current.updateSustainedNote({
        frequencyHz: 220,
        interactionId: 'glide-vibrato-update-low',
        vibratoDepth: 1,
        vibratoRateHz: 6.7,
      });
    });

    const lowVibratoRampTime =
      lowLfoGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;

    lowHook.unmount();
    const highHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await highHook.result.current.startSustainedNote(
        {
          frequencyHz: 523.25,
          id: 'vibrato-update-high',
          vibratoDepth: 0.4,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-vibrato-update-high' }
      );
    });

    const highLfoGainNode = createdContexts.at(-1)?.gains[2];
    expect(highLfoGainNode).toBeDefined();

    act(() => {
      highHook.result.current.updateSustainedNote({
        frequencyHz: 587.33,
        interactionId: 'glide-vibrato-update-high',
        vibratoDepth: 1,
        vibratoRateHz: 6.7,
      });
    });

    const highVibratoRampTime =
      highLfoGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;

    expect(lowVibratoRampTime).toBeGreaterThan(highVibratoRampTime);
  });

  it('updates sustained stereo pan faster for higher synth notes during glides', async () => {
    const lowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await lowHook.result.current.startSustainedNote(
        {
          frequencyHz: 196,
          id: 'pan-update-low',
          stereoPan: -0.34,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-pan-update-low' }
      );
    });

    const lowPannerNode = findPannerNodeByRampTarget(createdContexts.at(-1), -0.34);
    expect(lowPannerNode).toBeDefined();

    act(() => {
      lowHook.result.current.updateSustainedNote({
        frequencyHz: 220,
        interactionId: 'glide-pan-update-low',
        stereoPan: 0.33,
      });
    });

    const lowPanRampTime =
      lowPannerNode?.pan.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;

    lowHook.unmount();
    const highHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await highHook.result.current.startSustainedNote(
        {
          frequencyHz: 523.25,
          id: 'pan-update-high',
          stereoPan: -0.34,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-pan-update-high' }
      );
    });

    const highPannerNode = findPannerNodeByRampTarget(createdContexts.at(-1), -0.34);
    expect(highPannerNode).toBeDefined();

    act(() => {
      highHook.result.current.updateSustainedNote({
        frequencyHz: 587.33,
        interactionId: 'glide-pan-update-high',
        stereoPan: 0.33,
      });
    });

    const highPanRampTime =
      highPannerNode?.pan.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;

    expect(lowPanRampTime).toBeGreaterThan(highPanRampTime);
  });

  it('updates sustained gain faster for higher synth notes during live expression changes', async () => {
    const lowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await lowHook.result.current.startSustainedNote(
        {
          frequencyHz: 196,
          gain: 0.12,
          id: 'gain-update-low',
          velocity: 0.5,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-gain-update-low' }
      );
    });

    const lowGainNode = createdContexts.at(-1)?.gains[1];
    expect(lowGainNode).toBeDefined();

    act(() => {
      lowHook.result.current.updateSustainedNote({
        brightness: 0.88,
        frequencyHz: 196,
        interactionId: 'glide-gain-update-low',
        velocity: 0.94,
      });
    });

    const lowGainRampTime =
      lowGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;

    lowHook.unmount();
    const highHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await highHook.result.current.startSustainedNote(
        {
          frequencyHz: 523.25,
          gain: 0.12,
          id: 'gain-update-high',
          velocity: 0.5,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-gain-update-high' }
      );
    });

    const highGainNode = createdContexts.at(-1)?.gains[1];
    expect(highGainNode).toBeDefined();

    act(() => {
      highHook.result.current.updateSustainedNote({
        brightness: 0.88,
        frequencyHz: 523.25,
        interactionId: 'glide-gain-update-high',
        velocity: 0.94,
      });
    });

    const highGainRampTime =
      highGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;

    expect(lowGainRampTime).toBeGreaterThan(highGainRampTime);
  });
});
