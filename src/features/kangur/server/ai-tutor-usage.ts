import 'server-only';

import type { KangurAiTutorUsageSummary } from '@/shared/contracts/kangur-ai-tutor';
import { quotaExceededError } from '@/shared/errors/app-error';
import { readStoredSettingValue, upsertStoredSettingValue } from '@/shared/lib/ai-brain/server';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

export const KANGUR_AI_TUTOR_USAGE_SETTINGS_KEY = 'kangur_ai_tutor_usage_v1';

type KangurAiTutorUsageEntry = {
  dateKey: string;
  messageCount: number;
  updatedAt: string;
};

type KangurAiTutorUsageStore = Record<string, KangurAiTutorUsageEntry>;

const isDateKey = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const normalizeUsageEntry = (value: unknown): KangurAiTutorUsageEntry | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (!isDateKey(record['dateKey'])) {
    return null;
  }

  const rawMessageCount = record['messageCount'];
  const normalizedMessageCount =
    typeof rawMessageCount === 'number' && Number.isFinite(rawMessageCount) && rawMessageCount >= 0
      ? Math.floor(rawMessageCount)
      : 0;
  const updatedAt =
    typeof record['updatedAt'] === 'string' && record['updatedAt'].trim().length > 0
      ? record['updatedAt']
      : new Date(0).toISOString();

  return {
    dateKey: record['dateKey'],
    messageCount: normalizedMessageCount,
    updatedAt,
  };
};

const parseKangurAiTutorUsageStore = (raw: string | null): KangurAiTutorUsageStore => {
  const parsed = parseJsonSetting<KangurAiTutorUsageStore>(raw, {});
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {};
  }

  return Object.entries(parsed).reduce<KangurAiTutorUsageStore>((acc, [learnerId, entry]) => {
    if (!learnerId.trim()) {
      return acc;
    }

    const normalized = normalizeUsageEntry(entry);
    if (!normalized) {
      return acc;
    }

    acc[learnerId] = normalized;
    return acc;
  }, {});
};

export const buildKangurAiTutorUsageDateKey = (now = new Date()): string => {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const readKangurAiTutorDailyUsage = async ({
  learnerId,
  dailyMessageLimit,
  now = new Date(),
}: {
  learnerId: string;
  dailyMessageLimit: number | null;
  now?: Date;
}): Promise<KangurAiTutorUsageSummary> => {
  const dateKey = buildKangurAiTutorUsageDateKey(now);
  const rawStore = await readStoredSettingValue(KANGUR_AI_TUTOR_USAGE_SETTINGS_KEY);
  const store = parseKangurAiTutorUsageStore(rawStore);
  const currentEntry = store[learnerId];
  const currentCount = currentEntry?.dateKey === dateKey ? currentEntry.messageCount : 0;

  return {
    dateKey,
    messageCount: currentCount,
    dailyMessageLimit,
    remainingMessages:
      dailyMessageLimit === null ? null : Math.max(0, dailyMessageLimit - currentCount),
  };
};

export const ensureKangurAiTutorDailyUsageAvailable = async ({
  learnerId,
  dailyMessageLimit,
  now = new Date(),
}: {
  learnerId: string;
  dailyMessageLimit: number | null;
  now?: Date;
}): Promise<KangurAiTutorUsageSummary> => {
  const currentUsage = await readKangurAiTutorDailyUsage({
    learnerId,
    dailyMessageLimit,
    now,
  });

  if (dailyMessageLimit !== null && currentUsage.messageCount >= dailyMessageLimit) {
    throw quotaExceededError(
      'Daily AI tutor message limit reached for this learner. Try again tomorrow.',
      {
        learnerId,
        dateKey: currentUsage.dateKey,
        dailyMessageLimit,
        messageCount: currentUsage.messageCount,
        remainingMessages: 0,
      }
    );
  }

  return currentUsage;
};

export const consumeKangurAiTutorDailyUsage = async ({
  learnerId,
  dailyMessageLimit,
  now = new Date(),
}: {
  learnerId: string;
  dailyMessageLimit: number | null;
  now?: Date;
}): Promise<KangurAiTutorUsageSummary> => {
  const currentUsage = await ensureKangurAiTutorDailyUsageAvailable({
    learnerId,
    dailyMessageLimit,
    now,
  });
  const { dateKey, messageCount: currentCount } = currentUsage;

  if (dailyMessageLimit === null) {
    return currentUsage;
  }

  const nextCount = currentCount + 1;
  const rawStore = await readStoredSettingValue(KANGUR_AI_TUTOR_USAGE_SETTINGS_KEY);
  const store = parseKangurAiTutorUsageStore(rawStore);
  const nextStore: KangurAiTutorUsageStore = {
    ...store,
    [learnerId]: {
      dateKey,
      messageCount: nextCount,
      updatedAt: now.toISOString(),
    },
  };

  const persisted = await upsertStoredSettingValue(
    KANGUR_AI_TUTOR_USAGE_SETTINGS_KEY,
    serializeSetting(nextStore)
  );
  if (!persisted) {
    throw new Error('Failed to persist Kangur AI tutor usage.');
  }

  return {
    dateKey,
    messageCount: nextCount,
    dailyMessageLimit,
    remainingMessages: Math.max(0, dailyMessageLimit - nextCount),
  };
};
