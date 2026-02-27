import 'server-only';

import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { configurationError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import {
  AI_BRAIN_SETTINGS_KEY,
  parseBrainSettings,
  resolveBrainAssignment,
  type AiBrainAssignment,
  type AiBrainFeature,
} from './settings';

export type BrainAppliedMeta = {
  feature: AiBrainFeature;
  provider: 'model' | 'agent';
  modelId: string;
  temperature: number;
  maxTokens: number;
  systemPromptApplied: boolean;
  enforced: true;
};

export type BrainModelExecutionConfig = {
  assignment: AiBrainAssignment;
  modelId: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  brainApplied: BrainAppliedMeta;
};

const featureLabels: Record<AiBrainFeature, string> = {
  cms_builder: 'CMS Builder',
  system_logs: 'System Logs',
  error_logs: 'Error Logs',
  analytics: 'Analytics',
  runtime_analytics: 'Runtime Analytics',
  image_studio: 'Image Studio',
  ai_paths: 'AI Paths',
  chatbot: 'Chatbot',
  prompt_engine: 'Prompt Engine',
};

type SettingDoc = { key?: string; value?: string; _id?: string };

const canUsePrismaSettings = (): boolean =>
  Boolean(process.env['DATABASE_URL']) && 'setting' in prisma;

const readPrismaSettingValue = async (key: string): Promise<string | null> => {
  if (!canUsePrismaSettings()) return null;
  const setting = await prisma.setting.findUnique({
    where: { key },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const readMongoSettingValue = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<SettingDoc>('settings')
    .findOne({ $or: [{ _id: key }, { key }] });
  return typeof doc?.value === 'string' ? doc.value : null;
};

let cachedBrainSettingsValue: string | null = null;
let lastBrainSettingsFetchAt = 0;
const BRAIN_SETTINGS_TTL_MS = 30000; // 30 seconds

const readBrainSettingValue = async (key: string): Promise<string | null> => {
  const now = Date.now();
  if (key === AI_BRAIN_SETTINGS_KEY && cachedBrainSettingsValue !== null && now - lastBrainSettingsFetchAt < BRAIN_SETTINGS_TTL_MS) {
    return cachedBrainSettingsValue;
  }

  const provider = await getAppDbProvider().catch(() => null);

  const tryPrisma = async () => {
    try { return await readPrismaSettingValue(key); } catch { return null; }
  };
  const tryMongo = async () => {
    try { return await readMongoSettingValue(key); } catch { return null; }
  };

  const value =
    provider === 'mongodb'
      ? (await tryMongo()) || (await tryPrisma())
      : (await tryPrisma()) || (await tryMongo());

  if (key === AI_BRAIN_SETTINGS_KEY) {
    cachedBrainSettingsValue = value;
    lastBrainSettingsFetchAt = now;
  }

  return value;
};

export const getBrainAssignmentForFeature = async (
  feature: AiBrainFeature
): Promise<AiBrainAssignment> => {
  const raw = await readBrainSettingValue(AI_BRAIN_SETTINGS_KEY);
  const settings = parseBrainSettings(raw);
  return resolveBrainAssignment(settings, feature);
};

export const resolveBrainModelExecutionConfig = async (
  feature: AiBrainFeature,
  options?: {
    defaultTemperature?: number;
    defaultMaxTokens?: number;
    defaultSystemPrompt?: string;
  },
): Promise<BrainModelExecutionConfig> => {
  const assignment = await getBrainAssignmentForFeature(feature);
  const featureLabel = featureLabels[feature] ?? feature;

  if (!assignment.enabled) {
    throw configurationError(
      `${featureLabel} is disabled in AI Brain. Enable it in /admin/settings/brain before running this action.`,
    );
  }

  if (assignment.provider !== 'model') {
    throw configurationError(
      `${featureLabel} requires AI Brain provider=Model in this release. Update /admin/settings/brain to continue.`,
    );
  }

  const modelId = assignment.modelId.trim();
  if (!modelId) {
    throw configurationError(
      `${featureLabel} has no model assigned in AI Brain. Set a non-empty model ID in /admin/settings/brain.`,
    );
  }

  const temperature = assignment.temperature ?? options?.defaultTemperature ?? 0.7;
  const maxTokens = assignment.maxTokens ?? options?.defaultMaxTokens ?? 800;
  const systemPrompt =
    assignment.systemPrompt?.trim() ||
    options?.defaultSystemPrompt ||
    'You are an AI assistant.';

  return {
    assignment,
    modelId,
    temperature,
    maxTokens,
    systemPrompt,
    brainApplied: {
      feature,
      provider: 'model',
      modelId,
      temperature,
      maxTokens,
      systemPromptApplied: systemPrompt.trim().length > 0,
      enforced: true,
    },
  };
};
