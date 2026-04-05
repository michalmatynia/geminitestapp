import { describe, expect, it } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';
import { normalizeNodes } from '@/shared/lib/ai-paths/core/normalization';

const buildAudioNode = (type: 'audio_oscillator' | 'audio_speaker', config: Record<string, unknown>): AiNode =>
  ({
    id: `${type}-node-1`,
    type,
    title: type,
    description: '',
    position: { x: 0, y: 0 },
    data: {},
    inputs: [],
    outputs: ['result'],
    config,
  }) as AiNode;

describe('audio node normalization', () => {
  it('applies default oscillator config values', () => {
    const [normalized] = normalizeNodes([
      buildAudioNode('audio_oscillator', {
        audioOscillator: {
          frequencyHz: 880,
        },
      }),
    ]);

    expect(normalized?.config?.audioOscillator).toEqual({
      waveform: 'sine',
      frequencyHz: 880,
      gain: 0.25,
      durationMs: 400,
    });
  });

  it('applies default speaker config values', () => {
    const [normalized] = normalizeNodes([
      buildAudioNode('audio_speaker', {
        audioSpeaker: {
          autoPlay: false,
        },
      }),
    ]);

    expect(normalized?.config?.audioSpeaker).toEqual({
      enabled: true,
      autoPlay: false,
      gain: 1,
      stopPrevious: true,
    });
  });
});
