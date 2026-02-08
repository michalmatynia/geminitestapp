export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { parseJsonBody } from '@/features/products/server';
import { badRequestError, internalError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import prisma from '@/shared/lib/db/prisma';
import type { ApiHandlerContext } from '@/shared/types/api';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

const messageSchema = z.object({
  role: z.string().trim().min(1),
  content: z.string().trim().min(1),
});

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { sessionId: string }): Promise<Response> {
  const requestStart = Date.now();
  if (!('chatbotMessage' in prisma) || !('chatbotSession' in prisma)) {
    throw internalError(
      'Chat sessions not initialized. Run prisma generate/db push.'
    );
  }
  const { sessionId } = params;
  const session = await prisma.chatbotSession.findUnique({
    where: { id: sessionId },
    select: { id: true },
  });
  if (!session) {
    throw notFoundError('Session not found.');
  }
  const messages = await prisma.chatbotMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });
  if (DEBUG_CHATBOT) {
    console.info('[chatbot][sessions][GET] Messages loaded', {
      sessionId,
      count: messages.length,
      durationMs: Date.now() - requestStart,
    });
  }
  return NextResponse.json({ messages });
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { sessionId: string }): Promise<Response> {
  const requestStart = Date.now();
  if (!('chatbotMessage' in prisma) || !('chatbotSession' in prisma)) {
    throw internalError(
      'Chat sessions not initialized. Run prisma generate/db push.'
    );
  }
  const { sessionId } = params;
  const session = await prisma.chatbotSession.findUnique({
    where: { id: sessionId },
    select: { id: true },
  });
  if (!session) {
    throw notFoundError('Session not found.');
  }
  const parsed = await parseJsonBody(req, messageSchema, {
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
    console.info('[chatbot][sessions][POST] Request', {
      sessionId,
      role: body.role,
      contentLength: body.content.trim().length,
    });
  }
  const message = await prisma.chatbotMessage.create({
    data: {
      sessionId,
      role: body.role,
      content: body.content.trim(),
    },
  });
  await prisma.chatbotSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });
  if (DEBUG_CHATBOT) {
    console.info('[chatbot][sessions][POST] Created', {
      messageId: message.id,
      sessionId,
      durationMs: Date.now() - requestStart,
    });
  }
  return NextResponse.json({ message });
}

export const GET = apiHandlerWithParams<{ sessionId: string }>(GET_handler, { source: 'chatbot.sessions.[sessionId].messages.GET' });
export const POST = apiHandlerWithParams<{ sessionId: string }>(POST_handler, { source: 'chatbot.sessions.[sessionId].messages.POST' });
