export type KangurMusicKeyboardMode = 'piano' | 'synth';
export type KangurMusicSynthGlideMode = 'continuous' | 'semitone';
export type KangurMusicSynthWaveform = 'sine' | 'triangle' | 'sawtooth' | 'square';

export type DiatonicNoteId =
  | 'do'
  | 're'
  | 'mi'
  | 'fa'
  | 'sol'
  | 'la'
  | 'si'
  | 'high_do';

export type KangurMusicPianoKeyDefinition<NoteId extends string = string> = {
  id: NoteId;
  ariaLabel: string;
  blockClassName: string;
  buttonClassName: string;
  frequencyHz: number;
  glowClassName: string;
  label: string;
  spokenLabel: string;
  shortLabel: string;
};

export const DIATONIC_PIANO_KEYS = [
  {
    id: 'do',
    ariaLabel: 'Dzwiek do',
    blockClassName: 'from-rose-200 via-rose-300 to-pink-400',
    buttonClassName:
      'from-rose-200 via-rose-300 to-pink-500 text-rose-950 shadow-rose-500/30 ring-rose-200/80',
    frequencyHz: 261.63,
    glowClassName: 'shadow-rose-400/55 ring-rose-300/90',
    label: 'do',
    spokenLabel: 'do',
    shortLabel: 'DO',
  },
  {
    id: 're',
    ariaLabel: 'Dzwiek re',
    blockClassName: 'from-orange-200 via-amber-300 to-amber-400',
    buttonClassName:
      'from-orange-200 via-amber-300 to-amber-500 text-amber-950 shadow-amber-500/30 ring-amber-200/80',
    frequencyHz: 293.66,
    glowClassName: 'shadow-amber-400/55 ring-amber-300/90',
    label: 're',
    spokenLabel: 're',
    shortLabel: 'RE',
  },
  {
    id: 'mi',
    ariaLabel: 'Dzwiek mi',
    blockClassName: 'from-emerald-200 via-emerald-300 to-lime-400',
    buttonClassName:
      'from-emerald-200 via-emerald-300 to-lime-500 text-emerald-950 shadow-emerald-500/30 ring-emerald-200/80',
    frequencyHz: 329.63,
    glowClassName: 'shadow-emerald-400/55 ring-emerald-300/90',
    label: 'mi',
    spokenLabel: 'mi',
    shortLabel: 'MI',
  },
  {
    id: 'fa',
    ariaLabel: 'Dzwiek fa',
    blockClassName: 'from-sky-200 via-sky-300 to-cyan-400',
    buttonClassName:
      'from-sky-200 via-sky-300 to-cyan-500 text-sky-950 shadow-sky-500/30 ring-sky-200/80',
    frequencyHz: 349.23,
    glowClassName: 'shadow-sky-400/55 ring-sky-300/90',
    label: 'fa',
    spokenLabel: 'fa',
    shortLabel: 'FA',
  },
  {
    id: 'sol',
    ariaLabel: 'Dzwiek sol',
    blockClassName: 'from-indigo-200 via-indigo-300 to-blue-500',
    buttonClassName:
      'from-indigo-200 via-indigo-300 to-blue-500 text-indigo-950 shadow-indigo-500/30 ring-indigo-200/80',
    frequencyHz: 392,
    glowClassName: 'shadow-indigo-400/55 ring-indigo-300/90',
    label: 'sol',
    spokenLabel: 'sol',
    shortLabel: 'SOL',
  },
  {
    id: 'la',
    ariaLabel: 'Dzwiek la',
    blockClassName: 'from-violet-200 via-violet-300 to-fuchsia-400',
    buttonClassName:
      'from-violet-200 via-violet-300 to-fuchsia-500 text-violet-950 shadow-violet-500/30 ring-violet-200/80',
    frequencyHz: 440,
    glowClassName: 'shadow-violet-400/55 ring-violet-300/90',
    label: 'la',
    spokenLabel: 'la',
    shortLabel: 'LA',
  },
  {
    id: 'si',
    ariaLabel: 'Dzwiek si',
    blockClassName: 'from-teal-200 via-teal-300 to-emerald-400',
    buttonClassName:
      'from-teal-200 via-teal-300 to-emerald-500 text-teal-950 shadow-teal-500/30 ring-teal-200/80',
    frequencyHz: 493.88,
    glowClassName: 'shadow-teal-400/55 ring-teal-300/90',
    label: 'si',
    spokenLabel: 'si',
    shortLabel: 'SI',
  },
  {
    id: 'high_do',
    ariaLabel: 'Wysokie do',
    blockClassName: 'from-pink-200 via-fuchsia-300 to-rose-400',
    buttonClassName:
      'from-pink-200 via-fuchsia-300 to-rose-500 text-rose-950 shadow-pink-500/30 ring-pink-200/80',
    frequencyHz: 523.25,
    glowClassName: 'shadow-pink-400/55 ring-pink-300/90',
    label: 'do+',
    spokenLabel: 'wysokie do',
    shortLabel: 'DO+',
  },
] as const satisfies ReadonlyArray<KangurMusicPianoKeyDefinition<DiatonicNoteId>>;

