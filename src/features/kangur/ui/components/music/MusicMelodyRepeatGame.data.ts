import type { KangurAccent } from '@/features/kangur/ui/design/tokens';

import type { DiatonicNoteId } from './music-theory';

export type MusicMelodyRepeatRound = {
  accent: KangurAccent;
  id: string;
  notes: readonly DiatonicNoteId[];
};

export const MUSIC_MELODY_REPEAT_ROUNDS: readonly MusicMelodyRepeatRound[] = [
  {
    accent: 'sky',
    id: 'small_climb',
    notes: ['do', 're', 'mi'],
  },
  {
    accent: 'violet',
    id: 'small_descent',
    notes: ['sol', 'fa', 'mi', 're'],
  },
  {
    accent: 'emerald',
    id: 'open_chord',
    notes: ['do', 'mi', 'sol', 'mi'],
  },
  {
    accent: 'amber',
    id: 'echo_pattern',
    notes: ['mi', 'fa', 'sol', 'fa', 'mi'],
  },
  {
    accent: 'rose',
    id: 'long_climb',
    notes: ['do', 're', 'mi', 'fa', 'sol', 'la'],
  },
] as const;
