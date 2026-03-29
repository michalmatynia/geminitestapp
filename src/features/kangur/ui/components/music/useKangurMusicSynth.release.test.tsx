/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import * as synthSupport from './useKangurMusicSynth.test-support';

const {
  createdContexts,
  findGainNodeByRampTarget,
  findGainNodeConnectedToTarget,
  findPannerNodeByRampTarget,
  findSustainedFilterNode,
  resolveExpectedSustainedLowerBlendGain,
  resolveExpectedSustainedReverbPan,
  resolveExpectedSustainedReverbSendGain,
  resolveExpectedSustainedUpperBlendGain,
} = synthSupport;

const useKangurMusicSynth = <T extends string>() => synthSupport.useKangurMusicSynth<T>();

describe('useKangurMusicSynth', () => {
  synthSupport.registerUseKangurMusicSynthTestLifecycle();

  it('uses a longer release tail for softer sustained note-offs', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness: 0.28,
          frequencyHz: 261.63,
          id: 'soft',
          velocity: 0.32,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-soft-release' }
      );
    });

    const softLeadOscillator = createdContexts[0]?.oscillators[0];
    expect(softLeadOscillator).toBeDefined();

    act(() => {
      result.current.stopSustainedNote('glide-soft-release', {
        brightness: 0.28,
        velocity: 0.32,
      });
    });

    const softReleaseStopTime = softLeadOscillator?.stop.mock.calls.at(-1)?.[0] ?? 0;

    const hardStartOscillatorIndex = createdContexts[0]?.oscillators.length ?? 0;
    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness: 0.92,
          frequencyHz: 293.66,
          id: 'hard',
          velocity: 0.94,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-hard-release' }
      );
    });

    const hardLeadOscillator = createdContexts[0]?.oscillators[hardStartOscillatorIndex];
    expect(hardLeadOscillator).toBeDefined();

    act(() => {
      result.current.stopSustainedNote('glide-hard-release', {
        brightness: 0.92,
        velocity: 0.94,
      });
    });

    const hardReleaseStopTime = hardLeadOscillator?.stop.mock.calls.at(-1)?.[0] ?? 0;

    expect(typeof softReleaseStopTime).toBe('number');
    expect(typeof hardReleaseStopTime).toBe('number');
    expect(softReleaseStopTime).toBeGreaterThan(hardReleaseStopTime);
  });

  it('applies the configured ADSR envelope to sustained synth notes', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness: 0.54,
          envelope: {
            attackMs: 280,
            decayMs: 420,
            releaseMs: 760,
            sustainLevel: 0.24,
          },
          frequencyHz: 261.63,
          id: 'adsr-shaped',
          velocity: 0.74,
          waveform: 'sawtooth',
        },
        { interactionId: 'adsr-shaped-note' }
      );
    });

    const bodyGainNode = createdContexts[0]?.gains[1];
    expect(bodyGainNode).toBeDefined();

    const gainRamps = bodyGainNode?.gain.linearRampToValueAtTime.mock.calls ?? [];
    expect(gainRamps.length).toBeGreaterThanOrEqual(2);
    const [peakGain = 0, peakAt = 0] = gainRamps[0] ?? [];
    const [sustainGain = 0, sustainAt = 0] = gainRamps[1] ?? [];

    expect(peakAt).toBeGreaterThan(0.2);
    expect(sustainAt).toBeGreaterThan(peakAt);
    expect(sustainGain).toBeLessThan(peakGain);

    const leadOscillator = createdContexts[0]?.oscillators[0];
    expect(leadOscillator).toBeDefined();

    act(() => {
      result.current.stopSustainedNote('adsr-shaped-note');
    });

    const customReleaseStopTime = leadOscillator?.stop.mock.calls.at(-1)?.[0] ?? 0;
    expect(customReleaseStopTime).toBeGreaterThan(0.76);
  });

  it('uses a longer release tail for lower sustained note-offs at the same expression', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness: 0.68,
          frequencyHz: 146.83,
          id: 'low-release',
          velocity: 0.72,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-low-release' }
      );
    });

    const lowLeadOscillator = createdContexts[0]?.oscillators[0];
    expect(lowLeadOscillator).toBeDefined();

    act(() => {
      result.current.stopSustainedNote('glide-low-release', {
        brightness: 0.68,
        velocity: 0.72,
      });
    });

    const lowReleaseStopTime = lowLeadOscillator?.stop.mock.calls.at(-1)?.[0] ?? 0;

    const highStartOscillatorIndex = createdContexts[0]?.oscillators.length ?? 0;
    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness: 0.68,
          frequencyHz: 523.25,
          id: 'high-release',
          velocity: 0.72,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-high-release' }
      );
    });

    const highLeadOscillator = createdContexts[0]?.oscillators[highStartOscillatorIndex];
    expect(highLeadOscillator).toBeDefined();

    act(() => {
      result.current.stopSustainedNote('glide-high-release', {
        brightness: 0.68,
        velocity: 0.72,
      });
    });

    const highReleaseStopTime = highLeadOscillator?.stop.mock.calls.at(-1)?.[0] ?? 0;

    expect(typeof lowReleaseStopTime).toBe('number');
    expect(typeof highReleaseStopTime).toBe('number');
    expect(lowReleaseStopTime).toBeGreaterThan(highReleaseStopTime);
  });

  it('fades sustained vibrato back to zero during note-off', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness: 0.84,
          frequencyHz: 261.63,
          id: 'release-vibrato',
          vibratoDepth: 1,
          velocity: 0.78,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-release-vibrato' }
      );
    });

    const lfoGainNode = createdContexts[0]?.gains[2];
    const filterNode = findSustainedFilterNode(createdContexts[0]);
    const lfoFilterGainNode = findGainNodeConnectedToTarget(
      createdContexts[0],
      filterNode?.frequency
    );
    const lfoFilterQGainNode = findGainNodeConnectedToTarget(createdContexts[0], filterNode?.Q);
    expect(lfoGainNode).toBeDefined();
    expect(lfoFilterGainNode).toBeDefined();
    expect(lfoFilterQGainNode).toBeDefined();
    expect(lfoGainNode?.gain.value).toBeGreaterThan(0);
    expect(lfoFilterGainNode?.gain.value).toBeGreaterThan(0);
    expect(lfoFilterQGainNode?.gain.value).toBeGreaterThan(0);

    act(() => {
      result.current.stopSustainedNote('glide-release-vibrato', {
        brightness: 0.84,
        velocity: 0.78,
      });
    });

    expect(lfoGainNode?.gain.setValueAtTime).toHaveBeenLastCalledWith(
      expect.any(Number),
      expect.any(Number)
    );
    expect(lfoGainNode?.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      0,
      expect.any(Number)
    );
    expect(lfoGainNode?.gain.value).toBe(0);
    expect(lfoFilterGainNode?.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      0,
      expect.any(Number)
    );
    expect(lfoFilterGainNode?.gain.value).toBe(0);
    expect(lfoFilterQGainNode?.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      0,
      expect.any(Number)
    );
    expect(lfoFilterQGainNode?.gain.value).toBe(0);
  });

  it('warms the sustained filter tail during note-off', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness: 0.94,
          frequencyHz: 392,
          id: 'release-filter',
          velocity: 0.92,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-release-filter' }
      );
    });

    const filterNode = createdContexts[0]?.createBiquadFilter.mock.results[0]?.value;
    expect(filterNode).toBeDefined();

    const preReleaseFrequency = filterNode?.frequency.value ?? 0;
    const preReleaseQ = filterNode?.Q.value ?? 0;

    act(() => {
      result.current.stopSustainedNote('glide-release-filter', {
        brightness: 0.94,
        velocity: 0.92,
      });
    });

    expect(filterNode?.frequency.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      filterNode?.frequency.value,
      expect.any(Number)
    );
    expect(filterNode?.Q.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      filterNode?.Q.value,
      expect.any(Number)
    );
    expect(filterNode?.frequency.value ?? 0).toBeLessThan(preReleaseFrequency);
    expect(filterNode?.Q.value ?? 0).toBeLessThan(preReleaseQ);
  });

  it('tightens sustained unison width during note-off', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness: 0.94,
          frequencyHz: 392,
          id: 'release-detune',
          velocity: 0.92,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-release-detune' }
      );
    });

    const lowerOscillator = createdContexts[0]?.oscillators[1];
    const upperOscillator = createdContexts[0]?.oscillators[3];
    expect(lowerOscillator).toBeDefined();
    expect(upperOscillator).toBeDefined();

    const preReleaseLowerDetune = lowerOscillator?.detune.value ?? 0;
    const preReleaseUpperDetune = upperOscillator?.detune.value ?? 0;

    act(() => {
      result.current.stopSustainedNote('glide-release-detune', {
        brightness: 0.94,
        velocity: 0.92,
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
    expect(Math.abs(lowerOscillator?.detune.value ?? 0)).toBeLessThan(
      Math.abs(preReleaseLowerDetune)
    );
    expect(Math.abs(upperOscillator?.detune.value ?? 0)).toBeLessThan(
      Math.abs(preReleaseUpperDetune)
    );
  });

  it('reduces sustained side-voice blend during note-off', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness: 0.92,
          frequencyHz: 392,
          id: 'release-blend',
          velocity: 0.88,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-release-blend' }
      );
    });

    const lowerBlendGainNode = findGainNodeByRampTarget(
      createdContexts[0],
      resolveExpectedSustainedLowerBlendGain(0.92, 392)
    );
    const upperBlendGainNode = findGainNodeByRampTarget(
      createdContexts[0],
      resolveExpectedSustainedUpperBlendGain(0.92, 392)
    );
    expect(lowerBlendGainNode).toBeDefined();
    expect(upperBlendGainNode).toBeDefined();

    const preReleaseLowerBlend = lowerBlendGainNode?.gain.value ?? 0;
    const preReleaseUpperBlend = upperBlendGainNode?.gain.value ?? 0;

    act(() => {
      result.current.stopSustainedNote('glide-release-blend', {
        brightness: 0.92,
        velocity: 0.88,
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
    expect(lowerBlendGainNode?.gain.value ?? 0).toBeLessThan(preReleaseLowerBlend);
    expect(upperBlendGainNode?.gain.value ?? 0).toBeLessThan(preReleaseUpperBlend);
  });

  it('recenters the sustained stereo image during note-off', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness: 0.88,
          frequencyHz: 392,
          id: 'release-pan',
          stereoPan: 0.54,
          velocity: 0.84,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-release-pan' }
      );
    });

    const dryPanner = findPannerNodeByRampTarget(createdContexts[0], 0.54);
    const reverbPanner = findPannerNodeByRampTarget(
      createdContexts[0],
      resolveExpectedSustainedReverbPan(0.54)
    );
    expect(dryPanner).toBeDefined();
    expect(reverbPanner).toBeDefined();

    const preReleaseDryPan = dryPanner?.pan.value ?? 0;
    const preReleaseReverbPan = reverbPanner?.pan.value ?? 0;

    act(() => {
      result.current.stopSustainedNote('glide-release-pan', {
        brightness: 0.88,
        velocity: 0.84,
      });
    });

    expect(dryPanner?.pan.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      dryPanner?.pan.value,
      expect.any(Number)
    );
    expect(reverbPanner?.pan.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      reverbPanner?.pan.value,
      expect.any(Number)
    );
    expect(Math.abs(dryPanner?.pan.value ?? 0)).toBeLessThan(Math.abs(preReleaseDryPan));
    expect(Math.abs(reverbPanner?.pan.value ?? 0)).toBeLessThan(
      Math.abs(preReleaseReverbPan)
    );
  });

  it('settles the sustained reverb send during note-off', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness: 0.9,
          frequencyHz: 392,
          id: 'release-reverb-send',
          velocity: 0.9,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-release-reverb-send' }
      );
    });

    const reverbSendGainNode = findGainNodeByRampTarget(
      createdContexts[0],
      resolveExpectedSustainedReverbSendGain(0.9, 0.9, 392)
    );
    expect(reverbSendGainNode).toBeDefined();

    const preReleaseSend = reverbSendGainNode?.gain.value ?? 0;

    act(() => {
      result.current.stopSustainedNote('glide-release-reverb-send', {
        brightness: 0.9,
        velocity: 0.9,
      });
    });

    expect(reverbSendGainNode?.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      reverbSendGainNode?.gain.value,
      expect.any(Number)
    );
    expect(reverbSendGainNode?.gain.value ?? 0).toBeLessThan(preReleaseSend);
  });
});
