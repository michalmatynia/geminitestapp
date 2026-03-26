import type { KangurAccent } from '@/features/kangur/ui/design/tokens';

export type LogicalPatternTile = {
  id: string;
  value: string;
  label: string;
  accent?: KangurAccent;
  kind?: 'emoji' | 'number' | 'letter';
};

export type LogicalPatternCell =
  | { type: 'fixed'; tileId: string }
  | { type: 'blank'; id: string; correctValue: string };

export type LogicalPatternRound = {
  id: string;
  title: string;
  prompt: string;
  ruleHint: string;
  ruleSummary: string;
  stepHint: string;
  pool: string[];
  sequence: LogicalPatternCell[];
};

export type LogicalPatternSetId = 'logical_patterns_workshop' | 'alphabet_letter_order';

export const LOGICAL_PATTERNS_WORKSHOP_TILES: Record<string, LogicalPatternTile> = {
  tri_a: { id: 'tri_a', value: 'triangle', label: '🔺', accent: 'rose', kind: 'emoji' },
  circle_a: { id: 'circle_a', value: 'circle', label: '🔵', accent: 'sky', kind: 'emoji' },
  circle_b: { id: 'circle_b', value: 'circle', label: '🔵', accent: 'sky', kind: 'emoji' },
  diamond_a: { id: 'diamond_a', value: 'diamond', label: '🔷', accent: 'violet', kind: 'emoji' },
  star_a: { id: 'star_a', value: 'star', label: '⭐', accent: 'amber', kind: 'emoji' },
  star_b: { id: 'star_b', value: 'star', label: '⭐', accent: 'amber', kind: 'emoji' },
  star_c: { id: 'star_c', value: 'star', label: '⭐', accent: 'amber', kind: 'emoji' },
  moon_a: { id: 'moon_a', value: 'moon', label: '🌙', accent: 'violet', kind: 'emoji' },
  square_green: {
    id: 'square_green',
    value: 'green_square',
    label: '🟩',
    accent: 'emerald',
    kind: 'emoji',
  },
  square_red: { id: 'square_red', value: 'red_square', label: '🟥', accent: 'rose', kind: 'emoji' },
  square_blue: { id: 'square_blue', value: 'blue_square', label: '🟦', accent: 'sky', kind: 'emoji' },
  num_1: { id: 'num_1', value: '1', label: '1', accent: 'violet', kind: 'number' },
  num_2: { id: 'num_2', value: '2', label: '2', accent: 'violet', kind: 'number' },
  num_3: { id: 'num_3', value: '3', label: '3', accent: 'violet', kind: 'number' },
  num_4: { id: 'num_4', value: '4', label: '4', accent: 'violet', kind: 'number' },
  num_5: { id: 'num_5', value: '5', label: '5', accent: 'violet', kind: 'number' },
  num_6: { id: 'num_6', value: '6', label: '6', accent: 'violet', kind: 'number' },
  num_7: { id: 'num_7', value: '7', label: '7', accent: 'slate', kind: 'number' },
  num_8: { id: 'num_8', value: '8', label: '8', accent: 'violet', kind: 'number' },
  num_9: { id: 'num_9', value: '9', label: '9', accent: 'violet', kind: 'number' },
  num_12: { id: 'num_12', value: '12', label: '12', accent: 'violet', kind: 'number' },
  num_13: { id: 'num_13', value: '13', label: '13', accent: 'violet', kind: 'number' },
  num_15: { id: 'num_15', value: '15', label: '15', accent: 'violet', kind: 'number' },
  num_16: { id: 'num_16', value: '16', label: '16', accent: 'slate', kind: 'number' },
  num_18: { id: 'num_18', value: '18', label: '18', accent: 'violet', kind: 'number' },
  num_32: { id: 'num_32', value: '32', label: '32', accent: 'violet', kind: 'number' },
};

