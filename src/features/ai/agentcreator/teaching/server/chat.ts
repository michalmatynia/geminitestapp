import 'server-only';

import type { AgentTeachingChatSource } from '@/shared/contracts/agent-teaching';
import type { ChatMessage } from '@/shared/contracts/chatbot';

import { generateOllamaEmbedding } from './embeddings';
import { getTeachingAgentById } from './repository';
import { retrieveTopContext } from './retrieval';

const OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434';

const extractMessageContent = (payload: unknown): string => {
  if (!payload || typeof payload !== 'object') return '';
  const message = (payload as { message?: { content?: unknown } }).message;
  return typeof message?.content === 'string' ? message.content : '';
};

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
      const body = src.text.trim();
      // Keep each chunk bounded so we don't blow up the context window.
      const snippet = body.length > 2000 ? `${body.slice(0, 2000)}…` : body;
      lines.push('', header, snippet);
    });
  }
  return lines.join('\n');
};

export async function runTeachingChat(params: {
  agentId: string;
  messages: ChatMessage[];
}): Promise<{ message: string; sources: AgentTeachingChatSource[] }> {
  const agent = await getTeachingAgentById(params.agentId);
  if (!agent) {
    throw new Error('Learner agent not found.');
  }

  const lastUserMessage = [...params.messages].reverse().find((m: ChatMessage): boolean => m.role === 'user');
  const queryText = lastUserMessage?.content?.trim() ?? '';
  if (!queryText) {
    throw new Error('Missing user message.');
  }

  const embeddingModel = agent.embeddingModel?.trim();
  if (!embeddingModel) {
    throw new Error('Learner agent has no embedding model configured.');
  }

  const queryEmbedding = await generateOllamaEmbedding({
    model: embeddingModel,
    text: queryText,
  });

  const sources = await retrieveTopContext({
    queryEmbedding,
    collectionIds: agent.collectionIds,
    topK: agent.retrievalTopK ?? 5,
    minScore: agent.retrievalMinScore ?? 0,
    embeddingModel,
    maxDocsPerCollection: agent.maxDocsPerCollection ?? 400,
  });

  const systemPrompt = buildRagSystemPrompt({
    basePrompt: agent.systemPrompt ?? '',
    sources,
  });

  const temperature = typeof agent.temperature === 'number' ? agent.temperature : 0.2;
  const maxTokens = typeof agent.maxTokens === 'number' ? agent.maxTokens : 0;
  const ollamaOptions: Record<string, unknown> = { temperature };
  if (Number.isFinite(maxTokens) && maxTokens > 0) {
    // Ollama option name for generation length.
    ollamaOptions['num_predict'] = Math.round(maxTokens);
  }

  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: agent.llmModel,
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        ...params.messages
          .filter((m: ChatMessage) => m.role !== 'system')
          .map((m: ChatMessage) => ({ role: m.role, content: m.content })),
      ],
      options: ollamaOptions,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`LLM call failed (${res.status}): ${text || res.statusText}`);
  }
  const payload: unknown = await res.json();
  const message = extractMessageContent(payload).trim();
  return { message, sources };
}
