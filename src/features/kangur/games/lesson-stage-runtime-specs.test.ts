import { describe, expect, it } from 'vitest';

import { createDefaultKangurGames } from './defaults';
import {
  getKangurLessonStageGameRuntimeSpec,
  KANGUR_LESSON_STAGE_GAME_RUNTIME_SPECS,
} from './lesson-stage-runtime-specs';
import {
  KANGUR_LESSON_STAGE_GAME_RUNTIME_IDS,
  kangurLessonStageGameRuntimeSpecSchema,
} from '@/shared/contracts/kangur-games';

describe('lesson stage runtime specs', () => {
  it('covers every shared lesson-stage runtime with a schema-valid serializable spec', () => {
    expect(Object.keys(KANGUR_LESSON_STAGE_GAME_RUNTIME_SPECS).sort()).toEqual(
      [...KANGUR_LESSON_STAGE_GAME_RUNTIME_IDS].sort()
    );

    for (const runtimeId of KANGUR_LESSON_STAGE_GAME_RUNTIME_IDS) {
      const spec = getKangurLessonStageGameRuntimeSpec(runtimeId);

      expect(spec.runtimeId).toBe(runtimeId);
      expect(kangurLessonStageGameRuntimeSpecSchema.parse(spec)).toEqual(spec);
    }
  });

  it('keeps seeded lesson-stage variants pointed at runtime specs instead of inline lesson-local renderers', () => {
    const lessonStageVariants = createDefaultKangurGames().flatMap((game) =>
      game.variants.filter((variant) => variant.surface === 'lesson_stage')
    );

    expect(lessonStageVariants.length).toBeGreaterThan(0);
    expect(
      lessonStageVariants
        .filter((variant) =>
          [
            'adding_ball.lesson-stage',
            'adding_synthesis.lesson-stage',
            'agentic_prompt_trim_stage.lesson-stage',
            'agentic_approval_gate.lesson-stage',
            'agentic_reasoning_router.lesson-stage',
            'agentic_surface_match.lesson-stage',
            'art_shape_rotation_puzzle.lesson-stage',
            'division_groups.lesson-stage',
            'geometry_shape_workshop.lesson-stage',
            'geometry_shape_drawing.lesson-stage',
            'geometry_symmetry_studio.lesson-stage',
            'geometry_perimeter_trainer.lesson-stage',
            'english_sentence_builder.lesson-stage',
            'logical_patterns_workshop.lesson-stage',
            'logical_classification_lab.lesson-stage',
            'logical_analogies_relations.lesson-stage',
            'multiplication_array.lesson-stage',
            'english_parts_of_speech_sort.lesson-stage',
            'music_melody_repeat.lesson-stage',
            'music_piano_roll_free_play.lesson-stage',
            'subtracting_garden.lesson-stage',
          ].includes(variant.id)
        )
        .every((variant) => Boolean(variant.lessonStageRuntimeId))
    ).toBe(true);
    expect(
      lessonStageVariants.map((variant) => variant.lessonStageRuntimeId).filter(Boolean)
    ).toEqual(
      expect.arrayContaining([
        'adding_ball_lesson_stage',
        'adding_synthesis_lesson_stage',
        'agentic_prompt_trim_lesson_stage',
        'agentic_approval_gate_lesson_stage',
        'agentic_reasoning_router_lesson_stage',
        'agentic_surface_match_lesson_stage',
        'art_shape_rotation_puzzle_lesson_stage',
        'division_groups_lesson_stage',
        'geometry_shape_workshop_lesson_stage',
        'geometry_shape_drawing_lesson_stage',
        'english_sentence_builder_lesson_stage',
        'geometry_symmetry_studio_lesson_stage',
        'geometry_perimeter_trainer_lesson_stage',
        'logical_patterns_workshop_lesson_stage',
        'logical_classification_lab_lesson_stage',
        'logical_analogies_relations_lesson_stage',
        'multiplication_array_lesson_stage',
        'english_parts_of_speech_sort_lesson_stage',
        'music_melody_repeat_lesson_stage',
        'music_piano_roll_free_play_lesson_stage',
        'subtracting_garden_lesson_stage',
      ])
    );
  });
});
