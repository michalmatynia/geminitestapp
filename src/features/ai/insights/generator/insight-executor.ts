import type { 
  AiInsightRecord, 
  AiInsightSource, 
  AiInsightType 
} from '@/shared/contracts/ai-insights';
import { appendAiInsight } from '../repository';
import { stripCodeFence } from './utils';

export async function handleInsightRecording(
  type: AiInsightType,
  content: string,
  prompt: { name: string; metadata?: Record<string, unknown> },
  options?: { source?: AiInsightSource }
): Promise<AiInsightRecord> {
  return await appendAiInsight(type, {
    name: prompt.name,
    source: options?.source ?? 'manual',
    content: { text: stripCodeFence(content) },
    status: 'new',
    score: 0,
    metadata: prompt.metadata,
  });
}
