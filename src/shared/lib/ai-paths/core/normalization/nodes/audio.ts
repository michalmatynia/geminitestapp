import { type AiNode } from '@/shared/contracts/ai-paths';

export const normalizeAudioOscillatorNode = (node: AiNode): AiNode => {
  return {
    ...node,
    config: {
      ...node.config,
      audioOscillator: {
        waveform: node.config?.audioOscillator?.waveform ?? 'sine',
        frequencyHz: node.config?.audioOscillator?.frequencyHz ?? 440,
        gain: node.config?.audioOscillator?.gain ?? 0.25,
        durationMs: node.config?.audioOscillator?.durationMs ?? 400,
      },
    },
  };
};

export const normalizeAudioSpeakerNode = (node: AiNode): AiNode => {
  return {
    ...node,
    config: {
      ...node.config,
      audioSpeaker: {
        enabled: node.config?.audioSpeaker?.enabled ?? true,
        autoPlay: node.config?.audioSpeaker?.autoPlay ?? true,
        gain: node.config?.audioSpeaker?.gain ?? 1,
        stopPrevious: node.config?.audioSpeaker?.stopPrevious ?? true,
      },
    },
  };
};
