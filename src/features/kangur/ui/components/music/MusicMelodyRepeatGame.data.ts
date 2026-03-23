import type { KangurAccent } from '@/features/kangur/ui/design/tokens';

import type { DiatonicNoteId } from './music-theory';

export type MusicMelodyRepeatRound = {
  accent: KangurAccent;
  hint: string;
  id: string;
  notes: readonly DiatonicNoteId[];
  title: string;
};

export const MUSIC_MELODY_REPEAT_ROUNDS: readonly MusicMelodyRepeatRound[] = [
  {
    accent: 'sky',
    hint: 'Uslysz trzy dzwieki, ktore wspinaja sie po kolei.',
    id: 'small_climb',
    notes: ['do', 're', 'mi'],
    title: 'Melodia idzie w gore',
  },
  {
    accent: 'violet',
    hint: 'Teraz melodia schodzi spokojnie o stopien nizej.',
    id: 'small_descent',
    notes: ['sol', 'fa', 'mi', 're'],
    title: 'Melodia schodzi w dol',
  },
  {
    accent: 'emerald',
    hint: 'Posluchaj skoku od do do sol i wroc do domu.',
    id: 'open_chord',
    notes: ['do', 'mi', 'sol', 'mi'],
    title: 'Melodia skacze szerzej',
  },
  {
    accent: 'amber',
    hint: 'Srodkowy fragment wraca jak muzyczne echo.',
    id: 'echo_pattern',
    notes: ['mi', 'fa', 'sol', 'fa', 'mi'],
    title: 'Melodia robi echo',
  },
  {
    accent: 'rose',
    hint: 'Na koniec posluchaj dluzszego wejscia az do la.',
    id: 'long_climb',
    notes: ['do', 're', 'mi', 'fa', 'sol', 'la'],
    title: 'Dluzsza wspinaczka',
  },
] as const;

