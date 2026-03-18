import 'server-only';

import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { configurationError } from '@/shared/errors/app-error';
import {
  deleteKangurSettingValue,
  isKangurSettingKey,
  readKangurSettingValue,
  upsertKangurSettingValue,
} from '@/features/kangur/services/kangur-settings-repository';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

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
  type BrainAppliedMeta,
  type BrainExecutionConfig,
  type AiPathsNodeExecutionInput,
} from './settings';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const readMongoSettingValue = async (key: string): Promise<string | null> => {
  if (isKangurSettingKey(key)) {
    return await readKangurSettingValue(key);
  }
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoStringSettingRecord>('settings')
    .findOne({ $or: [{ _id: key }, { key }] });
  return typeof doc?.value === 'string' ? doc.value : null;
};

const writeMongoSettingValue = async (key: string, value: string): Promise<boolean> => {
  if (isKangurSettingKey(key)) {
    return Boolean(await upsertKangurSettingValue(key, value));
  }
  if (!process.env['MONGODB_URI']) return false;
  const mongo = await getMongoDb();
  await mongo.collection<MongoStringSettingRecord>('settings').updateOne(
    {
      $or: [{ _id: key }, { key }],
    },
    {
      $set: {
        key,
        value,
      },
      $setOnInsert: {
        _id: key,
      },
    },
    { upsert: true }
  );
  return true;
};

const deleteMongoSettingValue = async (key: string): Promise<boolean> => {
  if (isKangurSettingKey(key)) {
    return await deleteKangurSettingValue(key);
  }
  if (!process.env['MONGODB_URI']) return false;
  const mongo = await getMongoDb();
  await mongo.collection<MongoStringSettingRecord>('settings').deleteOne({
    $or: [{ _id: key }, { key }],
  });
  return true;
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

  const tryMongo = async () => {
    try {
      return await readMongoSettingValue(key);
    } catch (error) {
      void ErrorSystem.captureException(error);
      return null;
    }
  };

  const value = await tryMongo();

  if (key === AI_BRAIN_SETTINGS_KEY) {
    cachedBrainSettingsValue = value;
    lastBrainSettingsFetchAt = now;
  }

  return value;
};

export const upsertStoredSettingValue = async (key: string, value: string): Promise<boolean> => {
  const tryMongo = async (): Promise<boolean> => {
    try {
      return await writeMongoSettingValue(key, value);
    } catch (error) {
      void ErrorSystem.captureException(error);
      return false;
    }
  };

  const persisted = await tryMongo();

  if (persisted && key === AI_BRAIN_SETTINGS_KEY) {
    cachedBrainSettingsValue = value;
    lastBrainSettingsFetchAt = Date.now();
  }

  return persisted;
};

export const deleteStoredSettingValue = async (key: string): Promise<boolean> => {
  const tryMongo = async (): Promise<boolean> => {
    try {
      return await deleteMongoSettingValue(key);
    } catch (error) {
      void ErrorSystem.captureException(error);
      return false;
    }
  };

  const deleted = await tryMongo();

  if (deleted && key === AI_BRAIN_SETTINGS_KEY) {
    cachedBrainSettingsValue = null;
    lastBrainSettingsFetchAt = 0;
  }

  return deleted;
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
): Promise<BrainExecutionConfig> => {
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
