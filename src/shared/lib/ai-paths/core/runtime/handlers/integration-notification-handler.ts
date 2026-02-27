import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import type {
  NodeHandler,
  NodeHandlerContext,
} from '@/shared/contracts/ai-paths-runtime';

import {
  coerceInput,
  safeStringify,
} from '../../utils';
import { buildPromptOutput } from '../utils';

export const handleNotification: NodeHandler = ({
  node,
  nodeInputs,
  prevOutputs,
  allInputs,
  edges,
  nodes,
  toast,
  reportAiPathsError,  sideEffectControl,
}: NodeHandlerContext) => {
  if (sideEffectControl?.decision === 'skipped_policy') return prevOutputs;
  const hasMeaningfulValue = (value: unknown): boolean => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  };
  const nodeById = new Map<string, AiNode>();
  nodes.forEach((item: AiNode) => {
    nodeById.set(item.id, item);
  });
  let promptSourceNode: AiNode | null = null;
  for (const edge of edges) {
    if (edge.to !== node.id || edge.toPort !== 'prompt') continue;
    const fromNodeId = edge.from;
    if (!fromNodeId) continue;
    const fromNode = nodeById.get(fromNodeId);
    if (fromNode?.type === 'prompt') {
      promptSourceNode = fromNode;
      break;
    }
  }
  let derivedPromptMessage: string | null = null;
  if (promptSourceNode) {
    const hasUpstreamEdges = edges.some(
      (edge: Edge): boolean => edge.to === promptSourceNode.id,
    );
    const promptSourceInputs = allInputs[promptSourceNode.id] ?? {};
    if (hasUpstreamEdges) {
      const hasInputValue: boolean =
        Object.values(promptSourceInputs).some(hasMeaningfulValue);
      if (!hasInputValue) {
        return prevOutputs;
      }
    }
    const template = promptSourceNode.config?.prompt?.template ?? '';
    const templateNeedsCurrentValue =
      /{{\s*(result|value|current)\b[^}]*}}|\[\s*(result|value|current)\b[^\]]*\]/.test(template);
    if (templateNeedsCurrentValue) {
      const currentValue =
        coerceInput(promptSourceInputs['result']) ??
        coerceInput(promptSourceInputs['value']);
      const hasCurrentValue =
        currentValue !== undefined &&
        currentValue !== null &&
        (typeof currentValue !== 'string' || currentValue.trim().length > 0);
      if (!hasCurrentValue) {
        return prevOutputs;
      }
    }
    try {
      const derivedPrompt: { promptOutput: string; imagesValue: unknown } = buildPromptOutput(
        promptSourceNode.config?.prompt,
        promptSourceInputs,
      );
      if (derivedPrompt.promptOutput?.trim()) {
        derivedPromptMessage = derivedPrompt.promptOutput;
      }
    } catch (err) {
      reportAiPathsError(err, {
        service: 'ai-paths-runtime',
      }, `Prompt building failed for notification node ${node.id}`);
    }
  }
  const messageSource: unknown =
    derivedPromptMessage ??
    coerceInput(nodeInputs['result']) ??
    coerceInput(nodeInputs['prompt']) ??
    coerceInput(nodeInputs['value']) ??
    coerceInput(nodeInputs['bundle']) ??
    coerceInput(nodeInputs['context']) ??
    coerceInput(nodeInputs['triggerName']) ??
    coerceInput(nodeInputs['trigger']) ??
    coerceInput(nodeInputs['meta']) ??
    coerceInput(nodeInputs['entityId']) ??
    coerceInput(nodeInputs['entityType']);
  
  if (process.env['NODE_ENV'] === 'test') {
    console.log(`[handleNotification] nodeInputs keys: ${Object.keys(nodeInputs)}, messageSource: ${JSON.stringify(messageSource)}`);
  }

  if (messageSource === undefined) {
    return prevOutputs;
  }
  const message: string = safeStringify(messageSource);
  const trimmed: string = message.trim();
  if (!trimmed) {
    return prevOutputs;
  }
  toast(trimmed, { variant: 'success' });
  return prevOutputs;
};
