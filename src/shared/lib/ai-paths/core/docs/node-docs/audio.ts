import { COMMON_RUNTIME_FIELDS } from '../node-docs.constants';

import type { NodeConfigDocField } from '../node-docs.types';

export const audioOscillatorDocs: NodeConfigDocField[] = [
  {
    path: 'audioOscillator.waveform',
    description: 'Wave shape for generated signal: sine/square/triangle/sawtooth.',
    defaultValue: 'sine',
  },
  {
    path: 'audioOscillator.frequencyHz',
    description: 'Signal frequency in Hz.',
    defaultValue: '440',
  },
  {
    path: 'audioOscillator.gain',
    description: 'Signal amplitude in 0..1 range.',
    defaultValue: '0.25',
  },
  {
    path: 'audioOscillator.durationMs',
    description: 'Playback duration in milliseconds.',
    defaultValue: '400',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const audioSpeakerDocs: NodeConfigDocField[] = [
  {
    path: 'audioSpeaker.enabled',
    description: 'If false, speaker stays muted and reports disabled status.',
    defaultValue: 'true',
  },
  {
    path: 'audioSpeaker.autoPlay',
    description: 'If true, plays incoming audio signal immediately.',
    defaultValue: 'true',
  },
  {
    path: 'audioSpeaker.gain',
    description: 'Speaker output gain multiplier in 0..1 range.',
    defaultValue: '1',
  },
  {
    path: 'audioSpeaker.stopPrevious',
    description: 'Stop existing tone before playing the next signal.',
    defaultValue: 'true',
  },
  ...COMMON_RUNTIME_FIELDS,
];
