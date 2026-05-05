import type { AiInsightRecord, AiInsightSource } from '@/shared/contracts/ai-insights';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import { getBrainAssignmentForCapability } from '@/shared/lib/ai-brain/server';
import { type AiBrainCapabilityKey } from '@/shared/lib/ai-brain/settings';
import { appendAiInsight } from '../repository';
import { stripCodeFence } from './utils';
import { buildLogInterpretationPrompt } from './prompt-builders';
import { constructMessages } from './message-builder';
import { processInsightGeneration } from './insight-manager';

export async function generateLogInterpretation(options: {
  source?: AiInsightSource;
  log: Record<string, unknown>;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
}): Promise<AiInsightRecord | null> {
  const capability: AiBrainCapabilityKey = 'insights.system_logs';
  const assignment = await getBrainAssignmentForCapability(capability);
  if (!assignment?.enabled) {
    throw new Error(`No enabled AI model assigned for ${capability} capability.`);
  }

  const prompt = await buildLogInterpretationPrompt(options.log, options.contextRegistry);
  const messages = constructMessages('logs', prompt);
  
  return await processInsightGeneration(
    'logs', 
    assignment.modelId, 
    messages, 
    prompt, 
    { source: options.source }
  );
}
