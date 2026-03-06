import { z } from 'zod';

const nonEmptyTrimmedString = z.string().trim().min(1);

export const KANGUR_LESSONS_SETTING_KEY = 'kangur_lessons_v1';

export const kangurLessonComponentIdSchema = z.enum([
  'clock',
  'calendar',
  'adding',
  'subtracting',
  'multiplication',
  'division',
  'geometry_basics',
  'geometry_shapes',
  'geometry_symmetry',
  'geometry_perimeter',
]);
export type KangurLessonComponentId = z.infer<typeof kangurLessonComponentIdSchema>;

export const kangurLessonSchema = z.object({
  id: nonEmptyTrimmedString.max(120),
  componentId: kangurLessonComponentIdSchema,
  title: nonEmptyTrimmedString.max(120),
  description: nonEmptyTrimmedString.max(240),
  emoji: nonEmptyTrimmedString.max(12),
  color: nonEmptyTrimmedString.max(80),
  activeBg: nonEmptyTrimmedString.max(80),
  sortOrder: z.number().int(),
  enabled: z.boolean(),
});
export type KangurLesson = z.infer<typeof kangurLessonSchema>;

export const kangurLessonsSchema = z.array(kangurLessonSchema);
export type KangurLessons = z.infer<typeof kangurLessonsSchema>;

const kangurProgressCounterSchema = z.number().int().min(0).max(1_000_000);
const kangurProgressListSchema = z.array(nonEmptyTrimmedString.max(64)).max(256);
const kangurLessonMasteryPercentSchema = z.number().int().min(0).max(100);

export const kangurLessonMasteryEntrySchema = z.object({
  attempts: kangurProgressCounterSchema,
  completions: kangurProgressCounterSchema,
  masteryPercent: kangurLessonMasteryPercentSchema,
  bestScorePercent: kangurLessonMasteryPercentSchema,
  lastScorePercent: kangurLessonMasteryPercentSchema,
  lastCompletedAt: z.string().datetime({ offset: true }).nullable(),
});
export type KangurLessonMasteryEntry = z.infer<typeof kangurLessonMasteryEntrySchema>;

export const kangurLessonMasterySchema = z.record(
  z.string().trim().min(1).max(80),
  kangurLessonMasteryEntrySchema
);
export type KangurLessonMastery = z.infer<typeof kangurLessonMasterySchema>;

const normalizeKangurLessonMasteryEntry = (value: unknown): KangurLessonMasteryEntry | null => {
  const parsed = kangurLessonMasteryEntrySchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  return {
    ...parsed.data,
    lastCompletedAt: parsed.data.lastCompletedAt ?? null,
  };
};

export const normalizeKangurLessonMastery = (value: unknown): KangurLessonMastery => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const normalized: KangurLessonMastery = {};
  for (const [rawKey, rawEntry] of Object.entries(value as Record<string, unknown>)) {
    const key = rawKey.trim();
    if (!key || key.length > 80) {
      continue;
    }

    const entry = normalizeKangurLessonMasteryEntry(rawEntry);
    if (entry) {
      normalized[key] = entry;
    }
  }

  return normalized;
};

export const kangurProgressStateSchema = z.object({
  totalXp: kangurProgressCounterSchema,
  gamesPlayed: kangurProgressCounterSchema,
  perfectGames: kangurProgressCounterSchema,
  lessonsCompleted: kangurProgressCounterSchema,
  clockPerfect: kangurProgressCounterSchema,
  calendarPerfect: kangurProgressCounterSchema,
  geometryPerfect: kangurProgressCounterSchema,
  badges: kangurProgressListSchema,
  operationsPlayed: kangurProgressListSchema,
  lessonMastery: kangurLessonMasterySchema,
});
export type KangurProgressState = z.infer<typeof kangurProgressStateSchema>;

const kangurProgressStatePartialSchema = kangurProgressStateSchema.partial();

const mergeUniqueProgressValues = (values: string[]): string[] => Array.from(new Set(values));

