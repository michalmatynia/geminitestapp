import { describe, expect, it } from 'vitest';

import { simplifyPoints, simplifyShape, smoothPoints, smoothShape } from './geometry';

describe('vector-drawing geometry', () => {
  it('keeps short point sequences unchanged during smoothing and simplification', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];

    expect(smoothPoints(points)).toBe(points);
    expect(simplifyPoints(points)).toBe(points);
  });

  it('smooths longer paths by inserting intermediate control points', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ];

    expect(smoothPoints(points, 1)).toEqual([
      { x: 0, y: 0 },
      { x: 0.25, y: 0 },
      { x: 0.75, y: 0 },
      { x: 1.25, y: 0 },
      { x: 1.75, y: 0 },
      { x: 2, y: 0 },
    ]);
  });

  it('simplifies near-linear paths but keeps points that deviate past the tolerance', () => {
    const nearlyStraight = [
      { x: 0, y: 0 },
      { x: 0.5, y: 0.0001 },
      { x: 1, y: 0 },
    ];
    const corner = [
      { x: 0, y: 0 },
      { x: 0.5, y: 0.25 },
      { x: 1, y: 0 },
    ];

    expect(simplifyPoints(nearlyStraight)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);
    expect(simplifyPoints(corner, 0.01)).toEqual(corner);
  });

  it('wraps smoothing and simplification for complete vector shapes', () => {
    const shape = {
      id: 'shape-1',
      kind: 'polygon' as const,
      label: 'Shape',
      closed: false,
      points: [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.0001 },
        { x: 1, y: 0 },
      ],
    };

    expect(smoothShape(shape, 1)).toEqual({
      ...shape,
      points: [
        { x: 0, y: 0 },
        { x: 0.125, y: 0.000025 },
        { x: 0.375, y: 0.00007500000000000001 },
        { x: 0.625, y: 0.00007500000000000001 },
        { x: 0.875, y: 0.000025 },
        { x: 1, y: 0 },
      ],
    });
    expect(simplifyShape(shape)).toEqual({
      ...shape,
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
    });
  });
});
