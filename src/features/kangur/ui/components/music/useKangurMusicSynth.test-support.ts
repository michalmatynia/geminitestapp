/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, vi } from 'vitest';

export class MockOscillatorNode {
  readonly detune = {
    cancelScheduledValues: vi.fn(),
    linearRampToValueAtTime: vi.fn((value: number, _when?: number) => {
      this.detune.value = value;
    }),
    setValueAtTime: vi.fn((value: number, _when?: number) => {
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

export class MockGainNode {
  readonly gain = {
    cancelScheduledValues: vi.fn(),
    exponentialRampToValueAtTime: vi.fn((value: number, _when?: number) => {
      this.gain.value = value;
    }),
    linearRampToValueAtTime: vi.fn((value: number, _when?: number) => {
      this.gain.value = value;
    }),
    setValueAtTime: vi.fn((value: number, _when?: number) => {
      this.gain.value = value;
    }),
    value: 0.0001,
  };

  connect = vi.fn();
  disconnect = vi.fn();
}

export class MockBiquadFilterNode {
  readonly Q = {
    cancelScheduledValues: vi.fn(),
    linearRampToValueAtTime: vi.fn((value: number, _when?: number) => {
      this.Q.value = value;
    }),
    setValueAtTime: vi.fn((value: number, _when?: number) => {
      this.Q.value = value;
    }),
    value: 0,
  };

  readonly frequency = {
    cancelScheduledValues: vi.fn(),
    exponentialRampToValueAtTime: vi.fn((value: number, _when?: number) => {
      this.frequency.value = value;
    }),
    linearRampToValueAtTime: vi.fn((value: number, _when?: number) => {
      this.frequency.value = value;
    }),
    setValueAtTime: vi.fn((value: number, _when?: number) => {
      this.frequency.value = value;
    }),
    value: 0,
  };

  type: BiquadFilterType = 'lowpass';
  connect = vi.fn();
  disconnect = vi.fn();
}

export class MockDynamicsCompressorNode {
  readonly attack = { value: 0 };
  readonly knee = { value: 0 };
  readonly ratio = { value: 0 };
  readonly release = { value: 0 };
  readonly threshold = { value: 0 };

  connect = vi.fn();
  disconnect = vi.fn();
}

export class MockWaveShaperNode {
  curve: Float32Array | null = null;
  oversample: OverSampleType = 'none';
  connect = vi.fn();
  disconnect = vi.fn();
}

export class MockConvolverNode {
  buffer: AudioBuffer | null = null;
  normalize = false;
  connect = vi.fn();
  disconnect = vi.fn();
}

export class MockStereoPannerNode {
  readonly pan = {
    cancelScheduledValues: vi.fn(),
    linearRampToValueAtTime: vi.fn((value: number, _when?: number) => {
      this.pan.value = value;
    }),
    setValueAtTime: vi.fn((value: number, _when?: number) => {
      this.pan.value = value;
    }),
    value: 0,
  };

  connect = vi.fn();
  disconnect = vi.fn();
}

export class MockAudioBuffer {
  readonly channels: Float32Array[];

  constructor(numberOfChannels: number, length: number) {
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }

  getChannelData(channel: number): Float32Array {
    return this.channels[channel] ?? new Float32Array(0);
  }
}

export const createdContexts: MockAudioContext[] = [];

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const isApproximately = (
  value: number | undefined,
  target: number,
  epsilon = 0.001
): boolean => typeof value === 'number' && Math.abs(value - target) <= epsilon;

export const resolveExpectedSustainedLowerBlendGain = (
  brightness: number,
  frequencyHz: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return clamp(Number((0.18 + brightness * 0.16 - pitchTracking * 0.018).toFixed(3)), 0.16, 0.36);
};

export const resolveExpectedSustainedUpperBlendGain = (
  brightness: number,
  frequencyHz: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return clamp(Number((0.26 + brightness * 0.12 - pitchTracking * 0.024).toFixed(3)), 0.22, 0.4);
};

export const resolveExpectedSustainedAttackDetune = (
  brightness: number,
  velocity: number,
  frequencyHz: number
): { lowerCents: number; upperCents: number } => {
  const expressiveWidth = clamp(brightness * 0.58 + velocity * 0.42, 0, 1);
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const widthScale = clamp(1 - pitchTracking * 0.12, 0.82, 1.12);
  const sustainLowerCents = Number(((-4.5 - expressiveWidth * 3.5) * widthScale).toFixed(1));
  const sustainUpperCents = Number(((6.5 + expressiveWidth * 4.5) * widthScale).toFixed(1));
  const bloomScale = clamp(
    0.7 - brightness * 0.07 - velocity * 0.05 - pitchTracking * 0.08,
    0.42,
    0.72
  );

  return {
    lowerCents: Number((sustainLowerCents * bloomScale).toFixed(1)),
    upperCents: Number((sustainUpperCents * bloomScale).toFixed(1)),
  };
};

export const resolveExpectedSustainedAttackBlendGains = (
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

export const resolveExpectedSustainedAttackSeconds = (
  baseAttackSeconds: number,
  frequencyHz: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return Number(clamp(baseAttackSeconds - pitchTracking * 0.0025, 0.006, 0.016).toFixed(3));
};

export const resolveExpectedVibratoFilterDepthHz = (
  brightness: number,
  frequencyHz: number,
  vibratoDepth = 0
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const depthScale = clamp(1 - pitchTracking * 0.1, 0.8, 1.12);
  return clamp((48 + brightness * 132) * clamp(vibratoDepth, 0, 1) * depthScale, 0, 220);
};

export const resolveExpectedVibratoFilterQDepth = (
  brightness: number,
  frequencyHz: number,
  vibratoDepth = 0
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const depthScale = clamp(1 - pitchTracking * 0.08, 0.82, 1.08);
  return Number(
    clamp((0.03 + brightness * 0.18) * clamp(vibratoDepth, 0, 1) * depthScale, 0, 0.28).toFixed(3)
  );
};

export const resolveExpectedSustainedUnisonBlendAttackSeconds = (
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

export const resolveExpectedSustainedTransientFrequencyHz = (frequencyHz: number): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const partialMultiplier = clamp(2.08 - pitchTracking * 0.14, 1.82, 2.2);
  return Number((frequencyHz * partialMultiplier).toFixed(2));
};

export const resolveExpectedSustainedTransientDurationSeconds = (
  brightness: number,
  frequencyHz: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const brightnessTightening = clamp(brightness * 0.004, 0.001, 0.004);
  return Number(clamp(0.042 - pitchTracking * 0.007 - brightnessTightening, 0.028, 0.05).toFixed(3));
};

export const resolveExpectedSustainedReverbPan = (stereoPan: number): number =>
  Number(clamp(stereoPan * 0.38, -0.28, 0.28).toFixed(2));

export const resolveExpectedSustainedAttackStereoPan = (
  stereoPan: number,
  frequencyHz: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const bloomScale = clamp(0.76 - pitchTracking * 0.1, 0.46, 0.78);
  return Number((stereoPan * bloomScale).toFixed(2));
};

export const resolveExpectedSustainedAttackPanSeconds = (
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

export const resolveExpectedSustainedReverbSendGain = (
  brightness: number,
  velocity: number,
  frequencyHz = 261.63
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return clamp(0.06 + brightness * 0.08 + velocity * 0.04 - pitchTracking * 0.012, 0.05, 0.2);
};

export const resolveExpectedSustainedVibratoReverbSendGain = (
  brightness: number,
  velocity: number,
  frequencyHz: number,
  vibratoDepth = 0
): number => {
  const baseSendGain = resolveExpectedSustainedReverbSendGain(brightness, velocity, frequencyHz);
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const depthScale = clamp(1 - pitchTracking * 0.06, 0.88, 1.08);
  const vibratoBoost = clamp(vibratoDepth, 0, 1) * (0.008 + brightness * 0.014) * depthScale;
  return clamp(Number((baseSendGain + vibratoBoost).toFixed(3)), 0.05, 0.22);
};

export const resolveExpectedSustainedAttackReverbSendGain = (
  brightness: number,
  velocity: number,
  frequencyHz = 261.63,
  vibratoDepth = 0
): number => {
  const sustainSendGain = resolveExpectedSustainedVibratoReverbSendGain(
    brightness,
    velocity,
    frequencyHz,
    vibratoDepth
  );
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const bloomScale = clamp(
    0.72 - brightness * 0.08 - velocity * 0.04 - pitchTracking * 0.08,
    0.44,
    0.74
  );
  return Number((sustainSendGain * bloomScale).toFixed(3));
};

export const resolveExpectedSustainedAttackReverbSendSeconds = (
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

export const findGainNodeByInitialValue = (
  context: MockAudioContext | undefined,
  target: number,
  epsilon = 0.001
): MockGainNode | undefined =>
  context?.gains.find((gainNode) =>
    isApproximately(gainNode.gain.setValueAtTime.mock.calls[0]?.[0], target, epsilon)
  );

export const findGainNodeByRampTarget = (
  context: MockAudioContext | undefined,
  target: number,
  epsilon = 0.001
): MockGainNode | undefined =>
  context?.gains.find((gainNode) =>
    gainNode.gain.linearRampToValueAtTime.mock.calls.some(([value]) =>
      isApproximately(value, target, epsilon)
    )
  );

export const findGainNodeConnectedToTarget = (
  context: MockAudioContext | undefined,
  target: unknown
): MockGainNode | undefined =>
  context?.gains.find((gainNode) =>
    gainNode.connect.mock.calls.some(([connectedTarget]) => connectedTarget === target)
  );

export const findPannerNodeByInitialValue = (
  context: MockAudioContext | undefined,
  target: number,
  epsilon = 0.001
): MockStereoPannerNode | undefined =>
  context?.panners.find((panner) =>
    isApproximately(panner.pan.setValueAtTime.mock.calls[0]?.[0], target, epsilon)
  );

export const findPannerNodeByRampTarget = (
  context: MockAudioContext | undefined,
  target: number,
  epsilon = 0.001
): MockStereoPannerNode | undefined =>
  context?.panners.find((panner) =>
    panner.pan.linearRampToValueAtTime.mock.calls.some(([value]) =>
      isApproximately(value, target, epsilon)
    )
  );

export const findSustainedFilterNode = (
  context: MockAudioContext | undefined
): MockBiquadFilterNode | undefined =>
  context?.createBiquadFilter.mock.results.find((result) => result.type === 'return')?.value as
    | MockBiquadFilterNode
    | undefined;

export const findTransientGainNodeByInitialValue = (
  context: MockAudioContext | undefined
): MockGainNode[] =>
  context?.gains.filter(
    (gainNode) =>
      gainNode.gain.exponentialRampToValueAtTime.mock.calls.some(
        ([value, when]) => value === 0.0001 && typeof when === 'number' && when <= 0.05
      ) &&
      (gainNode.gain.setValueAtTime.mock.calls[0]?.[0] ?? 0) > 0.01
  ) ?? [];

export class MockAudioContext {
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

export type UseKangurMusicSynthType =
  typeof import('@/features/kangur/ui/components/music/useKangurMusicSynth')['useKangurMusicSynth'];

export let useKangurMusicSynth: UseKangurMusicSynthType;

export function registerUseKangurMusicSynthTestLifecycle(): void {
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
}
