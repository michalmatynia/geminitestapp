import type { KangurScore } from '@kangur/contracts/kangur';

/**
 * Normalizes runtime KangurScore data to match the strict schema defined in @kangur/contracts.
 * Sanitizes nulls, empty strings, and missing values to ensure type compliance.
 */
export function normalizeKangurScore(input: any): KangurScore {
  return {
    id: input?.id ?? 'unknown',
    player_name: (typeof input?.player_name === 'string' && input.player_name.trim()) ? input.player_name.trim() : 'Unknown',
    score: typeof input?.score === 'number' ? input.score : 0,
    operation: (typeof input?.operation === 'string' && input.operation.trim()) ? input.operation.trim() : 'unknown',
    subject: input?.subject ?? 'maths',
    total_questions: typeof input?.total_questions === 'number' && input.total_questions > 0 ? input.total_questions : 1,
    correct_answers: typeof input?.correct_answers === 'number' ? input.correct_answers : 0,
    time_taken: typeof input?.time_taken === 'number' ? input.time_taken : 0,
    xp_earned: typeof input?.xp_earned === 'number' ? input.xp_earned : null,
    created_date: (typeof input?.created_date === 'string' && input.created_date) ? input.created_date : new Date().toISOString(),
    client_mutation_id: input?.client_mutation_id ?? null,
    created_by: input?.created_by ?? null,
    learner_id: input?.learner_id ?? null,
    owner_user_id: input?.owner_user_id ?? null,
  };
}
