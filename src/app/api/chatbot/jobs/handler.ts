import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { chatbotJobRepository } from '@/features/ai/chatbot/services/chatbot-job-repository';
import { chatbotSessionRepository } from '@/features/ai/chatbot/services/chatbot-session-repository';
import { startChatbotJobQueue } from '@/features/jobs/server';
import type { EnqueueChatbotJobRequestDto as EnqueueJobRequest } from '@/shared/contracts/chatbot';
import type { ChatbotJobDto as ChatbotJob } from '@/shared/contracts/chatbot';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import type { JsonParseResult } from '@/shared/contracts/ui';
import { logger } from '@/shared/utils/logger';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

const enqueueJobSchema = z.object({
  sessionId: z.string().trim().min(1),
  model: z.string().trim().min(1),
  messages: z.array(chatMessageSchema).min(1),
  userMessage: z.string().trim().optional(),
}) as z.ZodSchema<EnqueueJobRequest>;

export async function GET_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const jobs: ChatbotJob[] = await chatbotJobRepository.findAll(50);

  if (DEBUG_CHATBOT) {
    logger.info('[chatbot][jobs][GET] Listed', { 
      count: jobs.length,
      requestId: ctx.requestId 
    });
  }

  return NextResponse.json({ jobs });
}

export async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const result: JsonParseResult<EnqueueJobRequest> = await parseJsonBody<EnqueueJobRequest>(req, enqueueJobSchema, {
    logPrefix: 'chatbot.jobs.POST',
  });
  
  if (!result.ok) {
    return result.response;
  }

  const data: EnqueueJobRequest = result.data;
  const session = await chatbotSessionRepository.findById(data.sessionId);

  if (!session) {
    throw notFoundError('Session not found.');
  }

  const trimmedUserMessage: string | undefined = data.userMessage?.trim();
  if (trimmedUserMessage) {
    const latest = session.messages[session.messages.length - 1];

    if (
      latest?.role !== 'user' ||
      latest.content !== trimmedUserMessage
    ) {
      await chatbotSessionRepository.addMessage(session.id, {
        role: 'user',
        content: trimmedUserMessage,
        timestamp: new Date().toISOString(),
      });
    }
  }

  const job: ChatbotJob = await chatbotJobRepository.create({
    sessionId: session.id,
    model: data.model,
    payload: {
      model: data.model,
      messages: data.messages,
    },
  });

  startChatbotJobQueue();

  if (DEBUG_CHATBOT) {
    logger.info('[chatbot][jobs][POST] Queued', {
      jobId: job.id,
      sessionId: job.sessionId,
      requestId: ctx.requestId,
    });
  }

  const responsePayload = { jobId: job.id, status: job.status };
  return NextResponse.json(responsePayload);
}

export async function DELETE_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const scope = req.nextUrl.searchParams.get('scope') ?? 'terminal';

  const terminalStatuses: Array<ChatbotJob['status']> = ['completed', 'failed', 'canceled'];

  if (scope !== 'terminal') {
    throw badRequestError('Unsupported delete scope.');
  }

  const deletedCount: number = await chatbotJobRepository.deleteMany(terminalStatuses);

  if (DEBUG_CHATBOT) {
    logger.info('[chatbot][jobs][DELETE] Deleted', { 
      count: deletedCount,
      requestId: ctx.requestId 
    });
  }

  return NextResponse.json({ deleted: deletedCount });
}
