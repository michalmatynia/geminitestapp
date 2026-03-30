import { describe, expect, it } from 'vitest';

import {
  DEFAULT_KANGUR_FREEFORM_DRAWING_TOOL_CONFIG,
  resolveKangurFreeformDrawingStrokeWidths,
  resolveKangurFreeformDrawingToolConfig,
} from '@/features/kangur/ui/components/drawing-engine/freeform-config';

describe('freeform drawing config', () => {
  it('falls back to default colors and widths when the config arrays are empty', () => {
    const resolved = resolveKangurFreeformDrawingToolConfig({
      colors: [],
      defaultColor: '#ff00ff',
      strokeWidths: [],
    });

    expect(resolved.colors).toEqual(
      DEFAULT_KANGUR_FREEFORM_DRAWING_TOOL_CONFIG.colors
    );
    expect(resolved.strokeWidths).toEqual(
      DEFAULT_KANGUR_FREEFORM_DRAWING_TOOL_CONFIG.strokeWidths
    );
    expect(resolved.defaultColor).toBe(
      DEFAULT_KANGUR_FREEFORM_DRAWING_TOOL_CONFIG.defaultColor
    );
    expect(resolved.strokeRenderMode).toBe(
      DEFAULT_KANGUR_FREEFORM_DRAWING_TOOL_CONFIG.strokeRenderMode
    );
  });

  it('derives coarse-pointer widths from the shared config object', () => {
    const resolved = resolveKangurFreeformDrawingToolConfig({
      coarsePointerWidthBoost: 3,
      strokeWidths: [3, 6],
    });

    expect(resolveKangurFreeformDrawingStrokeWidths(resolved, false)).toEqual([
      3,
      6,
    ]);
    expect(resolveKangurFreeformDrawingStrokeWidths(resolved, true)).toEqual([
      6,
      9,
    ]);
  });

  it('accepts an explicit freeform stroke render mode override', () => {
    const resolved = resolveKangurFreeformDrawingToolConfig({
      strokeRenderMode: 'polyline',
    });

    expect(resolved.strokeRenderMode).toBe('polyline');
  });
});
