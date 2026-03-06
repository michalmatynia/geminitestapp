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
  'logical_thinking',
  'logical_patterns',
  'logical_classification',
  'logical_reasoning',
  'logical_analogies',
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

export const kangurLearnerStatusSchema = z.enum(['active', 'disabled']);
export type KangurLearnerStatus = z.infer<typeof kangurLearnerStatusSchema>;

export const kangurLearnerProfileSchema = z.object({
  id: nonEmptyTrimmedString.max(120),
  ownerUserId: nonEmptyTrimmedString.max(120),
  displayName: nonEmptyTrimmedString.max(120),
  loginName: nonEmptyTrimmedString.max(80),
  status: kangurLearnerStatusSchema,
  legacyUserKey: z.string().trim().max(160).nullable().default(null),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type KangurLearnerProfile = z.infer<typeof kangurLearnerProfileSchema>;

export const kangurLearnerProfilesSchema = z.array(kangurLearnerProfileSchema);
export type KangurLearnerProfiles = z.infer<typeof kangurLearnerProfilesSchema>;

export const kangurLearnerCreateInputSchema = z.object({
  displayName: nonEmptyTrimmedString.max(120),
  loginName: nonEmptyTrimmedString.max(80),
  password: z.string().min(8).max(160),
});
export type KangurLearnerCreateInput = z.infer<typeof kangurLearnerCreateInputSchema>;

export const kangurLearnerUpdateInputSchema = z
  .object({
    displayName: nonEmptyTrimmedString.max(120).optional(),
    loginName: nonEmptyTrimmedString.max(80).optional(),
    password: z.string().min(8).max(160).optional(),
    status: kangurLearnerStatusSchema.optional(),
  })
  .refine(
    (value) =>
      value.displayName !== undefined ||
      value.loginName !== undefined ||
      value.password !== undefined ||
      value.status !== undefined,
    {
      message: 'At least one learner update field is required.',
    }
  );
export type KangurLearnerUpdateInput = z.infer<typeof kangurLearnerUpdateInputSchema>;

export const kangurLearnerSignInInputSchema = z.object({
  loginName: nonEmptyTrimmedString.max(80),
  password: z.string().min(1).max(160),
});
export type KangurLearnerSignInInput = z.infer<typeof kangurLearnerSignInInputSchema>;

export const kangurUserActorTypeSchema = z.enum(['parent', 'learner']);
export type KangurUserActorType = z.infer<typeof kangurUserActorTypeSchema>;

export const kangurUserRoleSchema = z.enum(['admin', 'user']);
export type KangurUserRole = z.infer<typeof kangurUserRoleSchema>;

export const kangurAuthUserSchema = z.object({
  id: nonEmptyTrimmedString.max(120),
  full_name: nonEmptyTrimmedString.max(120),
  email: z.string().trim().email().nullable(),
  role: kangurUserRoleSchema,
  actorType: kangurUserActorTypeSchema,
  canManageLearners: z.boolean(),
  ownerUserId: z.string().trim().max(120).nullable(),
  activeLearner: kangurLearnerProfileSchema.nullable(),
  learners: kangurLearnerProfilesSchema,
});
export type KangurAuthUser = z.infer<typeof kangurAuthUserSchema>;

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
  learner_id: z.string().trim().max(120).nullable().optional(),
  owner_user_id: z.string().trim().max(120).nullable().optional(),
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
  learner_id: z.string().trim().max(120).nullable().optional(),
  owner_user_id: z.string().trim().max(120).nullable().optional(),
});
export type KangurScoreRepositoryCreateInput = z.infer<
  typeof kangurScoreRepositoryCreateInputSchema
>;

export const kangurScoreFiltersSchema = z.object({
  player_name: z.string().trim().min(1).optional(),
  operation: z.string().trim().min(1).optional(),
  created_by: z.string().trim().min(1).optional(),
  learner_id: z.string().trim().min(1).optional(),
});
export type KangurScoreFilters = z.infer<typeof kangurScoreFiltersSchema>;

export const kangurScoreListQuerySchema = z.object({
  sort: kangurScoreSortSchema.optional(),
  limit: kangurScoreLimitSchema.optional(),
  player_name: kangurScoreFiltersSchema.shape.player_name,
  operation: kangurScoreFiltersSchema.shape.operation,
  created_by: kangurScoreFiltersSchema.shape.created_by,
  learner_id: kangurScoreFiltersSchema.shape.learner_id,
});
export type KangurScoreListQuery = z.infer<typeof kangurScoreListQuerySchema>;

export const kangurAssignmentPrioritySchema = z.enum(['high', 'medium', 'low']);
export type KangurAssignmentPriority = z.infer<typeof kangurAssignmentPrioritySchema>;

export const kangurPracticeAssignmentOperationSchema = z.enum([
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'decimals',
  'powers',
  'roots',
  'clock',
  'mixed',
]);
export type KangurPracticeAssignmentOperation = z.infer<
  typeof kangurPracticeAssignmentOperationSchema
>;

const kangurAssignmentIsoDateSchema = z.string().datetime({ offset: true });

export const kangurAssignmentCreateLessonTargetSchema = z.object({
  type: z.literal('lesson'),
  lessonComponentId: kangurLessonComponentIdSchema,
  requiredCompletions: z.number().int().min(1).max(20).default(1),
});
export type KangurAssignmentCreateLessonTarget = z.infer<
  typeof kangurAssignmentCreateLessonTargetSchema
