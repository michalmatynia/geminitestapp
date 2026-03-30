import { z } from 'zod';

import { kangurLessonComponentIdSchema } from './kangur-lesson-constants';

const nonEmptyTrimmedString = z.string().trim().min(1);
const kangurProgressCounterSchema = z.number().int().min(0).max(1_000_000);
const kangurLessonMasteryPercentSchema = z.number().int().min(0).max(100);
const kangurAssignmentIsoDateSchema = z.string().datetime({ offset: true });
const kangurAssignmentTimeLimitMinutesSchema = z.number().int().min(1).max(240).nullable();

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
  timeLimitMinutes: kangurAssignmentTimeLimitMinutesSchema.optional(),
  timeLimitStartsAt: kangurAssignmentIsoDateSchema.nullable().optional(),
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
  timeLimitMinutes: kangurAssignmentTimeLimitMinutesSchema.optional(),
  target: kangurAssignmentCreateTargetSchema,
});
export type KangurAssignmentCreateInput = z.infer<typeof kangurAssignmentCreateInputSchema>;

export const kangurAssignmentRepositoryCreateInputSchema = kangurAssignmentCreateInputSchema.extend(
  {
    learnerKey: nonEmptyTrimmedString.max(160),
    target: kangurAssignmentTargetSchema,
    assignedByName: z.string().trim().max(120).nullable().optional(),
    assignedByEmail: z.string().trim().max(160).nullable().optional(),
    archived: z.boolean().optional(),
  }
);
export type KangurAssignmentRepositoryCreateInput = z.infer<
  typeof kangurAssignmentRepositoryCreateInputSchema
>;

export const kangurAssignmentUpdateInputSchema = z
  .object({
    archived: z.boolean().optional(),
    priority: kangurAssignmentPrioritySchema.optional(),
    timeLimitMinutes: kangurAssignmentTimeLimitMinutesSchema.optional(),
  })
  .refine(
    (value) =>
      value.archived !== undefined ||
      value.priority !== undefined ||
      value.timeLimitMinutes !== undefined,
    {
      message: 'At least one assignment update field is required.',
    }
  );
export type KangurAssignmentUpdateInput = z.infer<typeof kangurAssignmentUpdateInputSchema>;

export const kangurAssignmentListQuerySchema = z.object({
  includeArchived: z.boolean().default(false),
});
export type KangurAssignmentListQuery = z.infer<typeof kangurAssignmentListQuerySchema>;
