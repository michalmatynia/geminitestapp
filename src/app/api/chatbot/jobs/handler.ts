import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveBrainModelExecutionConfig } from '@/shared/lib/ai-brain/server';
import { chatbotJobRepository } from '@/features/ai/chatbot/services/chatbot-job-repository';
import { chatbotSessionRepository } from '@/features/ai/chatbot/services/chatbot-session-repository';
import { enqueueChatbotJob, startChatbotJobQueue } from '@/features/jobs/server';
import type {
  ChatbotJobDto as ChatbotJob,
  EnqueueChatbotJobRequestDto as EnqueueJobRequest,
} from '@/shared/contracts/chatbot';
import type { ApiHandlerContext, JsonParseResult } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';
import { logger } from '@/shared/utils/logger';
import { isObjectRecord } from '@/shared/utils/object-utils';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';
const DEFAULT_CHATBOT_SYSTEM_PROMPT = 'You are a helpful assistant.';

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

const enqueueJobSchema = z.object({
  sessionId: z.string().trim().min(1),
  messages: z.array(chatMessageSchema).min(1),
  userMessage: z.string().trim().optional(),
}) as z.ZodSchema<EnqueueJobRequest>;

export const deleteQuerySchema = z.object({
  scope: optionalTrimmedQueryString(z.enum(['terminal'])),
});

export async function GET_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const jobs: ChatbotJob[] = await chatbotJobRepository.findAll(50);

  if (DEBUG_CHATBOT) {
    logger.info('[chatbot][jobs][GET] Listed', {
      count: jobs.length,
      requestId: ctx.requestId,
    });
  }

  return NextResponse.json({ jobs });
}

export async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const clonedRequest = req.clone();
  let rawBody: unknown = null;
  try {
    rawBody = await clonedRequest.json();
  } catch {
    rawBody = null;
  }

  if (isObjectRecord(rawBody) && Object.prototype.hasOwnProperty.call(rawBody, 'model')) {
    throw badRequestError('Chatbot job payload contains unsupported model override.');
  }

  const result: JsonParseResult<EnqueueJobRequest> = await parseJsonBody<EnqueueJobRequest>(
    req,
    enqueueJobSchema,
    {
      logPrefix: 'chatbot.jobs.POST',
    }
  );

  if (!result.ok) {
    return result.response;
  }

  const data: EnqueueJobRequest = result.data;
  const session = await chatbotSessionRepository.findById(data.sessionId);

  if (!session) {
    throw notFoundError('Session not found.');
  }

  const brainConfig = await resolveBrainModelExecutionConfig('chatbot', {
    defaultTemperature: 0.7,
    defaultMaxTokens: 800,
    defaultSystemPrompt: DEFAULT_CHATBOT_SYSTEM_PROMPT,
  });

  const trimmedUserMessage: string | undefined = data.userMessage?.trim();
  if (trimmedUserMessage && session.messages) {
    const latest = session.messages[session.messages.length - 1];

    if (latest?.role !== 'user' || latest.content !== trimmedUserMessage) {
      await chatbotSessionRepository.addMessage(session.id, {
        role: 'user',
        content: trimmedUserMessage,
        timestamp: new Date().toISOString(),
      });
    }
  }

  const job: ChatbotJob = await chatbotJobRepository.create({
    sessionId: session.id,
    model: brainConfig.modelId,
    payload: {
      sessionId: session.id,
      model: brainConfig.modelId,
      messages: data.messages,
      options: {
        brainApplied: brainConfig.brainApplied,
      },
    },
  });

  startChatbotJobQueue();
  await enqueueChatbotJob(job.id);

  if (DEBUG_CHATBOT) {
    logger.info('[chatbot][jobs][POST] Queued', {
      jobId: job.id,
      sessionId: job.sessionId,
      requestId: ctx.requestId,
      appliedModel: brainConfig.modelId,
    });
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    brainApplied: brainConfig.brainApplied,
  });
}

export async function DELETE_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  void _req;
  const scope = (ctx.query as z.infer<typeof deleteQuerySchema> | undefined)?.scope ?? null;
  void scope;
  const terminalStatuses: Array<ChatbotJob['status']> = ['completed', 'failed', 'canceled'];

  const deletedCount: number = await chatbotJobRepository.deleteMany(terminalStatuses);

  if (DEBUG_CHATBOT) {
    logger.info('[chatbot][jobs][DELETE] Deleted', {
      count: deletedCount,
      requestId: ctx.requestId,
    });
  }

  return NextResponse.json({ deleted: deletedCount });
}
