import { type AiNode } from '@/shared/contracts/ai-paths';

const DEFAULT_AUDIO_OSCILLATOR_CONFIG = {
  waveform: 'sine',
  frequencyHz: 440,
  gain: 0.25,
  durationMs: 400,
} as const;

const DEFAULT_AUDIO_SPEAKER_CONFIG = {
  enabled: true,
  autoPlay: true,
  gain: 1,
  stopPrevious: true,
} as const;

export const normalizeAudioOscillatorNode = (node: AiNode): AiNode => ({
  ...node,
  config: {
    ...node.config,
    audioOscillator: {
      ...DEFAULT_AUDIO_OSCILLATOR_CONFIG,
      ...(node.config?.audioOscillator ?? {}),
    },
  },
});

export const normalizeAudioSpeakerNode = (node: AiNode): AiNode => ({
  ...node,
  config: {
    ...node.config,
    audioSpeaker: {
      ...DEFAULT_AUDIO_SPEAKER_CONFIG,
      ...(node.config?.audioSpeaker ?? {}),
    },
  },
});
