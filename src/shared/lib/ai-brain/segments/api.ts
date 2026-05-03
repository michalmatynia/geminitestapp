import { configurationError } from '@/shared/errors/app-error';

import {
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
} from '../settings';

import { getBrainSettings } from './settings';

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
