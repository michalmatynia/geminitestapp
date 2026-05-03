import { kangurScoreSchema } from '@kangur/contracts/kangur';
import type { KangurScore } from '@kangur/contracts/kangur';

/**
 * Normalizes runtime KangurScore data to match the strict schema defined in @kangur/contracts.
 * Sanitizes nulls, empty strings, and missing values to ensure type compliance.
 */
export function normalizeKangurScore(input: unknown): KangurScore {
  const result = kangurScoreSchema.safeParse(input);

  if (result.success) {
    return result.data;
  }

  // Fallback defaults if validation fails
  return {
    id: 'unknown',
    player_name: 'Unknown',
    score: 0,
    operation: 'unknown',
    subject: 'maths',
    total_questions: 1,
    correct_answers: 0,
    time_taken: 0,
    xp_earned: null,
    created_date: new Date().toISOString(),
    client_mutation_id: null,
    created_by: null,
    learner_id: null,
    owner_user_id: null,
  };
}
