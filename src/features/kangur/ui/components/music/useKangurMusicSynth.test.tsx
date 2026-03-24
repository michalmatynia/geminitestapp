/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class MockOscillatorNode {
  readonly detune = {
    cancelScheduledValues: vi.fn(),
    linearRampToValueAtTime: vi.fn((value: number) => {
      this.detune.value = value;
    }),
    setValueAtTime: vi.fn((value: number) => {
      this.detune.value = value;
    }),
    value: 0,
  };

  readonly frequency = {
    cancelScheduledValues: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    setValueAtTime: vi.fn(),
    value: 0,
  };

  onended: (() => void) | null = null;
  type: OscillatorType = 'triangle';
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn((when?: number) => {
    if (when === undefined || when <= 0) {
      this.onended?.();
    }
  });
}

class MockGainNode {
  readonly gain = {
    cancelScheduledValues: vi.fn(),
    exponentialRampToValueAtTime: vi.fn((value: number) => {
      this.gain.value = value;
    }),
    linearRampToValueAtTime: vi.fn((value: number) => {
      this.gain.value = value;
    }),
    setValueAtTime: vi.fn((value: number) => {
      this.gain.value = value;
    }),
    value: 0.0001,
  };

  connect = vi.fn();
  disconnect = vi.fn();
}

class MockBiquadFilterNode {
  readonly Q = {
    cancelScheduledValues: vi.fn(),
    linearRampToValueAtTime: vi.fn((value: number) => {
      this.Q.value = value;
    }),
    setValueAtTime: vi.fn((value: number) => {
      this.Q.value = value;
    }),
    value: 0,
  };

  readonly frequency = {
    cancelScheduledValues: vi.fn(),
    exponentialRampToValueAtTime: vi.fn((value: number) => {
      this.frequency.value = value;
    }),
    linearRampToValueAtTime: vi.fn((value: number) => {
      this.frequency.value = value;
    }),
    setValueAtTime: vi.fn((value: number) => {
      this.frequency.value = value;
    }),
    value: 0,
  };

