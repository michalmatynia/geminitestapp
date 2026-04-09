import type { BrainModelDescriptor } from '@/shared/contracts/ai-brain';
import type { AiNode } from '@/shared/contracts/ai-paths';

export type VisionModelCapabilityIssue = {
  nodeId: string;
  nodeTitle: string | null;
  modelId: string;
  modality: string;
};

export const collectVisionModelCapabilityIssues = (args: {
  nodes: AiNode[];
  defaultModelId: string;
  descriptors: Record<string, BrainModelDescriptor>;
}): VisionModelCapabilityIssue[] => {
  const defaultModelId = args.defaultModelId.trim();
  return args.nodes.flatMap((node): VisionModelCapabilityIssue[] => {
    if (node.type !== 'model' || node.config?.model?.vision !== true) {
      return [];
    }

    const selectedModelId =
      typeof node.config?.model?.modelId === 'string' ? node.config.model.modelId.trim() : '';
    const runtimeModelId = selectedModelId || defaultModelId;
    if (!runtimeModelId) {
      return [];
    }

    const descriptor = args.descriptors[runtimeModelId];
    if (!descriptor || descriptor.modality === 'multimodal') {
      return [];
    }

    return [
      {
        nodeId: node.id,
        nodeTitle: typeof node.title === 'string' ? node.title : null,
        modelId: runtimeModelId,
        modality: descriptor.modality,
      },
    ];
  });
};

export const buildVisionModelCapabilityErrorMessage = (
  issue: VisionModelCapabilityIssue
): string => {
  const label = issue.nodeTitle?.trim() || issue.nodeId;
  return `Model node "${label}" has Accepts Images enabled but effective AI Brain model "${issue.modelId}" is ${issue.modality}. Choose a multimodal model or disable image input for this node.`;
};
