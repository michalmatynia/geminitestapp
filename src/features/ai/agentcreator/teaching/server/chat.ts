import 'server-only';

import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import {
  runBrainChatCompletion,
  type BrainChatMessage,
} from '@/shared/lib/ai-brain/server-runtime-client';
import type {
  AgentTeachingChatMessage,
  AgentTeachingChatSource,
} from '@/shared/contracts/agent-teaching';

import { generateOllamaEmbedding } from './embeddings';
import { getTeachingAgentById } from './repository';
import { retrieveTopContext } from './retrieval';

const buildRagSystemPrompt = (params: {
  basePrompt: string;
  sources: AgentTeachingChatSource[];
}): string => {
  const lines: string[] = [];
  if (params.basePrompt.trim()) {
    lines.push(params.basePrompt.trim());
  }
  lines.push(
    'You have access to a Knowledge Base (embedded text chunks).',
    'Use it when it is relevant and cite sources by documentId in square brackets, e.g. [doc:abc123].',
    'If the answer is not present in the provided sources, say you don\'t know (do not invent).'
  );
  if (params.sources.length > 0) {
    lines.push('', 'Knowledge Base Sources:');
    params.sources.forEach((src: AgentTeachingChatSource, _index: number) => {
      const title = src.metadata?.title?.trim() ? ` (${src.metadata?.title?.trim()})` : '';
      const header = `[doc:${src.documentId}]${title} score=${src.score.toFixed(3)}`;
      const body = (src.text ?? '').trim();
      // Keep each chunk bounded so we don't blow up the context window.
      const snippet = body.length > 2000 ? `${body.slice(0, 2000)}…` : body;
      lines.push('', header, snippet);
    });
  }
  return lines.join('\n');
};

export async function runTeachingChat(params: {
  agentId: string;
  messages: AgentTeachingChatMessage[];
  additionalSystemPrompt?: string | null;
}): Promise<{ message: string; sources: AgentTeachingChatSource[] }> {
  const agent = await getTeachingAgentById(params.agentId);
  if (!agent) {
    throw new Error('Learner agent not found.');
  }

  const lastUserMessage = [...params.messages]
    .reverse()
    .find((m: AgentTeachingChatMessage): boolean => m.role === 'user');
  const queryText = lastUserMessage?.content?.trim() ?? '';
  if (!queryText) {
    throw new Error('Missing user message.');
  }

  const queryEmbedding = await generateOllamaEmbedding({
    model: agent.embeddingModel?.trim() || '',
    text: queryText,
  });

  const sources = await retrieveTopContext({
    queryEmbedding,
    collectionIds: agent.collectionIds,
    topK: agent.retrievalTopK ?? 5,
    minScore: agent.retrievalMinScore ?? 0,
    embeddingModel: agent.embeddingModel?.trim() || undefined,
    maxDocsPerCollection: agent.maxDocsPerCollection ?? 400,
  });

  const ragSystemPrompt = buildRagSystemPrompt({
    basePrompt: agent.systemPrompt ?? '',
    sources,
  });

  const brainConfig = await resolveBrainExecutionConfigForCapability('agent_teaching.chat', {
    defaultTemperature: typeof agent.temperature === 'number' ? agent.temperature : 0.2,
    defaultMaxTokens:
      typeof agent.maxTokens === 'number' && agent.maxTokens > 0 ? agent.maxTokens : 1200,
    runtimeKind: 'chat',
  });
  const systemPrompt = [brainConfig.systemPrompt.trim(), ragSystemPrompt]
    .concat(params.additionalSystemPrompt?.trim() ? [params.additionalSystemPrompt.trim()] : [])
    .filter(Boolean)
    .join('\n\n');

  const res = await runBrainChatCompletion({
    modelId: brainConfig.modelId,
    temperature: brainConfig.temperature,
    maxTokens: brainConfig.maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      ...(params.messages
        .filter((m: AgentTeachingChatMessage) => m.role !== 'system')
        .map((m: AgentTeachingChatMessage) => ({
          role: m.role === 'assistant' || m.role === 'system' ? m.role : 'user',
          content: m.content,
        })) as BrainChatMessage[]),
    ],
  });
  const message = res.text.trim();
  return { message, sources };
}
