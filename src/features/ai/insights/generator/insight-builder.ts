import type { AiInsightRecord, AiInsightType } from '@/shared/contracts/ai-insights';
import { type InsightBuilderOptions } from './prompt-builders';
import { recordBrainInsightAnalytics } from '@/features/ai/ai-paths/services/runtime-analytics-service';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { processInsightGeneration } from './insight-manager';
import { constructMessages } from './message-builder';
import { INSIGHT_BUILDERS } from './prompt-builders';
import { getModelForInsightType } from './insight-orchestrator';

export async function orchestrateInsightGeneration(
  type: AiInsightType,
  options?: InsightBuilderOptions
): Promise<AiInsightRecord | null> {
  const modelId = await getModelForInsightType(type);
  const builder = INSIGHT_BUILDERS[type];
  if (!builder) return null;

  const prompt = await builder(options);
  const messages = constructMessages(type, prompt);

  try {
    const insight = await processInsightGeneration(type, modelId, messages, prompt, options);
    
    if (type === 'runtime_analytics') {
      await recordBrainInsightAnalytics({
        type: 'analytics',
        status: 'completed',
        timestamp: new Date().toISOString(),
      });
    }

    return insight;
  } catch (error) {
    void ErrorSystem.captureException(error);
    if (type === 'runtime_analytics') {
      await recordBrainInsightAnalytics({
        type: 'analytics',
        status: 'failed',
        timestamp: new Date().toISOString(),
      });
    }
    throw error;
  }
}

export async function generateAnalyticsInsight(options?: {
  source?: AiInsightSource;
  force?: boolean;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
}): Promise<AiInsightRecord | null> {
  return await orchestrateInsightGeneration('analytics', options);
}

export async function generateLogsInsight(options?: {
  source?: AiInsightSource;
  force?: boolean;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
}): Promise<AiInsightRecord | null> {
  return await orchestrateInsightGeneration('logs', options);
}

export async function generateRuntimeAnalyticsInsight(options?: {
  source?: AiInsightSource;
  range?: AiPathRuntimeAnalyticsRange;
  force?: boolean;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
}): Promise<AiInsightRecord | null> {
  return await orchestrateInsightGeneration('runtime_analytics', options);
}
