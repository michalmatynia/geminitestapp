import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  deleteAiPathsSettings,
  listAiPathsSettings,
  upsertAiPathsSetting,
  upsertAiPathsSettingsBulk,
} from '@/features/ai/ai-paths/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

const settingPayloadSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .refine((value) => value.startsWith('ai_paths_'), {
      message: 'AI Paths setting keys must start with "ai_paths_".',
    }),
  value: z.string(),
});

const settingsBulkPayloadSchema = z.object({
  items: z.array(settingPayloadSchema).min(1),
});

const deletePayloadSchema = z
  .object({
    key: z.string().trim().min(1).optional(),
    keys: z.array(z.string().trim().min(1)).min(1).optional(),
  })
  .refine((value) => Boolean(value.key) || Boolean(value.keys && value.keys.length > 0), {
    message: 'Provide "key" or non-empty "keys".',
  });

const MAX_SETTINGS_QUERY_KEYS = 500;
const MAX_SETTINGS_QUERY_KEY_LENGTH = 200;

const parseRequestedKeys = (req: NextRequest): string[] => {
  const raw = req.nextUrl.searchParams.getAll('keys');
  if (raw.length === 0) return [];

  const flattened = raw
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (flattened.length > MAX_SETTINGS_QUERY_KEYS) {
    throw badRequestError(
      `Too many keys requested. Maximum allowed is ${MAX_SETTINGS_QUERY_KEYS}.`
    );
  }

  const unique = Array.from(new Set(flattened));
  unique.forEach((key) => {
    if (key.length > MAX_SETTINGS_QUERY_KEY_LENGTH) {
      throw badRequestError(`Invalid key length for "${key.slice(0, 32)}...".`);
    }
    if (!key.startsWith('ai_paths_')) {
      throw badRequestError(`Invalid AI Paths key "${key}".`);
    }
  });
  return unique;
};

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const requestedKeys = parseRequestedKeys(req);
  const startedAt = Date.now();
  const settings =
    requestedKeys.length > 0 ? await listAiPathsSettings(requestedKeys) : await listAiPathsSettings();
  const durationMs = Date.now() - startedAt;
  const payloadBytes = settings.reduce((sum, item) => sum + item.key.length + item.value.length, 0);

  if (durationMs >= 250 || requestedKeys.length > 0) {
    void logSystemEvent({
      level: 'info',
      message: '[ai-paths-settings-api] GET /api/ai-paths/settings',
      source: 'ai-paths-settings-api',
      context: {
        durationMs,
        recordCount: settings.length,
        payloadBytes,
        requestedKeys: requestedKeys.length,
      },
    });
  }

  return NextResponse.json(settings, {
    headers: {
      'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
    },
  });
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const rawBody = await req.text();
  let body: unknown = {};

  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw badRequestError('Invalid JSON body.');
    }
  }

  const parsedBulk = settingsBulkPayloadSchema.safeParse(body);
  if (parsedBulk.success) {
    await upsertAiPathsSettingsBulk(parsedBulk.data.items);
    return NextResponse.json(parsedBulk.data.items);
  }

  const parsedSingle = settingPayloadSchema.safeParse(body);
  if (parsedSingle.success) {
    await upsertAiPathsSetting(parsedSingle.data.key, parsedSingle.data.value);
    return NextResponse.json(parsedSingle.data);
  }

  throw badRequestError('Invalid AI Paths settings payload.');
}

export async function DELETE_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const rawBody = await req.text();
  let body: unknown = {};

  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw badRequestError('Invalid JSON body.');
    }
  }

  const parsed = deletePayloadSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid AI Paths settings delete payload.');
  }

  const keys = [...(parsed.data.key ? [parsed.data.key] : []), ...(parsed.data.keys ?? [])];
  const deletedCount = await deleteAiPathsSettings(keys);
  return NextResponse.json({ deletedCount });
}
