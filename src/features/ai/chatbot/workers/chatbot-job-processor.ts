/**
 * Chatbot Job Processor
 * 
 * Background worker responsible for executing chatbot inference jobs.
 * This service mediates between the job queue, the Brain model runtime,
 * and the session repository to produce and store assistant responses.
 * 
 * Features:
 * - Model Execution: Integrates with `runChatbotModel` to process AI inferences.
 * - Context Enrichment: Merges base system prompts with dynamic context-registry data.
 * - Persistence: Automatically commits assistant responses to the session thread 
 *   and updates job status upon completion.
 * - Robust Error Handling: Ensures failure states are tracked via the chatbot repository.
 * 
 * Usage:
 * Invoked by the job worker infrastructure.
 */

import { buildChatbotContextRegistrySystemPrompt } from '@/features/ai/chatbot/context-registry/system-prompt';
import { chatbotJobRepository } from '@/features/ai/chatbot/services/chatbot-job-repository';
import { chatbotSessionRepository } from '@/features/ai/chatbot/services/chatbot-session-repository';
import { contextRegistryConsumerEnvelopeSchema } from '@/shared/contracts/ai-context-registry';
import type { ChatMessageRoleDto } from '@/shared/contracts/chatbot';
import { runChatbotModel } from '@/shared/lib/ai/chatbot/server-model-runtime';
import { resolveBrainModelExecutionConfig } from '@/shared/lib/ai-brain/server';
import { AppError, AppErrorCodes } from '@/shared/errors/app-error';

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

/**
 * Executes a chatbot job, performing model inference and persisting the results.
 * 
 * @param jobId - Unique identifier of the job to process.
 * @throws AppError if job payload is invalid, the model fails to return a response, or persistence fails.
 */
export const processJob = async (jobId: string): Promise<void> => {
  const job = await chatbotJobRepository.findById(jobId);
  if (!job) {
    throw new AppError(`Chatbot job not found: ${jobId}`, {
        code: AppErrorCodes.notFound,
        httpStatus: 404,
    });
  }
  if (job.status !== 'running') return;

  const payload = job.payload as ChatPayload;
  if (!Array.isArray(payload?.messages) || payload.messages.length === 0) {
    throw new AppError('Chatbot job payload missing or invalid: messages array required.', {
        code: AppErrorCodes.validation,
        httpStatus: 400,
        meta: { jobId, payload },
    });
  }
  
  const messages = payload.messages.filter(
    (message: ChatPayloadMessage): boolean =>
      typeof message?.role === 'string' && typeof message?.content === 'string'
  );
  
  if (messages.length !== payload.messages.length) {
    throw new AppError('Chatbot job payload contains malformed messages.', {
        code: AppErrorCodes.validation,
        httpStatus: 400,
        meta: { jobId },
    });
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

  try {
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
      content: result.message ?? 'No response from model.',
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
      resultText: (result.message ?? 'No response from model.').slice(0, 2000),
    });
  } catch (error) {
    throw new AppError(`Failed to process chatbot job: ${jobId}`, {
      code: AppErrorCodes.internal,
      httpStatus: 500,
      cause: error,
      meta: { jobId, sessionId: job.sessionId },
    });
  }
};