  type: BiquadFilterType = 'lowpass';
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockDynamicsCompressorNode {
  readonly attack = {
    value: 0,
  };

  readonly knee = {
    value: 0,
  };

  readonly ratio = {
    value: 0,
  };

  readonly release = {
    value: 0,
  };

  readonly threshold = {
    value: 0,
  };

  connect = vi.fn();
  disconnect = vi.fn();
}

class MockWaveShaperNode {
  curve: Float32Array | null = null;
  oversample: OverSampleType = 'none';
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockConvolverNode {
  buffer: AudioBuffer | null = null;
  normalize = false;
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockStereoPannerNode {
  readonly pan = {
    cancelScheduledValues: vi.fn(),
    linearRampToValueAtTime: vi.fn((value: number) => {
      this.pan.value = value;
    }),
    setValueAtTime: vi.fn((value: number) => {
      this.pan.value = value;
    }),
    value: 0,
  };

  connect = vi.fn();
  disconnect = vi.fn();
}

class MockAudioBuffer {
  readonly channels: Float32Array[];

  constructor(numberOfChannels: number, length: number) {
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }

  getChannelData(channel: number): Float32Array {
    return this.channels[channel] ?? new Float32Array(0);
  }
}

const createdContexts: MockAudioContext[] = [];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const isApproximately = (value: number | undefined, target: number, epsilon = 0.001): boolean =>
  typeof value === 'number' && Math.abs(value - target) <= epsilon;

const resolveExpectedSustainedLowerBlendGain = (
  brightness: number,
  frequencyHz: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return clamp(Number((0.18 + brightness * 0.16 - pitchTracking * 0.018).toFixed(3)), 0.16, 0.36);
};

const resolveExpectedSustainedUpperBlendGain = (
  brightness: number,
  frequencyHz: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return clamp(Number((0.26 + brightness * 0.12 - pitchTracking * 0.024).toFixed(3)), 0.22, 0.4);
};

const resolveExpectedSustainedAttackDetune = (
  brightness: number,
  velocity: number,
  frequencyHz: number
): { lowerCents: number; upperCents: number } => {
  const expressiveWidth = clamp(brightness * 0.58 + velocity * 0.42, 0, 1);
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const widthScale = clamp(1 - pitchTracking * 0.12, 0.82, 1.12);
  const sustainLowerCents = Number(((-4.5 - expressiveWidth * 3.5) * widthScale).toFixed(1));
  const sustainUpperCents = Number(((6.5 + expressiveWidth * 4.5) * widthScale).toFixed(1));
  const bloomScale = clamp(0.7 - brightness * 0.07 - velocity * 0.05 - pitchTracking * 0.08, 0.42, 0.72);

  return {
    lowerCents: Number((sustainLowerCents * bloomScale).toFixed(1)),
    upperCents: Number((sustainUpperCents * bloomScale).toFixed(1)),
  };
};

const resolveExpectedSustainedAttackBlendGains = (
  brightness: number,
  frequencyHz: number
): { lowerGain: number; upperGain: number } => {
  const sustainLowerGain = resolveExpectedSustainedLowerBlendGain(brightness, frequencyHz);
  const sustainUpperGain = resolveExpectedSustainedUpperBlendGain(brightness, frequencyHz);
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const bloomScale = clamp(0.72 - brightness * 0.08 - pitchTracking * 0.09, 0.42, 0.74);

  return {
    lowerGain: Number((sustainLowerGain * bloomScale).toFixed(3)),
    upperGain: Number((sustainUpperGain * bloomScale).toFixed(3)),
  };
};

const resolveExpectedSustainedAttackSeconds = (baseAttackSeconds: number, frequencyHz: number): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return Number(clamp(baseAttackSeconds - pitchTracking * 0.0025, 0.006, 0.016).toFixed(3));
};

const resolveExpectedVibratoFilterDepthHz = (
  brightness: number,
  frequencyHz: number,
  vibratoDepth = 0
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const depthScale = clamp(1 - pitchTracking * 0.1, 0.8, 1.12);
  return clamp((48 + brightness * 132) * clamp(vibratoDepth, 0, 1) * depthScale, 0, 220);
};

const resolveExpectedSustainedUnisonBlendAttackSeconds = (
  baseAttackSeconds: number,
  brightness: number,
  frequencyHz: number
): number => {
  const sustainedAttackSeconds = resolveExpectedSustainedAttackSeconds(
    baseAttackSeconds,
    frequencyHz
  );
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const bloomSeconds =
    sustainedAttackSeconds + 0.0035 - brightness * 0.003 - pitchTracking * 0.0015;
  return Number(clamp(bloomSeconds, 0.006, 0.018).toFixed(3));
};

const resolveExpectedSustainedTransientFrequencyHz = (frequencyHz: number): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const partialMultiplier = clamp(2.08 - pitchTracking * 0.14, 1.82, 2.2);
  return Number((frequencyHz * partialMultiplier).toFixed(2));
};

const resolveExpectedSustainedTransientDurationSeconds = (
  brightness: number,
  frequencyHz: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const brightnessTightening = clamp(brightness * 0.004, 0.001, 0.004);
  return Number(clamp(0.042 - pitchTracking * 0.007 - brightnessTightening, 0.028, 0.05).toFixed(3));
};

const resolveExpectedSustainedReverbPan = (stereoPan: number): number =>
  Number((clamp(stereoPan * 0.38, -0.28, 0.28)).toFixed(2));

const resolveExpectedSustainedAttackStereoPan = (
  stereoPan: number,
  frequencyHz: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const bloomScale = clamp(0.76 - pitchTracking * 0.1, 0.46, 0.78);
  return Number((stereoPan * bloomScale).toFixed(2));
};

const resolveExpectedSustainedAttackPanSeconds = (
  baseAttackSeconds: number,
  frequencyHz: number,
  stereoPan: number,
  wet = false
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const wetLagSeconds = wet ? clamp(0.01 - pitchTracking * 0.0015, 0.007, 0.011) : 0;
  const spreadLagSeconds = Math.abs(stereoPan) * (wet ? 0.006 : 0.004);
  return Number(clamp(baseAttackSeconds + wetLagSeconds + spreadLagSeconds, 0.006, 0.03).toFixed(3));
};

const resolveExpectedSustainedReverbSendGain = (
  brightness: number,
  velocity: number,
  frequencyHz = 261.63
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return clamp(0.06 + brightness * 0.08 + velocity * 0.04 - pitchTracking * 0.012, 0.05, 0.2);
};

const resolveExpectedSustainedAttackReverbSendGain = (
  brightness: number,
  velocity: number,
  frequencyHz = 261.63
): number => {
  const sustainSendGain = resolveExpectedSustainedReverbSendGain(
    brightness,
    velocity,
    frequencyHz
  );
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const bloomScale = clamp(
    0.72 - brightness * 0.08 - velocity * 0.04 - pitchTracking * 0.08,
    0.44,
    0.74
  );
  return Number((sustainSendGain * bloomScale).toFixed(3));
};

const resolveExpectedSustainedAttackReverbSendSeconds = (
  baseAttackSeconds: number,
  brightness: number,
  frequencyHz: number,
  stereoPan: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const wetLagSeconds = clamp(0.01 - brightness * 0.003 - pitchTracking * 0.0015, 0.006, 0.011);
  const spreadLagSeconds = Math.abs(stereoPan) * 0.006;
  return Number(clamp(baseAttackSeconds + wetLagSeconds + spreadLagSeconds, 0.012, 0.03).toFixed(3));
};

const findGainNodeByInitialValue = (
  context: MockAudioContext | undefined,
  target: number,
  epsilon = 0.001
): MockGainNode | undefined =>
  context?.gains.find((gainNode) => isApproximately(gainNode.gain.setValueAtTime.mock.calls[0]?.[0], target, epsilon));

const findGainNodeByRampTarget = (
  context: MockAudioContext | undefined,
  target: number,
  epsilon = 0.001
): MockGainNode | undefined =>
  context?.gains.find((gainNode) =>
    gainNode.gain.linearRampToValueAtTime.mock.calls.some(([value]) =>
      isApproximately(value, target, epsilon)
    )
  );

const findGainNodeConnectedToTarget = (
  context: MockAudioContext | undefined,
  target: unknown
): MockGainNode | undefined =>
  context?.gains.find((gainNode) =>
    gainNode.connect.mock.calls.some(([connectedTarget]) => connectedTarget === target)
  );

const findPannerNodeByInitialValue = (
  context: MockAudioContext | undefined,
  target: number,
  epsilon = 0.001
): MockStereoPannerNode | undefined =>
  context?.panners.find((panner) =>
    isApproximately(panner.pan.setValueAtTime.mock.calls[0]?.[0], target, epsilon)
  );

const findPannerNodeByRampTarget = (
  context: MockAudioContext | undefined,
  target: number,
  epsilon = 0.001
): MockStereoPannerNode | undefined =>
  context?.panners.find((panner) =>
    panner.pan.linearRampToValueAtTime.mock.calls.some(([value]) =>
      isApproximately(value, target, epsilon)
    )
  );

const findSustainedFilterNode = (context: MockAudioContext | undefined): MockBiquadFilterNode | undefined =>
  context?.createBiquadFilter.mock.results.find((result) => result.type === 'return')?.value as
    | MockBiquadFilterNode
    | undefined;

const findTransientGainNodeByInitialValue = (
  context: MockAudioContext | undefined
): MockGainNode[] =>
  context?.gains.filter(
    (gainNode) =>
      gainNode.gain.exponentialRampToValueAtTime.mock.calls.some(
        ([value, when]) => value === 0.0001 && typeof when === 'number' && when <= 0.05
      ) &&
      (gainNode.gain.setValueAtTime.mock.calls[0]?.[0] ?? 0) > 0.01
  ) ?? [];

class MockAudioContext {
  currentTime = 0;
  destination = {};
  readonly gains: MockGainNode[] = [];
  readonly oscillators: MockOscillatorNode[] = [];
  readonly panners: MockStereoPannerNode[] = [];
  sampleRate = 44_100;
  state: AudioContextState = 'running';

