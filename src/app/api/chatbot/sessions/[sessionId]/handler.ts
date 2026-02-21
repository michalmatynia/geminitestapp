import { NextRequest, NextResponse } from 'next/server';

import { chatbotSessionRepository } from '@/features/ai/chatbot/server';
import { logSystemEvent } from '@/features/observability/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { notFoundError } from '@/shared/errors/app-error';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

// GET /api/chatbot/sessions/[sessionId] - Get session by ID
export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { sessionId: string }
): Promise<Response> {
  const session = await chatbotSessionRepository.findById(params.sessionId);

  if (!session) {
    throw notFoundError('Session not found.');
  }

  if (DEBUG_CHATBOT) {
    await logSystemEvent({
      level: 'info',
      message: '[chatbot][sessions][GET:sessionId] Found',
      context: {
        sessionId: session.id,
        messageCount: session.messages?.length ?? 0,
      },
    });
  }

  return NextResponse.json({ session });
}
