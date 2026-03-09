import 'server-only';

import { randomUUID } from 'crypto';

import prisma from '@/shared/lib/db/prisma';
import { Prisma } from '@/shared/lib/db/prisma-client';
import {
  kangurScoreSchema,
  type KangurScore,
  type KangurScoreRepositoryCreateInput,
} from '@/shared/contracts/kangur';

import { sortScores } from './shared';
import type { KangurScoreListInput, KangurScoreRepository } from './types';

const KANGUR_SCORE_SETTING_PREFIX = 'kangur_score:';
const KANGUR_SCORE_MUTATION_PREFIX = 'kangur_score_mutation:';
const PRISMA_SCORE_SCAN_LIMIT = 5000;

type PrismaScoreSettingRow = {
  key: string;
  value: string;
};

const toSettingKey = (createdDateIso: string, id: string): string => {
  const millis = Date.parse(createdDateIso);
  const normalizedMillis = Number.isFinite(millis) ? millis : Date.now();
  const sortableTimestamp = String(normalizedMillis).padStart(13, '0');
  return `${KANGUR_SCORE_SETTING_PREFIX}${sortableTimestamp}:${id}`;
};

const toMutationSettingKey = (clientMutationId: string): string =>
  `${KANGUR_SCORE_MUTATION_PREFIX}${encodeURIComponent(clientMutationId.trim())}`;

const isPrismaUniqueConstraintError = (
  error: unknown
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

const parseScoreRow = (row: PrismaScoreSettingRow): KangurScore | null => {
  try {
    const parsedJson = JSON.parse(row.value) as unknown;
    const parsedScore = kangurScoreSchema.safeParse(parsedJson);
    if (!parsedScore.success) {
      return null;
    }
    return parsedScore.data;
  } catch {
    return null;
  }
};

const applyFilters = (scores: KangurScore[], input?: KangurScoreListInput): KangurScore[] => {
  const filters = input?.filters;
  if (!filters) {
    return scores;
  }
  return scores.filter((score) => {
    if (filters.player_name && score.player_name !== filters.player_name) return false;
    if (filters.operation && score.operation !== filters.operation) return false;
    if (filters.created_by && score.created_by !== filters.created_by) return false;
    if (filters.learner_id && score.learner_id !== filters.learner_id) return false;
    return true;
  });
};

export const prismaKangurScoreRepository: KangurScoreRepository = {
  async createScore(input: KangurScoreRepositoryCreateInput): Promise<KangurScore> {
    const clientMutationId = input.client_mutation_id?.trim() ?? '';
    const mutationKey = clientMutationId ? toMutationSettingKey(clientMutationId) : null;
    if (mutationKey) {
      const mapping = await prisma.setting.findUnique({
        where: {
          key: mutationKey,
        },
        select: {
          value: true,
        },
      });

      if (typeof mapping?.value === 'string' && mapping.value.length > 0) {
        const existingScoreRow = (await prisma.setting.findUnique({
          where: {
            key: mapping.value,
          },
          select: {
            key: true,
            value: true,
          },
        })) as PrismaScoreSettingRow | null;
        const existingScore = existingScoreRow ? parseScoreRow(existingScoreRow) : null;
        if (existingScore) {
          return existingScore;
        }
      }
    }

    const createdDate = new Date().toISOString();
    const id = randomUUID();
    const scoreKey = toSettingKey(createdDate, id);
    const score: KangurScore = {
      id,
      player_name: input.player_name,
      score: input.score,
      operation: input.operation,
      total_questions: input.total_questions,
      correct_answers: input.correct_answers,
      time_taken: input.time_taken,
      created_date: createdDate,
      client_mutation_id: clientMutationId || null,
      created_by: input.created_by ?? null,
      learner_id: input.learner_id ?? null,
      owner_user_id: input.owner_user_id ?? null,
    };

    if (mutationKey) {
      try {
        await prisma.$transaction([
          prisma.setting.create({
            data: {
              key: mutationKey,
              value: scoreKey,
            },
          }),
          prisma.setting.create({
            data: {
              key: scoreKey,
              value: JSON.stringify(score),
            },
          }),
        ]);
      } catch (error: unknown) {
        if (!isPrismaUniqueConstraintError(error)) {
          throw error;
        }

        const mapping = await prisma.setting.findUnique({
          where: {
            key: mutationKey,
          },
          select: {
            value: true,
          },
        });
        const existingScoreRow = typeof mapping?.value === 'string' && mapping.value.length > 0
          ? ((await prisma.setting.findUnique({
            where: {
              key: mapping.value,
            },
            select: {
              key: true,
              value: true,
            },
          })) as PrismaScoreSettingRow | null)
          : null;
        const existingScore = existingScoreRow ? parseScoreRow(existingScoreRow) : null;
        if (existingScore) {
          return existingScore;
        }
        throw error;
      }
    } else {
      await prisma.setting.create({
        data: {
          key: scoreKey,
          value: JSON.stringify(score),
        },
      });
    }

    return score;
  },

  async listScores(input?: KangurScoreListInput): Promise<KangurScore[]> {
    const rows = (await prisma.setting.findMany({
      where: {
        key: {
          startsWith: KANGUR_SCORE_SETTING_PREFIX,
        },
      },
      select: {
        key: true,
        value: true,
      },
      orderBy: {
        key: 'desc',
      },
      take: PRISMA_SCORE_SCAN_LIMIT,
    })) as PrismaScoreSettingRow[];

    const parsed = rows.map(parseScoreRow).filter((row): row is KangurScore => row !== null);
    const filtered = applyFilters(parsed, input);
    const sorted = sortScores(filtered, input?.sort);
    const limit = input?.limit ?? 100;
    return sorted.slice(0, limit);
  },
};
