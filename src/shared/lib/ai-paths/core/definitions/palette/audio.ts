import type { NodeDefinition } from '@/shared/contracts/ai-paths';
import {
  AUDIO_OSCILLATOR_INPUT_PORTS,
  AUDIO_OSCILLATOR_OUTPUT_PORTS,
  AUDIO_SPEAKER_INPUT_PORTS,
  AUDIO_SPEAKER_OUTPUT_PORTS,
} from '../../constants';
import { buildOptionalInputContracts, buildRequiredInputContracts } from '../utils';

export const audioPalette: NodeDefinition[] = [
  {
    type: 'audio_oscillator',
    title: 'Audio Oscillator',
    description: 'Generate a waveform signal (sine/square/triangle/sawtooth).',
    inputs: AUDIO_OSCILLATOR_INPUT_PORTS,
    outputs: AUDIO_OSCILLATOR_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(AUDIO_OSCILLATOR_INPUT_PORTS),
    config: {
      audioOscillator: {
        waveform: 'sine',
        frequencyHz: 440,
        gain: 0.25,
        durationMs: 400,
      },
    },
  },
  {
    type: 'audio_speaker',
    title: 'Audio Speaker (Mono)',
    description: 'Play incoming audio signals in local runtime.',
    inputs: AUDIO_SPEAKER_INPUT_PORTS,
    outputs: AUDIO_SPEAKER_OUTPUT_PORTS,
    inputContracts: buildRequiredInputContracts(AUDIO_SPEAKER_INPUT_PORTS, ['audioSignal']),
    config: {
      audioSpeaker: {
        enabled: true,
        autoPlay: true,
        gain: 1,
        stopPrevious: true,
      },
    },
  },
];
