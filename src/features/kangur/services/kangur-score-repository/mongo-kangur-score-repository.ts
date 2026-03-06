import 'server-only';

import { ObjectId, type Filter, type SortDirection } from 'mongodb';

import type { KangurScore, KangurScoreRepositoryCreateInput } from '@/shared/contracts/kangur';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import { normalizeSort } from './shared';
import type { KangurScoreListInput, KangurScoreRepository } from './types';

const KANGUR_SCORES_COLLECTION = 'kangur_scores';

type KangurScoreDocument = {
  _id: ObjectId;
  player_name: string;
  score: number;
  operation: string;
  total_questions: number;
  correct_answers: number;
  time_taken: number;
  created_date: Date;
  created_by?: string | null;
};

const toDto = (doc: KangurScoreDocument): KangurScore => ({
  id: doc._id.toString(),
  player_name: doc.player_name,
  score: doc.score,
  operation: doc.operation,
  total_questions: doc.total_questions,
  correct_answers: doc.correct_answers,
  time_taken: doc.time_taken,
  created_date: doc.created_date.toISOString(),
  created_by: doc.created_by ?? null,
});

const toMongoSort = (sort: KangurScoreListInput['sort']): Record<string, SortDirection> => {
  const normalized = normalizeSort(sort);
  return {
    [normalized.field]: normalized.direction === 'desc' ? -1 : 1,
  };
};

const toMongoFilters = (input?: KangurScoreListInput): Filter<KangurScoreDocument> => {
  const filters = input?.filters;
  const query: Filter<KangurScoreDocument> = {};
  if (!filters) return query;

  if (filters.player_name) {
    query.player_name = filters.player_name;
  }
  if (filters.operation) {
    query.operation = filters.operation;
  }
  if (filters.created_by) {
    query.created_by = filters.created_by;
  }
  return query;
};

export const mongoKangurScoreRepository: KangurScoreRepository = {
  async createScore(input: KangurScoreRepositoryCreateInput): Promise<KangurScore> {
    const db = await getMongoDb();
    const now = new Date();
    const payload: Omit<KangurScoreDocument, '_id'> = {
      player_name: input.player_name,
      score: input.score,
      operation: input.operation,
      total_questions: input.total_questions,
      correct_answers: input.correct_answers,
      time_taken: input.time_taken,
      created_date: now,
      created_by: input.created_by ?? null,
    };

    const insertResult = await db
      .collection<KangurScoreDocument>(KANGUR_SCORES_COLLECTION)
      .insertOne({
        ...payload,
        _id: new ObjectId(),
      });

    return toDto({
      _id: insertResult.insertedId,
      ...payload,
    });
  },

  async listScores(input?: KangurScoreListInput): Promise<KangurScore[]> {
    const db = await getMongoDb();
    const limit = input?.limit ?? 100;
    const rows = await db
      .collection<KangurScoreDocument>(KANGUR_SCORES_COLLECTION)
      .find(toMongoFilters(input))
      .sort(toMongoSort(input?.sort))
      .limit(limit)
      .toArray();
    return rows.map(toDto);
  },
};
