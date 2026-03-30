import { describe, expect, it } from 'vitest';

import { getKangurGameDefinition } from '@/features/kangur/games/registry';
import {
  KANGUR_MUSIC_PIANO_ROLL_BUILT_IN_INSTANCE_CONFIGS,
  KANGUR_MUSIC_PIANO_ROLL_DEFAULT_CONTENT_SET_IDS,
  KANGUR_MUSIC_PIANO_ROLL_DEFAULT_INSTANCE_IDS,
  KANGUR_MUSIC_PIANO_ROLL_GAME_IDS,
} from '../music-piano-roll-contract';

import {
  getKangurBuiltInGameInstanceId,
  getKangurGameBuiltInInstancesForGame,
} from '../instances';

describe('kangur built-in game instances', () => {
  it('creates stable built-in instance ids for each built-in calendar content set', () => {
    const instances = getKangurGameBuiltInInstancesForGame(getKangurGameDefinition('calendar_interactive'));

    expect(instances.map((instance) => instance.id)).toEqual([
      'calendar_interactive:instance:default',
      'calendar_interactive:instance:calendar-days',
      'calendar_interactive:instance:calendar-months',
      'calendar_interactive:instance:calendar-dates',
    ]);
    expect(instances.map((instance) => instance.contentSetId)).toEqual([
      'calendar_interactive:default',
      'calendar_interactive:calendar-days',
      'calendar_interactive:calendar-months',
      'calendar_interactive:calendar-dates',
    ]);
  });

  it('creates stable built-in instance ids for each built-in logical-pattern content set', () => {
    const instances = getKangurGameBuiltInInstancesForGame(
      getKangurGameDefinition('logical_patterns_workshop')
    );

    expect(instances.map((instance) => instance.id)).toEqual([
      'logical_patterns_workshop:instance:default',
      'logical_patterns_workshop:instance:alphabet-order',
    ]);
    expect(instances.map((instance) => instance.contentSetId)).toEqual([
      'logical_patterns_workshop:default',
      'logical_patterns_workshop:alphabet-order',
    ]);
  });

  it('creates alphabet built-in instances that point at the correct default content feeds', () => {
    const firstWordsInstances = getKangurGameBuiltInInstancesForGame(
      getKangurGameDefinition('alphabet_first_words')
    );
    const matchingInstances = getKangurGameBuiltInInstancesForGame(
      getKangurGameDefinition('alphabet_letter_matching')
    );
    const orderInstances = getKangurGameBuiltInInstancesForGame(
      getKangurGameDefinition('alphabet_letter_order')
    );

    expect(firstWordsInstances).toEqual([
      expect.objectContaining({
        id: 'alphabet_first_words:instance:default',
        contentSetId: 'alphabet_first_words:default',
      }),
    ]);
    expect(matchingInstances).toEqual([
      expect.objectContaining({
        id: 'alphabet_letter_matching:instance:default',
        contentSetId: 'alphabet_letter_matching:default',
      }),
    ]);
    expect(orderInstances).toEqual([
      expect.objectContaining({
        id: 'alphabet_letter_order:instance:default',
        contentSetId: 'alphabet_letter_order:default',
      }),
    ]);
  });

  it('creates arithmetic built-in instances for the shared engines once fullscreen variants exist', () => {
    const addingInstances = getKangurGameBuiltInInstancesForGame(getKangurGameDefinition('adding_ball'));
    const addingSynthesisInstances = getKangurGameBuiltInInstancesForGame(
      getKangurGameDefinition('adding_synthesis')
    );
    const divisionGroupsInstances = getKangurGameBuiltInInstancesForGame(
      getKangurGameDefinition('division_groups')
    );
    const multiplicationArrayInstances = getKangurGameBuiltInInstancesForGame(
      getKangurGameDefinition('multiplication_array')
    );
    const subtractingInstances = getKangurGameBuiltInInstancesForGame(
      getKangurGameDefinition('subtracting_garden')
    );

    expect(addingInstances).toEqual([
      expect.objectContaining({
        id: 'adding_ball:instance:default',
        contentSetId: 'adding_ball:default',
        launchableRuntimeId: 'addition_quiz',
      }),
    ]);
    expect(addingSynthesisInstances).toEqual([
      expect.objectContaining({
        id: 'adding_synthesis:instance:default',
        contentSetId: 'adding_synthesis:default',
        launchableRuntimeId: 'adding_synthesis_quiz',
      }),
    ]);
    expect(divisionGroupsInstances).toEqual([
      expect.objectContaining({
        id: 'division_groups:instance:default',
        contentSetId: 'division_groups:default',
        launchableRuntimeId: 'division_quiz',
      }),
    ]);
    expect(multiplicationArrayInstances).toEqual([
      expect.objectContaining({
        id: 'multiplication_array:instance:default',
        contentSetId: 'multiplication_array:default',
        launchableRuntimeId: 'multiplication_array_quiz',
      }),
    ]);
    expect(subtractingInstances).toEqual([
      expect.objectContaining({
        id: 'subtracting_garden:instance:default',
        contentSetId: 'subtracting_garden:default',
        launchableRuntimeId: 'subtraction_quiz',
      }),
    ]);
  });

  it('creates built-in instances for the shared English grammar engines once fullscreen variants exist', () => {
    const subjectVerbInstances = getKangurGameBuiltInInstancesForGame(
      getKangurGameDefinition('english_subject_verb_agreement')
    );
    const adjectivesInstances = getKangurGameBuiltInInstancesForGame(
      getKangurGameDefinition('english_adjectives_scene')
    );
    const comparativesInstances = getKangurGameBuiltInInstancesForGame(
      getKangurGameDefinition('english_compare_and_crown')
    );
    const adverbsActionInstances = getKangurGameBuiltInInstancesForGame(
      getKangurGameDefinition('english_adverbs_action_studio')
    );
    const adverbsInstances = getKangurGameBuiltInInstancesForGame(
      getKangurGameDefinition('english_adverbs_frequency_routine')
    );
    const articlesInstances = getKangurGameBuiltInInstancesForGame(
      getKangurGameDefinition('english_articles_drag_drop')
    );
    const prepositionsInstances = getKangurGameBuiltInInstancesForGame(
      getKangurGameDefinition('english_prepositions_time_place')
    );
    const prepositionsSortInstances = getKangurGameBuiltInInstancesForGame(
      getKangurGameDefinition('english_prepositions_sort')
    );
    const prepositionsOrderInstances = getKangurGameBuiltInInstancesForGame(
      getKangurGameDefinition('english_prepositions_order')
    );
    const pronounsWarmupInstances = getKangurGameBuiltInInstancesForGame(
      getKangurGameDefinition('english_pronouns_warmup')
    );

    expect(subjectVerbInstances).toEqual([
      expect.objectContaining({
        id: 'english_subject_verb_agreement:instance:default',
        contentSetId: 'english_subject_verb_agreement:default',
        launchableRuntimeId: 'english_subject_verb_agreement_quiz',
      }),
    ]);
    expect(adjectivesInstances).toEqual([
      expect.objectContaining({
        id: 'english_adjectives_scene:instance:default',
        contentSetId: 'english_adjectives_scene:default',
        launchableRuntimeId: 'english_adjectives_quiz',
      }),
    ]);
    expect(comparativesInstances).toEqual([
      expect.objectContaining({
        id: 'english_compare_and_crown:instance:default',
        contentSetId: 'english_compare_and_crown:default',
        launchableRuntimeId: 'english_compare_and_crown_quiz',
      }),
    ]);
    expect(adverbsActionInstances).toEqual([
      expect.objectContaining({
        id: 'english_adverbs_action_studio:instance:default',
        contentSetId: 'english_adverbs_action_studio:default',
        launchableRuntimeId: 'english_adverbs_quiz',
      }),
    ]);
    expect(adverbsInstances).toEqual([
      expect.objectContaining({
        id: 'english_adverbs_frequency_routine:instance:default',
        contentSetId: 'english_adverbs_frequency_routine:default',
        launchableRuntimeId: 'english_adverbs_frequency_quiz',
      }),
    ]);
    expect(articlesInstances).toEqual([
      expect.objectContaining({
        id: 'english_articles_drag_drop:instance:default',
        contentSetId: 'english_articles_drag_drop:default',
        launchableRuntimeId: 'english_articles_quiz',
      }),
    ]);
    expect(prepositionsInstances).toEqual([
      expect.objectContaining({
        id: 'english_prepositions_time_place:instance:default',
        contentSetId: 'english_prepositions_time_place:default',
        launchableRuntimeId: 'english_prepositions_quiz',
      }),
    ]);
    expect(prepositionsSortInstances).toEqual([
      expect.objectContaining({
        id: 'english_prepositions_sort:instance:default',
        contentSetId: 'english_prepositions_sort:default',
        launchableRuntimeId: 'english_prepositions_sort_quiz',
      }),
    ]);
    expect(prepositionsOrderInstances).toEqual([
      expect.objectContaining({
        id: 'english_prepositions_order:instance:default',
        contentSetId: 'english_prepositions_order:default',
        launchableRuntimeId: 'english_prepositions_order_quiz',
      }),
    ]);
    expect(pronounsWarmupInstances).toEqual([
      expect.objectContaining({
        id: 'english_pronouns_warmup:instance:default',
        contentSetId: 'english_pronouns_warmup:default',
        launchableRuntimeId: 'english_pronouns_warmup_quiz',
      }),
    ]);
  });

  it('creates built-in instances for seeded agentic games once fullscreen variants exist', () => {
    const promptTrimInstances = getKangurGameBuiltInInstancesForGame(
      getKangurGameDefinition('agentic_prompt_trim_stage')
    );
    const approvalGateInstances = getKangurGameBuiltInInstancesForGame(
      getKangurGameDefinition('agentic_approval_gate')
    );
    const reasoningRouterInstances = getKangurGameBuiltInInstancesForGame(
      getKangurGameDefinition('agentic_reasoning_router')
    );
    const surfaceMatchInstances = getKangurGameBuiltInInstancesForGame(
      getKangurGameDefinition('agentic_surface_match')
    );

    expect(promptTrimInstances).toEqual([
      expect.objectContaining({
        id: 'agentic_prompt_trim_stage:instance:default',
        contentSetId: 'agentic_prompt_trim_stage:default',
        launchableRuntimeId: 'agentic_prompt_trim_quiz',
      }),
    ]);
    expect(approvalGateInstances).toEqual([
      expect.objectContaining({
        id: 'agentic_approval_gate:instance:default',
        contentSetId: 'agentic_approval_gate:default',
        launchableRuntimeId: 'agentic_approval_gate_quiz',
      }),
    ]);
    expect(reasoningRouterInstances).toEqual([
      expect.objectContaining({
        id: 'agentic_reasoning_router:instance:default',
        contentSetId: 'agentic_reasoning_router:default',
        launchableRuntimeId: 'agentic_reasoning_router_quiz',
      }),
    ]);
    expect(surfaceMatchInstances).toEqual([
      expect.objectContaining({
        id: 'agentic_surface_match:instance:default',
        contentSetId: 'agentic_surface_match:default',
        launchableRuntimeId: 'agentic_surface_match_quiz',
      }),
    ]);
  });

  it('creates a built-in instance for the shape spotter game once its fullscreen variant exists', () => {
    const instances = getKangurGameBuiltInInstancesForGame(
      getKangurGameDefinition('geometry_shape_spotter')
    );

    expect(instances).toEqual([
      expect.objectContaining({
        id: 'geometry_shape_spotter:instance:default',
        contentSetId: 'geometry_shape_spotter:default',
        launchableRuntimeId: 'geometry_shape_spotter_quiz',
      }),
    ]);
  });

  it('derives stable instance ids from built-in content-set ids', () => {
    expect(
      getKangurBuiltInGameInstanceId(
        KANGUR_MUSIC_PIANO_ROLL_GAME_IDS.freePlay,
        KANGUR_MUSIC_PIANO_ROLL_DEFAULT_CONTENT_SET_IDS.freePlay
      )
    ).toBe(KANGUR_MUSIC_PIANO_ROLL_DEFAULT_INSTANCE_IDS.freePlay);
    expect(
      getKangurBuiltInGameInstanceId('clock_training', 'clock_training:clock-hours')
    ).toBe('clock_training:instance:clock-hours');
  });

  it('uses the shared music built-in instance contract for default piano roll games', () => {
    const repeatInstances = getKangurGameBuiltInInstancesForGame(
      getKangurGameDefinition(KANGUR_MUSIC_PIANO_ROLL_GAME_IDS.repeat)
    );
    const freePlayInstances = getKangurGameBuiltInInstancesForGame(
      getKangurGameDefinition(KANGUR_MUSIC_PIANO_ROLL_GAME_IDS.freePlay)
    );

    expect(repeatInstances).toEqual([
      expect.objectContaining(KANGUR_MUSIC_PIANO_ROLL_BUILT_IN_INSTANCE_CONFIGS.music_melody_repeat),
    ]);
    expect(freePlayInstances).toEqual([
      expect.objectContaining(
        KANGUR_MUSIC_PIANO_ROLL_BUILT_IN_INSTANCE_CONFIGS.music_piano_roll_free_play
      ),
    ]);
  });
});
