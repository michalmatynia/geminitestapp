import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { chatbotSessionRepository } from '@/features/ai/chatbot/server';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type {
  ChatbotSessionDto as ChatSession,
  UpdateChatSessionDto as UpdateSessionInput,
} from '@/shared/contracts/chatbot';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { notFoundError, validationError } from '@/shared/errors/app-error';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

type CreateSessionBody = {
  title?: string;
  settings?: ChatSession['settings'];
};

type UpdateSessionBody = {
  sessionId: string;
  title?: string;
};

type DeleteSessionBody = {
  sessionId: string;
};

const createSessionSchema = z.object({
  title: z.string().trim().optional(),
  settings: z.record(z.string(), z['unknown']()).optional(),
});

const updateSessionSchema = z.object({
  sessionId: z.string().trim().min(1),
  title: z.string().trim().optional(),
});

const deleteSessionSchema = z.object({
  sessionId: z.string().trim().min(1),
});

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
  const parsed = await parseBody(req, ctx, createSessionSchema, 'chatbot.sessions.POST');
  if (!parsed.ok) {
    return parsed.response;
  }
  const { title, settings } = parsed.data as CreateSessionBody;

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

  return NextResponse.json({ sessionId: session.id, session }, { status: 201 });
}

// GET /api/chatbot/sessions - List all sessions
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const requestStart = Date.now();
  const sessions = await chatbotSessionRepository.findAll();

  if (DEBUG_CHATBOT) {
    await logSystemEvent({
      level: 'info',
      message: '[chatbot][sessions][GET] Listed',
      context: {
        count: sessions.length,
        durationMs: Date.now() - requestStart,
      },
    });
  }

  return NextResponse.json(
    { sessions },
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
  const parsed = await parseBody(req, ctx, updateSessionSchema, 'chatbot.sessions.PATCH');
  if (!parsed.ok) {
    return parsed.response;
  }
  const { sessionId, title } = parsed.data as UpdateSessionBody;

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

  return NextResponse.json({ session: updated });
}

// DELETE /api/chatbot/sessions - Delete session
export async function DELETE_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const requestStart = Date.now();
  const parsed = await parseBody(req, ctx, deleteSessionSchema, 'chatbot.sessions.DELETE');
  if (!parsed.ok) {
    return parsed.response;
  }
  const { sessionId } = parsed.data as DeleteSessionBody;

  if (DEBUG_CHATBOT) {
    await logSystemEvent({
      level: 'info',
      message: '[chatbot][sessions][DELETE] Request',
      context: {
        sessionId,
      },
    });
  }

  const deleted = await chatbotSessionRepository.delete(sessionId);

  if (!deleted) {
    throw notFoundError('Session not found.', { sessionId });
  }

  if (DEBUG_CHATBOT) {
    await logSystemEvent({
      level: 'info',
      message: '[chatbot][sessions][DELETE] Deleted',
      context: {
        sessionId,
        durationMs: Date.now() - requestStart,
      },
    });
  }

  return NextResponse.json({ success: true });
}
