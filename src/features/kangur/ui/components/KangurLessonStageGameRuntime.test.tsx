/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { createMockGame } = vi.hoisted(() => ({
  createMockGame: (label: string) =>
    function MockGame({
      onFinish,
      finishLabel,
      finishLabelVariant,
    }: {
      onFinish?: () => void;
      finishLabel?: string;
      finishLabelVariant?: string;
    }): React.JSX.Element {
      return (
        <button
          data-finish-label-variant={finishLabelVariant}
          type='button'
          onClick={onFinish}
        >
          {finishLabel ?? label}
        </button>
      );
    },
}));

vi.mock('@/features/kangur/ui/components/EnglishAdjectivesSceneGame', () => ({
  default: createMockGame('EnglishAdjectivesSceneGame'),
}));
vi.mock('@/features/kangur/ui/components/AgenticApprovalGateGame', () => ({
  default: createMockGame('AgenticApprovalGateGame'),
}));
vi.mock('@/features/kangur/ui/components/AgenticPromptTrimGame', () => ({
  default: createMockGame('AgenticPromptTrimGame'),
}));
vi.mock('@/features/kangur/ui/components/AgenticReasoningRouterGame', () => ({
  default: createMockGame('AgenticReasoningRouterGame'),
}));
vi.mock('@/features/kangur/ui/components/AgenticSurfaceMatchGame', () => ({
  default: createMockGame('AgenticSurfaceMatchGame'),
}));
vi.mock('@/features/kangur/ui/components/AddingBallGame', () => ({
  default: createMockGame('AddingBallGame'),
}));
vi.mock('@/features/kangur/ui/components/AddingSynthesisGame', () => ({
  default: createMockGame('AddingSynthesisGame'),
}));
vi.mock('@/features/kangur/ui/components/ArtShapesRotationGapGame', () => ({
  ArtShapesRotationGapGame: createMockGame('ArtShapesRotationGapGame'),
}));
vi.mock('@/features/kangur/ui/components/CalendarInteractiveStageGame', () => ({
  default: ({
    onFinish,
    calendarSection,
  }: {
    onFinish?: () => void;
    calendarSection?: string;
  }) => (
    <button data-section={calendarSection} type='button' onClick={onFinish}>
      CalendarInteractiveStageGame
    </button>
  ),
}));
vi.mock('@/features/kangur/ui/components/ClockTrainingStageGame', () => ({
  default: ({
    onFinish,
    clockSection,
  }: {
    onFinish?: () => void;
    clockSection?: string;
  }) => (
    <button data-section={clockSection} type='button' onClick={onFinish}>
      ClockTrainingStageGame
    </button>
  ),
}));
vi.mock('@/features/kangur/ui/components/DivisionGroupsGame', () => ({
  default: createMockGame('DivisionGroupsGame'),
}));
vi.mock('@/features/kangur/ui/components/EnglishSubjectVerbAgreementGame', () => ({
  default: createMockGame('EnglishSubjectVerbAgreementGame'),
}));
vi.mock('@/features/kangur/ui/components/EnglishAdverbsFrequencyRoutineGame', () => ({
  default: createMockGame('EnglishAdverbsFrequencyRoutineGame'),
}));
vi.mock('@/features/kangur/ui/components/EnglishArticlesDragDropGame', () => ({
  default: createMockGame('EnglishArticlesDragDropGame'),
}));
vi.mock('@/features/kangur/ui/components/EnglishPartsOfSpeechGame', () => ({
  default: createMockGame('EnglishPartsOfSpeechGame'),
}));
vi.mock('@/features/kangur/ui/components/EnglishPrepositionsGame', () => ({
  default: createMockGame('EnglishPrepositionsGame'),
}));
vi.mock('@/features/kangur/ui/components/EnglishPrepositionsOrderGame', () => ({
  default: createMockGame('EnglishPrepositionsOrderGame'),
}));
vi.mock('@/features/kangur/ui/components/EnglishPrepositionsSortGame', () => ({
  default: createMockGame('EnglishPrepositionsSortGame'),
}));
vi.mock('@/features/kangur/ui/components/EnglishSentenceStructureGame', () => ({
  default: createMockGame('EnglishSentenceStructureGame'),
}));
vi.mock('@/features/kangur/ui/components/EnglishPronounsWarmupGame', () => ({
  default: createMockGame('EnglishPronounsWarmupGame'),
}));
vi.mock('@/features/kangur/ui/components/GeometryBasicsWorkshopGame', () => ({
  default: createMockGame('GeometryBasicsWorkshopGame'),
}));
vi.mock('@/features/kangur/ui/components/GeometryDrawingGame', () => ({
  default: createMockGame('GeometryDrawingGame'),
}));
vi.mock('@/features/kangur/ui/components/GeometryPerimeterDrawingGame', () => ({
  default: createMockGame('GeometryPerimeterDrawingGame'),
}));
vi.mock('@/features/kangur/ui/components/GeometrySymmetryGame', () => ({
  default: createMockGame('GeometrySymmetryGame'),
}));
vi.mock('@/features/kangur/ui/components/LogicalAnalogiesRelationGame', () => ({
  default: createMockGame('LogicalAnalogiesRelationGame'),
}));
vi.mock('@/features/kangur/ui/components/LogicalClassificationGame', () => ({
  default: createMockGame('LogicalClassificationGame'),
}));
vi.mock('@/features/kangur/ui/components/LogicalPatternsWorkshopGame', () => ({
  default: ({
    onFinish,
    finishLabel,
    patternSetId,
  }: {
    onFinish?: () => void;
    finishLabel?: string;
    patternSetId?: string;
  }) => (
    <button data-pattern-set-id={patternSetId} type='button' onClick={onFinish}>
      {finishLabel ?? 'LogicalPatternsWorkshopGame'}
    </button>
  ),
}));
vi.mock('@/features/kangur/ui/components/MultiplicationArrayGame', () => ({
  default: createMockGame('MultiplicationArrayGame'),
}));
vi.mock('@/features/kangur/ui/components/ShapeRecognitionStageGame', () => ({
  default: createMockGame('ShapeRecognitionStageGame'),
}));
vi.mock('@/features/kangur/ui/components/music/MusicMelodyRepeatGame', () => ({
  default: createMockGame('MusicMelodyRepeatGame'),
}));
vi.mock('@/features/kangur/ui/components/music/MusicPianoRollFreePlayGame', () => ({
  default: createMockGame('MusicPianoRollFreePlayGame'),
}));
vi.mock('@/features/kangur/ui/components/SubtractingGardenGame', () => ({
  default: createMockGame('SubtractingGardenGame'),
}));