  constructor() {
    createdContexts.push(this);
  }

  createBuffer = vi.fn(
    (numberOfChannels: number, length: number, _sampleRate: number) =>
      new MockAudioBuffer(numberOfChannels, length) as unknown as AudioBuffer
  );

  close = vi.fn(async () => {
    this.state = 'closed';
  });

  createBiquadFilter = vi.fn(() => new MockBiquadFilterNode() as unknown as BiquadFilterNode);

  createConvolver = vi.fn(() => new MockConvolverNode() as unknown as ConvolverNode);

  createDynamicsCompressor = vi.fn(
    () => new MockDynamicsCompressorNode() as unknown as DynamicsCompressorNode
  );

  createGain = vi.fn(() => {
    const gainNode = new MockGainNode();
    this.gains.push(gainNode);
    return gainNode as unknown as GainNode;
  });

  createOscillator = vi.fn(() => {
    const oscillator = new MockOscillatorNode();
    this.oscillators.push(oscillator);
    return oscillator as unknown as OscillatorNode;
  });

  createStereoPanner = vi.fn(() => {
    const panner = new MockStereoPannerNode();
    this.panners.push(panner);
    return panner as unknown as StereoPannerNode;
  });

  createWaveShaper = vi.fn(() => new MockWaveShaperNode() as unknown as WaveShaperNode);

