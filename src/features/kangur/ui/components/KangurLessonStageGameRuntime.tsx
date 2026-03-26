'use client';

import type { ComponentType } from 'react';

import type {
  KangurLessonStageGameRuntimeRendererId,
  KangurLessonStageGameRuntimeSpec,
} from '@/shared/contracts/kangur-games';
import type { KangurMiniGameFinishProps } from '@/features/kangur/ui/types';

import AgenticApprovalGateGame from '@/features/kangur/ui/components/AgenticApprovalGateGame';
import AgenticPromptTrimGame from '@/features/kangur/ui/components/AgenticPromptTrimGame';
import AgenticReasoningRouterGame from '@/features/kangur/ui/components/AgenticReasoningRouterGame';
import AddingBallGame from '@/features/kangur/ui/components/AddingBallGame';
import AddingSynthesisGame from '@/features/kangur/ui/components/AddingSynthesisGame';
import { ArtShapesRotationGapGame } from '@/features/kangur/ui/components/ArtShapesRotationGapGame';
import DivisionGroupsGame from '@/features/kangur/ui/components/DivisionGroupsGame';
import EnglishSubjectVerbAgreementGame from '@/features/kangur/ui/components/EnglishSubjectVerbAgreementGame';
import EnglishAdjectivesSceneGame from '@/features/kangur/ui/components/EnglishAdjectivesSceneGame';
import EnglishAdverbsFrequencyRoutineGame from '@/features/kangur/ui/components/EnglishAdverbsFrequencyRoutineGame';
import EnglishArticlesDragDropGame from '@/features/kangur/ui/components/EnglishArticlesDragDropGame';
import EnglishPartsOfSpeechGame from '@/features/kangur/ui/components/EnglishPartsOfSpeechGame';
import EnglishPrepositionsGame from '@/features/kangur/ui/components/EnglishPrepositionsGame';
import EnglishPrepositionsOrderGame from '@/features/kangur/ui/components/EnglishPrepositionsOrderGame';
import EnglishPrepositionsSortGame from '@/features/kangur/ui/components/EnglishPrepositionsSortGame';
import EnglishSentenceStructureGame from '@/features/kangur/ui/components/EnglishSentenceStructureGame';
import EnglishPronounsWarmupGame from '@/features/kangur/ui/components/EnglishPronounsWarmupGame';
import GeometryBasicsWorkshopGame from '@/features/kangur/ui/components/GeometryBasicsWorkshopGame';
import GeometryDrawingGame from '@/features/kangur/ui/components/GeometryDrawingGame';
import GeometryPerimeterDrawingGame from '@/features/kangur/ui/components/GeometryPerimeterDrawingGame';
import GeometrySymmetryGame from '@/features/kangur/ui/components/GeometrySymmetryGame';
import LogicalAnalogiesRelationGame from '@/features/kangur/ui/components/LogicalAnalogiesRelationGame';
import LogicalClassificationGame from '@/features/kangur/ui/components/LogicalClassificationGame';
import LogicalPatternsWorkshopGame from '@/features/kangur/ui/components/LogicalPatternsWorkshopGame';
import MultiplicationArrayGame from '@/features/kangur/ui/components/MultiplicationArrayGame';
import MusicMelodyRepeatGame from '@/features/kangur/ui/components/music/MusicMelodyRepeatGame';
import MusicPianoRollFreePlayGame from '@/features/kangur/ui/components/music/MusicPianoRollFreePlayGame';
import SubtractingGardenGame from '@/features/kangur/ui/components/SubtractingGardenGame';

type LessonStageGameRuntimeProps = Pick<KangurMiniGameFinishProps, 'finishLabel' | 'onFinish'> & {
  runtime: KangurLessonStageGameRuntimeSpec;
};

type LessonStageRuntimeComponentProps = KangurMiniGameFinishProps & Record<string, unknown>;

const RUNTIME_COMPONENTS: Record<
  KangurLessonStageGameRuntimeRendererId,
  ComponentType<LessonStageRuntimeComponentProps>
> = {
  adding_ball_game: AddingBallGame as ComponentType<LessonStageRuntimeComponentProps>,
  adding_synthesis_game: AddingSynthesisGame as ComponentType<LessonStageRuntimeComponentProps>,
  agentic_approval_gate_game: AgenticApprovalGateGame,
  agentic_prompt_trim_game: AgenticPromptTrimGame,
  agentic_reasoning_router_game: AgenticReasoningRouterGame,
  art_shapes_rotation_gap_game: ArtShapesRotationGapGame,
  division_groups_game: DivisionGroupsGame as ComponentType<LessonStageRuntimeComponentProps>,
  english_subject_verb_agreement_game: EnglishSubjectVerbAgreementGame,
  english_adjectives_scene_game: EnglishAdjectivesSceneGame,
  english_adverbs_frequency_routine_game: EnglishAdverbsFrequencyRoutineGame,
  english_articles_drag_drop_game: EnglishArticlesDragDropGame,
  english_parts_of_speech_game: EnglishPartsOfSpeechGame,
  english_prepositions_game: EnglishPrepositionsGame,
  english_prepositions_order_game: EnglishPrepositionsOrderGame,
  english_prepositions_sort_game: EnglishPrepositionsSortGame,
  english_sentence_structure_game: EnglishSentenceStructureGame,
  english_pronouns_warmup_game: EnglishPronounsWarmupGame,
  geometry_basics_workshop_game: GeometryBasicsWorkshopGame,
  geometry_drawing_game: GeometryDrawingGame,
  geometry_perimeter_drawing_game: GeometryPerimeterDrawingGame,
  geometry_symmetry_game: GeometrySymmetryGame,
  logical_analogies_relation_game: LogicalAnalogiesRelationGame,
  logical_classification_game: LogicalClassificationGame,
  logical_patterns_workshop_game: LogicalPatternsWorkshopGame,
  multiplication_array_game: MultiplicationArrayGame as ComponentType<LessonStageRuntimeComponentProps>,
  music_melody_repeat_game: MusicMelodyRepeatGame,
  music_piano_roll_free_play_game: MusicPianoRollFreePlayGame,
  subtracting_garden_game: SubtractingGardenGame as ComponentType<LessonStageRuntimeComponentProps>,
};

export function KangurLessonStageGameRuntime({
  runtime,
  finishLabel,
  onFinish,
}: LessonStageGameRuntimeProps): React.JSX.Element {
  const RuntimeComponent = RUNTIME_COMPONENTS[runtime.rendererId];
  const rendererProps = runtime.rendererProps ?? {};

  return (
    <RuntimeComponent
      {...rendererProps}
      finishLabel={finishLabel ?? rendererProps.finishLabel}
      onFinish={onFinish}
    />
  );
}

export default KangurLessonStageGameRuntime;