>;

export const kangurAssignmentLessonTargetSchema = kangurAssignmentCreateLessonTargetSchema.extend({
  baselineCompletions: kangurProgressCounterSchema,
});
export type KangurAssignmentLessonTarget = z.infer<typeof kangurAssignmentLessonTargetSchema>;

export const kangurAssignmentCreatePracticeTargetSchema = z.object({
  type: z.literal('practice'),
  operation: kangurPracticeAssignmentOperationSchema,
  requiredAttempts: z.number().int().min(1).max(20).default(1),
  minAccuracyPercent: kangurLessonMasteryPercentSchema.nullable().default(null),
});
export type KangurAssignmentCreatePracticeTarget = z.infer<
  typeof kangurAssignmentCreatePracticeTargetSchema
>;

export const kangurAssignmentPracticeTargetSchema = kangurAssignmentCreatePracticeTargetSchema;
export type KangurAssignmentPracticeTarget = z.infer<typeof kangurAssignmentPracticeTargetSchema>;

export const kangurAssignmentCreateTargetSchema = z.discriminatedUnion('type', [
  kangurAssignmentCreateLessonTargetSchema,
  kangurAssignmentCreatePracticeTargetSchema,
]);
export type KangurAssignmentCreateTarget = z.infer<typeof kangurAssignmentCreateTargetSchema>;

export const kangurAssignmentTargetSchema = z.discriminatedUnion('type', [
  kangurAssignmentLessonTargetSchema,
  kangurAssignmentPracticeTargetSchema,
]);
export type KangurAssignmentTarget = z.infer<typeof kangurAssignmentTargetSchema>;

export const kangurAssignmentSchema = z.object({
  id: nonEmptyTrimmedString.max(120),
  learnerKey: nonEmptyTrimmedString.max(160),
  title: nonEmptyTrimmedString.max(160),
  description: nonEmptyTrimmedString.max(320),
  priority: kangurAssignmentPrioritySchema,
  archived: z.boolean().default(false),
  target: kangurAssignmentTargetSchema,
  assignedByName: z.string().trim().max(120).nullable().default(null),
  assignedByEmail: z.string().trim().max(160).nullable().default(null),
  createdAt: kangurAssignmentIsoDateSchema,
  updatedAt: kangurAssignmentIsoDateSchema,
});
export type KangurAssignment = z.infer<typeof kangurAssignmentSchema>;

export const kangurAssignmentsSchema = z.array(kangurAssignmentSchema);
export type KangurAssignments = z.infer<typeof kangurAssignmentsSchema>;

export const kangurAssignmentProgressStatusSchema = z.enum([
  'not_started',
  'in_progress',
  'completed',
]);
export type KangurAssignmentProgressStatus = z.infer<typeof kangurAssignmentProgressStatusSchema>;

export const kangurAssignmentProgressSchema = z.object({
  status: kangurAssignmentProgressStatusSchema,
  percent: z.number().int().min(0).max(100),
  summary: nonEmptyTrimmedString.max(240),
  attemptsCompleted: kangurProgressCounterSchema,
  attemptsRequired: z.number().int().min(1).max(100),
  lastActivityAt: kangurAssignmentIsoDateSchema.nullable(),
  completedAt: kangurAssignmentIsoDateSchema.nullable(),
});
export type KangurAssignmentProgress = z.infer<typeof kangurAssignmentProgressSchema>;

export const kangurAssignmentSnapshotSchema = kangurAssignmentSchema.extend({
  progress: kangurAssignmentProgressSchema,
});
export type KangurAssignmentSnapshot = z.infer<typeof kangurAssignmentSnapshotSchema>;

export const kangurAssignmentCreateInputSchema = z.object({
  title: nonEmptyTrimmedString.max(160),
  description: nonEmptyTrimmedString.max(320),
  priority: kangurAssignmentPrioritySchema,
  target: kangurAssignmentCreateTargetSchema,
});
export type KangurAssignmentCreateInput = z.infer<typeof kangurAssignmentCreateInputSchema>;

export const kangurAssignmentRepositoryCreateInputSchema = kangurAssignmentCreateInputSchema.extend({
  learnerKey: nonEmptyTrimmedString.max(160),
  target: kangurAssignmentTargetSchema,
  assignedByName: z.string().trim().max(120).nullable().optional(),
  assignedByEmail: z.string().trim().max(160).nullable().optional(),
  archived: z.boolean().optional(),
});
export type KangurAssignmentRepositoryCreateInput = z.infer<
  typeof kangurAssignmentRepositoryCreateInputSchema
>;

export const kangurAssignmentUpdateInputSchema = z
  .object({
    archived: z.boolean().optional(),
    priority: kangurAssignmentPrioritySchema.optional(),
  })
  .refine((value) => value.archived !== undefined || value.priority !== undefined, {
    message: 'At least one assignment update field is required.',
  });
export type KangurAssignmentUpdateInput = z.infer<typeof kangurAssignmentUpdateInputSchema>;

export const kangurAssignmentListQuerySchema = z.object({
  includeArchived: z.boolean().default(false),
});
export type KangurAssignmentListQuery = z.infer<typeof kangurAssignmentListQuerySchema>;
