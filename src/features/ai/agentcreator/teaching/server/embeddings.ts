import 'server-only';

import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import { generateBrainEmbedding } from '@/shared/lib/ai-brain/server-embeddings-client';

export async function generateOllamaEmbedding(params: {
  model: string;
  text: string;
}): Promise<number[]> {
  const text = params.text;
  if (!text.trim()) throw new Error('Text is required.');
  const config = await resolveBrainExecutionConfigForCapability('agent_teaching.embeddings', {
    runtimeKind: 'embedding',
  });
  return generateBrainEmbedding({
    modelId: config.modelId,
    text,
  });
}
