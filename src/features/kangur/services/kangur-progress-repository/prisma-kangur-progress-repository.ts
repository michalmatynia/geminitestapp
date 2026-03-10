import 'server-only';

import {
  createDefaultKangurProgressState,
  normalizeKangurProgressState,
  type KangurProgressState,
} from '@/shared/contracts/kangur';
import prisma from '@/shared/lib/db/prisma';

import type { KangurProgressRepository } from './types';

const KANGUR_PROGRESS_SETTING_PREFIX = 'kangur_progress:';

type PrismaProgressSettingRow = {
  value: string;
};

const toSettingKey = (userKey: string): string =>
  `${KANGUR_PROGRESS_SETTING_PREFIX}${encodeURIComponent(userKey.trim().toLowerCase())}`;

const parseProgressRow = (row: PrismaProgressSettingRow | null): KangurProgressState => {
  if (!row?.value) {
    return createDefaultKangurProgressState();
  }

  try {
    return normalizeKangurProgressState(JSON.parse(row.value) as unknown);
  } catch {
    return createDefaultKangurProgressState();
  }
};

export const prismaKangurProgressRepository: KangurProgressRepository = {
  async getProgress(userKey: string): Promise<KangurProgressState> {
    const row = (await prisma.setting.findUnique({
      where: { key: toSettingKey(userKey) },
      select: { value: true },
    })) as PrismaProgressSettingRow | null;

    return parseProgressRow(row);
  },

  async saveProgress(userKey: string, progress: KangurProgressState): Promise<KangurProgressState> {
    const normalized = normalizeKangurProgressState(progress);

    await prisma.setting.upsert({
      where: { key: toSettingKey(userKey) },
      update: {
        value: JSON.stringify(normalized),
      },
      create: {
        key: toSettingKey(userKey),
        value: JSON.stringify(normalized),
      },
    });

    return normalized;
  },
};
