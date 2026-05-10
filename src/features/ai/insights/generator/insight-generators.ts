import type { 
  AiInsightRecord, 
  AiInsightSource 
} from '@/shared/contracts/ai-insights';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type { AiPathRuntimeAnalyticsRange } from '@/shared/contracts/ai-paths';
import { generateAiInsightByType } from '../generator';

export async function generateAnalyticsInsight(options?: {
  source?: AiInsightSource;
  force?: boolean;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
}): Promise<AiInsightRecord | null> {
  return generateAiInsightByType('analytics', options);
}

export async function generateLogsInsight(options?: {
  source?: AiInsightSource;
  force?: boolean;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
}): Promise<AiInsightRecord | null> {
  return generateAiInsightByType('logs', options);
}

export async function generateRuntimeAnalyticsInsight(options?: {
  source?: AiInsightSource;
  force?: boolean;
  range?: AiPathRuntimeAnalyticsRange;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
}): Promise<AiInsightRecord | null> {
  return generateAiInsightByType('runtime_analytics', options);
}
