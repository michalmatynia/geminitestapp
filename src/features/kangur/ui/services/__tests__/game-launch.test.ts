import { describe, expect, it } from 'vitest';

import { createDefaultKangurGames } from '@/features/kangur/games';

import {
  buildKangurGameLaunchHref,
  buildKangurGameInstanceLaunchHref,
  buildKangurGameLessonHref,
  getKangurLaunchableGameContentId,
  getKangurLaunchableGameScreen,
  getKangurLaunchableGameScreenForLessonComponent,
  isKangurLaunchableGameContentId,
} from '../game-launch';

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
    expect(getKangurLaunchableGameScreen(findGame('adding_ball'))).toBe('addition_quiz');
    expect(getKangurLaunchableGameScreen(findGame('english_adverbs_action_studio'))).toBe(
      'english_adverbs_quiz'
    );
    expect(getKangurLaunchableGameScreen(findGame('english_compare_and_crown'))).toBe(
      'english_compare_and_crown_quiz'
    );
  });

  it('maps lesson components to launchable fullscreen screens when variants exist', () => {
    expect(getKangurLaunchableGameScreenForLessonComponent('logical_patterns')).toBe(
      'logical_patterns_quiz'
    );
    expect(getKangurLaunchableGameScreenForLessonComponent('english_sentence_structure')).toBe(
      'english_sentence_quiz'
    );
    expect(getKangurLaunchableGameScreenForLessonComponent('english_adverbs')).toBe(
      'english_adverbs_quiz'
    );
    expect(getKangurLaunchableGameScreenForLessonComponent('english_comparatives_superlatives')).toBe(
      'english_compare_and_crown_quiz'
    );
    expect(getKangurLaunchableGameScreenForLessonComponent('adding')).toBe('addition_quiz');
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
    expect(buildKangurGameLaunchHref('/kangur', findGame('adding_ball'))).toBe(
      '/kangur/game?quickStart=screen&screen=addition_quiz'
    );
    expect(buildKangurGameLaunchHref('/kangur', findGame('english_adverbs_action_studio'))).toBe(
      '/kangur/game?quickStart=screen&screen=english_adverbs_quiz'
    );
    expect(buildKangurGameLaunchHref('/kangur', findGame('english_compare_and_crown'))).toBe(
      '/kangur/game?quickStart=screen&screen=english_compare_and_crown_quiz'
    );

    expect(buildKangurGameLessonHref('/kangur', findGame('clock_training'))).toBe(
      '/kangur/lessons?focus=clock'
    );
    expect(buildKangurGameLessonHref('/kangur', findGame('english_adverbs_action_studio'))).toBe(
      '/kangur/lessons?focus=english_adverbs'
    );
    expect(buildKangurGameLessonHref('/kangur', findGame('english_compare_and_crown'))).toBe(
      '/kangur/lessons?focus=english_comparatives_superlatives'
    );
  });

  it('builds instance launch hrefs for shared arithmetic runtimes', () => {
    expect(
      buildKangurGameInstanceLaunchHref('/kangur', {
        id: 'adding_ball:instance:default',
        launchableRuntimeId: 'addition_quiz',
      })
    ).toBe(
      '/kangur/game?quickStart=screen&screen=addition_quiz&instanceId=adding_ball%3Ainstance%3Adefault'
    );
    expect(
      buildKangurGameInstanceLaunchHref('/', {
        id: 'adding_synthesis:instance:default',
        launchableRuntimeId: 'adding_synthesis_quiz',
      })
    ).toBe(
      '/game?quickStart=screen&screen=adding_synthesis_quiz&instanceId=adding_synthesis%3Ainstance%3Adefault'
    );
  });

  it('shares launchable tutor content ids across runtime and tutor layout code', () => {
    expect(getKangurLaunchableGameContentId('logical_patterns_quiz')).toBe(
      'game:logical_patterns_quiz'
    );
    expect(getKangurLaunchableGameContentId('english_adverbs_quiz')).toBe(
      'game:english_adverbs_quiz'
    );
    expect(getKangurLaunchableGameContentId('english_compare_and_crown_quiz')).toBe(
      'game:english_compare_and_crown_quiz'
    );
    expect(isKangurLaunchableGameContentId('game:logical_patterns_quiz')).toBe(true);
    expect(isKangurLaunchableGameContentId('game:english_adverbs_quiz')).toBe(true);
    expect(isKangurLaunchableGameContentId('game:english_compare_and_crown_quiz')).toBe(true);
    expect(isKangurLaunchableGameContentId('game:home')).toBe(false);
  });
});