import { getKangurLessonStageGameRuntimeSpec } from '@/features/kangur/games/lesson-stage-runtime-specs';
import { KangurLessonStageGameRuntime } from '@/features/kangur/ui/components/KangurLessonStageGameRuntime';

describe('KangurLessonStageGameRuntime', () => {
  it('renders the configured lesson-stage game component and forwards finish handling', () => {
    const onFinish = vi.fn();

    render(
      <KangurLessonStageGameRuntime
        runtime={getKangurLessonStageGameRuntimeSpec('logical_patterns_workshop_lesson_stage')}
        finishLabel='Finish lesson game'
        onFinish={onFinish}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Finish lesson game' }));

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('forwards serialized renderer props into the shared stage runtime component', () => {
    render(
      <KangurLessonStageGameRuntime
        runtime={getKangurLessonStageGameRuntimeSpec('alphabet_letter_order_lesson_stage')}
        onFinish={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'LogicalPatternsWorkshopGame' })).toHaveAttribute(
      'data-pattern-set-id',
      'alphabet_letter_order'
    );
  });

  it('switches renderer components from the shared runtime spec rather than lesson-local render callbacks', () => {
    render(
      <KangurLessonStageGameRuntime
        runtime={getKangurLessonStageGameRuntimeSpec('english_pronouns_warmup_lesson_stage')}
        onFinish={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'EnglishPronounsWarmupGame' })).toBeInTheDocument();
  });

  it('supports calendar and clock lesson-stage runtimes through the same shared registry', () => {
    const { rerender } = render(
      <KangurLessonStageGameRuntime
        runtime={getKangurLessonStageGameRuntimeSpec('calendar_interactive_days_lesson_stage')}
        onFinish={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'CalendarInteractiveStageGame' })).toHaveAttribute(
      'data-section',
      'dni'
    );

    rerender(
      <KangurLessonStageGameRuntime
        runtime={getKangurLessonStageGameRuntimeSpec('clock_training_combined_lesson_stage')}
        onFinish={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'ClockTrainingStageGame' })).toHaveAttribute(
      'data-section',
      'combined'
    );
  });

  it('supports the geometry lesson-stage runtime renderers through the same registry', () => {
    const { rerender } = render(
      <KangurLessonStageGameRuntime
        runtime={getKangurLessonStageGameRuntimeSpec('geometry_symmetry_studio_lesson_stage')}
        onFinish={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'GeometrySymmetryGame' })).toBeInTheDocument();

    rerender(
      <KangurLessonStageGameRuntime
        runtime={getKangurLessonStageGameRuntimeSpec('geometry_shape_spotter_lesson_stage')}
        onFinish={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'ShapeRecognitionStageGame' })).toBeInTheDocument();
  });

  it('supports the sentence-builder lesson-stage runtime through the same registry', () => {
    render(
      <KangurLessonStageGameRuntime
        runtime={getKangurLessonStageGameRuntimeSpec('english_sentence_builder_lesson_stage')}
        onFinish={vi.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: 'EnglishSentenceStructureGame' })
    ).toBeInTheDocument();
  });

  it('supports the extracted English grammar lesson-stage runtimes through the same registry', () => {
    render(
      <KangurLessonStageGameRuntime
        runtime={getKangurLessonStageGameRuntimeSpec('english_articles_drag_lesson_stage')}
        onFinish={vi.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: 'EnglishArticlesDragDropGame' })
    ).toBeInTheDocument();
  });

  it('supports the extracted agentic lesson-stage runtimes through the same registry', () => {
    const { rerender } = render(
      <KangurLessonStageGameRuntime
        runtime={getKangurLessonStageGameRuntimeSpec('agentic_prompt_trim_lesson_stage')}
        onFinish={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'AgenticPromptTrimGame' })).toBeInTheDocument();

    rerender(
      <KangurLessonStageGameRuntime
        runtime={getKangurLessonStageGameRuntimeSpec('agentic_surface_match_lesson_stage')}
        onFinish={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'AgenticSurfaceMatchGame' })).toBeInTheDocument();
  });

  it('supports the art and music lesson-stage runtimes through the same registry', () => {
    render(
      <KangurLessonStageGameRuntime
        runtime={getKangurLessonStageGameRuntimeSpec('music_melody_repeat_lesson_stage')}
        onFinish={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'MusicMelodyRepeatGame' })).toBeInTheDocument();
  });

  it('supports lesson-only shared stage runtimes through the same registry', () => {
    render(
      <KangurLessonStageGameRuntime
        runtime={getKangurLessonStageGameRuntimeSpec('english_subject_verb_agreement_lesson_stage')}
        onFinish={vi.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: 'EnglishSubjectVerbAgreementGame' })
    ).toBeInTheDocument();
  });

  it('passes serializable renderer props through the shared runtime interpreter', () => {
    render(
      <KangurLessonStageGameRuntime
        runtime={getKangurLessonStageGameRuntimeSpec('geometry_shape_drawing_lesson_stage')}
        onFinish={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'GeometryDrawingGame' })).toBeInTheDocument();
  });

  it('supports the arithmetic lesson-stage runtimes through the same registry', () => {
    const { rerender } = render(
      <KangurLessonStageGameRuntime
        runtime={getKangurLessonStageGameRuntimeSpec('adding_synthesis_lesson_stage')}
        onFinish={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'AddingSynthesisGame' })).toBeInTheDocument();

    rerender(
      <KangurLessonStageGameRuntime
        runtime={getKangurLessonStageGameRuntimeSpec('subtracting_garden_lesson_stage')}
        onFinish={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'SubtractingGardenGame' })).toBeInTheDocument();

    rerender(
      <KangurLessonStageGameRuntime
        runtime={getKangurLessonStageGameRuntimeSpec('division_groups_lesson_stage')}
        onFinish={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'DivisionGroupsGame' })).toBeInTheDocument();

    rerender(
      <KangurLessonStageGameRuntime
        runtime={getKangurLessonStageGameRuntimeSpec('multiplication_array_lesson_stage')}
        onFinish={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'MultiplicationArrayGame' })).toBeInTheDocument();
  });

  it('forwards arithmetic finish label variants through the serialized runtime props', () => {
    const { rerender } = render(
      <KangurLessonStageGameRuntime
        runtime={getKangurLessonStageGameRuntimeSpec('adding_ball_lesson_stage')}
        onFinish={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'AddingBallGame' })).toHaveAttribute(
      'data-finish-label-variant',
      'topics'
    );

    rerender(
      <KangurLessonStageGameRuntime
        runtime={getKangurLessonStageGameRuntimeSpec('division_groups_lesson_stage')}
        onFinish={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'DivisionGroupsGame' })).toHaveAttribute(
      'data-finish-label-variant',
      'topics'
    );

    rerender(
      <KangurLessonStageGameRuntime
        runtime={getKangurLessonStageGameRuntimeSpec('multiplication_array_lesson_stage')}
        onFinish={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'MultiplicationArrayGame' })).toHaveAttribute(
      'data-finish-label-variant',
      'topics'
    );
  });
});
