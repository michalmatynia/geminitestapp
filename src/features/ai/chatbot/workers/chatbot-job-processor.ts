import { buildChatbotContextRegistrySystemPrompt } from '@/features/ai/chatbot/context-registry/system-prompt';
import { chatbotJobRepository } from '@/features/ai/chatbot/services/chatbot-job-repository';
import { chatbotSessionRepository } from '@/features/ai/chatbot/services/chatbot-session-repository';
import { contextRegistryConsumerEnvelopeSchema } from '@/shared/contracts/ai-context-registry';
import type { ChatMessageRoleDto } from '@/shared/contracts/chatbot';
import { runChatbotModel } from '@/shared/lib/ai/chatbot/server-model-runtime';
import { resolveBrainModelExecutionConfig } from '@/shared/lib/ai-brain/server';

type ChatPayloadMessage = {
  role: string;
  content: string;
  images?: string[];
};

type ChatPayload = {
  model?: string;
  messages?: ChatPayloadMessage[];
  options?: Record<string, unknown>;
  contextRegistry?: unknown;
};

const DEFAULT_CHATBOT_SYSTEM_PROMPT = 'You are a helpful assistant.';

export const processJob = async (jobId: string): Promise<void> => {
  const job = await chatbotJobRepository.findById(jobId);
  if (job?.status !== 'running') return;

  const payload = job.payload as ChatPayload;
  if (!Array.isArray(payload?.messages) || payload.messages.length === 0) {
    throw new Error('Invalid job payload.');
  }
  const messages = payload.messages.filter(
    (message: ChatPayloadMessage): boolean =>
      typeof message?.role === 'string' && typeof message?.content === 'string'
  );
  if (messages.length !== payload.messages.length) {
    throw new Error('Invalid job payload.');
  }

  const brainConfig = await resolveBrainModelExecutionConfig('chatbot', {
    defaultTemperature: 0.7,
    defaultMaxTokens: 800,
    defaultSystemPrompt: DEFAULT_CHATBOT_SYSTEM_PROMPT,
  });
  const parsedContextRegistry = contextRegistryConsumerEnvelopeSchema.safeParse(
    payload.contextRegistry
  );
  const contextRegistryPrompt = parsedContextRegistry.success
    ? buildChatbotContextRegistrySystemPrompt(parsedContextRegistry.data.resolved)
    : '';
  const systemPrompt = [brainConfig.systemPrompt, contextRegistryPrompt].filter(Boolean).join('\n\n');

  const result = await runChatbotModel({
    messages: messages.map((m) => ({
      ...m,
      role: m.role as ChatMessageRoleDto,
    })),
    modelId: brainConfig.modelId,
    temperature: brainConfig.temperature,
    maxTokens: brainConfig.maxTokens,
    systemPrompt,
  });

  await chatbotSessionRepository.addMessage(job.sessionId, {
    role: 'assistant',
    content: result.message || 'No response from model.',
    timestamp: new Date().toISOString(),
    model: brainConfig.modelId,
    metadata: {
      brainApplied: brainConfig.brainApplied,
    },
  });

  await chatbotJobRepository.update(job.id, {
    status: 'completed',
    model: brainConfig.modelId,
    payload: {
      ...job.payload,
      model: brainConfig.modelId,
      options: {
        ...(payload.options ?? {}),
        brainApplied: brainConfig.brainApplied,
      },
    },
    finishedAt: new Date(),
    resultText: (result.message || 'No response from model.').slice(0, 2000),
  });
};
