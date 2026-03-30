import { describe, expect, it, vi } from 'vitest';

import {
  createKangurFreeformDrawingSnapshot,
  exportKangurCanvasDataUrl,
  parseKangurFreeformDrawingSnapshot,
  rescaleKangurFreeformDrawingSnapshot,
  serializeKangurFreeformDrawingSnapshot,
} from '@/features/kangur/ui/components/drawing-engine/freeform-snapshots';

describe('freeform drawing snapshots', () => {
  it('serializes and parses freeform snapshots with cloned stroke data', () => {
    const snapshot = createKangurFreeformDrawingSnapshot({
      logicalHeight: 240,
      logicalWidth: 320,
      strokes: [
        {
          meta: {
            color: '#2563eb',
            isEraser: false,
            width: 4,
          },
          points: [
            { x: 20, y: 30 },
            { x: 120, y: 160 },
          ],
        },
      ],
    });

    const parsed = parseKangurFreeformDrawingSnapshot(
      serializeKangurFreeformDrawingSnapshot(snapshot)
    );

    expect(parsed).toEqual(snapshot);
    expect(parsed?.strokes[0]).not.toBe(snapshot.strokes[0]);
  });

  it('rescales snapshot points into the current logical board size', () => {
    const strokes = rescaleKangurFreeformDrawingSnapshot(
      createKangurFreeformDrawingSnapshot({
        logicalHeight: 100,
        logicalWidth: 100,
        strokes: [
          {
            meta: {
              color: '#111827',
              isEraser: false,
              width: 6,
            },
            points: [
              { x: 10, y: 20 },
              { x: 50, y: 70 },
            ],
          },
        ],
      }),
      200,
      300
    );

    expect(strokes[0]?.points).toEqual([
      { x: 20, y: 60 },
      { x: 100, y: 210 },
    ]);
  });

  it('exports canvas snapshots through the shared helper and rejects invalid payloads', () => {
    const canvas = {
      toDataURL: vi.fn(() => 'data:image/png;base64,AAA'),
    } as unknown as HTMLCanvasElement;

    expect(exportKangurCanvasDataUrl(canvas)).toBe('data:image/png;base64,AAA');
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/png');
    expect(parseKangurFreeformDrawingSnapshot('{"version":2}')).toBeNull();
    expect(exportKangurCanvasDataUrl(null)).toBeNull();
  });
});