export const DIATONIC_SCALE_ASCENDING = DIATONIC_PIANO_KEYS.map((note) => note.id);

export const DIATONIC_PIANO_KEYS_BY_ID = Object.fromEntries(
  DIATONIC_PIANO_KEYS.map((note) => [note.id, note] as const)
) as Record<DiatonicNoteId, (typeof DIATONIC_PIANO_KEYS)[number]>;

export const DIATONIC_PREVIEW_MELODY = [
  'do',
  're',
  'mi',
  'fa',
  'sol',
  'la',
  'si',
  'high_do',
] as const satisfies ReadonlyArray<DiatonicNoteId>;

export const MAX_SYNTH_GLIDE_SEMITONES = 2;
export const KANGUR_MUSIC_SYNTH_WAVEFORMS = [
  'sine',
  'triangle',
  'sawtooth',
  'square',
] as const satisfies ReadonlyArray<KangurMusicSynthWaveform>;

export const KANGUR_MUSIC_SYNTH_WAVEFORM_LABELS: Record<KangurMusicSynthWaveform, string> = {
  sine: 'Sine',
  square: 'Square',
  sawtooth: 'Saw',
  triangle: 'Triangle',
};
export const KANGUR_MUSIC_SYNTH_GLIDE_MODES = [
  'continuous',
  'semitone',
] as const satisfies ReadonlyArray<KangurMusicSynthGlideMode>;

export const KANGUR_MUSIC_SYNTH_GLIDE_MODE_LABELS: Record<KangurMusicSynthGlideMode, string> = {
  continuous: 'Plynnie',
  semitone: 'Stopnie',
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const resolveSynthGlideSemitoneOffset = (
  normalizedVerticalPosition: number,
  maxGlideSemitones = MAX_SYNTH_GLIDE_SEMITONES
): number =>
  Number(
    (((0.5 - clamp(normalizedVerticalPosition, 0, 1)) * 2 * maxGlideSemitones).toFixed(2))
  );

export const resolveFrequencyWithSemitoneOffset = (
  baseFrequencyHz: number,
  semitoneOffset: number
): number => Number((baseFrequencyHz * 2 ** (semitoneOffset / 12)).toFixed(2));

export const resolveGlideSemitoneOffsetForMode = (
  semitoneOffset: number,
  glideMode: KangurMusicSynthGlideMode
): number =>
  glideMode === 'semitone' ? Number(Math.round(semitoneOffset).toFixed(2)) : semitoneOffset;

export type KangurMusicSynthOsc1Config = {
  volume: number;
  waveform: KangurMusicSynthWaveform;
};

export type KangurMusicSynthOsc2Config = {
  blend: number;
  detuneCents: number;
  enabled: boolean;
  waveform: KangurMusicSynthWaveform;
};

export const KANGUR_MUSIC_SYNTH_DEFAULT_OSC1_CONFIG: KangurMusicSynthOsc1Config = {
  volume: 1,
  waveform: 'sawtooth',
};

export const KANGUR_MUSIC_SYNTH_DEFAULT_OSC2_CONFIG: KangurMusicSynthOsc2Config = {
  blend: 0.3,
  detuneCents: 0,
  enabled: true,
  waveform: 'sine',
};
