import { NextRequest, NextResponse } from 'next/server';

import { parseJsonBody } from '@/shared/lib/api/parse-json';
import {
  parseChatbotSettingsPayload,
  type ChatbotSettingsResponseDto,
  type ChatbotSettingsSaveResponseDto,
  type ChatbotStoredSettingsDto,
  chatbotSettingsQuerySchema,
  chatbotSettingsSaveRequestSchema,
} from '@/shared/contracts/chatbot';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { badRequestError, internalError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { logger } from '@/shared/utils/logger';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';
const DEFAULT_SETTINGS_KEY = 'default';
const CHATBOT_SETTINGS_COLLECTION = 'chatbot_settings';

export { chatbotSettingsSaveRequestSchema as settingsSchema };
export { chatbotSettingsQuerySchema as querySchema };

const resolveChatbotSettingsQueryInput = (
  req: Request,
  ctx: ApiHandlerContext
): Record<string, unknown> => ({
  ...Object.fromEntries(new URL(req.url).searchParams.entries()),
  ...((ctx.query ?? {}) as Record<string, unknown>),
});

type ChatbotSettingsRecord = {
  _id?: string;
  id?: string;
  key: string;
  settings: unknown;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

const toIsoString = (value: Date | string | undefined, fallback: string): string => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return fallback;
};

const toChatbotSettingsResponse = (record: ChatbotSettingsRecord): ChatbotStoredSettingsDto => {
  const nowIso = new Date().toISOString();
  return {
    id: String(record.id ?? record._id ?? record.key),
    key: record.key,
    settings: parseChatbotSettingsPayload(record.settings),
    createdAt: toIsoString(record.createdAt, nowIso),
    updatedAt: toIsoString(record.updatedAt, nowIso),
  };
};

const getChatbotSettingsCollection = async () => {
  if (!process.env['MONGODB_URI']) {
    throw internalError('MongoDB is not configured.');
  }
  const mongo = await getMongoDb();
  return mongo.collection<ChatbotSettingsRecord>(CHATBOT_SETTINGS_COLLECTION);
};

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const requestStart = Date.now();
  const query = chatbotSettingsQuerySchema.parse(resolveChatbotSettingsQueryInput(req, _ctx));
  const key = query.key ?? DEFAULT_SETTINGS_KEY;
  const collection = await getChatbotSettingsCollection();
  const settings = await collection.findOne({ key });

  if (DEBUG_CHATBOT) {
    logger.info('[chatbot][settings][GET] Loaded', {
      key,
      found: Boolean(settings),
      durationMs: Date.now() - requestStart,
    });
  }

  const response: ChatbotSettingsResponseDto = {
    settings: settings ? toChatbotSettingsResponse(settings) : null,
  };

  return NextResponse.json(response);
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const requestStart = Date.now();
  const parsed = await parseJsonBody(req, chatbotSettingsSaveRequestSchema, {
    logPrefix: 'chatbot.settings.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const key = parsed.data.key?.trim() || DEFAULT_SETTINGS_KEY;
  if (!parsed.data.settings || typeof parsed.data.settings !== 'object') {
    throw badRequestError('Settings payload is required.');
  }

  const collection = await getChatbotSettingsCollection();
  const now = new Date();
  await collection.updateOne(
    { key },
    {
      $set: {
        id: key,
        key,
        settings: parsed.data.settings,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: key,
        createdAt: now,
      },
    },
    { upsert: true }
  );

  const saved = await collection.findOne({ key });
  if (!saved) {
    throw internalError('Failed to persist chatbot settings.');
  }

  if (DEBUG_CHATBOT) {
    logger.info('[chatbot][settings][POST] Saved', {
      key,
      durationMs: Date.now() - requestStart,
    });
  }

  const response: ChatbotSettingsSaveResponseDto = {
    settings: toChatbotSettingsResponse(saved),
  };

  return NextResponse.json(response);
}
