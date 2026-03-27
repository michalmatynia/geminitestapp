import { z } from 'zod';

import {
  kangurLessonActivityIdSchema,
  kangurLessonAgeGroupSchema,
  kangurLessonComponentIdSchema,
  kangurLessonSubjectSchema,
} from './kangur-lesson-constants';
import {
  optionalBooleanQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';
import { kangurGameRuntimeRendererPropsSchema } from './kangur-game-runtime-renderer-props';

const nonEmptyTrimmedString = z.string().trim().min(1);

export const kangurGameIdSchema = nonEmptyTrimmedString.max(120);
export type KangurGameId = z.infer<typeof kangurGameIdSchema>;

export const kangurGameSurfaceSchema = z.enum(['lesson', 'library', 'game', 'duel']);
export type KangurGameSurface = z.infer<typeof kangurGameSurfaceSchema>;

export const kangurGameStatusSchema = z.enum(['draft', 'active', 'legacy']);
export type KangurGameStatus = z.infer<typeof kangurGameStatusSchema>;

export const kangurGameEngineIdSchema = nonEmptyTrimmedString.max(120);
export type KangurGameEngineId = z.infer<typeof kangurGameEngineIdSchema>;

export const KANGUR_GAME_ENGINE_CATEGORIES = [
  'foundational',
  'early_learning',
  'adult_learning',
] as const;

export const kangurGameEngineCategorySchema = z.enum(KANGUR_GAME_ENGINE_CATEGORIES);
export type KangurGameEngineCategory = z.infer<typeof kangurGameEngineCategorySchema>;

export const KANGUR_GAME_ENGINE_IMPLEMENTATION_OWNERSHIPS = [
  'shared_runtime',
  'mixed_runtime',
  'lesson_embedded',
] as const;

export const kangurGameEngineImplementationOwnershipSchema = z.enum(
  KANGUR_GAME_ENGINE_IMPLEMENTATION_OWNERSHIPS
);
export type KangurGameEngineImplementationOwnership = z.infer<
  typeof kangurGameEngineImplementationOwnershipSchema
>;

export const kangurGameMechanicSchema = z.enum([
  'drag_drop',
  'multiple_choice',
  'tap_select',
  'drawing',
  'rhythm',
  'clock_training',
  'calendar_interactive',
  'logic_pattern',
  'logic_classification',
  'logic_relation',
  'sentence_building',
]);
export type KangurGameMechanic = z.infer<typeof kangurGameMechanicSchema>;

export const kangurGameInteractionModeSchema = z.enum(['drag', 'tap', 'draw', 'mixed']);
export type KangurGameInteractionMode = z.infer<typeof kangurGameInteractionModeSchema>;

export const KANGUR_LAUNCHABLE_GAME_SCREENS = [
  'calendar_quiz',
  'geometry_quiz',
  'clock_quiz',
  'addition_quiz',
  'subtraction_quiz',
  'multiplication_quiz',
  'division_quiz',
  'logical_patterns_quiz',
  'logical_classification_quiz',
  'logical_analogies_quiz',
  'english_sentence_quiz',
  'english_parts_of_speech_quiz',
 ] as const;

export const kangurLaunchableGameScreenSchema = z.enum(KANGUR_LAUNCHABLE_GAME_SCREENS);
export type KangurLaunchableGameScreen = z.infer<typeof kangurLaunchableGameScreenSchema>;

export const KANGUR_LAUNCHABLE_GAME_STAGE_ACCENTS = [
  'amber',
  'emerald',
  'indigo',
  'rose',
  'sky',
  'teal',
  'violet',
] as const;

export const kangurLaunchableGameStageAccentSchema = z.enum(
  KANGUR_LAUNCHABLE_GAME_STAGE_ACCENTS
);
export type KangurLaunchableGameStageAccent = z.infer<
  typeof kangurLaunchableGameStageAccentSchema
>;

export const KANGUR_LAUNCHABLE_GAME_RUNTIME_RENDERER_IDS = [
  'adding_ball_game',
  'calendar_training_game',
  'clock_training_game',
  'division_game',
  'english_parts_of_speech_game',
  'english_sentence_structure_game',
  'geometry_drawing_game',
  'logical_analogies_relation_game',
  'logical_classification_game',
  'logical_patterns_workshop_game',
  'multiplication_game',
  'subtracting_game',
] as const;

export const kangurLaunchableGameRuntimeRendererIdSchema = z.enum(
  KANGUR_LAUNCHABLE_GAME_RUNTIME_RENDERER_IDS
);
export type KangurLaunchableGameRuntimeRendererId = z.infer<
  typeof kangurLaunchableGameRuntimeRendererIdSchema
>;

export const KANGUR_LAUNCHABLE_GAME_RUNTIME_FINISH_MODES = [
  'default',
  'play_variant',
  'return_to_game_home',
] as const;

export const kangurLaunchableGameRuntimeFinishModeSchema = z.enum(
  KANGUR_LAUNCHABLE_GAME_RUNTIME_FINISH_MODES
);
export type KangurLaunchableGameRuntimeFinishMode = z.infer<
  typeof kangurLaunchableGameRuntimeFinishModeSchema
>;

export const KANGUR_LAUNCHABLE_GAME_RUNTIME_FINISH_LABEL_PROPS = [
  'none',
  'finishLabelVariant',
  'finishLabel',
  'completionPrimaryActionLabel',
] as const;

export const kangurLaunchableGameRuntimeFinishLabelPropSchema = z.enum(
  KANGUR_LAUNCHABLE_GAME_RUNTIME_FINISH_LABEL_PROPS
);
export type KangurLaunchableGameRuntimeFinishLabelProp = z.infer<
  typeof kangurLaunchableGameRuntimeFinishLabelPropSchema
>;

export const kangurLaunchableGameStageConfigSchema = z.object({
  accent: kangurLaunchableGameStageAccentSchema,
  backScreen: nonEmptyTrimmedString.max(120).optional(),
  description: z.string().trim().min(1).max(320).optional(),
  icon: z.string().trim().min(1).max(12),
  shellTestId: nonEmptyTrimmedString.max(160),
  title: nonEmptyTrimmedString.max(160).optional(),
});
export type KangurLaunchableGameStageConfig = z.infer<
  typeof kangurLaunchableGameStageConfigSchema
>;

export const kangurLaunchableGameRuntimeSpecSchema = z.object({
  kind: z.literal('launchable_game_screen'),
  screen: kangurLaunchableGameScreenSchema,
  engineId: kangurGameEngineIdSchema.optional(),
  rendererId: kangurLaunchableGameRuntimeRendererIdSchema,
  rendererProps: kangurGameRuntimeRendererPropsSchema.optional(),
  finishMode: kangurLaunchableGameRuntimeFinishModeSchema.default('default'),
  finishLabelProp: kangurLaunchableGameRuntimeFinishLabelPropSchema.default('none'),
  className: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .default('w-full flex flex-col items-center'),
  stage: kangurLaunchableGameStageConfigSchema,
});
export type KangurLaunchableGameRuntimeSpec = z.infer<
  typeof kangurLaunchableGameRuntimeSpecSchema
>;

export const KANGUR_LESSON_ACTIVITY_RUNTIME_RENDERER_IDS = [
  'adding_ball_game',
  'adding_synthesis_game',
  'calendar_interactive_game',
  'clock_training_game',
  'division_game',
  'geometry_drawing_game',
  'multiplication_array_game',
  'multiplication_game',
  'subtracting_garden_game',
] as const;

export const kangurLessonActivityRuntimeRendererIdSchema = z.enum(
  KANGUR_LESSON_ACTIVITY_RUNTIME_RENDERER_IDS
);
export type KangurLessonActivityRuntimeRendererId = z.infer<
  typeof kangurLessonActivityRuntimeRendererIdSchema
>;

export const kangurLessonActivityRuntimeSpecSchema = z.object({
  kind: z.literal('lesson_activity'),
  activityId: kangurLessonActivityIdSchema,
  engineId: kangurGameEngineIdSchema.optional(),
  rendererId: kangurLessonActivityRuntimeRendererIdSchema,
});
export type KangurLessonActivityRuntimeSpec = z.infer<
  typeof kangurLessonActivityRuntimeSpecSchema
>;

export const KANGUR_LESSON_STAGE_GAME_RUNTIME_IDS = [
  'adding_ball_lesson_stage',
  'adding_synthesis_lesson_stage',
  'agentic_approval_gate_lesson_stage',
  'agentic_prompt_trim_lesson_stage',
  'agentic_reasoning_router_lesson_stage',
  'agentic_surface_match_lesson_stage',
  'alphabet_first_words_lesson_stage',
  'alphabet_letter_matching_lesson_stage',
  'alphabet_letter_order_lesson_stage',
  'art_color_harmony_studio_lesson_stage',
  'art_shape_rotation_puzzle_lesson_stage',
  'calendar_interactive_days_lesson_stage',
  'calendar_interactive_months_lesson_stage',
  'calendar_interactive_dates_lesson_stage',
  'clock_training_hours_lesson_stage',
  'clock_training_minutes_lesson_stage',
  'clock_training_combined_lesson_stage',
  'division_groups_lesson_stage',
  'english_subject_verb_agreement_lesson_stage',
  'english_adjectives_scene_lesson_stage',
  'english_adverbs_frequency_routine_lesson_stage',
  'english_articles_drag_lesson_stage',
  'english_prepositions_lesson_stage',
  'english_prepositions_order_lesson_stage',
  'english_prepositions_sort_lesson_stage',
  'english_sentence_builder_lesson_stage',
  'geometry_perimeter_trainer_lesson_stage',
  'geometry_basics_workshop_lesson_stage',
  'geometry_shape_spotter_lesson_stage',
  'geometry_shape_workshop_lesson_stage',
  'geometry_shape_drawing_lesson_stage',
  'geometry_symmetry_studio_lesson_stage',
  'english_parts_of_speech_sort_lesson_stage',
  'english_pronouns_warmup_lesson_stage',
  'logical_analogies_relations_lesson_stage',
  'logical_classification_lab_lesson_stage',
  'logical_patterns_workshop_lesson_stage',
  'multiplication_array_lesson_stage',
  'music_melody_repeat_lesson_stage',
  'music_piano_roll_free_play_lesson_stage',
  'subtracting_garden_lesson_stage',
] as const;

export const kangurLessonStageGameRuntimeIdSchema = z.enum(
  KANGUR_LESSON_STAGE_GAME_RUNTIME_IDS
);
export type KangurLessonStageGameRuntimeId = z.infer<
  typeof kangurLessonStageGameRuntimeIdSchema
>;

export const KANGUR_LESSON_STAGE_GAME_RUNTIME_RENDERER_IDS = [
  'adding_ball_game',
  'adding_synthesis_game',
  'agentic_approval_gate_game',
  'agentic_prompt_trim_game',
  'agentic_reasoning_router_game',
  'agentic_surface_match_game',
  'alphabet_literacy_stage_game',
  'color_harmony_stage_game',
  'art_shapes_rotation_gap_game',
  'calendar_interactive_stage_game',
  'clock_training_stage_game',
  'division_groups_game',
  'english_subject_verb_agreement_game',
  'english_adjectives_scene_game',
  'english_adverbs_frequency_routine_game',
  'english_articles_drag_drop_game',
  'english_parts_of_speech_game',
  'english_prepositions_game',
  'english_prepositions_order_game',
  'english_prepositions_sort_game',
  'english_sentence_structure_game',
  'english_pronouns_warmup_game',
  'geometry_perimeter_drawing_game',
  'geometry_basics_workshop_game',
  'geometry_drawing_game',
  'shape_recognition_stage_game',
  'geometry_symmetry_game',
  'logical_analogies_relation_game',
  'logical_classification_game',
  'logical_patterns_workshop_game',
  'multiplication_array_game',
  'music_melody_repeat_game',
  'music_piano_roll_free_play_game',
  'subtracting_garden_game',
] as const;

export const kangurLessonStageGameRuntimeRendererIdSchema = z.enum(
  KANGUR_LESSON_STAGE_GAME_RUNTIME_RENDERER_IDS
);
export type KangurLessonStageGameRuntimeRendererId = z.infer<
  typeof kangurLessonStageGameRuntimeRendererIdSchema
>;

const KANGUR_GEOMETRY_DRAWING_SHAPE_IDS = [
  'circle',
  'oval',
  'triangle',
  'diamond',
  'square',
  'rectangle',
  'pentagon',
  'hexagon',
] as const;

const kangurGeometryDrawingShapeIdSchema = z.enum(KANGUR_GEOMETRY_DRAWING_SHAPE_IDS);
export type KangurGeometryDrawingShapeId = z.infer<
  typeof kangurGeometryDrawingShapeIdSchema
>;

const KANGUR_CALENDAR_INTERACTIVE_STAGE_SECTIONS = ['dni', 'miesiace', 'data'] as const;
const kangurCalendarInteractiveStageSectionSchema = z.enum(
  KANGUR_CALENDAR_INTERACTIVE_STAGE_SECTIONS
);
export type KangurCalendarInteractiveStageSection = z.infer<
  typeof kangurCalendarInteractiveStageSectionSchema
>;

const KANGUR_CLOCK_TRAINING_STAGE_SECTIONS = ['hours', 'minutes', 'combined'] as const;
export const kangurClockTrainingStageSectionSchema = z.enum(
  KANGUR_CLOCK_TRAINING_STAGE_SECTIONS
);
export type KangurClockTrainingStageSection = z.infer<
  typeof kangurClockTrainingStageSectionSchema
>;

const kangurClockTrainingInitialModeSchema = z.enum(['practice', 'challenge']);

const KANGUR_LOGICAL_PATTERN_SET_IDS = [
  'logical_patterns_workshop',
  'alphabet_letter_order',
] as const;
const kangurLogicalPatternSetIdSchema = z.enum(KANGUR_LOGICAL_PATTERN_SET_IDS);
export type KangurLogicalPatternSetId = z.infer<typeof kangurLogicalPatternSetIdSchema>;

const KANGUR_LITERACY_MATCH_SET_IDS = [
  'alphabet_first_words',
  'alphabet_letter_matching',
] as const;
const kangurLiteracyMatchSetIdSchema = z.enum(KANGUR_LITERACY_MATCH_SET_IDS);
export type KangurLiteracyMatchSetId = z.infer<typeof kangurLiteracyMatchSetIdSchema>;

const KANGUR_LESSON_STAGE_GAME_FINISH_LABEL_VARIANTS = [
  'lesson',
  'topics',
  'play',
  'done',
] as const;

const kangurLessonStageGameFinishLabelVariantSchema = z.enum(
  KANGUR_LESSON_STAGE_GAME_FINISH_LABEL_VARIANTS
);

export const kangurLessonStageGameRuntimeRendererPropsSchema = z
  .object({
    activityKey: nonEmptyTrimmedString.max(120).optional(),
    calendarSection: kangurCalendarInteractiveStageSectionSchema.optional(),
    clockSection: kangurClockTrainingStageSectionSchema.optional(),
    clockInitialMode: kangurClockTrainingInitialModeSchema.optional(),
    difficultyLabelOverride: nonEmptyTrimmedString.max(120).optional(),
    finishLabel: nonEmptyTrimmedString.max(120).optional(),
    finishLabelVariant: kangurLessonStageGameFinishLabelVariantSchema.optional(),
    lessonKey: nonEmptyTrimmedString.max(120).optional(),
    literacyMatchSetId: kangurLiteracyMatchSetIdSchema.optional(),
    patternSetId: kangurLogicalPatternSetIdSchema.optional(),
    operation: nonEmptyTrimmedString.max(80).optional(),
    shapeIds: z.array(kangurGeometryDrawingShapeIdSchema).min(1).max(12).optional(),
    showClockHourHand: z.boolean().optional(),
    showClockMinuteHand: z.boolean().optional(),
    showClockModeSwitch: z.boolean().optional(),
    showClockTaskTitle: z.boolean().optional(),
    showClockTimeDisplay: z.boolean().optional(),
    showDifficultySelector: z.boolean().optional(),
  })
  .strict();
export type KangurLessonStageGameRuntimeRendererProps = z.infer<
  typeof kangurLessonStageGameRuntimeRendererPropsSchema
>;

export const kangurLessonStageGameRuntimeSpecSchema = z.object({
  kind: z.literal('lesson_stage_game'),
  runtimeId: kangurLessonStageGameRuntimeIdSchema,
  engineId: kangurGameEngineIdSchema.optional(),
  rendererId: kangurLessonStageGameRuntimeRendererIdSchema,
  rendererProps: kangurLessonStageGameRuntimeRendererPropsSchema.optional(),
});
export type KangurLessonStageGameRuntimeSpec = z.infer<
  typeof kangurLessonStageGameRuntimeSpecSchema
>;

export const KANGUR_GAME_VARIANT_SURFACES = [
  'lesson_inline',
  'lesson_stage',
  'library_preview',
  'game_screen',
] as const;

export const kangurGameVariantSurfaceSchema = z.enum(KANGUR_GAME_VARIANT_SURFACES);
export type KangurGameVariantSurface = z.infer<typeof kangurGameVariantSurfaceSchema>;

export const kangurGameVariantSchema = z.object({
  id: nonEmptyTrimmedString.max(120),
  label: nonEmptyTrimmedString.max(120),
  title: nonEmptyTrimmedString.max(120),
  description: z.string().trim().min(1).max(240),
  surface: kangurGameVariantSurfaceSchema,
  status: kangurGameStatusSchema.default('active'),
  legacyActivityId: kangurLessonActivityIdSchema.optional(),
  lessonActivityRuntimeId: kangurLessonActivityIdSchema.optional(),
  lessonStageRuntimeId: kangurLessonStageGameRuntimeIdSchema.optional(),
  launchableRuntimeId: kangurLaunchableGameScreenSchema.optional(),
  legacyScreenId: z.string().trim().min(1).max(120).optional(),
  sortOrder: z.number().int().min(0).max(1_000_000).default(0),
});
export type KangurGameVariant = z.infer<typeof kangurGameVariantSchema>;

export const kangurGameEngineDefinitionSchema = z.object({
  id: kangurGameEngineIdSchema,
  category: kangurGameEngineCategorySchema,
  label: nonEmptyTrimmedString.max(120),
  title: nonEmptyTrimmedString.max(120),
  description: z.string().trim().min(1).max(320),
  mechanics: z.array(kangurGameMechanicSchema).min(1).max(12),
  interactionModes: z.array(kangurGameInteractionModeSchema).min(1).max(4),
  surfaces: z.array(kangurGameSurfaceSchema).min(1).max(4),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  status: kangurGameStatusSchema.default('active'),
  sortOrder: z.number().int().min(0).max(1_000_000).default(0),
});
export type KangurGameEngineDefinition = z.infer<typeof kangurGameEngineDefinitionSchema>;

export const kangurGameDefinitionSchema = z.object({
  id: kangurGameIdSchema,
  engineId: kangurGameEngineIdSchema,
  subject: kangurLessonSubjectSchema,
  ageGroup: kangurLessonAgeGroupSchema.optional(),
  lessonComponentIds: z.array(kangurLessonComponentIdSchema).max(24).default([]),
  activityIds: z.array(kangurLessonActivityIdSchema).max(24).default([]),
  legacyScreenIds: z.array(z.string().trim().min(1).max(120)).max(24).default([]),
  label: nonEmptyTrimmedString.max(120),
  title: nonEmptyTrimmedString.max(120),
  description: z.string().trim().min(1).max(320),
  emoji: z.string().trim().max(12),
  mechanic: kangurGameMechanicSchema,
  interactionMode: kangurGameInteractionModeSchema,
  surfaces: z.array(kangurGameSurfaceSchema).min(1).max(4),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  variants: z.array(kangurGameVariantSchema).max(12).default([]),
  status: kangurGameStatusSchema.default('active'),
  sortOrder: z.number().int().min(0).max(1_000_000).default(0),
});
export type KangurGameDefinition = z.infer<typeof kangurGameDefinitionSchema>;

export const kangurGamesSchema = z.array(kangurGameDefinitionSchema);
export type KangurGames = z.infer<typeof kangurGamesSchema>;

export const kangurGameEnginesSchema = z.array(kangurGameEngineDefinitionSchema);
export type KangurGameEngines = z.infer<typeof kangurGameEnginesSchema>;

export const kangurGameEngineImplementationSchema = z.object({
  engineId: kangurGameEngineIdSchema,
  ownership: kangurGameEngineImplementationOwnershipSchema,
  runtimeIds: z.array(nonEmptyTrimmedString.max(120)).max(24),
  summary: z.string().trim().min(1).max(320),
});
export type KangurGameEngineImplementation = z.infer<
  typeof kangurGameEngineImplementationSchema
>;

export const kangurGameEngineImplementationsSchema = z.array(
  kangurGameEngineImplementationSchema
);
export type KangurGameEngineImplementations = z.infer<
  typeof kangurGameEngineImplementationsSchema
>;

const optionalLegacyScreenSchema = kangurLaunchableGameScreenSchema.nullable();

export const kangurGameCatalogEntrySchema = z.object({
  game: kangurGameDefinitionSchema,
  engine: kangurGameEngineDefinitionSchema.nullable(),
  defaultVariant: kangurGameVariantSchema.nullable(),
  lessonVariant: kangurGameVariantSchema.nullable(),
  lessonActivityRuntime: kangurLessonActivityRuntimeSpecSchema.nullable(),
  lessonStageRuntime: kangurLessonStageGameRuntimeSpecSchema.nullable(),
  libraryPreviewVariant: kangurGameVariantSchema.nullable(),
  gameScreenVariant: kangurGameVariantSchema.nullable(),
  launchableScreen: optionalLegacyScreenSchema,
  launchableRuntime: kangurLaunchableGameRuntimeSpecSchema.nullable(),
});
export type KangurGameCatalogEntryDto = z.infer<typeof kangurGameCatalogEntrySchema>;

export const kangurGameCatalogEntriesSchema = z.array(kangurGameCatalogEntrySchema);
export type KangurGameCatalogEntriesDto = z.infer<typeof kangurGameCatalogEntriesSchema>;

export const kangurGameCatalogFacetGameSchema = z.object({
  id: kangurGameIdSchema,
  title: nonEmptyTrimmedString.max(120),
  sortOrder: z.number().int().min(0).max(1_000_000),
});
export type KangurGameCatalogFacetGameDto = z.infer<
  typeof kangurGameCatalogFacetGameSchema
>;

export const kangurGameCatalogFacetsSchema = z.object({
  gameCount: z.number().int().min(0),
  games: z.array(kangurGameCatalogFacetGameSchema),
  subjects: z.array(kangurLessonSubjectSchema),
  ageGroups: z.array(kangurLessonAgeGroupSchema),
  statuses: z.array(kangurGameStatusSchema),
  surfaces: z.array(kangurGameSurfaceSchema),
  variantSurfaces: z.array(kangurGameVariantSurfaceSchema),
  variantStatuses: z.array(kangurGameStatusSchema),
  mechanics: z.array(kangurGameMechanicSchema),
  engineIds: z.array(kangurGameEngineIdSchema),
  engineCategories: z.array(kangurGameEngineCategorySchema),
  implementationOwnerships: z.array(kangurGameEngineImplementationOwnershipSchema),
  engines: z.array(kangurGameEngineDefinitionSchema),
});
export type KangurGameCatalogFacetsDto = z.infer<typeof kangurGameCatalogFacetsSchema>;

export const kangurGameVariantCatalogEntrySchema = z.object({
  game: kangurGameDefinitionSchema,
  engine: kangurGameEngineDefinitionSchema.nullable(),
  variant: kangurGameVariantSchema,
  lessonActivityRuntime: kangurLessonActivityRuntimeSpecSchema.nullable(),
  lessonStageRuntime: kangurLessonStageGameRuntimeSpecSchema.nullable(),
  launchableScreen: optionalLegacyScreenSchema,
  launchableRuntime: kangurLaunchableGameRuntimeSpecSchema.nullable(),
  isDefaultVariant: z.boolean(),
  isLessonVariant: z.boolean(),
  isLibraryPreviewVariant: z.boolean(),
  isGameScreenVariant: z.boolean(),
});
export type KangurGameVariantCatalogEntryDto = z.infer<typeof kangurGameVariantCatalogEntrySchema>;

export const kangurGameVariantCatalogEntriesSchema = z.array(kangurGameVariantCatalogEntrySchema);
export type KangurGameVariantCatalogEntriesDto = z.infer<
  typeof kangurGameVariantCatalogEntriesSchema
>;

export const kangurGameEngineCatalogEntrySchema = z.object({
  ageGroups: z.array(kangurLessonAgeGroupSchema),
  category: kangurGameEngineCategorySchema.nullable(),
  engine: kangurGameEngineDefinitionSchema.nullable(),
  engineId: kangurGameEngineIdSchema,
  entries: kangurGameCatalogEntriesSchema,
  implementation: kangurGameEngineImplementationSchema.nullable(),
  launchableCount: z.number().int().min(0),
  lessonComponentIds: z.array(kangurLessonComponentIdSchema),
  mechanics: z.array(kangurGameMechanicSchema),
  subjects: z.array(kangurLessonSubjectSchema),
  surfaces: z.array(kangurGameSurfaceSchema),
  variants: kangurGameVariantCatalogEntriesSchema,
});
export type KangurGameEngineCatalogEntryDto = z.infer<
  typeof kangurGameEngineCatalogEntrySchema
>;

export const kangurGameEngineCatalogEntriesSchema = z.array(
  kangurGameEngineCatalogEntrySchema
);
export type KangurGameEngineCatalogEntriesDto = z.infer<
  typeof kangurGameEngineCatalogEntriesSchema
>;

export const kangurGameEngineCatalogFacetsSchema = z.object({
  ageGroups: z.array(kangurLessonAgeGroupSchema),
  drawingEngineCount: z.number().int().min(0),
  engineCategories: z.array(kangurGameEngineCategorySchema),
  engineCount: z.number().int().min(0),
  engineIds: z.array(kangurGameEngineIdSchema),
  engines: z.array(kangurGameEngineDefinitionSchema),
  implementationOwnerships: z.array(kangurGameEngineImplementationOwnershipSchema),
  launchableEngineCount: z.number().int().min(0),
  lessonLinkedEngineCount: z.number().int().min(0),
  mechanics: z.array(kangurGameMechanicSchema),
  subjects: z.array(kangurLessonSubjectSchema),
  surfaces: z.array(kangurGameSurfaceSchema),
});
export type KangurGameEngineCatalogFacetsDto = z.infer<
  typeof kangurGameEngineCatalogFacetsSchema
>;

export const kangurDrawingEngineCatalogEntrySchema = z.object({
  ageGroups: z.array(kangurLessonAgeGroupSchema),
  category: kangurGameEngineCategorySchema.nullable(),
  engine: kangurGameEngineDefinitionSchema.nullable(),
  engineId: kangurGameEngineIdSchema,
  entries: kangurGameCatalogEntriesSchema,
  implementation: kangurGameEngineImplementationSchema.nullable(),
  lessonComponentIds: z.array(kangurLessonComponentIdSchema),
  subjects: z.array(kangurLessonSubjectSchema),
  variantCount: z.number().int().min(0),
});
export type KangurDrawingEngineCatalogEntryDto = z.infer<
  typeof kangurDrawingEngineCatalogEntrySchema
>;

export const kangurGameEngineCatalogImplementationGroupSchema = z.object({
  engineGroups: kangurGameEngineCatalogEntriesSchema,
  gameCount: z.number().int().min(0),
  lessonComponentIds: z.array(kangurLessonComponentIdSchema),
  ownership: kangurGameEngineImplementationOwnershipSchema,
  runtimeIds: z.array(nonEmptyTrimmedString.max(120)),
});
export type KangurGameEngineCatalogImplementationGroupDto = z.infer<
  typeof kangurGameEngineCatalogImplementationGroupSchema
>;

export const kangurGameEngineLibraryOverviewSchema = z.object({
  drawingGroups: z.array(kangurDrawingEngineCatalogEntrySchema),
  engineGroups: kangurGameEngineCatalogEntriesSchema,
  facets: kangurGameEngineCatalogFacetsSchema,
  implementationGroups: z.array(kangurGameEngineCatalogImplementationGroupSchema),
});
export type KangurGameEngineLibraryOverviewDto = z.infer<
  typeof kangurGameEngineLibraryOverviewSchema
>;

export const kangurGameLibraryLessonCoverageStatusSchema = z.enum([
  'launchable',
  'library_backed',
  'selector_fallback',
  'lesson_only',
]);
export type KangurGameLibraryLessonCoverageStatusDto = z.infer<
  typeof kangurGameLibraryLessonCoverageStatusSchema
>;

export const kangurGameLibraryCoverageGroupIdSchema = z.enum([
  'library_backed',
  'launchable',
  'selector_fallback',
]);
export type KangurGameLibraryCoverageGroupIdDto = z.infer<
  typeof kangurGameLibraryCoverageGroupIdSchema
>;

export const kangurGameLibraryCoverageGroupSchema = z.object({
  ageGroups: z.array(kangurLessonAgeGroupSchema),
  componentIds: z.array(kangurLessonComponentIdSchema),
  coveredComponentIds: z.array(kangurLessonComponentIdSchema),
  entries: kangurGameCatalogEntriesSchema,
  id: kangurGameLibraryCoverageGroupIdSchema,
  subjects: z.array(kangurLessonSubjectSchema),
  uncoveredComponentIds: z.array(kangurLessonComponentIdSchema),
});
export type KangurGameLibraryCoverageGroupDto = z.infer<
  typeof kangurGameLibraryCoverageGroupSchema
>;

export const kangurGameLibraryCoverageGroupsSchema = z.array(
  kangurGameLibraryCoverageGroupSchema
);
export type KangurGameLibraryCoverageGroupsDto = z.infer<
  typeof kangurGameLibraryCoverageGroupsSchema
>;

export const kangurGameLibraryCoverageStatusMapSchema = z.partialRecord(
  kangurLessonComponentIdSchema,
  kangurGameLibraryLessonCoverageStatusSchema
);
export type KangurGameLibraryCoverageStatusMapDto = z.infer<
  typeof kangurGameLibraryCoverageStatusMapSchema
>;

export const kangurGameLibraryCoverageSchema = z.object({
  groups: kangurGameLibraryCoverageGroupsSchema,
  statusMap: kangurGameLibraryCoverageStatusMapSchema,
});
export type KangurGameLibraryCoverageDto = z.infer<typeof kangurGameLibraryCoverageSchema>;

export const kangurGamesLibraryMetricsSchema = z.object({
  engineCount: z.number().int().min(0),
  lessonLinkedCount: z.number().int().min(0),
  variantCount: z.number().int().min(0),
  visibleGameCount: z.number().int().min(0),
});
export type KangurGamesLibraryMetricsDto = z.infer<typeof kangurGamesLibraryMetricsSchema>;

export const kangurGamesLibrarySubjectDefinitionSchema = z.object({
  id: kangurLessonSubjectSchema,
  label: nonEmptyTrimmedString.max(120),
  shortLabel: nonEmptyTrimmedString.max(120),
  sortOrder: z.number().int().min(0).max(1_000_000),
  default: z.boolean().optional(),
  ageGroups: z.array(kangurLessonAgeGroupSchema),
});
export type KangurGamesLibrarySubjectDefinitionDto = z.infer<
  typeof kangurGamesLibrarySubjectDefinitionSchema
>;

export const kangurGamesLibrarySubjectGroupSchema = z.object({
  entries: kangurGameCatalogEntriesSchema,
  subject: kangurGamesLibrarySubjectDefinitionSchema,
});
export type KangurGamesLibrarySubjectGroupDto = z.infer<
  typeof kangurGamesLibrarySubjectGroupSchema
>;

export const kangurGamesLibraryVariantGroupSchema = z.object({
  entries: kangurGameVariantCatalogEntriesSchema,
  surface: kangurGameVariantSurfaceSchema,
});
export type KangurGamesLibraryVariantGroupDto = z.infer<
  typeof kangurGamesLibraryVariantGroupSchema
>;

export const kangurGamesLibraryCohortGroupSchema = z.object({
  ageGroup: kangurLessonAgeGroupSchema,
  engineCount: z.number().int().min(0),
  entries: kangurGameCatalogEntriesSchema,
  launchableCount: z.number().int().min(0),
  lessonLinkedCount: z.number().int().min(0),
  subjects: z.array(kangurLessonSubjectSchema),
  variantCount: z.number().int().min(0),
});
export type KangurGamesLibraryCohortGroupDto = z.infer<
  typeof kangurGamesLibraryCohortGroupSchema
>;

export const kangurGamesLibraryOverviewSchema = z.object({
  cohortGroups: z.array(kangurGamesLibraryCohortGroupSchema),
  metrics: kangurGamesLibraryMetricsSchema,
  subjectGroups: z.array(kangurGamesLibrarySubjectGroupSchema),
  variantGroups: z.array(kangurGamesLibraryVariantGroupSchema),
});
export type KangurGamesLibraryOverviewDto = z.infer<
  typeof kangurGamesLibraryOverviewSchema
>;

export const KANGUR_GAME_RUNTIME_SERIALIZATION_SURFACES = [
  'lesson_inline',
  'lesson_stage',
  'game_screen',
] as const;

export const kangurGameRuntimeSerializationSurfaceIdSchema = z.enum(
  KANGUR_GAME_RUNTIME_SERIALIZATION_SURFACES
);
export type KangurGameRuntimeSerializationSurfaceIdDto = z.infer<
  typeof kangurGameRuntimeSerializationSurfaceIdSchema
>;

export const kangurGameRuntimeSerializationSurfaceSchema = z.object({
  surface: kangurGameRuntimeSerializationSurfaceIdSchema,
  totalVariants: z.number().int().min(0),
  explicitRuntimeVariants: z.number().int().min(0),
  compatibilityFallbackVariants: z.number().int().min(0),
  duplicatedLegacyVariants: z.number().int().min(0),
  missingRuntimeVariants: z.number().int().min(0),
});
export type KangurGameRuntimeSerializationSurfaceDto = z.infer<
  typeof kangurGameRuntimeSerializationSurfaceSchema
>;

export const KANGUR_GAME_RUNTIME_SERIALIZATION_ISSUE_KINDS = [
  'compatibility_fallback_variant',
  'duplicated_legacy_variant',
  'missing_runtime_variant',
  'legacy_launch_fallback_game',
  'non_shared_runtime_engine',
] as const;

export const kangurGameRuntimeSerializationIssueKindSchema = z.enum(
  KANGUR_GAME_RUNTIME_SERIALIZATION_ISSUE_KINDS
);
export type KangurGameRuntimeSerializationIssueKindDto = z.infer<
  typeof kangurGameRuntimeSerializationIssueKindSchema
>;

export const KANGUR_GAME_RUNTIME_SERIALIZATION_ISSUE_TARGETS = [
  'game',
  'engine',
] as const;

export const kangurGameRuntimeSerializationIssueTargetSchema = z.enum(
  KANGUR_GAME_RUNTIME_SERIALIZATION_ISSUE_TARGETS
);
export type KangurGameRuntimeSerializationIssueTargetDto = z.infer<
  typeof kangurGameRuntimeSerializationIssueTargetSchema
>;

export const kangurGameRuntimeSerializationIssueSchema = z.object({
  kind: kangurGameRuntimeSerializationIssueKindSchema,
  itemId: nonEmptyTrimmedString.max(120),
  label: nonEmptyTrimmedString.max(160),
  detail: z.string().trim().min(1).max(160).optional(),
  targetKind: kangurGameRuntimeSerializationIssueTargetSchema,
  targetId: nonEmptyTrimmedString.max(120),
});
export type KangurGameRuntimeSerializationIssueDto = z.infer<
  typeof kangurGameRuntimeSerializationIssueSchema
>;

export const kangurGameRuntimeSerializationAuditSchema = z.object({
  surfaces: z.array(kangurGameRuntimeSerializationSurfaceSchema),
  runtimeBearingVariantCount: z.number().int().min(0),
  explicitRuntimeVariantCount: z.number().int().min(0),
  compatibilityFallbackVariantCount: z.number().int().min(0),
  duplicatedLegacyVariantCount: z.number().int().min(0),
  missingRuntimeVariantCount: z.number().int().min(0),
  legacyLaunchFallbackGameCount: z.number().int().min(0),
  issues: z.array(kangurGameRuntimeSerializationIssueSchema),
  engineCount: z.number().int().min(0),
  sharedRuntimeEngineCount: z.number().int().min(0),
  nonSharedRuntimeEngineCount: z.number().int().min(0),
  allEnginesSharedRuntime: z.boolean(),
});
export type KangurGameRuntimeSerializationAuditDto = z.infer<
  typeof kangurGameRuntimeSerializationAuditSchema
>;

export const kangurGameLibraryPageDataSchema = z.object({
  catalogFacets: kangurGameCatalogFacetsSchema,
  coverage: kangurGameLibraryCoverageSchema,
  engineFilterOptions: kangurGameEngineCatalogFacetsSchema,
  engineOverview: kangurGameEngineLibraryOverviewSchema,
  overview: kangurGamesLibraryOverviewSchema,
  serializationAudit: kangurGameRuntimeSerializationAuditSchema,
});
export type KangurGameLibraryPageDataDto = z.infer<typeof kangurGameLibraryPageDataSchema>;

export const kangurGameCatalogQuerySchema = z.object({
  gameId: optionalTrimmedQueryString(kangurGameIdSchema),
  subject: optionalTrimmedQueryString(kangurLessonSubjectSchema),
  ageGroup: optionalTrimmedQueryString(kangurLessonAgeGroupSchema),
  gameStatus: optionalTrimmedQueryString(kangurGameStatusSchema),
  surface: optionalTrimmedQueryString(kangurGameSurfaceSchema),
  lessonComponentId: optionalTrimmedQueryString(kangurLessonComponentIdSchema),
  mechanic: optionalTrimmedQueryString(kangurGameMechanicSchema),
  engineId: optionalTrimmedQueryString(kangurGameEngineIdSchema),
  engineCategory: optionalTrimmedQueryString(kangurGameEngineCategorySchema),
  implementationOwnership: optionalTrimmedQueryString(
    kangurGameEngineImplementationOwnershipSchema
  ),
  variantSurface: optionalTrimmedQueryString(kangurGameVariantSurfaceSchema),
  variantStatus: optionalTrimmedQueryString(kangurGameStatusSchema),
  launchableOnly: optionalBooleanQuerySchema(),
});
export type KangurGameCatalogQuery = z.infer<typeof kangurGameCatalogQuerySchema>;

export const kangurGameLibraryPageQuerySchema = kangurGameCatalogQuerySchema;
export type KangurGameLibraryPageQuery = z.infer<typeof kangurGameLibraryPageQuerySchema>;
