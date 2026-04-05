export type KangurMusicSynthEnvelope = {
  attackMs: number;
  decayMs: number;
  releaseMs: number;
  sustainLevel: number;
};

export type KangurMusicPlayableNote<NoteId extends string = string> = {
  brightness?: number;
  durationMs?: number;
  envelope?: KangurMusicSynthEnvelope;
  frequencyHz: number;
  gain?: number;
  id: NoteId;
  stereoPan?: number;
  velocity?: number;
  vibratoDepth?: number;
  vibratoRateHz?: number;
  waveform?: OscillatorType;
};

export type KangurMusicSequenceCallbacks<NoteId extends string> = {
  gapMs?: number;
  onComplete?: (completed: boolean) => void;
  onStepStart?: (note: KangurMusicPlayableNote<NoteId>, index: number) => void;
};

export type ActiveNode = {
  blendGainNode?: GainNode;
  blendGainNode3?: GainNode;
  context: AudioContext;
  filterNode?: BiquadFilterNode;
  gainNode: GainNode;
  lfoFilterGainNode?: GainNode;
  lfoFilterQGainNode?: GainNode;
  lfoGainNode?: GainNode;
  lfoOscillator?: OscillatorNode;
  oscillator: OscillatorNode;
  oscillator2?: OscillatorNode;
  oscillator3?: OscillatorNode;
  reverbSendGainNode?: GainNode;
  reverbStereoPannerNode?: StereoPannerNode;
  stereoPannerNode?: StereoPannerNode;
  transientGainNode?: GainNode;
  transientOscillator?: OscillatorNode;
  waveShaperNode?: WaveShaperNode;
};

export type SustainedNode<NoteId extends string = string> = ActiveNode & {
  baseGain: number;
  brightness: number;
  currentFrequencyHz: number;
  envelope?: KangurMusicSynthEnvelope;
  id: NoteId;
  interactionId: string;
  stereoPan: number;
  velocity: number;
  vibratoDepth: number;
  vibratoRateHz: number;
};

export type StopSustainedNoteOptions = {
  brightness?: number;
  immediate?: boolean;
  releaseSeconds?: number;
  velocity?: number;
};

export type ReverbChain = {
  convolver: ConvolverNode;
  outputGain: GainNode;
};

export const DEFAULT_DURATION_MS = 420;
export const DEFAULT_GAIN = 0.20;
export const DEFAULT_GAP_MS = 110;
export const ATTACK_MS = 12;
export const DEFAULT_VELOCITY = 0.72;
export const DEFAULT_VIBRATO_RATE_HZ = 5.2;
export const SUSTAINED_RELEASE_SECONDS = 0.06;
export const MAX_TRANSIENT_POLYPHONY = 6;
export const MAX_SUSTAINED_POLYPHONY = 4;
export const VOICE_STEAL_RELEASE_SECONDS = 0.03;

export const KANGUR_DEFAULT_MUSIC_SYNTH_ENVELOPE: KangurMusicSynthEnvelope = {
  attackMs: 12,
  decayMs: 0,
  releaseMs: 90,
  sustainLevel: 1,
};
