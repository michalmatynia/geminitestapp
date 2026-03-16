import 'server-only';

import { ObjectId, type Filter, type SortDirection } from 'mongodb';

import {
  resolveKangurScoreSubject,
  type KangurScore,
  type KangurScoreRepositoryCreateInput,
} from '@/features/kangur/shared/contracts/kangur';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import { normalizeSort } from './shared';

import type { KangurScoreListInput, KangurScoreRepository } from './types';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';


const KANGUR_SCORES_COLLECTION = 'kangur_scores';
const KANGUR_SCORES_CLIENT_MUTATION_INDEX = 'kangur_scores_client_mutation_id_unique';

type KangurScoreDocument = {
  _id: ObjectId;
  player_name: string;
  score: number;
  operation: string;
  subject?: KangurScore['subject'] | null;
  total_questions: number;
  correct_answers: number;
  time_taken: number;
  xp_earned?: number | null;
  created_date: Date;
  client_mutation_id?: string | null;
  created_by?: string | null;
  learner_id?: string | null;
  owner_user_id?: string | null;
};

const toDto = (doc: KangurScoreDocument): KangurScore => ({
  id: doc._id.toString(),
  player_name: doc.player_name,
  score: doc.score,
  operation: doc.operation,
  subject: resolveKangurScoreSubject({ operation: doc.operation, subject: doc.subject ?? null }),
  total_questions: doc.total_questions,
  correct_answers: doc.correct_answers,
  time_taken: doc.time_taken,
  xp_earned: doc.xp_earned ?? null,
  created_date: doc.created_date.toISOString(),
  client_mutation_id: doc.client_mutation_id ?? null,
  created_by: doc.created_by ?? null,
  learner_id: doc.learner_id ?? null,
  owner_user_id: doc.owner_user_id ?? null,
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
  if (filters.subject) {
    if (filters.subject === 'maths') {
      query.$or = [
        { subject: filters.subject },
        { subject: { $exists: false } },
        { subject: null },
      ];
    } else {
      query.subject = filters.subject;
    }
  }
  if (filters.created_by) {
    query.created_by = filters.created_by;
  }
  if (filters.learner_id) {
    query.learner_id = filters.learner_id;
  }
  return query;
};

let ensureMongoScoreIndexesPromise: Promise<void> | null = null;

const ensureMongoScoreIndexes = async (): Promise<void> => {
  if (!ensureMongoScoreIndexesPromise) {
    ensureMongoScoreIndexesPromise = (async () => {
      const db = await getMongoDb();
      await db.collection<KangurScoreDocument>(KANGUR_SCORES_COLLECTION).createIndex(
        { client_mutation_id: 1 },
        {
          name: KANGUR_SCORES_CLIENT_MUTATION_INDEX,
          unique: true,
          sparse: true,
        }
      );
    })().catch((error) => {
      ensureMongoScoreIndexesPromise = null;
      throw error;
    });
  }

  return ensureMongoScoreIndexesPromise;
};

const isMongoDuplicateKeyError = (error: unknown): boolean => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? (error as { code?: unknown }).code : null;
  const message =
    error instanceof Error ? error.message.toLowerCase() : typeof error === 'string' ? error.toLowerCase() : '';
  return code === 11000 || message.includes('e11000') || message.includes('duplicate key');
};

export const mongoKangurScoreRepository: KangurScoreRepository = {
  async createScore(input: KangurScoreRepositoryCreateInput): Promise<KangurScore> {
    const db = await getMongoDb();
    const clientMutationId = input.client_mutation_id?.trim() ?? '';
    await ensureMongoScoreIndexes();

    const now = new Date();
    const payload: Omit<KangurScoreDocument, '_id'> = {
      player_name: input.player_name,
      score: input.score,
      operation: input.operation,
      subject: input.subject,
      total_questions: input.total_questions,
      correct_answers: input.correct_answers,
      time_taken: input.time_taken,
      xp_earned: input.xp_earned ?? null,
      created_date: now,
      client_mutation_id: clientMutationId || null,
      created_by: input.created_by ?? null,
      learner_id: input.learner_id ?? null,
      owner_user_id: input.owner_user_id ?? null,
    };

    try {
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
    } catch (error: unknown) {
      void ErrorSystem.captureException(error);
      if (!clientMutationId || !isMongoDuplicateKeyError(error)) {
        throw error;
      }

      const existing = await db
        .collection<KangurScoreDocument>(KANGUR_SCORES_COLLECTION)
        .findOne({ client_mutation_id: clientMutationId });
      if (existing) {
        return toDto(existing);
      }
      throw error;
    }
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
