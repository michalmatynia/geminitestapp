import type { InputJsonValue } from '@/shared/contracts/json';
import { getAgentBrowserLogDelegate } from '@/features/ai/agent-runtime/store-delegates';
import { normalizeExtractionItemsWithLLM } from '../llm';

const normalizeField = async (
    payload: Record<string, unknown>,
    key: string,
    extractionType: 'product_names' | 'emails',
    config: { model: string; runId: string; prompt: string; outputNormalizationModel: string }
): Promise<Record<string, unknown>> => {
  const newPayload = { ...payload };
  const value = newPayload[key];
  if (!Array.isArray(value)) return newPayload;
  const items = value.filter((item: unknown): item is string => typeof item === 'string');
  if (items.length === 0) return newPayload;
  
  const normalized = await normalizeExtractionItemsWithLLM(
    { model: config.model, runId: config.runId, log: async () => {} },
    { prompt: config.prompt, extractionType, items, normalizationModel: config.outputNormalizationModel }
  );
  newPayload[key] = normalized;
  return newPayload;
};

const normalizeLogMetadata = async (
    payload: Record<string, unknown>,
    config: { outputNormalizationModel: string, model: string, runId: string, prompt: string }
): Promise<Record<string, unknown>> => {
  let newPayload = { ...payload };
  const extractionType = newPayload['extractionType'];
  if (typeof extractionType !== 'string' || (extractionType !== 'product_names' && extractionType !== 'emails')) {
    return newPayload;
  }

  const fieldConfig = { model: config.model, runId: config.runId, prompt: config.prompt, outputNormalizationModel: config.outputNormalizationModel };
  
  const results = await Promise.all([
    normalizeField(newPayload, 'items', extractionType, fieldConfig),
    normalizeField(newPayload, 'names', extractionType, fieldConfig),
    normalizeField(newPayload, 'extractedItems', extractionType, fieldConfig),
    normalizeField(newPayload, 'extractedNames', extractionType, fieldConfig),
    normalizeField(newPayload, 'acceptedItems', extractionType, fieldConfig),
    normalizeField(newPayload, 'rejectedItems', extractionType, fieldConfig),
  ]);

  for (const result of results) {
      newPayload = { ...newPayload, ...result };
  }
  return newPayload;
};

export function createToolLogger(args: {
  runId: string;
  stepId: string | null;
  model: string;
  outputNormalizationModel: string;
  prompt: string;
}): (level: string, message: string, metadata?: Record<string, unknown>) => Promise<void> {
  const { runId, stepId, model, outputNormalizationModel, prompt } = args;
  const agentBrowserLog = getAgentBrowserLogDelegate();

  return async (
    level: string,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> => {
    const normalizedMetadata = metadata 
        ? await normalizeLogMetadata({ ...metadata }, { outputNormalizationModel, model, runId, prompt }) 
        : undefined;

    if (!agentBrowserLog) {
      return;
    }

    await agentBrowserLog.create({
      data: {
        runId,
        stepId,
        level,
        message,
        metadata: normalizedMetadata as InputJsonValue,
      },
    });
  };
}
