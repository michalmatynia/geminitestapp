import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleAudioOscillator, handleAudioSpeaker } from '@/shared/lib/ai-paths/core/runtime/handlers/audio';
import { createMockContext } from '@/shared/lib/ai-paths/core/runtime/test-utils';

const AUDIO_STATE_KEY = '__AI_PATHS_AUDIO_PLAYBACK_STATE__';

class MockAudioParam {
  setValueAtTime = vi.fn();
}

class MockGainNode {
  gain = new MockAudioParam();
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockOscillatorNode {
  type: OscillatorType = 'sine';
  frequency = new MockAudioParam();
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
  onended: (() => void) | null = null;
}

class MockAudioContext {
  static nextInitialState: AudioContextState = 'running';
  static nextResumeImpl: (() => Promise<void>) | null = null;

  currentTime = 0;
  destination = {};
  state: AudioContextState;
  oscillators: MockOscillatorNode[] = [];
  gains: MockGainNode[] = [];

  constructor() {
    this.state = MockAudioContext.nextInitialState;
  }

  createOscillator = vi.fn(() => {
    const oscillator = new MockOscillatorNode();
    this.oscillators.push(oscillator);
    return oscillator as unknown as OscillatorNode;
  });

  createGain = vi.fn(() => {
    const gain = new MockGainNode();
    this.gains.push(gain);
    return gain as unknown as GainNode;
  });

  resume = vi.fn(async () => {
    if (MockAudioContext.nextResumeImpl) {
      await MockAudioContext.nextResumeImpl();
      return;
    }
    this.state = 'running';
  });
}

const resetAudioTestGlobals = (): void => {
  delete (globalThis as Record<string, unknown>).AudioContext;
  delete (globalThis as Record<string, unknown>).webkitAudioContext;
  delete (globalThis as Record<string, unknown>)[AUDIO_STATE_KEY];
  MockAudioContext.nextInitialState = 'running';
  MockAudioContext.nextResumeImpl = null;
};

describe('audio.shared-lib', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAudioTestGlobals();
  });

  afterEach(() => {
    resetAudioTestGlobals();
  });

  it('returns ready audio oscillator output with normalized signal values', () => {
    const result = handleAudioOscillator(
      createMockContext({
        node: {
          id: 'osc-node',
          type: 'audio_oscillator',
          title: 'Oscillator',
          description: '',
          inputs: [],
          outputs: [],
          position: { x: 0, y: 0 },
          config: {
            audioOscillator: {
              waveform: 'triangle',
              frequencyHz: 220,
              gain: 0.4,
              durationMs: 250,
            },
          },
        } as any,
      })
    );

    expect(result).toEqual(
      expect.objectContaining({
        status: 'ready',
        frequency: 220,
        waveform: 'triangle',
        gain: 0.4,
        durationMs: 250,
        audioSignal: expect.objectContaining({
          kind: 'oscillator',
          waveform: 'triangle',
        }),
      })
    );
  });

  it('plays speaker output when a running audio context is available', async () => {
    Object.defineProperty(globalThis, 'AudioContext', {
      configurable: true,
      value: MockAudioContext,
      writable: true,
    });

    const result = await handleAudioSpeaker(
      createMockContext({
        node: {
          id: 'speaker-node',
          type: 'audio_speaker',
          title: 'Speaker',
          description: '',
          inputs: [],
          outputs: [],
          position: { x: 0, y: 0 },
          config: {},
        } as any,
        nodeInputs: {
          audioSignal: {
            kind: 'oscillator',
            waveform: 'square',
            frequencyHz: 330,
            gain: 0.5,
            durationMs: 120,
          },
        },
      })
    );

    expect(result).toEqual(
      expect.objectContaining({
        status: 'playing',
        frequency: 330,
        waveform: 'square',
        gain: 0.5,
        durationMs: 120,
      })
    );
  });

  it('returns blocked_by_browser when resume leaves the context suspended', async () => {
    MockAudioContext.nextInitialState = 'suspended';
    MockAudioContext.nextResumeImpl = async () => {
      throw new Error('resume blocked');
    };

    Object.defineProperty(globalThis, 'AudioContext', {
      configurable: true,
      value: MockAudioContext,
      writable: true,
    });

    const result = await handleAudioSpeaker(
      createMockContext({
        node: {
          id: 'speaker-node',
          type: 'audio_speaker',
          title: 'Speaker',
          description: '',
          inputs: [],
          outputs: [],
          position: { x: 0, y: 0 },
          config: {},
        } as any,
        nodeInputs: {
          audioSignal: {
            kind: 'oscillator',
            waveform: 'sine',
            frequencyHz: 440,
            gain: 0.25,
            durationMs: 100,
          },
        },
      })
    );

    expect(result).toEqual(
      expect.objectContaining({
        status: 'blocked_by_browser',
      })
    );
  });

  it('returns unsupported_environment when no web audio constructor is available', async () => {
    const result = await handleAudioSpeaker(
      createMockContext({
        node: {
          id: 'speaker-node',
          type: 'audio_speaker',
          title: 'Speaker',
          description: '',
          inputs: [],
          outputs: [],
          position: { x: 0, y: 0 },
          config: {},
        } as any,
        nodeInputs: {
          audioSignal: {
            kind: 'oscillator',
            waveform: 'sine',
            frequencyHz: 440,
            gain: 0.25,
            durationMs: 100,
          },
        },
      })
    );

    expect(result).toEqual(
      expect.objectContaining({
        status: 'unsupported_environment',
      })
    );
  });
});
