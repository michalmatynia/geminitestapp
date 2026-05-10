import 'server-only';

import type {
  AgentTeachingChatMessage,
  AgentTeachingChatResponse,
  AgentTeachingChatSource,
} from '@/shared/contracts/agent-teaching';
import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import {
  runBrainChatCompletion,
  type BrainChatMessage,
} from '@/shared/lib/ai-brain/server-runtime-client';

import { generateOllamaEmbedding } from './embeddings';
import { getTeachingAgentById } from './repository';
import { retrieveTopContext } from './retrieval';

const buildRagSystemPrompt = (params: {
  basePrompt: string;
  sources: AgentTeachingChatSource[];
}): string => {
  const lines: string[] = [];
  const basePrompt = params.basePrompt.trim();
  if (basePrompt.length > 0) {
    lines.push(basePrompt);
  }
  lines.push(
    'You have access to a Knowledge Base (embedded text chunks).',
    'Use it when it is relevant and cite sources by documentId in square brackets, e.g. [doc:abc123].',
    'If the answer is not present in the provided sources, say you don\'t know (do not invent).'
  );
  if (params.sources.length > 0) {
    lines.push('', 'Knowledge Base Sources:');
    params.sources.forEach((src: AgentTeachingChatSource) => {
      lines.push('', buildSourceHeader(src), buildSourceSnippet(src.text));
    });
  }
  return lines.join('\n');
};

type TeachingAgent = NonNullable<Awaited<ReturnType<typeof getTeachingAgentById>>>;

const buildSourceHeader = (src: AgentTeachingChatSource): string => {
  const title = src.metadata?.title?.trim() ?? '';
  const titleLabel = title.length > 0 ? ` (${title})` : '';
  return `[doc:${src.documentId}]${titleLabel} score=${src.score.toFixed(3)}`;
};

const buildSourceSnippet = (text: string): string => {
  const body = text.trim();
  return body.length > 2000 ? `${body.slice(0, 2000)}…` : body;
};

const readLastUserMessageText = (messages: AgentTeachingChatMessage[]): string => {
  const lastUserMessage = [...messages]
    .reverse()
    .find((message: AgentTeachingChatMessage): boolean => message.role === 'user');
  return lastUserMessage?.content.trim() ?? '';
};

const normalizeEmbeddingModel = (model: string | null | undefined): string => model?.trim() ?? '';

const optionalEmbeddingModel = (model: string | null | undefined): string | undefined => {
  const trimmed = normalizeEmbeddingModel(model);
  return trimmed.length > 0 ? trimmed : undefined;
};

const retrieveTeachingSources = async (
  agent: TeachingAgent,
  queryText: string
): Promise<AgentTeachingChatSource[]> => {
  const queryEmbedding = await generateOllamaEmbedding({
    model: normalizeEmbeddingModel(agent.embeddingModel),
    text: queryText,
  });

  return retrieveTopContext({
    queryEmbedding,
    collectionIds: agent.collectionIds,
    topK: agent.retrievalTopK ?? 5,
    minScore: agent.retrievalMinScore ?? 0,
    embeddingModel: optionalEmbeddingModel(agent.embeddingModel),
    maxDocsPerCollection: agent.maxDocsPerCollection ?? 400,
  });
};

const buildSystemPrompt = (
  brainSystemPrompt: string,
  ragSystemPrompt: string,
  additionalSystemPrompt: string | null | undefined
): string => {
  const prompts = [brainSystemPrompt.trim(), ragSystemPrompt];
  const additionalPrompt = additionalSystemPrompt?.trim() ?? '';
  if (additionalPrompt.length > 0) {
    prompts.push(additionalPrompt);
  }
  return prompts.filter((prompt) => prompt.length > 0).join('\n\n');
};

const toBrainChatRole = (message: AgentTeachingChatMessage): BrainChatMessage['role'] => {
  if (message.role === 'assistant' || message.role === 'system') {
    return message.role;
  }
  return 'user';
};

const toBrainChatMessages = (messages: AgentTeachingChatMessage[]): BrainChatMessage[] =>
  messages
    .filter((message: AgentTeachingChatMessage): boolean => message.role !== 'system')
    .map(
      (message: AgentTeachingChatMessage): BrainChatMessage => ({
        role: toBrainChatRole(message),
        content: message.content,
      })
    );

export async function runTeachingChat(params: {
  agentId: string;
  messages: AgentTeachingChatMessage[];
  additionalSystemPrompt?: string | null;
}): Promise<AgentTeachingChatResponse> {
  const agent = await getTeachingAgentById(params.agentId);
  if (!agent) {
    throw new Error('Learner agent not found.');
  }

  const queryText = readLastUserMessageText(params.messages);
  if (queryText.length === 0) {
    throw new Error('Missing user message.');
  }

  const sources = await retrieveTeachingSources(agent, queryText);
  const ragSystemPrompt = buildRagSystemPrompt({
    basePrompt: agent.systemPrompt,
    sources,
  });

  const brainConfig = await resolveBrainExecutionConfigForCapability('agent_teaching.chat', {
    defaultTemperature: typeof agent.temperature === 'number' ? agent.temperature : 0.2,
    defaultMaxTokens:
      typeof agent.maxTokens === 'number' && agent.maxTokens > 0 ? agent.maxTokens : 1200,
    runtimeKind: 'chat',
  });
  const systemPrompt = buildSystemPrompt(
    brainConfig.systemPrompt,
    ragSystemPrompt,
    params.additionalSystemPrompt
  );

  const res = await runBrainChatCompletion({
    modelId: brainConfig.modelId,
    temperature: brainConfig.temperature,
    maxTokens: brainConfig.maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      ...toBrainChatMessages(params.messages),
    ],
  });
  const message = res.text.trim();
  return { message, sources };
}