export const LOGICAL_PATTERNS_WORKSHOP_ROUNDS: LogicalPatternRound[] = [
  {
    id: 'kolory',
    title: 'Wzorzec AB',
    prompt: 'Dokończ naprzemienny wzorzec kształtów.',
    ruleHint: 'Powtarza się para 🔺 → 🔵 (AB).',
    ruleSummary: 'Wzorzec AB: A, B, A, B, A, B.',
    stepHint: 'Zobacz, co pojawia się co drugi element.',
    pool: ['circle_a', 'circle_b', 'diamond_a'],
    sequence: [
      { type: 'fixed', tileId: 'tri_a' },
      { type: 'fixed', tileId: 'circle_a' },
      { type: 'fixed', tileId: 'tri_a' },
      { type: 'blank', id: 'kolory-1', correctValue: 'circle' },
      { type: 'fixed', tileId: 'tri_a' },
      { type: 'blank', id: 'kolory-2', correctValue: 'circle' },
    ],
  },
  {
    id: 'aab',
    title: 'Wzorzec AAB',
    prompt: 'Dwie gwiazdki, księżyc, i znowu to samo.',
    ruleHint: 'Jednostka wzorca to ⭐ ⭐ 🌙.',
    ruleSummary: 'Wzorzec AAB: A, A, B, A, A, B...',
    stepHint: 'Szukaj dwóch takich samych obok siebie.',
    pool: ['moon_a', 'star_c', 'square_green'],
    sequence: [
      { type: 'fixed', tileId: 'star_a' },
      { type: 'fixed', tileId: 'star_a' },
      { type: 'blank', id: 'aab-1', correctValue: 'moon' },
      { type: 'fixed', tileId: 'star_a' },
      { type: 'fixed', tileId: 'star_a' },
      { type: 'fixed', tileId: 'moon_a' },
      { type: 'blank', id: 'aab-2', correctValue: 'star' },
    ],
  },
  {
    id: 'abbc',
    title: 'Wzorzec ABBC',
    prompt: 'Sprawdź powtarzającą się grupę kolorów.',
    ruleHint: 'Powtarza się sekwencja 🟥 🟦 🟦 🟩.',
    ruleSummary: 'Wzorzec ABBC: A, B, B, C, A, B, B, C...',
    stepHint: 'Zapisz krótki blok i sprawdź, czy się powtarza.',
    pool: ['square_blue', 'square_green', 'diamond_a'],
    sequence: [
      { type: 'fixed', tileId: 'square_red' },
      { type: 'fixed', tileId: 'square_blue' },
      { type: 'fixed', tileId: 'square_blue' },
      { type: 'fixed', tileId: 'square_green' },
      { type: 'fixed', tileId: 'square_red' },
      { type: 'blank', id: 'abbc-1', correctValue: 'blue_square' },
      { type: 'blank', id: 'abbc-2', correctValue: 'green_square' },
    ],
  },
  {
    id: 'arytm',
    title: 'Ciąg +3',
    prompt: 'Każdy kolejny wyraz jest większy o 3.',
    ruleHint: 'Dodajemy 3: 3, 6, 9, 12, 15, 18.',
    ruleSummary: 'Ciąg arytmetyczny: stała różnica +3.',
    stepHint: 'Sprawdź różnicę między sąsiadami.',
    pool: ['num_12', 'num_18', 'num_16'],
    sequence: [
      { type: 'fixed', tileId: 'num_3' },
      { type: 'fixed', tileId: 'num_6' },
      { type: 'fixed', tileId: 'num_9' },
      { type: 'blank', id: 'arytm-1', correctValue: '12' },
      { type: 'fixed', tileId: 'num_15' },
      { type: 'blank', id: 'arytm-2', correctValue: '18' },
    ],
  },
  {
    id: 'geo',
    title: 'Ciąg ×2',
    prompt: 'Każdy kolejny wyraz jest dwa razy większy.',
    ruleHint: 'Mnożymy przez 2: 1, 2, 4, 8, 16, 32.',
    ruleSummary: 'Ciąg geometryczny: stały iloraz ×2.',
    stepHint: 'Sprawdź iloraz: następny = poprzedni ×2.',
    pool: ['num_4', 'num_16', 'num_32', 'num_18'],
    sequence: [
      { type: 'fixed', tileId: 'num_1' },
      { type: 'fixed', tileId: 'num_2' },
      { type: 'blank', id: 'geo-1', correctValue: '4' },
      { type: 'fixed', tileId: 'num_8' },
      { type: 'blank', id: 'geo-2', correctValue: '16' },
      { type: 'blank', id: 'geo-3', correctValue: '32' },
    ],
  },
  {
    id: 'fibonacci',
    title: 'Fibonacci',
    prompt: 'Każdy wyraz to suma dwóch poprzednich.',
    ruleHint: '1, 1, 2, 3, 5, 8, 13.',
    ruleSummary: 'Fibonacci: nowy = dwa poprzednie razem.',
    stepHint: 'Dodaj dwa ostatnie elementy.',
    pool: ['num_8', 'num_13', 'num_7'],
    sequence: [
      { type: 'fixed', tileId: 'num_1' },
      { type: 'fixed', tileId: 'num_1' },
      { type: 'fixed', tileId: 'num_2' },
      { type: 'fixed', tileId: 'num_3' },
      { type: 'fixed', tileId: 'num_5' },
      { type: 'blank', id: 'fibo-1', correctValue: '8' },
      { type: 'blank', id: 'fibo-2', correctValue: '13' },
    ],
  },
];

export const ALPHABET_LETTER_ORDER_TILES: Record<string, LogicalPatternTile> = {
  letter_c: { id: 'letter_c', value: 'c', label: 'C', accent: 'amber', kind: 'letter' },
  letter_e: { id: 'letter_e', value: 'e', label: 'E', accent: 'amber', kind: 'letter' },
  letter_f: { id: 'letter_f', value: 'f', label: 'F', accent: 'rose', kind: 'letter' },
  letter_k: { id: 'letter_k', value: 'k', label: 'K', accent: 'amber', kind: 'letter' },
  letter_m: { id: 'letter_m', value: 'm', label: 'M', accent: 'amber', kind: 'letter' },
  letter_n: { id: 'letter_n', value: 'n', label: 'N', accent: 'rose', kind: 'letter' },
  letter_y: { id: 'letter_y', value: 'y', label: 'Y', accent: 'amber', kind: 'letter' },
  letter_w: { id: 'letter_w', value: 'w', label: 'W', accent: 'rose', kind: 'letter' },
};

