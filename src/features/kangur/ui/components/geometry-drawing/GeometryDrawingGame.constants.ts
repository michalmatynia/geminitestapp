import type { ShapeRound } from './GeometryDrawingGame.types';

export const SHAPE_ROUND_LIBRARY = {
  circle: {
    id: 'circle',
    label: 'Koło',
    emoji: '⚪',
    hint: 'Narysuj jedną płynną, zamkniętą linię.',
    accent: 'kangur-gradient-accent-teal',
  },
  oval: {
    id: 'oval',
    label: 'Owal',
    emoji: '🥚',
    hint: 'Narysuj kształt bez rogów, ale trochę wydłużony.',
    accent: 'kangur-gradient-accent-sky',
  },
  triangle: {
    id: 'triangle',
    label: 'Trójkąt',
    emoji: '🔺',
    hint: 'Postaraj się zrobić 3 wyraźne rogi.',
    accent: 'kangur-gradient-accent-amber',
  },
  diamond: {
    id: 'diamond',
    label: 'Romb',
    emoji: '💠',
    hint: '4 rogi, boki wyglądają na ukośne.',
    accent: 'kangur-gradient-accent-amber-reverse',
  },
  square: {
    id: 'square',
    label: 'Kwadrat',
    emoji: '🟦',
    hint: '4 boki, podobna długość każdego boku.',
    accent: 'kangur-gradient-accent-indigo-reverse',
  },
  rectangle: {
    id: 'rectangle',
    label: 'Prostokąt',
    emoji: '▭',
    hint: '4 rogi, dwa boki wyraźnie dłuższe.',
    accent: 'kangur-gradient-accent-emerald',
  },
  pentagon: {
    id: 'pentagon',
    label: 'Pięciokąt',
    emoji: '⬟',
    hint: '5 rogów, zamknięta figura.',
    accent: 'kangur-gradient-accent-rose-reverse',
  },
  hexagon: {
    id: 'hexagon',
    label: 'Sześciokąt',
    emoji: '⬢',
    hint: '6 rogów i zamknięta linia.',
    accent: 'kangur-gradient-accent-violet',
  },
} satisfies Record<string, ShapeRound>;

export const STARTER_ROUNDS: ShapeRound[] = [
  SHAPE_ROUND_LIBRARY.circle,
  SHAPE_ROUND_LIBRARY.triangle,
  SHAPE_ROUND_LIBRARY.square,
  SHAPE_ROUND_LIBRARY.rectangle,
];

export const PRO_ROUNDS: ShapeRound[] = [
  SHAPE_ROUND_LIBRARY.circle,
  SHAPE_ROUND_LIBRARY.oval,
  SHAPE_ROUND_LIBRARY.triangle,
  SHAPE_ROUND_LIBRARY.diamond,
  SHAPE_ROUND_LIBRARY.square,
  SHAPE_ROUND_LIBRARY.rectangle,
  SHAPE_ROUND_LIBRARY.pentagon,
  SHAPE_ROUND_LIBRARY.hexagon,
];

export const LEGACY_SHAPE_ROUNDS: ShapeRound[] = [
  SHAPE_ROUND_LIBRARY.circle,
  SHAPE_ROUND_LIBRARY.triangle,
  SHAPE_ROUND_LIBRARY.square,
  SHAPE_ROUND_LIBRARY.rectangle,
  SHAPE_ROUND_LIBRARY.pentagon,
];

export const CANVAS_WIDTH = 320;
export const CANVAS_HEIGHT = 220;
export const KEYBOARD_DRAW_STEP = 14;
export const KEYBOARD_CURSOR_START = {
  x: Math.round(CANVAS_WIDTH / 2),
  y: Math.round(CANVAS_HEIGHT / 2),
} as const;