  resume = vi.fn(async () => {
    this.state = 'running';
  });
}

type UseKangurMusicSynthType =
  typeof import('@/features/kangur/ui/components/music/useKangurMusicSynth')['useKangurMusicSynth'];

describe('useKangurMusicSynth', () => {
  let useKangurMusicSynth: UseKangurMusicSynthType;

  beforeEach(async () => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.resetModules();
    createdContexts.length = 0;
    Object.defineProperty(globalThis, 'AudioContext', {
      configurable: true,
      value: MockAudioContext,
      writable: true,
    });
    Object.defineProperty(globalThis, 'webkitAudioContext', {
      configurable: true,
      value: MockAudioContext,
      writable: true,
    });
    ({ useKangurMusicSynth } = await import(
      '@/features/kangur/ui/components/music/useKangurMusicSynth'
    ));
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as Partial<typeof globalThis>).AudioContext;
    delete (globalThis as Partial<typeof globalThis> & { webkitAudioContext?: unknown })
      .webkitAudioContext;
  });

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
    expect(lfoGainNode).toBeDefined();
    expect(lfoOscillator).toBeDefined();
    expect(lfoFilterGainNode).toBeDefined();
    expect(lfoGainNode?.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, expect.any(Number));
    expect(lfoFilterGainNode?.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
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

  it('starts sustained side-voice blend tighter for higher synth notes', async () => {
    const brightness = 0.52;
    const velocity = 0.6;
    const lowFrequencyHz = 196;
    const baseAttackSeconds = 0.012 * (1.16 - velocity * 0.48);
    const lowExpectedAttackBlendGains = resolveExpectedSustainedAttackBlendGains(
      brightness,
      lowFrequencyHz
    );
    const lowExpectedSustainLowerBlend = resolveExpectedSustainedLowerBlendGain(
      brightness,
      lowFrequencyHz
    );
    const lowExpectedSustainUpperBlend = resolveExpectedSustainedUpperBlendGain(
      brightness,
      lowFrequencyHz
    );
    const lowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await lowHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: lowFrequencyHz,
          id: 'blend-attack-low',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-blend-attack-low' }
      );
    });

