import { NextRequest, NextResponse } from 'next/server';

import { chatbotSessionRepository } from '@/features/ai/chatbot/server';
import { parseJsonBody } from '@/features/products/server';
import {
  chatbotSessionMessageCreateRequestSchema,
  chatbotSessionMessageResponseSchema,
  chatbotSessionMessagesResponseSchema,
  type ChatbotSessionMessageResponse,
  type ChatbotSessionMessagesResponse,
} from '@/shared/contracts/chatbot';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { badRequestError, internalError, notFoundError } from '@/shared/errors/app-error';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

export { chatbotSessionMessageCreateRequestSchema as messageSchema };

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { sessionId: string }
): Promise<Response> {
  const requestStart = Date.now();
  const { sessionId } = params;
  const session = await chatbotSessionRepository.findById(sessionId);
  if (!session) {
    throw notFoundError('Session not found.');
  }
  const messages = session.messages ?? [];
  if (DEBUG_CHATBOT) {
    await logSystemEvent({
      level: 'info',
      message: '[chatbot][sessions][GET] Messages loaded',
      context: {
        sessionId,
        count: messages.length,
        durationMs: Date.now() - requestStart,
      },
    });
  }
  const response: ChatbotSessionMessagesResponse = { messages };
  return NextResponse.json(chatbotSessionMessagesResponseSchema.parse(response), {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { sessionId: string }
): Promise<Response> {
  const requestStart = Date.now();
  const { sessionId } = params;
  const parsed = await parseJsonBody(req, chatbotSessionMessageCreateRequestSchema, {
    logPrefix: 'chatbot.sessions.messages.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const body = parsed.data;
  if (!body.role || !body.content?.trim()) {
    throw badRequestError('Role and content are required.');
  }
  if (DEBUG_CHATBOT) {
    await logSystemEvent({
      level: 'info',
      message: '[chatbot][sessions][POST] Request',
      context: {
        sessionId,
        role: body.role,
        contentLength: body.content.trim().length,
      },
    });
  }
  const updatedSession = await chatbotSessionRepository.addMessage(sessionId, {
    role: body.role,
    content: body.content.trim(),
  });
  if (!updatedSession) {
    throw notFoundError('Session not found.');
  }
  const message = updatedSession.messages?.[updatedSession.messages.length - 1];
  if (!message) {
    throw internalError('Failed to create chatbot session message.');
  }
  if (DEBUG_CHATBOT) {
    await logSystemEvent({
      level: 'info',
      message: '[chatbot][sessions][POST] Created',
      context: {
        messageId: message.id,
        sessionId,
        durationMs: Date.now() - requestStart,
      },
    });
  }
  const response: ChatbotSessionMessageResponse = { message };
  return NextResponse.json(chatbotSessionMessageResponseSchema.parse(response));
}
