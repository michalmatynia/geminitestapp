import { describe, expect, it } from 'vitest';

import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';

import {
  resolveActionRecommendationTarget,
  resolveLessonRecommendationTarget,
} from '../KangurGameOperationSelectorWidget.logic';

describe('KangurGameOperationSelectorWidget.logic', () => {
  it('resolves lesson recommendations from the shared game launch registry', () => {
    expect(resolveLessonRecommendationTarget('logical_patterns', 82)).toEqual({
      kind: 'screen',
      screen: 'logical_patterns_quiz',
    });

    expect(resolveLessonRecommendationTarget('english_adverbs', 79)).toEqual({
      kind: 'screen',
      screen: 'english_adverbs_quiz',
    });
    expect(resolveLessonRecommendationTarget('english_comparatives_superlatives', 79)).toEqual({
      kind: 'screen',
      screen: 'english_compare_and_crown_quiz',
    });

    expect(resolveLessonRecommendationTarget('english_sentence_structure', 76)).toEqual({
      kind: 'screen',
      screen: 'english_sentence_quiz',
    });

    expect(resolveLessonRecommendationTarget('adding', 42)).toEqual({
      kind: 'operation',
      difficulty: 'easy',
      operation: 'addition',
    });
  });

  it('routes migrated shared-engine lessons to their launchable game screens', () => {
    expect(resolveLessonRecommendationTarget('art_shapes_basic', 65)).toEqual({
      kind: 'screen',
      screen: 'art_shape_rotation_quiz',
    });
    expect(resolveLessonRecommendationTarget('english_adverbs_frequency', 65)).toEqual({
      kind: 'screen',
      screen: 'english_adverbs_frequency_quiz',
    });
  });

  it('understands direct game screen quickstarts', () => {
    expect(
      resolveActionRecommendationTarget(
        {
          page: 'Game',
          query: {
            quickStart: 'screen',
            screen: 'english_parts_of_speech_quiz',
          },
        },
        createDefaultKangurProgressState()
      )
    ).toEqual({
      kind: 'screen',
      screen: 'english_parts_of_speech_quiz',
    });
  });
});
