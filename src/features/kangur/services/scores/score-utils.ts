/**
 * Kangur Platform - Scoring Utilities
 * 
 * Provides utility functions for score deduplication, merging, and URL construction.
 */

import { buildKangurScoreListPath } from '@kangur/api-client';
import type { KangurScoreRecord } from '@kangur/platform';
import { type KangurLessonSubject } from '@kangur/contracts/kangur-lesson-constants';
import { sortScores } from '@/features/kangur/services/kangur-score-repository/shared';

const DEFAULT_SCORE_LIMIT = 100;

/**
 * Builds a unique deduplication key for a score record based on mutation ID.
 */
export const getScoreDedupKey = (score: KangurScoreRecord): string => {
  const mutationId = score.client_mutation_id?.trim();
  return typeof mutationId === 'string' && mutationId.length > 0 ? mutationId : score.id;
};

/**
 * Merges local and remote score rows, applying deduplication and sorting.
 */
export const mergeScoreRows = (input: {
  localRows: KangurScoreRecord[];
  remoteRows: KangurScoreRecord[];
  sort?: string;
  limit?: number;
}): KangurScoreRecord[] => {
  const mergedRows = new Map<string, KangurScoreRecord>();

  input.localRows.forEach((score) => {
    mergedRows.set(getScoreDedupKey(score), score);
  });
  input.remoteRows.forEach((score) => {
    mergedRows.set(getScoreDedupKey(score), score);
  });

  const limit = typeof input.limit === 'number' ? input.limit : DEFAULT_SCORE_LIMIT;
  return sortScores(Array.from(mergedRows.values()), input.sort).slice(0, limit);
};

/**
 * Builds the URL for fetching Kangur scores.
 */
export const buildScoresUrl = (params: {
  sort?: string;
  limit?: number;
  player_name?: string;
  operation?: string;
  subject?: KangurLessonSubject;
  created_by?: string;
  learner_id?: string;
}): string => buildKangurScoreListPath(params);
