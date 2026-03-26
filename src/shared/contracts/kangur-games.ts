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
  implementationOwnerships: z.array(kangurGameEngineImplementationOwnershipSchema),
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

export const kangurGameLibraryPageDataSchema = z.object({
  catalogFacets: kangurGameCatalogFacetsSchema,
  coverage: kangurGameLibraryCoverageSchema,
  engineFilterOptions: kangurGameEngineCatalogFacetsSchema,
  engineOverview: kangurGameEngineLibraryOverviewSchema,
  overview: kangurGamesLibraryOverviewSchema,
});
export type KangurGameLibraryPageDataDto = z.infer<typeof kangurGameLibraryPageDataSchema>;

export const kangurGameCatalogQuerySchema = z.object({
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
