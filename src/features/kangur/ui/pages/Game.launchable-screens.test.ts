import { describe, expect, it } from 'vitest';

import deMessages from '@/i18n/messages/de.json';
import enMessages from '@/i18n/messages/en.json';
import plMessages from '@/i18n/messages/pl.json';
import ukMessages from '@/i18n/messages/uk.json';
import {
  createLaunchableGameScreenComponentConfigFromRuntime,
  getKangurLaunchableGameScreenComponentConfig,
  KANGUR_LAUNCHABLE_GAME_SCREEN_COMPONENTS,
  mergeKangurLaunchableGameRuntimeSpec,
} from './Game.launchable-screens';
import { KANGUR_LAUNCHABLE_GAME_SCREENS } from '@/features/kangur/ui/services/game-launch';
import { getKangurLaunchableGameRuntimeSpec } from '@/features/kangur/games';

describe('Game launchable screen registry', () => {
  it('covers every launchable fullscreen game screen', () => {
    expect(Object.keys(KANGUR_LAUNCHABLE_GAME_SCREEN_COMPONENTS).sort()).toEqual(
      [...KANGUR_LAUNCHABLE_GAME_SCREENS].sort()
    );

    for (const screen of KANGUR_LAUNCHABLE_GAME_SCREENS) {
      const config = getKangurLaunchableGameScreenComponentConfig(screen);

      expect(config.className).toContain('w-full');
      expect(config.Component).toBeTruthy();
      expect(config.runtime.screen).toBe(screen);
      expect(config.runtime.rendererId).toBeTruthy();
    }
  });

  it('has translated labels and descriptions for every launchable fullscreen screen', () => {
    const localeMessages = [plMessages, enMessages, deMessages, ukMessages];

    for (const messages of localeMessages) {
      const screens = messages.KangurGamePage.screens;

      for (const screen of KANGUR_LAUNCHABLE_GAME_SCREENS) {
        expect(screens[screen]).toEqual(
          expect.objectContaining({
            label: expect.any(String),
            description: expect.any(String),
          })
        );
        expect(screens[screen].label.trim().length).toBeGreaterThan(0);
        expect(screens[screen].description.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('merges content-set renderer props with instance engine overrides', () => {
    const runtime = getKangurLaunchableGameRuntimeSpec('clock_quiz');
    const mergedRuntime = mergeKangurLaunchableGameRuntimeSpec(
      runtime,
      { clockSection: 'minutes' },
      {
        clockInitialMode: 'challenge',
        showClockMinuteHand: false,
      }
    );
    const config = createLaunchableGameScreenComponentConfigFromRuntime(mergedRuntime);

    expect(config.runtime.rendererProps).toEqual(
      expect.objectContaining({
        clockInitialMode: 'challenge',
        clockSection: 'minutes',
        showClockMinuteHand: false,
      })
    );
  });

  it('keeps the general adverbs screen wired to the adverbs action runtime', () => {
    const config = getKangurLaunchableGameScreenComponentConfig('english_adverbs_quiz');

    expect(config.runtime).toEqual(
      expect.objectContaining({
        screen: 'english_adverbs_quiz',
        engineId: 'sentence-builder-engine',
        rendererId: 'english_adverbs_action_game',
      })
    );
    expect(enMessages.KangurGamePage.screens.english_adverbs_quiz.label).toBeTruthy();
  });

  it('keeps the going-to screen wired to the plan parade runtime', () => {
    const config = getKangurLaunchableGameScreenComponentConfig('english_going_to_quiz');

    expect(config.runtime).toEqual(
      expect.objectContaining({
        screen: 'english_going_to_quiz',
        engineId: 'sentence-builder-engine',
        rendererId: 'english_going_to_plan_parade_game',
      })
    );
    expect(enMessages.KangurGamePage.screens.english_going_to_quiz.label).toBeTruthy();
  });

  it('keeps the comparatives screen wired to the compare-and-crown runtime', () => {
    const config = getKangurLaunchableGameScreenComponentConfig('english_compare_and_crown_quiz');

    expect(config.runtime).toEqual(
      expect.objectContaining({
        screen: 'english_compare_and_crown_quiz',
        engineId: 'sentence-builder-engine',
        rendererId: 'english_compare_and_crown_game',
      })
    );
    expect(enMessages.KangurGamePage.screens.english_compare_and_crown_quiz.label).toBeTruthy();
  });
});
