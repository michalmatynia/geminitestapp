import { type AiNode } from '@/shared/contracts/ai-paths';
import {
  AGENT_INPUT_PORTS,
  AGENT_OUTPUT_PORTS,
  DESCRIPTION_OUTPUT_PORTS,
  MODEL_OUTPUT_PORTS,
} from '../../constants';
import { ensureUniquePorts } from '../../utils';

export const normalizeAiDescriptionNode = (node: AiNode): AiNode => {
  return {
    ...node,
    inputs: ensureUniquePorts(node.inputs ?? [], ['entityJson', 'images', 'title']),
    outputs: ensureUniquePorts(node.outputs ?? [], DESCRIPTION_OUTPUT_PORTS),
    config: {
      ...node.config,
      description: {
        visionOutputEnabled: node.config?.description?.visionOutputEnabled ?? true,
        generationOutputEnabled: node.config?.description?.generationOutputEnabled ?? true,
      },
    },
  };
};

export const normalizeDescriptionUpdaterNode = (node: AiNode): AiNode => {
  return {
    ...node,
    outputs: ensureUniquePorts(node.outputs ?? [], ['description_en']),
  };
};

export const normalizeModelNode = (node: AiNode): AiNode => {
  return {
    ...node,
    inputs: ensureUniquePorts(node.inputs ?? [], ['prompt', 'images', 'context']),
    outputs: ensureUniquePorts(node.outputs ?? [], MODEL_OUTPUT_PORTS),
    config: {
      ...node.config,
      model: {
        ...(node.config?.model?.modelId !== undefined
          ? { modelId: node.config.model.modelId }
          : {}),
        temperature: node.config?.model?.temperature ?? 0.7,
        maxTokens: node.config?.model?.maxTokens ?? 800,
        vision: node.config?.model?.vision ?? (node.inputs ?? []).includes('images'),
        ...(node.config?.model?.systemPrompt !== undefined
          ? { systemPrompt: node.config.model.systemPrompt }
          : {}),
        ...(node.config?.model?.waitForResult !== undefined
          ? { waitForResult: node.config.model.waitForResult }
          : {}),
      },
    },
  };
};

export const normalizeAgentNode = (node: AiNode): AiNode => {
  const agentConfig = node.config?.agent;
  return {
    ...node,
    inputs: ensureUniquePorts(node.inputs ?? [], AGENT_INPUT_PORTS),
    outputs: ensureUniquePorts(node.outputs ?? [], AGENT_OUTPUT_PORTS),
    config: {
      ...node.config,
      agent: {
        personaId: agentConfig?.personaId ?? '',
        promptTemplate: agentConfig?.promptTemplate ?? '',
        waitForResult: agentConfig?.waitForResult ?? true,
      },
    },
  };
};
