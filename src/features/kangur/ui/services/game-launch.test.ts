import { describe, expect, it } from 'vitest';

import { createDefaultKangurGames } from '@/features/kangur/games';

import {
  buildKangurGameLaunchHref,
  buildKangurGameLessonHref,
  getKangurLaunchableGameContentId,
  getKangurLaunchableGameScreen,
  getKangurLaunchableGameScreenForLessonComponent,
  isKangurLaunchableGameContentId,
} from './game-launch';

const findGame = (gameId: string) => {
  const game = createDefaultKangurGames().find((entry) => entry.id === gameId);
  if (!game) {
    throw new Error(`Missing test game "${gameId}".`);
  }

  return game;
};

describe('game launch helpers', () => {
  it('resolves fullscreen game screens from the shared game registry', () => {
    expect(getKangurLaunchableGameScreen(findGame('clock_training'))).toBe('clock_quiz');
    expect(getKangurLaunchableGameScreen(findGame('adding_ball'))).toBeNull();
  });

  it('maps lesson components to launchable fullscreen screens when variants exist', () => {
    expect(getKangurLaunchableGameScreenForLessonComponent('logical_patterns')).toBe(
      'logical_patterns_quiz'
    );
    expect(getKangurLaunchableGameScreenForLessonComponent('english_sentence_structure')).toBe(
      'english_sentence_quiz'
    );
    expect(getKangurLaunchableGameScreenForLessonComponent('adding')).toBeNull();
  });

  it('keeps the definition-level launch fallback for synthetic legacy-only games', () => {
    const game = findGame('english_sentence_builder');
    const legacyOnlyGame = {
      ...game,
      legacyScreenIds: ['english_sentence_quiz'],
      variants: game.variants.filter((variant) => variant.surface !== 'game_screen'),
    };

    expect(getKangurLaunchableGameScreen(legacyOnlyGame)).toBe('english_sentence_quiz');
  });

  it('builds game and lesson hrefs from the shared definitions', () => {
    expect(buildKangurGameLaunchHref('/kangur', findGame('clock_training'))).toBe(
      '/kangur/game?quickStart=screen&screen=clock_quiz'
    );
    expect(buildKangurGameLaunchHref('/kangur', findGame('adding_ball'))).toBeNull();

    expect(buildKangurGameLessonHref('/kangur', findGame('clock_training'))).toBe(
      '/kangur/lessons?focus=clock'
    );
  });

  it('shares launchable tutor content ids across runtime and tutor layout code', () => {
    expect(getKangurLaunchableGameContentId('logical_patterns_quiz')).toBe(
      'game:logical_patterns_quiz'
    );
    expect(isKangurLaunchableGameContentId('game:logical_patterns_quiz')).toBe(true);
    expect(isKangurLaunchableGameContentId('game:home')).toBe(false);
  });
});
