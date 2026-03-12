import { describe, expect, it } from 'vitest';

import {
  AVATAR_SIZE,
  EDGE_GAP,
  clampTutorPanelPoint,
} from './KangurAiTutorWidget.shared';

describe('KangurAiTutorWidget.shared floating avatar metrics', () => {
  it('clamps the floating launcher to the shared footprint on narrow mobile viewports', () => {
    expect(AVATAR_SIZE).toBe(56);
    expect(EDGE_GAP).toBe(16);
    expect(
      clampTutorPanelPoint(
        { x: -48, y: -24 },
        { width: 320, height: 740 },
        { width: AVATAR_SIZE, height: AVATAR_SIZE }
      )
    ).toEqual({
      x: 16,
      y: 16,
    });
    expect(
      clampTutorPanelPoint(
        { x: 999, y: 999 },
        { width: 320, height: 740 },
        { width: AVATAR_SIZE, height: AVATAR_SIZE }
      )
    ).toEqual({
      x: 248,
      y: 668,
    });
  });

  it('keeps the launcher inside bounds on wider phone viewports', () => {
    expect(
      clampTutorPanelPoint(
        { x: 999, y: 999 },
        { width: 390, height: 844 },
        { width: AVATAR_SIZE, height: AVATAR_SIZE }
      )
    ).toEqual({
      x: 318,
      y: 772,
    });
  });

  it('preserves the desktop launcher bounds on larger viewports', () => {
    expect(
      clampTutorPanelPoint(
        { x: 999, y: 999 },
        { width: 1024, height: 768 },
        { width: AVATAR_SIZE, height: AVATAR_SIZE }
      )
    ).toEqual({
      x: 952,
      y: 696,
    });
  });
});
