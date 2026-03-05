import 'server-only';

import { randomUUID } from 'crypto';

import prisma from '@/shared/lib/db/prisma';
import {
  kangurScoreSchema,
  type KangurScore,
  type KangurScoreRepositoryCreateInput,
} from '@/shared/contracts/kangur';

import { sortScores } from './shared';
import type { KangurScoreListInput, KangurScoreRepository } from './types';

const KANGUR_SCORE_SETTING_PREFIX = 'kangur_score:';
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
    return true;
  });
};

export const prismaKangurScoreRepository: KangurScoreRepository = {
  async createScore(input: KangurScoreRepositoryCreateInput): Promise<KangurScore> {
    const createdDate = new Date().toISOString();
    const id = randomUUID();
    const score: KangurScore = {
      id,
      player_name: input.player_name,
      score: input.score,
      operation: input.operation,
      total_questions: input.total_questions,
      correct_answers: input.correct_answers,
      time_taken: input.time_taken,
      created_date: createdDate,
      created_by: input.created_by ?? null,
    };

    await prisma.setting.create({
      data: {
        key: toSettingKey(createdDate, id),
        value: JSON.stringify(score),
      },
    });

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

    const parsed = rows
      .map(parseScoreRow)
      .filter((row): row is KangurScore => row !== null);
    const filtered = applyFilters(parsed, input);
    const sorted = sortScores(filtered, input?.sort);
    const limit = input?.limit ?? 100;
    return sorted.slice(0, limit);
  },
};
