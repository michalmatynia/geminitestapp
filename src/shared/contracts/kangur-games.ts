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

export const kangurLaunchableGameScreenSchema = z.enum([
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
]);
export type KangurLaunchableGameScreen = z.infer<typeof kangurLaunchableGameScreenSchema>;

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

const optionalLegacyScreenSchema = kangurLaunchableGameScreenSchema.nullable();

export const kangurGameCatalogEntrySchema = z.object({
  game: kangurGameDefinitionSchema,
  engine: kangurGameEngineDefinitionSchema.nullable(),
  defaultVariant: kangurGameVariantSchema.nullable(),
  lessonVariant: kangurGameVariantSchema.nullable(),
  libraryPreviewVariant: kangurGameVariantSchema.nullable(),
  gameScreenVariant: kangurGameVariantSchema.nullable(),
  launchableScreen: optionalLegacyScreenSchema,
});
export type KangurGameCatalogEntryDto = z.infer<typeof kangurGameCatalogEntrySchema>;

export const kangurGameCatalogEntriesSchema = z.array(kangurGameCatalogEntrySchema);
export type KangurGameCatalogEntriesDto = z.infer<typeof kangurGameCatalogEntriesSchema>;

export const kangurGameCatalogFacetsSchema = z.object({
  gameCount: z.number().int().min(0),
  subjects: z.array(kangurLessonSubjectSchema),
  ageGroups: z.array(kangurLessonAgeGroupSchema),
  statuses: z.array(kangurGameStatusSchema),
  surfaces: z.array(kangurGameSurfaceSchema),
  variantSurfaces: z.array(kangurGameVariantSurfaceSchema),
  variantStatuses: z.array(kangurGameStatusSchema),
  mechanics: z.array(kangurGameMechanicSchema),
  engineIds: z.array(kangurGameEngineIdSchema),
  engineCategories: z.array(kangurGameEngineCategorySchema),
  engines: z.array(kangurGameEngineDefinitionSchema),
});
export type KangurGameCatalogFacetsDto = z.infer<typeof kangurGameCatalogFacetsSchema>;

export const kangurGameVariantCatalogEntrySchema = z.object({
  game: kangurGameDefinitionSchema,
  engine: kangurGameEngineDefinitionSchema.nullable(),
  variant: kangurGameVariantSchema,
  launchableScreen: optionalLegacyScreenSchema,
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

export const kangurGamesQuerySchema = z.object({
  subject: optionalTrimmedQueryString(kangurLessonSubjectSchema),
  ageGroup: optionalTrimmedQueryString(kangurLessonAgeGroupSchema),
  status: optionalTrimmedQueryString(kangurGameStatusSchema),
  surface: optionalTrimmedQueryString(kangurGameSurfaceSchema),
  lessonComponentId: optionalTrimmedQueryString(kangurLessonComponentIdSchema),
});
export type KangurGamesQuery = z.infer<typeof kangurGamesQuerySchema>;

export const kangurGameEnginesQuerySchema = z.object({
  status: optionalTrimmedQueryString(kangurGameStatusSchema),
  surface: optionalTrimmedQueryString(kangurGameSurfaceSchema),
  mechanic: optionalTrimmedQueryString(kangurGameMechanicSchema),
});
export type KangurGameEnginesQuery = z.infer<typeof kangurGameEnginesQuerySchema>;

export const kangurGameCatalogQuerySchema = z.object({
  subject: optionalTrimmedQueryString(kangurLessonSubjectSchema),
  ageGroup: optionalTrimmedQueryString(kangurLessonAgeGroupSchema),
  gameStatus: optionalTrimmedQueryString(kangurGameStatusSchema),
  surface: optionalTrimmedQueryString(kangurGameSurfaceSchema),
  lessonComponentId: optionalTrimmedQueryString(kangurLessonComponentIdSchema),
  mechanic: optionalTrimmedQueryString(kangurGameMechanicSchema),
  engineId: optionalTrimmedQueryString(kangurGameEngineIdSchema),
  engineCategory: optionalTrimmedQueryString(kangurGameEngineCategorySchema),
  variantSurface: optionalTrimmedQueryString(kangurGameVariantSurfaceSchema),
  variantStatus: optionalTrimmedQueryString(kangurGameStatusSchema),
  launchableOnly: optionalBooleanQuerySchema(),
});
export type KangurGameCatalogQuery = z.infer<typeof kangurGameCatalogQuerySchema>;

export const kangurGameVariantsQuerySchema = z.object({
  subject: optionalTrimmedQueryString(kangurLessonSubjectSchema),
  ageGroup: optionalTrimmedQueryString(kangurLessonAgeGroupSchema),
  gameStatus: optionalTrimmedQueryString(kangurGameStatusSchema),
  surface: optionalTrimmedQueryString(kangurGameSurfaceSchema),
  lessonComponentId: optionalTrimmedQueryString(kangurLessonComponentIdSchema),
  mechanic: optionalTrimmedQueryString(kangurGameMechanicSchema),
  engineId: optionalTrimmedQueryString(kangurGameEngineIdSchema),
  engineCategory: optionalTrimmedQueryString(kangurGameEngineCategorySchema),
  variantSurface: optionalTrimmedQueryString(kangurGameVariantSurfaceSchema),
  variantStatus: optionalTrimmedQueryString(kangurGameStatusSchema),
  launchableOnly: optionalBooleanQuerySchema(),
});
export type KangurGameVariantsQuery = z.infer<typeof kangurGameVariantsQuerySchema>;

export const kangurGamesReplacePayloadSchema = z.object({
  games: kangurGamesSchema,
});
export type KangurGamesReplacePayload = z.infer<typeof kangurGamesReplacePayloadSchema>;
