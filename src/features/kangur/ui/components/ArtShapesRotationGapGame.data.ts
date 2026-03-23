export type RotationGlyph =
  | 'circle'
  | 'ball'
  | 'square'
  | 'window'
  | 'triangle'
  | 'pizza'
  | 'rectangle'
  | 'book';

export type RotationTempo = 'slow' | 'medium' | 'fast';

export type RotationTile = {
  id: string;
  glyph: RotationGlyph;
  tempo: RotationTempo;
  direction: 'cw' | 'ccw';
  restAngle: number;
};

export type RotationRound = {
  id: string;
  hintKey: string;
  slots: readonly RotationTile[];
  missingIndex: number;
  options: readonly RotationTile[];
  correctOptionId: string;
};

export const ROTATION_ROUNDS: RotationRound[] = [
  {
    id: 'shape-to-object-trio',
    hintKey: 'shapeToObjectTrio',
    missingIndex: 5,
    correctOptionId: 'r1-pizza-fast',
    slots: [
      { id: 'r1-circle-slow', glyph: 'circle', tempo: 'slow', direction: 'cw', restAngle: 12 },
      { id: 'r1-square-medium', glyph: 'square', tempo: 'medium', direction: 'cw', restAngle: 28 },
      { id: 'r1-triangle-fast', glyph: 'triangle', tempo: 'fast', direction: 'cw', restAngle: 44 },
      { id: 'r1-ball-slow', glyph: 'ball', tempo: 'slow', direction: 'cw', restAngle: 12 },
      { id: 'r1-window-medium', glyph: 'window', tempo: 'medium', direction: 'cw', restAngle: 28 },
      { id: 'r1-pizza-fast', glyph: 'pizza', tempo: 'fast', direction: 'cw', restAngle: 44 },
    ],
    options: [
      { id: 'r1-pizza-fast', glyph: 'pizza', tempo: 'fast', direction: 'cw', restAngle: 44 },
      { id: 'r1-triangle-fast-option', glyph: 'triangle', tempo: 'fast', direction: 'cw', restAngle: 44 },
      { id: 'r1-book-fast-option', glyph: 'book', tempo: 'fast', direction: 'cw', restAngle: 44 },
    ],
  },
  {
    id: 'object-to-shape-loop',
    hintKey: 'objectToShapeLoop',
    missingIndex: 4,
    correctOptionId: 'r2-circle-medium',
    slots: [
      { id: 'r2-book-slow', glyph: 'book', tempo: 'slow', direction: 'ccw', restAngle: 18 },
      { id: 'r2-ball-medium', glyph: 'ball', tempo: 'medium', direction: 'ccw', restAngle: 34 },
      { id: 'r2-window-fast', glyph: 'window', tempo: 'fast', direction: 'ccw', restAngle: 52 },
      { id: 'r2-rectangle-slow', glyph: 'rectangle', tempo: 'slow', direction: 'ccw', restAngle: 18 },
      { id: 'r2-circle-medium', glyph: 'circle', tempo: 'medium', direction: 'ccw', restAngle: 34 },
      { id: 'r2-square-fast', glyph: 'square', tempo: 'fast', direction: 'ccw', restAngle: 52 },
    ],
    options: [
      { id: 'r2-circle-medium', glyph: 'circle', tempo: 'medium', direction: 'ccw', restAngle: 34 },
      { id: 'r2-ball-medium-option', glyph: 'ball', tempo: 'medium', direction: 'ccw', restAngle: 34 },
      { id: 'r2-circle-fast-option', glyph: 'circle', tempo: 'fast', direction: 'ccw', restAngle: 52 },
    ],
  },
  {
    id: 'paired-family-speeds',
    hintKey: 'pairedFamilySpeeds',
    missingIndex: 5,
    correctOptionId: 'r3-ball-fast',
    slots: [
      { id: 'r3-triangle-slow', glyph: 'triangle', tempo: 'slow', direction: 'cw', restAngle: 8 },
      { id: 'r3-pizza-slow', glyph: 'pizza', tempo: 'slow', direction: 'cw', restAngle: 8 },
      { id: 'r3-rectangle-medium', glyph: 'rectangle', tempo: 'medium', direction: 'cw', restAngle: 26 },
      { id: 'r3-book-medium', glyph: 'book', tempo: 'medium', direction: 'cw', restAngle: 26 },
      { id: 'r3-circle-fast', glyph: 'circle', tempo: 'fast', direction: 'cw', restAngle: 48 },
      { id: 'r3-ball-fast', glyph: 'ball', tempo: 'fast', direction: 'cw', restAngle: 48 },
    ],
    options: [
      { id: 'r3-ball-fast', glyph: 'ball', tempo: 'fast', direction: 'cw', restAngle: 48 },
      { id: 'r3-circle-fast-option', glyph: 'circle', tempo: 'fast', direction: 'cw', restAngle: 48 },
      { id: 'r3-ball-medium-option', glyph: 'ball', tempo: 'medium', direction: 'cw', restAngle: 26 },
    ],
  },
  {
    id: 'square-rectangle-finish',
    hintKey: 'squareRectangleFinish',
    missingIndex: 5,
    correctOptionId: 'r4-book-fast',
    slots: [
      { id: 'r4-square-slow', glyph: 'square', tempo: 'slow', direction: 'ccw', restAngle: 16 },
      { id: 'r4-rectangle-slow', glyph: 'rectangle', tempo: 'slow', direction: 'ccw', restAngle: 16 },
      { id: 'r4-window-medium', glyph: 'window', tempo: 'medium', direction: 'ccw', restAngle: 32 },
      { id: 'r4-book-medium', glyph: 'book', tempo: 'medium', direction: 'ccw', restAngle: 32 },
      { id: 'r4-square-fast', glyph: 'square', tempo: 'fast', direction: 'ccw', restAngle: 50 },
      { id: 'r4-book-fast', glyph: 'book', tempo: 'fast', direction: 'ccw', restAngle: 50 },
    ],
    options: [
      { id: 'r4-book-fast', glyph: 'book', tempo: 'fast', direction: 'ccw', restAngle: 50 },
      { id: 'r4-rectangle-fast-option', glyph: 'rectangle', tempo: 'fast', direction: 'ccw', restAngle: 50 },
      { id: 'r4-window-fast-option', glyph: 'window', tempo: 'fast', direction: 'ccw', restAngle: 50 },
    ],
  },
];
