import { z } from 'zod';

const nonEmptyTrimmedString = z.string().trim().min(1);

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
