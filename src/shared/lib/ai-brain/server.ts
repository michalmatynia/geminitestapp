import 'server-only';

import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { configurationError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import {
  AI_BRAIN_SETTINGS_KEY,
  parseBrainSettings,
  getBrainCapabilityDefinition,
  getDefaultCapabilityForFeature,
  resolveBrainAssignment,
  resolveBrainCapabilityAssignment,
  type AiBrainAssignment,
  type AiBrainCapabilityKey,
  type AiBrainFeature,
  type AiBrainCapabilityPolicy,
  type BrainModelFamily,
} from './settings';

export type BrainAppliedMeta = {
  capability: AiBrainCapabilityKey;
  feature: AiBrainFeature;
  modelFamily: BrainModelFamily;
  runtimeKind:
    | 'chat'
    | 'stream'
    | 'embedding'
    | 'ocr'
    | 'vision'
    | 'validation'
    | 'image_generation';
  provider: 'model' | 'agent';
  modelId: string;
  temperature: number;
  maxTokens: number;
  systemPromptApplied: boolean;
  modelSelectionSource?: 'node' | 'brain_default';
  defaultModelId?: string;
  enforced: true;
};

export type BrainExecutionConfig = {
  assignment: AiBrainAssignment;
  capability: AiBrainCapabilityKey;
  feature: AiBrainFeature;
  provider: 'model' | 'agent';
  agentId: string;
  modelId: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  brainApplied: BrainAppliedMeta;
};
export type BrainModelExecutionConfig = BrainExecutionConfig;

export type AiPathsNodeExecutionInput = {
  requestedModelId?: string;
  requestedTemperature?: number;
  requestedMaxTokens?: number;
  requestedSystemPrompt?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  defaultSystemPrompt?: string;
  runtimeKind?: BrainAppliedMeta['runtimeKind'];
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

export const readStoredSettingValue = async (key: string): Promise<string | null> => {
  const now = Date.now();
  if (
    key === AI_BRAIN_SETTINGS_KEY &&
    cachedBrainSettingsValue !== null &&
    now - lastBrainSettingsFetchAt < BRAIN_SETTINGS_TTL_MS
  ) {
    return cachedBrainSettingsValue;
  }

  const provider =
    typeof getAppDbProvider === 'function'
      ? await Promise.resolve(getAppDbProvider()).catch(() => null)
      : null;

  const tryPrisma = async () => {
    try {
      return await readPrismaSettingValue(key);
    } catch {
      return null;
    }
  };
  const tryMongo = async () => {
    try {
      return await readMongoSettingValue(key);
    } catch {
      return null;
    }
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

const readBrainSettingValue = readStoredSettingValue;

const getBrainSettings = async () => {
  const raw = await readBrainSettingValue(AI_BRAIN_SETTINGS_KEY);
  return parseBrainSettings(raw);
};

export const getBrainAssignmentForFeature = async (
  feature: AiBrainFeature
): Promise<AiBrainAssignment> => {
  const settings = await getBrainSettings();
  return resolveBrainAssignment(settings, feature);
};

export const resolveBrainCapabilityPolicy = (
  capability: AiBrainCapabilityKey
): AiBrainCapabilityPolicy => getBrainCapabilityDefinition(capability).policy;

export const getBrainAssignmentForCapability = async (
  capability: AiBrainCapabilityKey
): Promise<AiBrainAssignment> => {
  const settings = await getBrainSettings();
  return resolveBrainCapabilityAssignment(settings, capability);
};

export const resolveBrainExecutionConfigForCapability = async (
  capability: AiBrainCapabilityKey,
  options?: {
    defaultTemperature?: number;
    defaultMaxTokens?: number;
    defaultSystemPrompt?: string;
    /** Fallback model ID used when Brain has no modelId configured for this capability. */
    defaultModelId?: string;
    runtimeKind?: BrainAppliedMeta['runtimeKind'];
  }
): Promise<BrainExecutionConfig> => {
  const assignment = await getBrainAssignmentForCapability(capability);
  const definition = getBrainCapabilityDefinition(capability);
  const capabilityLabel = definition.label;

  if (!assignment.enabled) {
    throw configurationError(
      `${capabilityLabel} is disabled in AI Brain. Enable it in /admin/brain?tab=routing before running this action.`
    );
  }

  if (definition.policy === 'model-only' && assignment.provider !== 'model') {
    throw configurationError(
      `${capabilityLabel} requires AI Brain provider=Model in this release. Update /admin/brain?tab=routing to continue.`
    );
  }

  if (assignment.provider === 'agent' && definition.policy === 'agent-or-model') {
    const agentId = assignment.agentId.trim();
    if (!agentId) {
      throw configurationError(
        `${capabilityLabel} is set to provider=Agent but no agentId is assigned in AI Brain.`
      );
    }
    const systemPrompt = assignment.systemPrompt?.trim() || options?.defaultSystemPrompt || '';
    return {
      assignment,
      capability,
      feature: definition.feature,
      provider: 'agent',
      agentId,
      modelId: '',
      temperature: assignment.temperature ?? options?.defaultTemperature ?? 0.7,
      maxTokens: assignment.maxTokens ?? options?.defaultMaxTokens ?? 800,
      systemPrompt,
      brainApplied: {
        capability,
        feature: definition.feature,
        modelFamily: definition.modelFamily,
        runtimeKind: options?.runtimeKind ?? 'chat',
        provider: 'agent',
        modelId: '',
        temperature: assignment.temperature ?? options?.defaultTemperature ?? 0.7,
        maxTokens: assignment.maxTokens ?? options?.defaultMaxTokens ?? 800,
        systemPromptApplied: systemPrompt.trim().length > 0,
        enforced: true,
      },
    };
  }

  if (assignment.provider !== 'model') {
    throw configurationError(
      `${capabilityLabel} requires AI Brain provider=Model in this release. Update /admin/brain?tab=routing to continue.`
    );
  }

  const modelId = assignment.modelId.trim() || options?.defaultModelId?.trim() || '';
  if (!modelId) {
    throw configurationError(
      `${capabilityLabel} has no model assigned in AI Brain. Set a non-empty model ID in /admin/brain?tab=routing.`
    );
  }

  const temperature = assignment.temperature ?? options?.defaultTemperature ?? 0.7;
  const maxTokens = assignment.maxTokens ?? options?.defaultMaxTokens ?? 800;
  const systemPrompt =
    assignment.systemPrompt?.trim() || options?.defaultSystemPrompt || 'You are an AI assistant.';

  return {
    assignment,
    capability,
    feature: definition.feature,
    provider: 'model',
    agentId: '',
    modelId,
    temperature,
    maxTokens,
    systemPrompt,
    brainApplied: {
      capability,
      feature: definition.feature,
      modelFamily: definition.modelFamily,
      runtimeKind: options?.runtimeKind ?? 'chat',
      provider: 'model',
      modelId,
      temperature,
      maxTokens,
      systemPromptApplied: systemPrompt.trim().length > 0,
      enforced: true,
    },
  };
};

export const resolveBrainModelExecutionConfig = async (
  feature: AiBrainFeature,
  options?: {
    defaultTemperature?: number;
    defaultMaxTokens?: number;
    defaultSystemPrompt?: string;
    /** Fallback model ID used when Brain has no modelId configured for this feature. */
    defaultModelId?: string;
  }
): Promise<BrainModelExecutionConfig> => {
  return resolveBrainExecutionConfigForCapability(getDefaultCapabilityForFeature(feature), options);
};

export const resolveAiPathsNodeExecutionConfig = async (
  options?: AiPathsNodeExecutionInput
): Promise<BrainExecutionConfig> => {
  const capability: AiBrainCapabilityKey = 'ai_paths.model';
  const assignment = await getBrainAssignmentForCapability(capability);
  const definition = getBrainCapabilityDefinition(capability);
  const capabilityLabel = definition.label;

  if (!assignment.enabled) {
    throw configurationError(
      `${capabilityLabel} is disabled in AI Brain. Enable it in /admin/brain?tab=routing before running this action.`
    );
  }

  if (assignment.provider !== 'model') {
    throw configurationError(
      `${capabilityLabel} requires AI Brain provider=Model in this release. Update /admin/brain?tab=routing to continue.`
    );
  }

  const defaultModelId = assignment.modelId.trim();
  const requestedModelId = options?.requestedModelId?.trim() || '';
  const modelId = requestedModelId || defaultModelId;
  if (!modelId) {
    throw configurationError(
      `${capabilityLabel} has no model assigned in AI Brain, and this Model node did not select one. Set a default model in AI Brain or choose a model on the node.`
    );
  }

  const temperature =
    options?.requestedTemperature ?? assignment.temperature ?? options?.defaultTemperature ?? 0.7;
  const maxTokens =
    options?.requestedMaxTokens ?? assignment.maxTokens ?? options?.defaultMaxTokens ?? 800;
  const requestedSystemPrompt = options?.requestedSystemPrompt?.trim() || '';
  const systemPrompt =
    requestedSystemPrompt ||
    assignment.systemPrompt?.trim() ||
    options?.defaultSystemPrompt ||
    'You are an AI assistant.';
  const modelSelectionSource: BrainAppliedMeta['modelSelectionSource'] = requestedModelId
    ? 'node'
    : 'brain_default';

  return {
    assignment,
    capability,
    feature: definition.feature,
    provider: 'model',
    agentId: '',
    modelId,
    temperature,
    maxTokens,
    systemPrompt,
    brainApplied: {
      capability,
      feature: definition.feature,
      modelFamily: definition.modelFamily,
      runtimeKind: options?.runtimeKind ?? 'chat',
      provider: 'model',
      modelId,
      temperature,
      maxTokens,
      systemPromptApplied: systemPrompt.trim().length > 0,
      modelSelectionSource,
      defaultModelId,
      enforced: true,
    },
  };
};
