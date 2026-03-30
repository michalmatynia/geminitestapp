/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';

import {
  createKangurPointDrawingSnapshot,
  parseKangurPointDrawingSnapshot,
  rescaleKangurPointDrawingSnapshot,
  serializeKangurPointDrawingSnapshot,
} from '../point-snapshots';

describe('point drawing snapshots', () => {
  it('serializes and parses point snapshots with cloned stroke data', () => {
    const snapshot = createKangurPointDrawingSnapshot({
      logicalHeight: 180,
      logicalWidth: 240,
      strokes: [
        [
          { x: 12, y: 24 },
          { x: 48, y: 72 },
        ],
      ],
    });

    const parsed = parseKangurPointDrawingSnapshot(
      serializeKangurPointDrawingSnapshot(snapshot)
    );

    expect(parsed).toEqual(snapshot);
    expect(parsed?.strokes[0]).not.toBe(snapshot.strokes[0]);
    expect(parsed?.strokes[0]?.[0]).not.toBe(snapshot.strokes[0]?.[0]);
  });

  it('rescales point snapshots into the current logical board size', () => {
    const snapshot = createKangurPointDrawingSnapshot({
      logicalHeight: 100,
      logicalWidth: 200,
      strokes: [
        [
          { x: 20, y: 10 },
          { x: 100, y: 80 },
        ],
      ],
    });

    expect(rescaleKangurPointDrawingSnapshot(snapshot, 400, 200)).toEqual([
      [
        { x: 40, y: 20 },
        { x: 200, y: 160 },
      ],
    ]);
  });

  it('rejects invalid serialized point snapshots', () => {
    expect(parseKangurPointDrawingSnapshot('{"version":2}')).toBeNull();
    expect(parseKangurPointDrawingSnapshot('not-json')).toBeNull();
  });
});
