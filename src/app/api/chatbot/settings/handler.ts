import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { parseJsonBody } from '@/features/products/server';
import type { ChatbotSettingsRecordDto as ChatbotSettingsRecord } from '@/shared/contracts/chatbot';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, internalError } from '@/shared/errors/app-error';
import prisma from '@/shared/lib/db/prisma';
import { logger } from '@/shared/utils/logger';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';
const DEFAULT_SETTINGS_KEY = 'default';

const settingsSchema = z.object({
  key: z.string().trim().optional(),
  settings: z.record(z.string(), z.any()).optional(),
});

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const requestStart = Date.now();
  if (!('chatbotSettings' in prisma)) {
    throw internalError(
      'Chatbot settings not initialized. Run prisma generate/db push.'
    );
  }
  const url = new URL(req.url);
  const key = url.searchParams.get('key')?.trim() || DEFAULT_SETTINGS_KEY;
  const settings = await prisma.chatbotSettings.findUnique({
    where: { key },
  });
  if (DEBUG_CHATBOT) {
    logger.info('[chatbot][settings][GET] Loaded', {
      key,
      found: Boolean(settings),
      durationMs: Date.now() - requestStart,
    });
  }
  return NextResponse.json({ settings: settings as ChatbotSettingsRecord | null });
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const requestStart = Date.now();
  if (!('chatbotSettings' in prisma)) {
    throw internalError(
      'Chatbot settings not initialized. Run prisma generate/db push.'
    );
  }
  const parsed = await parseJsonBody(req, settingsSchema, {
    logPrefix: 'chatbot.settings.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const key = parsed.data.key?.trim() || DEFAULT_SETTINGS_KEY;
  if (!parsed.data.settings || typeof parsed.data.settings !== 'object') {
    throw badRequestError('Settings payload is required.');
  }
  const saved = await prisma.chatbotSettings.upsert({
    where: { key },
    update: { settings: parsed.data.settings as Prisma.InputJsonValue },
    create: { key, settings: parsed.data.settings as Prisma.InputJsonValue },
  });
  if (DEBUG_CHATBOT) {
    logger.info('[chatbot][settings][POST] Saved', {
      key,
      durationMs: Date.now() - requestStart,
    });
  }
  return NextResponse.json({ settings: saved as unknown as ChatbotSettingsRecord });
}