export const createDefaultKangurProgressState = (): KangurProgressState => ({
  totalXp: 0,
  gamesPlayed: 0,
  perfectGames: 0,
  lessonsCompleted: 0,
  clockPerfect: 0,
  calendarPerfect: 0,
  geometryPerfect: 0,
  badges: [],
  operationsPlayed: [],
  lessonMastery: {},
});

export const normalizeKangurProgressState = (value: unknown): KangurProgressState => {
  const parsed = kangurProgressStateSchema.safeParse(value);
  if (parsed.success) {
    return {
      ...parsed.data,
      badges: mergeUniqueProgressValues(parsed.data.badges),
      operationsPlayed: mergeUniqueProgressValues(parsed.data.operationsPlayed),
      lessonMastery: normalizeKangurLessonMastery(parsed.data.lessonMastery),
    };
  }

  const partial = kangurProgressStatePartialSchema.safeParse(value);
  if (!partial.success) {
    return createDefaultKangurProgressState();
  }

  const defaults = createDefaultKangurProgressState();
  return {
    ...defaults,
    ...partial.data,
    badges: mergeUniqueProgressValues(partial.data.badges ?? defaults.badges),
    operationsPlayed: mergeUniqueProgressValues(
      partial.data.operationsPlayed ?? defaults.operationsPlayed
    ),
    lessonMastery: normalizeKangurLessonMastery(partial.data.lessonMastery),
  };
};

export const kangurScoreSortFieldSchema = z.enum([
  'created_date',
  'score',
  'time_taken',
  'correct_answers',
  'total_questions',
  'player_name',
  'operation',
]);
export type KangurScoreSortField = z.infer<typeof kangurScoreSortFieldSchema>;

export const kangurScoreSortSchema = z
  .string()
  .trim()
  .regex(/^-?[a-z_]+$/)
  .default('-created_date');
export type KangurScoreSort = z.infer<typeof kangurScoreSortSchema>;

export const kangurScoreLimitSchema = z.number().int().min(1).max(500).default(100);
export type KangurScoreLimit = z.infer<typeof kangurScoreLimitSchema>;

export const kangurScoreSchema = z.object({
  id: nonEmptyTrimmedString,
  player_name: nonEmptyTrimmedString.max(80),
  score: z.number().int().min(0).max(10_000),
  operation: nonEmptyTrimmedString.max(64),
  total_questions: z.number().int().min(1).max(10_000),
  correct_answers: z.number().int().min(0).max(10_000),
  time_taken: z.number().int().min(0).max(86_400),
  created_date: z.string().datetime({ offset: true }),
  created_by: z.string().trim().nullable().optional(),
});
export type KangurScore = z.infer<typeof kangurScoreSchema>;

export const kangurScoreCreateInputSchema = kangurScoreSchema.omit({
  id: true,
  created_date: true,
  created_by: true,
});
export type KangurScoreCreateInput = z.infer<typeof kangurScoreCreateInputSchema>;

export const kangurScoreRepositoryCreateInputSchema = kangurScoreCreateInputSchema.extend({
  created_by: z.string().trim().nullable().optional(),
});
export type KangurScoreRepositoryCreateInput = z.infer<typeof kangurScoreRepositoryCreateInputSchema>;

export const kangurScoreFiltersSchema = z.object({
  player_name: z.string().trim().min(1).optional(),
  operation: z.string().trim().min(1).optional(),
  created_by: z.string().trim().min(1).optional(),
});
export type KangurScoreFilters = z.infer<typeof kangurScoreFiltersSchema>;

export const kangurScoreListQuerySchema = z.object({
  sort: kangurScoreSortSchema.optional(),
  limit: kangurScoreLimitSchema.optional(),
  player_name: kangurScoreFiltersSchema.shape.player_name,
  operation: kangurScoreFiltersSchema.shape.operation,
  created_by: kangurScoreFiltersSchema.shape.created_by,
});
export type KangurScoreListQuery = z.infer<typeof kangurScoreListQuerySchema>;
