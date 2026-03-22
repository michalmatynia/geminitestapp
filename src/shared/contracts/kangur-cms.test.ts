import { describe, expect, it } from 'vitest';

import {
  KANGUR_WIDGET_IDS,
  KANGUR_WIDGET_OPTIONS,
  getKangurWidgetLabel,
  kangurWidgetIdSchema,
} from './kangur-cms';

describe('kangur-cms', () => {
  it('keeps widget options aligned with the schema ids', () => {
    expect(KANGUR_WIDGET_OPTIONS.map((option) => option.value)).toEqual(
      KANGUR_WIDGET_IDS,
    );
    expect(
      KANGUR_WIDGET_IDS.every((widgetId) => kangurWidgetIdSchema.safeParse(widgetId).success),
    ).toBe(true);
    expect(kangurWidgetIdSchema.safeParse('unknown-widget').success).toBe(false);
  });

  it('returns friendly labels for known widget ids', () => {
    expect(getKangurWidgetLabel('game-screen')).toBe('Game screen');
    expect(getKangurWidgetLabel('assignment-spotlight')).toBe(
      'Assignment spotlight',
    );
  });

  it('falls back to a generic or namespaced label when the widget id is missing', () => {
    expect(getKangurWidgetLabel(undefined)).toBe('Kangur widget');
    expect(getKangurWidgetLabel(null)).toBe('Kangur widget');
    expect(getKangurWidgetLabel('custom-training-widget')).toBe(
      'Kangur: custom-training-widget',
    );
  });
});
