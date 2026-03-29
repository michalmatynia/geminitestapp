/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import * as synthSupport from './useKangurMusicSynth.test-support';

const {
  createdContexts,
  findGainNodeConnectedToTarget,
  findSustainedFilterNode,
  findTransientGainNodeByInitialValue,
  isApproximately,
  resolveExpectedSustainedTransientDurationSeconds,
  resolveExpectedSustainedTransientFrequencyHz,
  resolveExpectedVibratoFilterDepthHz,
  resolveExpectedVibratoFilterQDepth,
} = synthSupport;

const useKangurMusicSynth = <T extends string>() => synthSupport.useKangurMusicSynth<T>();

describe('useKangurMusicSynth', () => {
  synthSupport.registerUseKangurMusicSynthTestLifecycle();

  it('lets piano notes overlap instead of cutting the earlier voice immediately', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.playNote({
        durationMs: 520,
        frequencyHz: 261.63,
        id: 'do',
        velocity: 0.68,
      });
    });

    const context = createdContexts[0];
    expect(context).toBeDefined();
    const firstPrimaryOscillator = context?.oscillators[0];
    expect(firstPrimaryOscillator).toBeDefined();

    await act(async () => {
      await result.current.playNote({
        durationMs: 520,
        frequencyHz: 293.66,
        id: 're',
        velocity: 0.78,
      });
    });

    expect(firstPrimaryOscillator?.disconnect).not.toHaveBeenCalled();
    expect(firstPrimaryOscillator?.stop).toHaveBeenCalledTimes(1);
  });

  it('steals the oldest transient piano voice after the overlap limit is reached', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    for (const [index, frequencyHz] of [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88].entries()) {
      await act(async () => {
        await result.current.playNote({
          durationMs: 640,
          frequencyHz,
          id: `note-${index}`,
          velocity: 0.76,
        });
      });
    }

    const oldestPrimaryOscillator = createdContexts[0]?.oscillators[0];

    expect(oldestPrimaryOscillator).toBeDefined();
    expect(
      oldestPrimaryOscillator?.stop.mock.calls.some(
        ([when]) => typeof when === 'number' && when <= 0.05
      )
    ).toBe(true);
  });

  it('steals the oldest sustained synth glide when touch polyphony exceeds the cap', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    for (const [index, frequencyHz] of [261.63, 293.66, 329.63, 349.23, 392].entries()) {
      await act(async () => {
        await result.current.startSustainedNote(
          {
            brightness: 0.72,
            frequencyHz,
            id: `note-${index}`,
            velocity: 0.8,
            waveform: 'sawtooth',
          },
          { interactionId: `glide-${index}` }
        );
      });
    }

    expect(
      result.current.updateSustainedNote({
        frequencyHz: 280,
        interactionId: 'glide-0',
      })
    ).toBe(false);
    expect(
      result.current.updateSustainedNote({
        frequencyHz: 410,
        interactionId: 'glide-4',
      })
    ).toBe(true);
  });

  it('ramps sustained vibrato depth when the gesture updates vertically', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          frequencyHz: 261.63,
          id: 'do',
          vibratoDepth: 0,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-vibrato' }
      );
    });

    const lfoGainNode = createdContexts[0]?.gains[2];
    const lfoOscillator = createdContexts[0]?.oscillators[2];
    const filterNode = findSustainedFilterNode(createdContexts[0]);
    const lfoFilterGainNode = findGainNodeConnectedToTarget(
      createdContexts[0],
      filterNode?.frequency
    );
    const lfoFilterQGainNode = findGainNodeConnectedToTarget(createdContexts[0], filterNode?.Q);
    expect(lfoGainNode).toBeDefined();
    expect(lfoOscillator).toBeDefined();
    expect(lfoFilterGainNode).toBeDefined();
    expect(lfoFilterQGainNode).toBeDefined();
    expect(lfoGainNode?.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, expect.any(Number));
    expect(lfoFilterGainNode?.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0,
      expect.any(Number)
    );
    expect(lfoFilterQGainNode?.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0,
      expect.any(Number)
    );

    act(() => {
      result.current.updateSustainedNote({
        brightness: 0.92,
        frequencyHz: 261.63,
        interactionId: 'glide-vibrato',
        vibratoDepth: 1,
        vibratoRateHz: 6.8,
      });
    });

    const lastRampTarget =
      lfoGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    expect(typeof lastRampTarget).toBe('number');
    expect(lastRampTarget).toBeGreaterThan(0);
    expect(lfoOscillator?.frequency.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      6.8,
      expect.any(Number)
    );
    expect(lfoFilterGainNode?.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      resolveExpectedVibratoFilterDepthHz(0.92, 261.63, 1),
      expect.any(Number)
    );
    expect(lfoFilterQGainNode?.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      resolveExpectedVibratoFilterQDepth(0.92, 261.63, 1),
      expect.any(Number)
    );
  });

  it('keeps sustained vibrato depth more controlled for higher synth notes', async () => {
    const lowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await lowHook.result.current.startSustainedNote(
        {
          frequencyHz: 196,
          id: 'vibrato-low',
          vibratoDepth: 1,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-vibrato-low' }
      );
    });

    const lowLfoGainNode = createdContexts.at(-1)?.gains[2];
    expect(lowLfoGainNode).toBeDefined();
    const lowDepthTarget =
      lowLfoGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[0] ?? 0;

    lowHook.unmount();
    const highHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await highHook.result.current.startSustainedNote(
        {
          frequencyHz: 523.25,
          id: 'vibrato-high',
          vibratoDepth: 1,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-vibrato-high' }
      );
    });

    const highLfoGainNode = createdContexts.at(-1)?.gains[2];
    expect(highLfoGainNode).toBeDefined();
    const highDepthTarget =
      highLfoGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[0] ?? 0;

    expect(highDepthTarget).toBeLessThan(lowDepthTarget * 2.5);
  });

  it('fades sustained vibrato in faster for higher synth notes', async () => {
    const lowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await lowHook.result.current.startSustainedNote(
        {
          frequencyHz: 196,
          id: 'vibrato-fade-low',
          vibratoDepth: 1,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-vibrato-fade-low' }
      );
    });

    const lowLfoGainNode = createdContexts.at(-1)?.gains[2];
    expect(lowLfoGainNode).toBeDefined();
    const lowFadeInTime =
      lowLfoGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;

    lowHook.unmount();
    const highHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await highHook.result.current.startSustainedNote(
        {
          frequencyHz: 523.25,
          id: 'vibrato-fade-high',
          vibratoDepth: 1,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-vibrato-fade-high' }
      );
    });

    const highLfoGainNode = createdContexts.at(-1)?.gains[2];
    expect(highLfoGainNode).toBeDefined();
    const highFadeInTime =
      highLfoGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;

    expect(lowFadeInTime).toBeGreaterThan(highFadeInTime);
  });

  it('adds a short attack transient when a sustained synth note starts', async () => {
    const { result } = renderHook(() => useKangurMusicSynth<string>());
    const targetFrequencyHz = 261.63;
    const expectedTransientFrequencyHz =
      resolveExpectedSustainedTransientFrequencyHz(targetFrequencyHz);

    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness: 0.86,
          frequencyHz: targetFrequencyHz,
          id: 'do',
          velocity: 0.84,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-attack' }
      );
    });

    const transientOscillator = createdContexts[0]?.oscillators.find((oscillator) => {
      const targetCall = oscillator.frequency.setValueAtTime.mock.calls.find(
        ([value]) => value === expectedTransientFrequencyHz
      );
      const shortStopCall = oscillator.stop.mock.calls.find(
        ([when]) => typeof when === 'number' && when <= 0.05
      );
      return Boolean(targetCall && shortStopCall);
    });
    expect(transientOscillator).toBeDefined();
    expect(transientOscillator?.start).toHaveBeenCalledWith(expect.any(Number));
    expect(transientOscillator?.stop).toHaveBeenCalledWith(expect.any(Number));
    const transientStopTime = transientOscillator?.stop.mock.calls.at(-1)?.[0] ?? 0;
    expect(typeof transientStopTime).toBe('number');
    expect(transientStopTime).toBeLessThanOrEqual(0.05);
  });

  it('softens the sustained attack transient for higher synth notes', async () => {
    const brightness = 0.86;
    const velocity = 0.84;
    const lowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await lowHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: 196,
          id: 'attack-low',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-attack-low' }
      );
    });

    const lowTransientGainNodes = findTransientGainNodeByInitialValue(createdContexts.at(-1));
    expect(lowTransientGainNodes.length).toBeGreaterThan(0);
    const lowTransientGain =
      lowTransientGainNodes.at(-1)?.gain.setValueAtTime.mock.calls[0]?.[0] ?? 0;

    lowHook.unmount();
    const highHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await highHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: 523.25,
          id: 'attack-high',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-attack-high' }
      );
    });

    const highTransientGainNodes = findTransientGainNodeByInitialValue(createdContexts.at(-1));
    expect(highTransientGainNodes.length).toBeGreaterThan(0);
    const highTransientGain =
      highTransientGainNodes.at(-1)?.gain.setValueAtTime.mock.calls[0]?.[0] ?? 0;

    expect(highTransientGain).toBeLessThan(lowTransientGain);
  });

  it('uses a cleaner transient waveform for bright higher synth notes', async () => {
    const brightness = 0.86;
    const velocity = 0.84;
    const lowExpectedTransientFrequencyHz = resolveExpectedSustainedTransientFrequencyHz(196);
    const lowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await lowHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: 196,
          id: 'attack-wave-low',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-attack-wave-low' }
      );
    });

    const lowTransientOscillator = createdContexts.at(-1)?.oscillators.find((oscillator) =>
      oscillator.frequency.setValueAtTime.mock.calls.some(
        ([value]) => value === lowExpectedTransientFrequencyHz
      )
    );
    expect(lowTransientOscillator).toBeDefined();

    lowHook.unmount();
    const highHook = renderHook(() => useKangurMusicSynth<string>());
    const highExpectedTransientFrequencyHz = resolveExpectedSustainedTransientFrequencyHz(523.25);

    await act(async () => {
      await highHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: 523.25,
          id: 'attack-wave-high',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-attack-wave-high' }
      );
    });

    const highTransientOscillator = createdContexts.at(-1)?.oscillators.find((oscillator) =>
      oscillator.frequency.setValueAtTime.mock.calls.some(
        ([value]) => value === highExpectedTransientFrequencyHz
      )
    );
    expect(highTransientOscillator).toBeDefined();

    expect(lowTransientOscillator?.type).toBe('square');
    expect(highTransientOscillator?.type).toBe('triangle');
  });

  it('moves the sustained attack transient closer for higher synth notes', async () => {
    const brightness = 0.86;
    const velocity = 0.84;
    const lowFrequencyHz = 196;
    const highFrequencyHz = 523.25;
    const lowExpectedTransientFrequencyHz =
      resolveExpectedSustainedTransientFrequencyHz(lowFrequencyHz);
    const lowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await lowHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: lowFrequencyHz,
          id: 'attack-partial-low',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-attack-partial-low' }
      );
    });

    const lowTransientOscillator = createdContexts.at(-1)?.oscillators.find((oscillator) =>
      oscillator.frequency.setValueAtTime.mock.calls.some(
        ([value]) => value === lowExpectedTransientFrequencyHz
      )
    );
    expect(lowTransientOscillator).toBeDefined();

    lowHook.unmount();
    const highHook = renderHook(() => useKangurMusicSynth<string>());
    const highExpectedTransientFrequencyHz =
      resolveExpectedSustainedTransientFrequencyHz(highFrequencyHz);

    await act(async () => {
      await highHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: highFrequencyHz,
          id: 'attack-partial-high',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-attack-partial-high' }
      );
    });

    const highTransientOscillator = createdContexts.at(-1)?.oscillators.find((oscillator) =>
      oscillator.frequency.setValueAtTime.mock.calls.some(
        ([value]) => value === highExpectedTransientFrequencyHz
      )
    );
    expect(highTransientOscillator).toBeDefined();

    const lowPartialRatio =
      (lowTransientOscillator?.frequency.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0) /
      lowFrequencyHz;
    const highPartialRatio =
      (highTransientOscillator?.frequency.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0) /
      highFrequencyHz;

    expect(highPartialRatio).toBeLessThan(lowPartialRatio);
  });

  it('shortens the sustained attack transient for higher synth notes', async () => {
    const brightness = 0.86;
    const velocity = 0.84;
    const lowFrequencyHz = 196;
    const highFrequencyHz = 523.25;
    const lowExpectedTransientFrequencyHz =
      resolveExpectedSustainedTransientFrequencyHz(lowFrequencyHz);
    const lowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await lowHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: lowFrequencyHz,
          id: 'attack-duration-low',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-attack-duration-low' }
      );
    });

    const lowTransientOscillator = createdContexts.at(-1)?.oscillators.find((oscillator) => {
      const targetCall = oscillator.frequency.setValueAtTime.mock.calls.find(
        ([value]) => value === lowExpectedTransientFrequencyHz
      );
      const shortStopCall = oscillator.stop.mock.calls.find(
        ([when]) => typeof when === 'number' && when <= 0.06
      );
      return Boolean(targetCall && shortStopCall);
    });
    expect(lowTransientOscillator).toBeDefined();
    const lowTransientStopTime = lowTransientOscillator?.stop.mock.calls.at(-1)?.[0] ?? 0;

    lowHook.unmount();
    const highHook = renderHook(() => useKangurMusicSynth<string>());
    const highExpectedTransientFrequencyHz =
      resolveExpectedSustainedTransientFrequencyHz(highFrequencyHz);

    await act(async () => {
      await highHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: highFrequencyHz,
          id: 'attack-duration-high',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-attack-duration-high' }
      );
    });

    const highTransientOscillator = createdContexts.at(-1)?.oscillators.find((oscillator) => {
      const targetCall = oscillator.frequency.setValueAtTime.mock.calls.find(
        ([value]) => value === highExpectedTransientFrequencyHz
      );
      const shortStopCall = oscillator.stop.mock.calls.find(
        ([when]) => typeof when === 'number' && when <= 0.06
      );
      return Boolean(targetCall && shortStopCall);
    });
    expect(highTransientOscillator).toBeDefined();
    const highTransientStopTime = highTransientOscillator?.stop.mock.calls.at(-1)?.[0] ?? 0;

    expect(lowTransientStopTime).toBeGreaterThan(highTransientStopTime);
  });

  it('shortens the sustained attack transient for brighter synth starts at the same pitch', async () => {
    const velocity = 0.84;
    const frequencyHz = 261.63;
    const expectedTransientFrequencyHz = resolveExpectedSustainedTransientFrequencyHz(frequencyHz);
    const mellowBrightness = 0.24;
    const brightBrightness = 0.92;
    const mellowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await mellowHook.result.current.startSustainedNote(
        {
          brightness: mellowBrightness,
          frequencyHz,
          id: 'attack-duration-mellow',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-attack-duration-mellow' }
      );
    });

    const mellowTransientOscillator = createdContexts.at(-1)?.oscillators.find((oscillator) => {
      const targetCall = oscillator.frequency.setValueAtTime.mock.calls.find(
        ([value]) => value === expectedTransientFrequencyHz
      );
      const expectedStopTime =
        resolveExpectedSustainedTransientDurationSeconds(mellowBrightness, frequencyHz) + 0.005;
      const shortStopCall = oscillator.stop.mock.calls.find(
        ([when]) => typeof when === 'number' && isApproximately(when, expectedStopTime, 0.001)
      );
      return Boolean(targetCall && shortStopCall);
    });
    expect(mellowTransientOscillator).toBeDefined();
    const mellowTransientStopTime =
      mellowTransientOscillator?.stop.mock.calls.at(-1)?.[0] ?? 0;

    mellowHook.unmount();
    const brightHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await brightHook.result.current.startSustainedNote(
        {
          brightness: brightBrightness,
          frequencyHz,
          id: 'attack-duration-bright',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-attack-duration-bright' }
      );
    });

    const brightTransientOscillator = createdContexts.at(-1)?.oscillators.find((oscillator) => {
      const targetCall = oscillator.frequency.setValueAtTime.mock.calls.find(
        ([value]) => value === expectedTransientFrequencyHz
      );
      const expectedStopTime =
        resolveExpectedSustainedTransientDurationSeconds(brightBrightness, frequencyHz) + 0.005;
      const shortStopCall = oscillator.stop.mock.calls.find(
        ([when]) => typeof when === 'number' && isApproximately(when, expectedStopTime, 0.001)
      );
      return Boolean(targetCall && shortStopCall);
    });
    expect(brightTransientOscillator).toBeDefined();
    const brightTransientStopTime =
      brightTransientOscillator?.stop.mock.calls.at(-1)?.[0] ?? 0;

    expect(mellowTransientStopTime).toBeGreaterThan(brightTransientStopTime);
  });

  it('shortens the sustained body attack for higher synth notes', async () => {
    const brightness = 0.86;
    const velocity = 0.84;
    const lowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await lowHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: 196,
          id: 'body-attack-low',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-body-attack-low' }
      );
    });

    const lowGainNode = createdContexts.at(-1)?.gains[1];
    expect(lowGainNode).toBeDefined();
    const lowAttackTime = lowGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;

    lowHook.unmount();
    const highHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await highHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: 523.25,
          id: 'body-attack-high',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-body-attack-high' }
      );
    });

    const highGainNode = createdContexts.at(-1)?.gains[1];
    expect(highGainNode).toBeDefined();
    const highAttackTime =
      highGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;

    expect(lowAttackTime).toBeGreaterThan(highAttackTime);
  });
});
