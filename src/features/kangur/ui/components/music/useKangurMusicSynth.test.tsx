/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class MockOscillatorNode {
  readonly detune = {
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
    expect(lfoGainNode).toBeDefined();
    expect(lfoOscillator).toBeDefined();
    expect(lfoGainNode?.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, expect.any(Number));

    act(() => {
      result.current.updateSustainedNote({
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

    const stereoPannerNode = createdContexts[0]?.panners[0];
    expect(stereoPannerNode).toBeDefined();
    expect(stereoPannerNode?.pan.setValueAtTime).toHaveBeenCalledWith(-0.34, expect.any(Number));

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

    const thirdBlendGainNode = createdContexts[0]?.gains[3];
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

    const reverbSendGainNode = createdContexts[0]?.gains.at(-1);
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
