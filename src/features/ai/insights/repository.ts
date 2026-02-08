import 'server-only';

import { randomUUID } from 'crypto';

import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import type { AiInsightRecord, AiInsightType, AiInsightNotification } from '@/shared/types/ai-insights';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

import { AI_INSIGHTS_SETTINGS_KEYS } from './settings';

type SettingDoc = { key?: string; value?: string; _id?: string };

const SETTINGS_COLLECTION = 'settings';

const getHistoryKey = (type: AiInsightType): string =>
  type === 'analytics'
    ? AI_INSIGHTS_SETTINGS_KEYS.analyticsHistory
    : type === 'runtime_analytics'
      ? AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsHistory
      : AI_INSIGHTS_SETTINGS_KEYS.logsHistory;

const canUsePrismaSettings = (): boolean =>
  Boolean(process.env['DATABASE_URL']) && 'setting' in prisma;

const readSettingValue = async (key: string): Promise<string | null> => {
  const provider = await getAppDbProvider();
  if (provider === 'mongodb') {
    if (!process.env['MONGODB_URI']) return null;
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<SettingDoc>(SETTINGS_COLLECTION)
      .findOne({ $or: [{ _id: key }, { key }] });
    return typeof doc?.value === 'string' ? doc.value : null;
  }

  if (canUsePrismaSettings()) {
    const setting = await prisma.setting.findUnique({
      where: { key },
      select: { value: true },
    });
    return setting?.value ?? null;
  }
  return null;
};

const upsertSettingValue = async (key: string, value: string): Promise<void> => {
  const provider = await getAppDbProvider();
  const hasMongo = Boolean(process.env['MONGODB_URI']);
  if (provider === 'mongodb' || !canUsePrismaSettings()) {
    if (!hasMongo) return;
    const mongo = await getMongoDb();
    const now = new Date();
    await mongo.collection<SettingDoc>(SETTINGS_COLLECTION).updateOne(
      { key },
      { $set: { value, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true }
    );
    return;
  }

  if (canUsePrismaSettings()) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
};

const normalizeHistory = (input: AiInsightRecord[]): AiInsightRecord[] => {
  return input
    .filter((entry: AiInsightRecord) => entry && typeof entry.id === 'string')
    .sort((a: AiInsightRecord, b: AiInsightRecord) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
};

export const listAiInsights = async (
  type: AiInsightType,
  limit: number = 10
): Promise<AiInsightRecord[]> => {
  const raw = await readSettingValue(getHistoryKey(type));
  const parsed = parseJsonSetting<AiInsightRecord[]>(raw, []);
  const normalized = normalizeHistory(parsed);
  return normalized.slice(0, limit);
};

export const appendAiInsight = async (
  type: AiInsightType,
  input: Omit<AiInsightRecord, 'id' | 'createdAt' | 'type'>
): Promise<AiInsightRecord> => {
  const insight: AiInsightRecord = {
    id: randomUUID(),
    type,
    createdAt: new Date().toISOString(),
    ...input,
  };
  const history = await listAiInsights(type, 50);
  const next = normalizeHistory([insight, ...history]).slice(0, 25);
  await upsertSettingValue(getHistoryKey(type), serializeSetting(next));
  return insight;
};

const normalizeNotifications = (input: AiInsightNotification[]): AiInsightNotification[] => {
  return input
    .filter((entry: AiInsightNotification) => entry && typeof entry.id === 'string')
    .sort((a: AiInsightNotification, b: AiInsightNotification) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
};

export const listAiInsightNotifications = async (
  limit: number = 20
): Promise<AiInsightNotification[]> => {
  const raw = await readSettingValue(AI_INSIGHTS_SETTINGS_KEYS.notifications);
  const parsed = parseJsonSetting<AiInsightNotification[]>(raw, []);
  const normalized = normalizeNotifications(parsed);
  return normalized.slice(0, limit);
};

export const appendAiInsightNotification = async (
  input: Omit<AiInsightNotification, 'id' | 'createdAt'>
): Promise<AiInsightNotification> => {
  const notification: AiInsightNotification = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };
  const history = await listAiInsightNotifications(100);
  const next = normalizeNotifications([notification, ...history]).slice(0, 50);
  await upsertSettingValue(
    AI_INSIGHTS_SETTINGS_KEYS.notifications,
    serializeSetting(next),
  );
  return notification;
};

export const clearAiInsightNotifications = async (): Promise<void> => {
  await upsertSettingValue(AI_INSIGHTS_SETTINGS_KEYS.notifications, serializeSetting([]));
};

export const setAiInsightsMeta = async (key: string, value: string): Promise<void> => {
  await upsertSettingValue(key, value);
};

export const getAiInsightsMeta = async (key: string): Promise<string | null> => {
  return readSettingValue(key);
};