    const lowLowerBlendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      lowExpectedSustainLowerBlend
    );
    const lowUpperBlendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      lowExpectedSustainUpperBlend
    );
    expect(lowLowerBlendGainNode).toBeDefined();
    expect(lowUpperBlendGainNode).toBeDefined();

    const lowLowerAttackBlend =
      lowLowerBlendGainNode?.gain.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const lowUpperAttackBlend =
      lowUpperBlendGainNode?.gain.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const lowLowerBlendAttackTime =
      lowLowerBlendGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;
    const lowExpectedBlendAttackTime = resolveExpectedSustainedUnisonBlendAttackSeconds(
      baseAttackSeconds,
      brightness,
      lowFrequencyHz
    );

    expect(lowLowerAttackBlend).toBe(lowExpectedAttackBlendGains.lowerGain);
    expect(lowUpperAttackBlend).toBe(lowExpectedAttackBlendGains.upperGain);
    expect(lowLowerAttackBlend).toBeLessThan(lowExpectedSustainLowerBlend);
    expect(lowUpperAttackBlend).toBeLessThan(lowExpectedSustainUpperBlend);
    expect(lowLowerBlendAttackTime).toBe(lowExpectedBlendAttackTime);

    lowHook.unmount();
    const highFrequencyHz = 523.25;
    const highExpectedAttackBlendGains = resolveExpectedSustainedAttackBlendGains(
      brightness,
      highFrequencyHz
    );
    const highExpectedSustainLowerBlend = resolveExpectedSustainedLowerBlendGain(
      brightness,
      highFrequencyHz
    );
    const highExpectedSustainUpperBlend = resolveExpectedSustainedUpperBlendGain(
      brightness,
      highFrequencyHz
    );
    const highHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await highHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: highFrequencyHz,
          id: 'blend-attack-high',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-blend-attack-high' }
      );
    });

    const highLowerBlendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      highExpectedSustainLowerBlend
    );
    const highUpperBlendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      highExpectedSustainUpperBlend
    );
    expect(highLowerBlendGainNode).toBeDefined();
    expect(highUpperBlendGainNode).toBeDefined();

    const highLowerAttackBlend =
      highLowerBlendGainNode?.gain.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const highUpperAttackBlend =
      highUpperBlendGainNode?.gain.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const highLowerBlendAttackTime =
      highLowerBlendGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;
    const highExpectedBlendAttackTime = resolveExpectedSustainedUnisonBlendAttackSeconds(
      baseAttackSeconds,
      brightness,
      highFrequencyHz
    );

    expect(highLowerAttackBlend).toBe(highExpectedAttackBlendGains.lowerGain);
    expect(highUpperAttackBlend).toBe(highExpectedAttackBlendGains.upperGain);
    expect(highLowerAttackBlend).toBeLessThan(highExpectedSustainLowerBlend);
    expect(highUpperAttackBlend).toBeLessThan(highExpectedSustainUpperBlend);
    expect(highLowerBlendAttackTime).toBe(highExpectedBlendAttackTime);
    expect(lowLowerAttackBlend).toBeGreaterThan(highLowerAttackBlend);
    expect(lowUpperAttackBlend).toBeGreaterThan(highUpperAttackBlend);
    expect(lowLowerBlendAttackTime).toBeGreaterThan(highLowerBlendAttackTime);
  });

  it('starts sustained unison detune narrower for higher synth notes', async () => {
    const brightness = 0.52;
    const velocity = 0.6;
    const lowFrequencyHz = 196;
    const lowExpectedAttackDetune = resolveExpectedSustainedAttackDetune(
      brightness,
      velocity,
      lowFrequencyHz
    );
    const lowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await lowHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: lowFrequencyHz,
          id: 'detune-attack-low',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-detune-attack-low' }
      );
    });

    const lowLowerOscillator = createdContexts.at(-1)?.oscillators[1];
    const lowUpperOscillator = createdContexts.at(-1)?.oscillators[3];
    expect(lowLowerOscillator).toBeDefined();
    expect(lowUpperOscillator).toBeDefined();

    const lowLowerAttackDetune =
      lowLowerOscillator?.detune.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const lowUpperAttackDetune =
      lowUpperOscillator?.detune.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const lowLowerSustainDetune =
      lowLowerOscillator?.detune.linearRampToValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const lowUpperSustainDetune =
      lowUpperOscillator?.detune.linearRampToValueAtTime.mock.calls.at(-1)?.[0] ?? 0;

    expect(lowLowerAttackDetune).toBe(lowExpectedAttackDetune.lowerCents);
    expect(lowUpperAttackDetune).toBe(lowExpectedAttackDetune.upperCents);
    expect(Math.abs(lowLowerAttackDetune)).toBeLessThan(Math.abs(lowLowerSustainDetune));
    expect(Math.abs(lowUpperAttackDetune)).toBeLessThan(Math.abs(lowUpperSustainDetune));

    lowHook.unmount();
    const highFrequencyHz = 523.25;
    const highExpectedAttackDetune = resolveExpectedSustainedAttackDetune(
      brightness,
      velocity,
      highFrequencyHz
    );
    const highHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await highHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: highFrequencyHz,
          id: 'detune-attack-high',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-detune-attack-high' }
      );
    });

    const highLowerOscillator = createdContexts.at(-1)?.oscillators[1];
    const highUpperOscillator = createdContexts.at(-1)?.oscillators[3];
    expect(highLowerOscillator).toBeDefined();
    expect(highUpperOscillator).toBeDefined();

    const highLowerAttackDetune =
      highLowerOscillator?.detune.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const highUpperAttackDetune =
      highUpperOscillator?.detune.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const highLowerSustainDetune =
      highLowerOscillator?.detune.linearRampToValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const highUpperSustainDetune =
      highUpperOscillator?.detune.linearRampToValueAtTime.mock.calls.at(-1)?.[0] ?? 0;

    expect(highLowerAttackDetune).toBe(highExpectedAttackDetune.lowerCents);
    expect(highUpperAttackDetune).toBe(highExpectedAttackDetune.upperCents);
    expect(Math.abs(highLowerAttackDetune)).toBeLessThan(Math.abs(highLowerSustainDetune));
    expect(Math.abs(highUpperAttackDetune)).toBeLessThan(Math.abs(highUpperSustainDetune));
    expect(Math.abs(lowLowerAttackDetune)).toBeGreaterThan(Math.abs(highLowerAttackDetune));
    expect(Math.abs(lowUpperAttackDetune)).toBeGreaterThan(Math.abs(highUpperAttackDetune));
  });

  it('blooms sustained side-voice blend faster for brighter synth starts at the same pitch', async () => {
    const velocity = 0.6;
    const frequencyHz = 261.63;
    const baseAttackSeconds = 0.012 * (1.16 - velocity * 0.48);
    const mellowBrightness = 0.24;
    const brightBrightness = 0.92;
    const mellowExpectedSustainLowerBlend = resolveExpectedSustainedLowerBlendGain(
      mellowBrightness,
      frequencyHz
    );
    const mellowExpectedSustainUpperBlend = resolveExpectedSustainedUpperBlendGain(
      mellowBrightness,
      frequencyHz
    );
    const mellowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await mellowHook.result.current.startSustainedNote(
        {
          brightness: mellowBrightness,
          frequencyHz,
          id: 'blend-bloom-mellow',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-blend-bloom-mellow' }
      );
    });

    const mellowLowerBlendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      mellowExpectedSustainLowerBlend
    );
    const mellowUpperBlendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      mellowExpectedSustainUpperBlend
    );
    expect(mellowLowerBlendGainNode).toBeDefined();
    expect(mellowUpperBlendGainNode).toBeDefined();

    const mellowLowerBlendAttackTime =
      mellowLowerBlendGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;
    const mellowUpperBlendAttackTime =
      mellowUpperBlendGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;
    const mellowExpectedBlendAttackTime = resolveExpectedSustainedUnisonBlendAttackSeconds(
      baseAttackSeconds,
      mellowBrightness,
      frequencyHz
    );

    expect(mellowLowerBlendAttackTime).toBe(mellowExpectedBlendAttackTime);
    expect(mellowUpperBlendAttackTime).toBe(mellowExpectedBlendAttackTime);

    mellowHook.unmount();
    const brightExpectedSustainLowerBlend = resolveExpectedSustainedLowerBlendGain(
      brightBrightness,
      frequencyHz
    );
    const brightExpectedSustainUpperBlend = resolveExpectedSustainedUpperBlendGain(
      brightBrightness,
      frequencyHz
    );
    const brightHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await brightHook.result.current.startSustainedNote(
        {
          brightness: brightBrightness,
          frequencyHz,
          id: 'blend-bloom-bright',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-blend-bloom-bright' }
      );
    });

    const brightLowerBlendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      brightExpectedSustainLowerBlend
    );
    const brightUpperBlendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      brightExpectedSustainUpperBlend
    );
    expect(brightLowerBlendGainNode).toBeDefined();
    expect(brightUpperBlendGainNode).toBeDefined();

    const brightLowerBlendAttackTime =
      brightLowerBlendGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;
    const brightUpperBlendAttackTime =
      brightUpperBlendGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;
    const brightExpectedBlendAttackTime = resolveExpectedSustainedUnisonBlendAttackSeconds(
      baseAttackSeconds,
      brightBrightness,
      frequencyHz
    );

    expect(brightLowerBlendAttackTime).toBe(brightExpectedBlendAttackTime);
    expect(brightUpperBlendAttackTime).toBe(brightExpectedBlendAttackTime);
    expect(mellowLowerBlendAttackTime).toBeGreaterThan(brightLowerBlendAttackTime);
    expect(mellowUpperBlendAttackTime).toBeGreaterThan(brightUpperBlendAttackTime);
  });

  it('starts sustained reverb send drier for higher synth notes', async () => {
    const brightness = 0.52;
    const velocity = 0.6;
    const lowFrequencyHz = 196;
    const lowExpectedSustainSend = resolveExpectedSustainedReverbSendGain(
      brightness,
      velocity,
      lowFrequencyHz
    );
    const lowExpectedAttackSend = resolveExpectedSustainedAttackReverbSendGain(
      brightness,
      velocity,
      lowFrequencyHz
    );
    const lowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await lowHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: lowFrequencyHz,
          id: 'reverb-attack-low',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-reverb-attack-low' }
      );
    });

    const lowReverbSendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      lowExpectedSustainSend
    );
    expect(lowReverbSendGainNode).toBeDefined();
    const lowAttackSend = lowReverbSendGainNode?.gain.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const lowSustainSend =
      lowReverbSendGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[0] ?? 0;

    expect(lowAttackSend).toBe(lowExpectedAttackSend);
    expect(lowAttackSend).toBeLessThan(lowSustainSend);

    lowHook.unmount();
    const highFrequencyHz = 523.25;
    const highExpectedSustainSend = resolveExpectedSustainedReverbSendGain(
      brightness,
      velocity,
      highFrequencyHz
    );
    const highExpectedAttackSend = resolveExpectedSustainedAttackReverbSendGain(
      brightness,
      velocity,
      highFrequencyHz
    );
    const highHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await highHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz: highFrequencyHz,
          id: 'reverb-attack-high',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-reverb-attack-high' }
      );
    });

    const highReverbSendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      highExpectedSustainSend
    );
    expect(highReverbSendGainNode).toBeDefined();
    const highAttackSend =
      highReverbSendGainNode?.gain.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const highSustainSend =
      highReverbSendGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[0] ?? 0;

    expect(highAttackSend).toBe(highExpectedAttackSend);
    expect(highAttackSend).toBeLessThan(highSustainSend);
    expect(lowAttackSend).toBeGreaterThan(highAttackSend);
  });

  it('starts sustained stereo pan closer to center for higher synth notes', async () => {
    const stereoPan = 0.54;
    const lowFrequencyHz = 196;
    const lowExpectedAttackPan = resolveExpectedSustainedAttackStereoPan(
      stereoPan,
      lowFrequencyHz
    );
    const lowHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await lowHook.result.current.startSustainedNote(
        {
          frequencyHz: lowFrequencyHz,
          id: 'pan-attack-low',
          stereoPan,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-pan-attack-low' }
      );
    });

    const lowDryPanner = findPannerNodeByRampTarget(createdContexts.at(-1), stereoPan);
    expect(lowDryPanner).toBeDefined();
    const lowAttackPan = lowDryPanner?.pan.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const lowSustainPan = lowDryPanner?.pan.linearRampToValueAtTime.mock.calls.at(-1)?.[0] ?? 0;

    expect(lowAttackPan).toBe(lowExpectedAttackPan);
    expect(Math.abs(lowAttackPan)).toBeLessThan(Math.abs(lowSustainPan));

    lowHook.unmount();
    const highFrequencyHz = 523.25;
    const highExpectedAttackPan = resolveExpectedSustainedAttackStereoPan(
      stereoPan,
      highFrequencyHz
    );
    const highHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await highHook.result.current.startSustainedNote(
        {
          frequencyHz: highFrequencyHz,
          id: 'pan-attack-high',
          stereoPan,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-pan-attack-high' }
      );
    });

    const highDryPanner = findPannerNodeByRampTarget(createdContexts.at(-1), stereoPan);
    expect(highDryPanner).toBeDefined();
    const highAttackPan = highDryPanner?.pan.setValueAtTime.mock.calls.at(-1)?.[0] ?? 0;
    const highSustainPan =
      highDryPanner?.pan.linearRampToValueAtTime.mock.calls.at(-1)?.[0] ?? 0;

    expect(highAttackPan).toBe(highExpectedAttackPan);
    expect(Math.abs(highAttackPan)).toBeLessThan(Math.abs(highSustainPan));
    expect(Math.abs(lowAttackPan)).toBeGreaterThan(Math.abs(highAttackPan));
  });

  it('blooms sustained stereo pan a bit slower at wider placements', async () => {
    const frequencyHz = 261.63;
    const velocity = 0.72;
    const brightness = 0.79;
    const baseAttackSeconds = 0.012 * (1.16 - velocity * 0.48);
    const expectedUnisonAttackSeconds = resolveExpectedSustainedUnisonBlendAttackSeconds(
      baseAttackSeconds,
      brightness,
      frequencyHz
    );
    const centerStereoPan = 0.18;
    const centerExpectedAttackTime = resolveExpectedSustainedAttackPanSeconds(
      expectedUnisonAttackSeconds,
      frequencyHz,
      centerStereoPan
    );
    const centerHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await centerHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz,
          id: 'pan-center',
          stereoPan: centerStereoPan,
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-pan-center' }
      );
    });

    const centerDryPanner = findPannerNodeByRampTarget(
      createdContexts.at(-1),
      centerStereoPan
    );
    expect(centerDryPanner).toBeDefined();
    const centerAttackTime =
      centerDryPanner?.pan.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;
    expect(centerAttackTime).toBe(centerExpectedAttackTime);

    centerHook.unmount();
    const edgeStereoPan = 0.54;
    const edgeExpectedAttackTime = resolveExpectedSustainedAttackPanSeconds(
      expectedUnisonAttackSeconds,
      frequencyHz,
      edgeStereoPan
    );
    const edgeHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await edgeHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz,
          id: 'pan-edge',
          stereoPan: edgeStereoPan,
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-pan-edge' }
      );
    });

    const edgeDryPanner = findPannerNodeByRampTarget(createdContexts.at(-1), edgeStereoPan);
    expect(edgeDryPanner).toBeDefined();
    const edgeAttackTime =
      edgeDryPanner?.pan.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;
    expect(edgeAttackTime).toBe(edgeExpectedAttackTime);
    expect(edgeAttackTime).toBeGreaterThan(centerAttackTime);
  });

  it('blooms sustained reverb send a bit slower at wider placements', async () => {
    const brightness = 0.79;
    const velocity = 0.72;
    const frequencyHz = 261.63;
    const baseAttackSeconds = 0.012 * (1.16 - velocity * 0.48);
    const expectedUnisonAttackSeconds = resolveExpectedSustainedUnisonBlendAttackSeconds(
      baseAttackSeconds,
      brightness,
      frequencyHz
    );
    const centerStereoPan = 0.18;
    const centerExpectedAttackTime = resolveExpectedSustainedAttackReverbSendSeconds(
      expectedUnisonAttackSeconds,
      brightness,
      frequencyHz,
      centerStereoPan
    );
    const centerExpectedSustainSend = resolveExpectedSustainedReverbSendGain(
      brightness,
      velocity,
      frequencyHz
    );
    const centerHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await centerHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz,
          id: 'reverb-send-center',
          stereoPan: centerStereoPan,
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-reverb-send-center' }
      );
    });

    const centerReverbSendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      centerExpectedSustainSend
    );
    expect(centerReverbSendGainNode).toBeDefined();
    const centerAttackTime =
      centerReverbSendGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;
    expect(centerAttackTime).toBe(centerExpectedAttackTime);

    centerHook.unmount();
    const edgeStereoPan = 0.54;
    const edgeExpectedAttackTime = resolveExpectedSustainedAttackReverbSendSeconds(
      expectedUnisonAttackSeconds,
      brightness,
      frequencyHz,
      edgeStereoPan
    );
    const edgeExpectedSustainSend = resolveExpectedSustainedReverbSendGain(
      brightness,
      velocity,
      frequencyHz
    );
    const edgeHook = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await edgeHook.result.current.startSustainedNote(
        {
          brightness,
          frequencyHz,
          id: 'reverb-send-edge',
          stereoPan: edgeStereoPan,
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-reverb-send-edge' }
      );
    });

    const edgeReverbSendGainNode = findGainNodeByRampTarget(
      createdContexts.at(-1),
      edgeExpectedSustainSend
    );
    expect(edgeReverbSendGainNode).toBeDefined();
    const edgeAttackTime =
      edgeReverbSendGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;
    expect(edgeAttackTime).toBe(edgeExpectedAttackTime);
    expect(edgeAttackTime).toBeGreaterThan(centerAttackTime);
  });

  it('lets the sustained reverb send bloom slightly after the dry body on note-on', async () => {
    const brightness = 0.79;
    const velocity = 0.72;
    const frequencyHz = 261.63;
    const baseAttackSeconds = 0.012 * (1.16 - velocity * 0.48);
    const expectedBodyAttackSeconds = resolveExpectedSustainedAttackSeconds(
      baseAttackSeconds,
      frequencyHz
    );
    const expectedUnisonAttackSeconds = resolveExpectedSustainedUnisonBlendAttackSeconds(
      baseAttackSeconds,
      brightness,
      frequencyHz
    );
    const expectedReverbSendAttackSeconds = resolveExpectedSustainedAttackReverbSendSeconds(
      expectedUnisonAttackSeconds,
      brightness,
      frequencyHz,
      0
    );
    const expectedSustainSend = resolveExpectedSustainedReverbSendGain(
      brightness,
      velocity,
      frequencyHz
    );
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness,
          frequencyHz,
          id: 'reverb-send-bloom',
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-reverb-send-bloom' }
      );
    });

    const bodyGainNode = createdContexts[0]?.gains[1];
    const reverbSendGainNode = findGainNodeByRampTarget(createdContexts[0], expectedSustainSend);
    expect(bodyGainNode).toBeDefined();
    expect(reverbSendGainNode).toBeDefined();

    const bodyAttackTime = bodyGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;
    const reverbSendAttackTime =
      reverbSendGainNode?.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;

    expect(bodyAttackTime).toBe(expectedBodyAttackSeconds);
    expect(reverbSendAttackTime).toBe(expectedReverbSendAttackSeconds);
    expect(reverbSendAttackTime).toBeGreaterThan(bodyAttackTime);
  });

  it('lets the sustained reverb pan bloom slightly after the dry image on note-on', async () => {
    const stereoPan = -0.34;
    const frequencyHz = 261.63;
    const velocity = 0.72;
    const baseAttackSeconds = 0.012 * (1.16 - velocity * 0.48);
    const expectedUnisonAttackSeconds = resolveExpectedSustainedUnisonBlendAttackSeconds(
      baseAttackSeconds,
      0.79,
      frequencyHz
    );
    const expectedDryPanAttackTime = resolveExpectedSustainedAttackPanSeconds(
      expectedUnisonAttackSeconds,
      frequencyHz,
      stereoPan
    );
    const expectedWetPanAttackTime = resolveExpectedSustainedAttackPanSeconds(
      expectedUnisonAttackSeconds,
      frequencyHz,
      stereoPan,
      true
    );
    const { result } = renderHook(() => useKangurMusicSynth<string>());

    await act(async () => {
      await result.current.startSustainedNote(
        {
          brightness: 0.79,
          frequencyHz,
          id: 'pan-bloom',
          stereoPan,
          velocity,
          waveform: 'sawtooth',
        },
        { interactionId: 'glide-pan-bloom' }
      );
    });

    const dryPanner = findPannerNodeByRampTarget(createdContexts[0], stereoPan);
    const reverbPanner = findPannerNodeByRampTarget(
      createdContexts[0],
      resolveExpectedSustainedReverbPan(stereoPan)
    );
    expect(dryPanner).toBeDefined();
    expect(reverbPanner).toBeDefined();

    const dryAttackTime = dryPanner?.pan.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;
    const wetAttackTime = reverbPanner?.pan.linearRampToValueAtTime.mock.calls.at(-1)?.[1] ?? 0;

    expect(dryAttackTime).toBe(expectedDryPanAttackTime);
    expect(wetAttackTime).toBe(expectedWetPanAttackTime);
    expect(wetAttackTime).toBeGreaterThan(dryAttackTime);
  });

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
    expect(lfoGainNode).toBeDefined();
    expect(lfoFilterGainNode).toBeDefined();
    expect(lfoGainNode?.gain.value).toBeGreaterThan(0);
    expect(lfoFilterGainNode?.gain.value).toBeGreaterThan(0);

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

    const filterNode = createdContexts[0]?.createBiquadFilter.mock.results[0]?.value as
      | MockBiquadFilterNode
      | undefined;
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
    expect(Math.abs(lowerOscillator?.detune.value ?? 0)).toBeLessThan(Math.abs(preReleaseLowerDetune));
    expect(Math.abs(upperOscillator?.detune.value ?? 0)).toBeLessThan(Math.abs(preReleaseUpperDetune));
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

    expect((lowerOscillator?.detune.value ?? 0)).toBeLessThan(initialLowerDetune);
    expect((upperOscillator?.detune.value ?? 0)).toBeGreaterThan(initialUpperDetune);
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
    const lowSettleTime = lowFilterNode?.frequency.linearRampToValueAtTime.mock.calls[0]?.[1] ?? 0;

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
});
