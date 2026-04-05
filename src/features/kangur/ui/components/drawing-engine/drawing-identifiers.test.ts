import { describe, expect, it } from 'vitest';

import {
  createKangurDrawingDraftStorageKey,
  createKangurDrawingExportFilename,
} from '@/features/kangur/ui/components/drawing-engine/drawing-identifiers';

describe('drawing identifiers', () => {
  it('builds colon-delimited draft keys without rewriting existing segments', () => {
    expect(
      createKangurDrawingDraftStorageKey(
        'geometry-drawing',
        'training:shape:easy',
        'triangle-1'
      )
    ).toBe('geometry-drawing:training:shape:easy:triangle-1');
    expect(createKangurDrawingDraftStorageKey(null, undefined, '')).toBeNull();
  });

  it('builds stable png export filenames from normalized segments', () => {
    expect(
      createKangurDrawingExportFilename('training:shape:easy', 'Triangle 1')
    ).toBe('training-shape-easy-Triangle-1.png');
    expect(
      createKangurDrawingExportFilename('operating_loop_arrow', 'diagram')
    ).toBe('operating_loop_arrow-diagram.png');
    expect(createKangurDrawingExportFilename(null, undefined, '')).toBe('drawing.png');
  });
});
