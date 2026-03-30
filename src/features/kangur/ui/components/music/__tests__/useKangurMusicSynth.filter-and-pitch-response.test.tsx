/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import * as synthSupport from '../useKangurMusicSynth.test-support';

const {
  createdContexts,
  findGainNodeByRampTarget,
  findSustainedFilterNode,
  resolveExpectedSustainedLowerBlendGain,
  resolveExpectedSustainedReverbSendGain,
  resolveExpectedSustainedUpperBlendGain,
  resolveExpectedSustainedVibratoReverbSendGain,
} = synthSupport;

const useKangurMusicSynth = <T extends string>() => synthSupport.useKangurMusicSynth<T>();

describe('useKangurMusicSynth', () => {
  synthSupport.registerUseKangurMusicSynthTestLifecycle();

  it('updates sustained timbre faster for higher synth notes during live expression changes', async () => {
    const lowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await lowHook.result.current.startSustainedNote(
        {
          brightness: 0.26,
          frequencyHz: 196,
          id: 'timbre-update-low',
          velocity: 0.48,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-timbre-update-low' }
      );
    });

    const lowFilterNode = findSustainedFilterNode(createdContexts.at(-1));
    expect(lowFilterNode).toBeDefined();

    act(() => {
      lowHook.result.current.updateSustainedNote({
        brightness: 0.9,
        frequencyHz: 196,
        interactionId: 'glide-timbre-update-low',
        velocity: 0.92,
      });
    });

    const lowTimbreRampTime =
      lowFilterNode?.frequency.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;

    lowHook.unmount();
    const highHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await highHook.result.current.startSustainedNote(
        {
          brightness: 0.26,
          frequencyHz: 523.25,
          id: 'timbre-update-high',
          velocity: 0.48,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-timbre-update-high' }
      );
    });

    const highFilterNode = findSustainedFilterNode(createdContexts.at(-1));
    expect(highFilterNode).toBeDefined();

    act(() => {
      highHook.result.current.updateSustainedNote({
        brightness: 0.9,
        frequencyHz: 523.25,
        interactionId: 'glide-timbre-update-high',
        velocity: 0.92,
      });
    });

    const highTimbreRampTime =
      highFilterNode?.frequency.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;

    expect(lowTimbreRampTime).toBeGreaterThan(highTimbreRampTime);
  });

  it('opens the sustained filter slightly when pitch glides upward at the same expression', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness: 0.52,
          frequencyHz: 261.63,
          id: 'pitch-filter',
          velocity: 0.6,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-pitch-filter' }
      );
    });

    const filterNode = findSustainedFilterNode(createdContexts[0]);
    expect(filterNode).toBeDefined();

    const lowPitchFilterHz = filterNode?.frequency.value ?? 0;

    act(() => {
      result.current.updateSustainedNote({
        frequencyHz: 392,
        interactionId: 'glide-pitch-filter',
      });
    });

    expect(filterNode?.frequency.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      filterNode?.frequency.value,
      expect.any(Number)
    );
    expect(filterNode?.frequency.value ?? 0).toBeGreaterThan(lowPitchFilterHz);
  });

  it('smooths sustained filter resonance slightly lower when pitch glides upward at the same expression', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness: 0.52,
          frequencyHz: 261.63,
          id: 'pitch-filter-q',
          velocity: 0.6,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-pitch-filter-q' }
      );
    });

    const filterNode = findSustainedFilterNode(createdContexts[0]);
    expect(filterNode).toBeDefined();

    const lowPitchFilterQ = filterNode?.Q.value ?? 0;

    act(() => {
      result.current.updateSustainedNote({
        frequencyHz: 392,
        interactionId: 'glide-pitch-filter-q',
      });
    });

    expect(filterNode?.Q.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      filterNode?.Q.value,
      expect.any(Number)
    );
    expect(filterNode?.Q.value ?? 0).toBeLessThan(lowPitchFilterQ);
  });

  it('opens the sustained filter attack less aggressively for higher synth notes', async () => {
    const brightness = 0.52;
    const velocity = 0.6;
    const lowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await lowHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: 196,
          id: 'filter-attack-low',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-filter-attack-low' }
      );
    });

    const lowFilterNode = findSustainedFilterNode(createdContexts.at(-1));
    expect(lowFilterNode).toBeDefined();
    const lowAttackHz = lowFilterNode?.frequency.setValueAtTime.mock.calls[0]?.[0] ?? 0;

    lowHook.unmount();
    const highHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await highHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: 523.25,
          id: 'filter-attack-high',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-filter-attack-high' }
      );
    });

    const highFilterNode = findSustainedFilterNode(createdContexts.at(-1));
    expect(highFilterNode).toBeDefined();
    const highAttackHz = highFilterNode?.frequency.setValueAtTime.mock.calls[0]?.[0] ?? 0;

    expect(highAttackHz).toBeLessThan(lowAttackHz * 1.5);
  });

  it('settles the sustained filter attack faster for higher synth notes', async () => {
    const brightness = 0.52;
    const velocity = 0.6;
    const lowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await lowHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: 196,
          id: 'filter-settle-low',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-filter-settle-low' }
      );
    });

    const lowFilterNode = findSustainedFilterNode(createdContexts.at(-1));
    expect(lowFilterNode).toBeDefined();
    const lowSettleTime =
      lowFilterNode?.frequency.linearRampToValueAtTime.mock.calls[0]?.[1] ?? 0;

    lowHook.unmount();
    const highHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await highHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: 523.25,
          id: 'filter-settle-high',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-filter-settle-high' }
      );
    });

    const highFilterNode = findSustainedFilterNode(createdContexts.at(-1));
    expect(highFilterNode).toBeDefined();
    const highSettleTime =
      highFilterNode?.frequency.linearRampToValueAtTime.mock.calls[0]?.[1] ?? 0;

    expect(lowSettleTime).toBeGreaterThan(highSettleTime);
  });

  it('starts the sustained filter resonance more strongly for lower synth notes', async () => {
    const brightness = 0.52;
    const velocity = 0.6;
    const lowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await lowHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: 196,
          id: 'filter-attack-q-low',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-filter-attack-q-low' }
      );
    });

    const lowFilterNode = findSustainedFilterNode(createdContexts.at(-1));
    expect(lowFilterNode).toBeDefined();
    const lowAttackQ = lowFilterNode?.Q.setValueAtTime.mock.calls[0]?.[0] ?? 0;
    const lowSustainQ = lowFilterNode?.Q.linearRampToValueAtTime.mock.calls[0]?.[0] ?? 0;

    lowHook.unmount();
    const highHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await highHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: 523.25,
          id: 'filter-attack-q-high',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-filter-attack-q-high' }
      );
    });

    const highFilterNode = findSustainedFilterNode(createdContexts.at(-1));
    expect(highFilterNode).toBeDefined();
    const highAttackQ = highFilterNode?.Q.setValueAtTime.mock.calls[0]?.[0] ?? 0;
    const highSustainQ = highFilterNode?.Q.linearRampToValueAtTime.mock.calls[0]?.[0] ?? 0;

    expect(lowAttackQ).toBeGreaterThan(lowSustainQ);
    expect(highAttackQ).toBeGreaterThan(highSustainQ);
    expect(lowAttackQ).toBeGreaterThan(highAttackQ);
  });

  it('leans the sustained unison blend lighter when pitch glides upward at the same expression', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness: 0.52,
          frequencyHz: 261.63,
          id: 'pitch-blend',
          velocity: 0.6,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-pitch-blend' }
      );
    });

    const lowerBlendGainNode = findGainNodeByRampTarget(
      createdContexts[0],
      resolveExpectedSustainedLowerBlendGain(0.52, 261.63)
    );
    const upperBlendGainNode = findGainNodeByRampTarget(
      createdContexts[0],
      resolveExpectedSustainedUpperBlendGain(0.52, 261.63)
    );
    expect(lowerBlendGainNode).toBeDefined();
    expect(upperBlendGainNode).toBeDefined();

    const lowPitchLowerBlend = lowerBlendGainNode?.gain.value ?? 0;
    const lowPitchUpperBlend = upperBlendGainNode?.gain.value ?? 0;

    act(() => {
      result.current.updateSustainedNote({
        frequencyHz: 392,
        interactionId: 'glide-pitch-blend',
      });
    });

    expect(lowerBlendGainNode?.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      lowerBlendGainNode?.gain.value,
      expect.any(Number)
    );
    expect(upperBlendGainNode?.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      upperBlendGainNode?.gain.value,
      expect.any(Number)
    );
    expect(lowerBlendGainNode?.gain.value ?? 0).toBeLessThan(lowPitchLowerBlend);
    expect(upperBlendGainNode?.gain.value ?? 0).toBeLessThan(lowPitchUpperBlend);
  });

  it('narrows sustained unison detune slightly when pitch glides upward at the same expression', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness: 0.52,
          frequencyHz: 261.63,
          id: 'pitch-detune',
          velocity: 0.6,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-pitch-detune' }
      );
    });

    const lowerOscillator = createdContexts[0]?.oscillators[1];
    const upperOscillator = createdContexts[0]?.oscillators[3];
    expect(lowerOscillator).toBeDefined();
    expect(upperOscillator).toBeDefined();

    const lowPitchLowerDetune = Math.abs(lowerOscillator?.detune.value ?? 0);
    const lowPitchUpperDetune = Math.abs(upperOscillator?.detune.value ?? 0);

    act(() => {
      result.current.updateSustainedNote({
        frequencyHz: 392,
        interactionId: 'glide-pitch-detune',
      });
    });

    expect(lowerOscillator?.detune.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      lowerOscillator?.detune.value,
      expect.any(Number)
    );
    expect(upperOscillator?.detune.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      upperOscillator?.detune.value,
      expect.any(Number)
    );
    expect(Math.abs(lowerOscillator?.detune.value ?? 0)).toBeLessThan(lowPitchLowerDetune);
    expect(Math.abs(upperOscillator?.detune.value ?? 0)).toBeLessThan(lowPitchUpperDetune);
  });

  it('dries the sustained reverb send slightly when pitch glides upward at the same expression', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness: 0.52,
          frequencyHz: 261.63,
          id: 'pitch-reverb',
          velocity: 0.6,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-pitch-reverb' }
      );
    });

    const reverbSendGainNode = findGainNodeByRampTarget(
      createdContexts[0],
      resolveExpectedSustainedReverbSendGain(0.52, 0.6, 261.63)
    );
    expect(reverbSendGainNode).toBeDefined();

    const lowPitchSend = reverbSendGainNode?.gain.value ?? 0;

    act(() => {
      result.current.updateSustainedNote({
        frequencyHz: 392,
        interactionId: 'glide-pitch-reverb',
      });
    });

    expect(reverbSendGainNode?.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      reverbSendGainNode?.gain.value,
      expect.any(Number)
    );
    expect(reverbSendGainNode?.gain.value ?? 0).toBeLessThan(lowPitchSend);
  });

  it('rebalances the full sustained unison stack when brightness changes mid-glide', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness: 0.32,
          frequencyHz: 261.63,
          id: 'do',
          velocity: 0.58,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-brightness' }
      );
    });

    const thirdBlendGainNode = findGainNodeByRampTarget(
      createdContexts[0],
      resolveExpectedSustainedUpperBlendGain(0.32, 261.63)
    );
    expect(thirdBlendGainNode).toBeDefined();

    act(() => {
      result.current.updateSustainedNote({
        brightness: 0.92,
        frequencyHz: 261.63,
        interactionId: 'glide-brightness',
        velocity: 0.92,
      });
    });

    expect(thirdBlendGainNode?.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      expect.any(Number),
      expect.any(Number)
    );
    const lastBlendTarget =
      thirdBlendGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    expect(typeof lastBlendTarget).toBe('number');
    expect(lastBlendTarget).toBeGreaterThan(0.3);
  });

  it('opens the sustained reverb send when brightness increases mid-glide', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness: 0.24,
          frequencyHz: 261.63,
          id: 'do',
          velocity: 0.52,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-reverb' }
      );
    });

    const reverbSendGainNode = findGainNodeByRampTarget(
      createdContexts[0],
      resolveExpectedSustainedReverbSendGain(0.24, 0.52)
    );
    expect(reverbSendGainNode).toBeDefined();

    act(() => {
      result.current.updateSustainedNote({
        brightness: 0.94,
        frequencyHz: 261.63,
        interactionId: 'glide-reverb',
        velocity: 0.94,
      });
    });

    expect(reverbSendGainNode?.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      expect.any(Number),
      expect.any(Number)
    );
    const lastSendTarget =
      reverbSendGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    expect(typeof lastSendTarget).toBe('number');
    expect(lastSendTarget).toBeGreaterThan(0.16);
  });

  it('opens the sustained reverb send when vibrato deepens mid-glide', async () => {
    const brightness = 0.58;
    const velocity = 0.72;
    const frequencyHz = 261.63;
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness,
          frequencyHz,
          id: 'vibrato-reverb-update',
          velocity,
          vibratoDepth: 0,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-vibrato-reverb-update' }
      );
    });

    const reverbSendGainNode = findGainNodeByRampTarget(
      createdContexts[0],
      resolveExpectedSustainedVibratoReverbSendGain(brightness, velocity, frequencyHz, 0)
    );
    expect(reverbSendGainNode).toBeDefined();
    const calmSend = reverbSendGainNode?.gain.value ?? 0;

    act(() => {
      result.current.updateSustainedNote({
        brightness,
        frequencyHz,
        interactionId: 'glide-vibrato-reverb-update',
        vibratoDepth: 1,
        velocity,
      });
    });

    expect(reverbSendGainNode?.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      resolveExpectedSustainedVibratoReverbSendGain(brightness, velocity, frequencyHz, 1),
      expect.any(Number)
    );
    expect(reverbSendGainNode?.gain.value ?? 0).toBeGreaterThan(calmSend);
  });
});
