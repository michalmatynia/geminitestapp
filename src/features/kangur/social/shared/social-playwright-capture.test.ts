import { describe, expect, it } from 'vitest';

import { KANGUR_SOCIAL_CAPTURE_PRESETS } from './social-capture-presets';
import {
  buildKangurSocialProgrammableCaptureInputPreview,
  buildKangurSocialProgrammableCaptureRoutesFromPresetIds,
} from './social-playwright-capture';

describe('social Playwright capture presets', () => {
  it('includes direct-launch minigame presets for Social capture', () => {
    expect(KANGUR_SOCIAL_CAPTURE_PRESETS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'clock-quiz',
          title: 'Clock Quiz',
          path: '/kangur/game?quickStart=screen&screen=clock_quiz',
          selector: '[data-testid="kangur-clock-quiz-top-section"]',
        }),
        expect.objectContaining({
          id: 'calendar-quiz',
          title: 'Calendar Training',
          path: '/kangur/game?quickStart=screen&screen=calendar_quiz',
          selector: '[data-testid="kangur-calendar-training-top-section"]',
        }),
        expect.objectContaining({
          id: 'geometry-quiz',
          title: 'Geometry Drawing',
          path: '/kangur/game?quickStart=screen&screen=geometry_quiz',
          selector: '[data-testid="kangur-geometry-training-top-section"]',
        }),
      ])
    );
  });

  it('builds programmable capture routes and preview URLs for minigame presets', () => {
    const routes = buildKangurSocialProgrammableCaptureRoutesFromPresetIds([
      'clock-quiz',
      'calendar-quiz',
      'geometry-quiz',
    ]);

    expect(routes).toEqual([
      expect.objectContaining({
        id: 'clock-quiz',
        title: 'Clock Quiz',
        path: '/kangur/game?quickStart=screen&screen=clock_quiz',
        selector: '[data-testid="kangur-clock-quiz-top-section"]',
        waitForMs: 3500,
        waitForSelectorMs: 20000,
      }),
      expect.objectContaining({
        id: 'calendar-quiz',
        title: 'Calendar Training',
        path: '/kangur/game?quickStart=screen&screen=calendar_quiz',
        selector: '[data-testid="kangur-calendar-training-top-section"]',
        waitForMs: 3500,
        waitForSelectorMs: 20000,
      }),
      expect.objectContaining({
        id: 'geometry-quiz',
        title: 'Geometry Drawing',
        path: '/kangur/game?quickStart=screen&screen=geometry_quiz',
        selector: '[data-testid="kangur-geometry-training-top-section"]',
        waitForMs: 3500,
        waitForSelectorMs: 20000,
      }),
    ]);

    expect(
      buildKangurSocialProgrammableCaptureInputPreview(routes, 'https://example.com')
    ).toEqual([
      expect.objectContaining({
        id: 'clock-quiz',
        title: 'Clock Quiz',
        url: 'https://example.com/kangur/game?quickStart=screen&screen=clock_quiz&kangurCapture=social-batch',
      }),
      expect.objectContaining({
        id: 'calendar-quiz',
        title: 'Calendar Training',
        url: 'https://example.com/kangur/game?quickStart=screen&screen=calendar_quiz&kangurCapture=social-batch',
      }),
      expect.objectContaining({
        id: 'geometry-quiz',
        title: 'Geometry Drawing',
        url: 'https://example.com/kangur/game?quickStart=screen&screen=geometry_quiz&kangurCapture=social-batch',
      }),
    ]);
  });
});
