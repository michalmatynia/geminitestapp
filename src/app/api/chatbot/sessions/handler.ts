import { type NextRequest, NextResponse } from 'next/server';
import { type z } from 'zod';

import { chatbotSessionRepository } from '@/features/ai/chatbot/server';
import { parseJsonBody } from '@/features/products/server';
import {
  chatbotSessionCreateRequestSchema,
  chatbotSessionCreateResponseSchema,
  chatbotSessionDeleteResponseSchema,
  chatbotSessionIdsResponseSchema,
  chatbotSessionResponseSchema,
  chatbotSessionsDeleteBodySchema,
  chatbotSessionsQuerySchema,
  chatbotSessionsResponseSchema,
  chatbotSessionUpdateRequestSchema,
  type ChatbotSessionCreateResponse,
  type ChatbotSessionDeleteResponse,
  type ChatbotSessionDto as ChatSession,
  type ChatbotSessionsQuery,
  type ChatbotSessionsResponse,
  type UpdateChatSessionDto as UpdateSessionInput,
} from '@/shared/contracts/chatbot';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError, validationError } from '@/shared/errors/app-error';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

const matchesSessionQuery = (session: ChatSession, query: string): boolean => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return (
    session.id.toLowerCase().includes(normalizedQuery) ||
    (session.title ?? '').toLowerCase().includes(normalizedQuery)
  );
};

const parseBody = async <T>(
  req: NextRequest,
  ctx: ApiHandlerContext,
  schema: z.ZodSchema<T>,
  logPrefix: string
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> => {
  if (ctx.body !== undefined) {
    const parsed = schema.safeParse(ctx.body);
    if (parsed.success) {
      return { ok: true, data: parsed.data };
    }
    return {
      ok: false,
      response: await createErrorResponse(
        validationError('Invalid payload', { issues: parsed.error.flatten() }),
        { request: req, source: logPrefix }
      ),
    };
  }
  return parseJsonBody(req, schema, { logPrefix });
};

// POST /api/chatbot/sessions - Create new session
export async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const requestStart = Date.now();
  const parsed = await parseBody(
    req,
    ctx,
    chatbotSessionCreateRequestSchema,
    'chatbot.sessions.POST'
  );
  if (!parsed.ok) {
    return parsed.response;
  }
  const { title, settings } = parsed.data;

  if (DEBUG_CHATBOT) {
    await logSystemEvent({
      level: 'info',
      message: '[chatbot][sessions][POST] Request',
      context: {
        titleProvided: Boolean(title?.trim()),
      },
    });
  }

  const session = await chatbotSessionRepository.create({
    title: title?.trim() || `Chat ${new Date().toLocaleString()}`,
    userId: ctx.userId ?? null,
    messages: [],
    messageCount: 0,
    ...(settings !== undefined ? { settings } : {}),
  });

  if (DEBUG_CHATBOT) {
    await logSystemEvent({
      level: 'info',
      message: '[chatbot][sessions][POST] Created',
      context: {
        sessionId: session.id,
        durationMs: Date.now() - requestStart,
      },
    });
  }

  const response: ChatbotSessionCreateResponse = {
    sessionId: session.id,
    session,
  };

  return NextResponse.json(chatbotSessionCreateResponseSchema.parse(response), { status: 201 });
}

// GET /api/chatbot/sessions - List all sessions
export async function GET_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const requestStart = Date.now();
  const query = chatbotSessionsQuerySchema.parse((ctx.query ?? {}) as ChatbotSessionsQuery);
  const sessions = (await chatbotSessionRepository.findAll()).filter((session: ChatSession) =>
    query.query ? matchesSessionQuery(session, query.query) : true
  );

  if (DEBUG_CHATBOT) {
    await logSystemEvent({
      level: 'info',
      message: '[chatbot][sessions][GET] Listed',
      context: {
        count: sessions.length,
        scope: query.scope ?? 'list',
        query: query.query ?? null,
        durationMs: Date.now() - requestStart,
      },
    });
  }

  if (query.scope === 'ids') {
    return NextResponse.json(
      chatbotSessionIdsResponseSchema.parse({ ids: sessions.map((session: ChatSession) => session.id) }),
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  const response: ChatbotSessionsResponse = { sessions };

  return NextResponse.json(
    chatbotSessionsResponseSchema.parse(response),
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

// PATCH /api/chatbot/sessions - Update session (title)
export async function PATCH_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const requestStart = Date.now();
  const parsed = await parseBody(
    req,
    ctx,
    chatbotSessionUpdateRequestSchema,
    'chatbot.sessions.PATCH'
  );
  if (!parsed.ok) {
    return parsed.response;
  }
  const { sessionId, title } = parsed.data;

  if (DEBUG_CHATBOT) {
    await logSystemEvent({
      level: 'info',
      message: '[chatbot][sessions][PATCH] Request',
      context: {
        sessionId,
        titleProvided: Boolean(title?.trim()),
      },
    });
  }

  const updateData: UpdateSessionInput = {};
  if (title?.trim()) {
    updateData.title = title.trim();
  }

  const updated = await chatbotSessionRepository.update(sessionId, updateData);

  if (!updated) {
    throw notFoundError('Session not found.', { sessionId });
  }

  if (DEBUG_CHATBOT) {
    await logSystemEvent({
      level: 'info',
      message: '[chatbot][sessions][PATCH] Updated',
      context: {
        sessionId: updated.id,
        durationMs: Date.now() - requestStart,
      },
    });
  }

  return NextResponse.json(chatbotSessionResponseSchema.parse({ session: updated }));
}

// DELETE /api/chatbot/sessions - Delete session
export async function DELETE_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const requestStart = Date.now();
  const parsed = await parseBody(
    req,
    ctx,
    chatbotSessionsDeleteBodySchema,
    'chatbot.sessions.DELETE'
  );
  if (!parsed.ok) {
    return parsed.response;
  }
  const body = parsed.data;

  if (DEBUG_CHATBOT) {
    await logSystemEvent({
      level: 'info',
      message: '[chatbot][sessions][DELETE] Request',
      context: {
        sessionId: 'sessionId' in body ? body.sessionId : null,
        sessionCount: 'sessionIds' in body ? body.sessionIds.length : 1,
      },
    });
  }

  let deletedCount = 0;

  if ('sessionIds' in body) {
    deletedCount = await chatbotSessionRepository.deleteMany(body.sessionIds);
    if (deletedCount === 0) {
      throw notFoundError('Sessions not found.', { sessionIds: body.sessionIds });
    }
  } else {
    const deleted = await chatbotSessionRepository.delete(body.sessionId);

    if (!deleted) {
      throw notFoundError('Session not found.', { sessionId: body.sessionId });
    }

    deletedCount = 1;
  }

  if (DEBUG_CHATBOT) {
    await logSystemEvent({
      level: 'info',
      message: '[chatbot][sessions][DELETE] Deleted',
      context: {
        sessionId: 'sessionId' in body ? body.sessionId : null,
        deletedCount,
        durationMs: Date.now() - requestStart,
      },
    });
  }

  const response: ChatbotSessionDeleteResponse = {
    success: true,
    deletedCount,
  };

  return NextResponse.json(chatbotSessionDeleteResponseSchema.parse(response));
}
