import type { Point2d } from '@/shared/contracts/geometry';
import {
  mirrorPoints,
  type SymmetryAxis,
} from '@/features/kangur/ui/services/geometry-symmetry';
import { loosenMinInt } from '@/features/kangur/ui/services/drawing-leniency';

import type { SymmetryRound, TemplateShape } from './GeometrySymmetryGame.types';

export const CANVAS_WIDTH = 320;
export const CANVAS_HEIGHT = 220;
export const GRID_STEP = 40;
export const KEYBOARD_DRAW_STEP = 14;
export const KEYBOARD_CURSOR_START = {
  x: Math.round(CANVAS_WIDTH / 2),
  y: Math.round(CANVAS_HEIGHT / 2),
} as const;
export const BASE_MIN_DRAWING_POINTS = loosenMinInt(10);

export const VERTICAL_AXIS: SymmetryAxis = {
  orientation: 'vertical',
  position: CANVAS_WIDTH / 2,
};
export const HORIZONTAL_AXIS: SymmetryAxis = {
  orientation: 'horizontal',
  position: CANVAS_HEIGHT / 2,
};

const toPoints = (pairs: Array<[number, number]>): Point2d[] =>
  pairs.map(([x, y]) => ({ x, y }));

const createEllipsePath = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  steps = 36
): Point2d[] =>
  Array.from({ length: steps }, (_, index): Point2d => {
    const angle = (Math.PI * 2 * index) / Math.max(1, steps);
    return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
  });

const combineShapes = (...shapes: TemplateShape[]): TemplateShape => ({
  paths: shapes.flatMap((shape) => shape.paths),
});

export const mirrorShape = (shape: TemplateShape, axis: SymmetryAxis): TemplateShape => ({
  paths: shape.paths.map((path) => ({
    ...path,
    points: mirrorPoints(path.points, axis),
  })),
});

export const flattenPaths = (shape: TemplateShape): Point2d[] =>
  shape.paths.flatMap((path) => path.points);

const BUTTERFLY_LEFT: TemplateShape = {
  paths: [
    {
      points: toPoints([
        [160, 60],
        [140, 40],
        [110, 50],
        [85, 70],
        [95, 100],
        [75, 125],
        [105, 145],
        [135, 135],
        [155, 110],
        [160, 85],
      ]),
    },
  ],
};

const HEART_LEFT: TemplateShape = {
  paths: [
    {
      points: toPoints([
        [160, 70],
        [145, 45],
        [120, 45],
        [100, 70],
        [110, 105],
        [135, 125],
        [160, 150],
      ]),
    },
  ],
};

const LEAF_TOP: TemplateShape = {
  paths: [
    {
      points: toPoints([
        [80, 110],
        [95, 85],
        [125, 70],
        [160, 65],
        [195, 70],
        [225, 85],
        [240, 110],
      ]),
    },
  ],
};

const EYE_FULL: TemplateShape = {
  paths: [
    {
      points: createEllipsePath(160, 110, 90, 45, 44),
      closed: true,
    },
  ],
};

const SQUARE_FULL: TemplateShape = {
  paths: [
    {
      points: toPoints([
        [110, 50],
        [210, 50],
        [210, 170],
        [110, 170],
      ]),
      closed: true,
    },
  ],
};

const ZIGZAG_LEFT: TemplateShape = {
  paths: [
    {
      points: toPoints([
        [145, 55],
        [110, 75],
        [140, 100],
        [100, 125],
        [135, 150],
        [115, 175],
      ]),
    },
  ],
};

const BUTTERFLY_FULL = combineShapes(
  BUTTERFLY_LEFT,
  mirrorShape(BUTTERFLY_LEFT, VERTICAL_AXIS)
);

export const ROUNDS: SymmetryRound[] = [
  {
    id: 'axis-butterfly',
    type: 'axis',
    title: 'Oś motyla',
    prompt: 'Narysuj oś symetrii motyla.',
    hint: 'To pionowa linia przechodząca przez środek — kieruj się zielonym pasem.',
    emoji: '🦋',
    axis: VERTICAL_AXIS,
    template: BUTTERFLY_FULL,
  },
  {
    id: 'mirror-heart',
    type: 'mirror',
    title: 'Serce w lustrze',
    prompt: 'Dorysuj brakującą połowę serca.',
    hint: 'Odbij kształt po osi, rysując po zielonej stronie.',
    emoji: '❤️',
    axis: VERTICAL_AXIS,
    template: HEART_LEFT,
    expectedSide: 'right',
  },
  {
    id: 'axis-square',
    type: 'axis',
    title: 'Oś kwadratu',
    prompt: 'Narysuj oś symetrii kwadratu.',
    hint: 'To pionowa linia pośrodku kwadratu — zielony pas pokazuje oś.',
    emoji: '🟦',
    axis: VERTICAL_AXIS,
    template: SQUARE_FULL,
  },
  {
    id: 'mirror-leaf',
    type: 'mirror',
    title: 'Listek',
    prompt: 'Dorysuj dolną połowę listka.',
    hint: 'Symetria względem osi poziomej — rysuj w zielonej strefie.',
    emoji: '🍃',
    axis: HORIZONTAL_AXIS,
    template: LEAF_TOP,
    expectedSide: 'bottom',
  },
  {
    id: 'mirror-zigzag',
    type: 'mirror',
    title: 'Zygzak w lustrze',
    prompt: 'Dorysuj odbicie zygzaka.',
    hint: 'Rysuj tylko w zielonej strefie po prawej stronie osi.',
    emoji: '⚡',
    axis: VERTICAL_AXIS,
    template: ZIGZAG_LEFT,
    expectedSide: 'right',
  },
  {
    id: 'axis-eye',
    type: 'axis',
    title: 'Oś oka',
    prompt: 'Narysuj oś symetrii oka.',
    hint: 'To pozioma linia pośrodku — zielony pas wskazuje oś.',
    emoji: '👁️',
    axis: HORIZONTAL_AXIS,
    template: EYE_FULL,
  },
];