type LogicalPatternDataset = {
  rounds: LogicalPatternRound[];
  tiles: Record<string, LogicalPatternTile>;
};

const ALPHABET_LETTER_ORDER_FIXED_TILES: Record<string, LogicalPatternTile> = {
  alpha_a: { id: 'alpha_a', value: 'a', label: 'A', accent: 'sky', kind: 'letter' },
  alpha_b: { id: 'alpha_b', value: 'b', label: 'B', accent: 'sky', kind: 'letter' },
  alpha_d: { id: 'alpha_d', value: 'd', label: 'D', accent: 'sky', kind: 'letter' },
  alpha_h: { id: 'alpha_h', value: 'h', label: 'H', accent: 'sky', kind: 'letter' },
  alpha_i: { id: 'alpha_i', value: 'i', label: 'I', accent: 'sky', kind: 'letter' },
  alpha_j: { id: 'alpha_j', value: 'j', label: 'J', accent: 'sky', kind: 'letter' },
  alpha_l: { id: 'alpha_l', value: 'l', label: 'L', accent: 'sky', kind: 'letter' },
  alpha_x: { id: 'alpha_x', value: 'x', label: 'X', accent: 'sky', kind: 'letter' },
  alpha_z: { id: 'alpha_z', value: 'z', label: 'Z', accent: 'sky', kind: 'letter' },
};

export const ALPHABET_LETTER_ORDER_DATASET: LogicalPatternDataset = {
  rounds: [
    {
      id: 'alphabet-abcde',
      title: 'Alfabet A-E',
      prompt: 'Uzupełnij brakujące litery w kolejności alfabetu.',
      ruleHint: 'Każda kolejna litera idzie o jeden krok dalej.',
      ruleSummary: 'Porządek alfabetu: A, B, C, D, E.',
      stepHint: 'Powiedz litery na głos: A, B, C, D, E.',
      pool: ['letter_c', 'letter_e', 'letter_f'],
      sequence: [
        { type: 'fixed', tileId: 'alpha_a' },
        { type: 'fixed', tileId: 'alpha_b' },
        { type: 'blank', id: 'alphabet-1', correctValue: 'c' },
        { type: 'fixed', tileId: 'alpha_d' },
        { type: 'blank', id: 'alphabet-2', correctValue: 'e' },
      ],
    },
    {
      id: 'alphabet-hm',
      title: 'Alfabet H-M',
      prompt: 'Znajdź kolejne litery w środku alfabetu.',
      ruleHint: 'H, I, J, K, L, M.',
      ruleSummary: 'Litery idą po kolei bez przeskoków.',
      stepHint: 'Sprawdź, jaka litera jest po J i po L.',
      pool: ['letter_k', 'letter_m', 'letter_n'],
      sequence: [
        { type: 'fixed', tileId: 'alpha_h' },
        { type: 'fixed', tileId: 'alpha_i' },
        { type: 'fixed', tileId: 'alpha_j' },
        { type: 'blank', id: 'alphabet-3', correctValue: 'k' },
        { type: 'fixed', tileId: 'alpha_l' },
        { type: 'blank', id: 'alphabet-4', correctValue: 'm' },
      ],
    },
    {
      id: 'alphabet-xyz',
      title: 'Koniec alfabetu',
      prompt: 'Uzupełnij brakującą literę na końcu alfabetu.',
      ruleHint: 'X, Y, Z.',
      ruleSummary: 'Na końcu alfabetu mamy X, Y, Z.',
      stepHint: 'Pomyśl, jaka litera jest między X i Z.',
      pool: ['letter_y', 'letter_w'],
      sequence: [
        { type: 'fixed', tileId: 'alpha_x' },
        { type: 'blank', id: 'alphabet-5', correctValue: 'y' },
        { type: 'fixed', tileId: 'alpha_z' },
      ],
    },
  ],
  tiles: {
    ...ALPHABET_LETTER_ORDER_FIXED_TILES,
    ...ALPHABET_LETTER_ORDER_TILES,
  },
};

export const LOGICAL_PATTERN_DATASETS: Record<LogicalPatternSetId, LogicalPatternDataset> = {
  logical_patterns_workshop: {
    rounds: LOGICAL_PATTERNS_WORKSHOP_ROUNDS,
    tiles: LOGICAL_PATTERNS_WORKSHOP_TILES,
  },
  alphabet_letter_order: ALPHABET_LETTER_ORDER_DATASET,
};

export const getLogicalPatternDataset = (
  patternSetId: LogicalPatternSetId = 'logical_patterns_workshop'
): LogicalPatternDataset => LOGICAL_PATTERN_DATASETS[patternSetId];
