import prisma from '@/shared/lib/db/prisma';
import { Prisma } from '@/shared/lib/db/prisma-client';

import { normalizeExtractionItemsWithLLM } from '../llm';

export function createToolLogger(args: {
  runId: string;
  stepId: string | null;
  model: string;
  outputNormalizationModel: string;
  prompt: string;
}) {
  const { runId, stepId, model, outputNormalizationModel, prompt } = args;

  const log = async (
    level: string,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> => {
    const normalizeLogMetadata = async (
      payload?: Record<string, unknown>
    ): Promise<Record<string, unknown> | undefined> => {
      if (!payload || !outputNormalizationModel) return payload;
      const extractionType = payload['extractionType'];
      if (extractionType !== 'product_names' && extractionType !== 'emails') {
        return payload;
      }

      const normalizeField = async (key: string): Promise<void> => {
        const value = payload[key];
        if (!Array.isArray(value)) return;
        const items = value.filter((item: unknown): item is string => typeof item === 'string');
        if (items.length === 0) return;
        const typedExtractionType: 'product_names' | 'emails' = extractionType;
        const normalized = await normalizeExtractionItemsWithLLM(
          {
            model,
            runId,
            log: async () => {},
          },
          {
            prompt,
            extractionType: typedExtractionType,
            items,
            normalizationModel: outputNormalizationModel,
          }
        );
        payload[key] = normalized;
      };

      await Promise.all([
        normalizeField('items'),
        normalizeField('names'),
        normalizeField('extractedItems'),
        normalizeField('extractedNames'),
        normalizeField('acceptedItems'),
        normalizeField('rejectedItems'),
      ]);
      return payload;
    };

    const normalizedMetadata = await normalizeLogMetadata(metadata ? { ...metadata } : undefined);

    await prisma.agentBrowserLog.create({
      data: {
        runId,
        stepId,
        level,
        message,
        metadata: normalizedMetadata as Prisma.InputJsonValue,
      },
    });
  };

  return log;
}
