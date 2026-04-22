import { type NextRequest, NextResponse } from 'next/server';

import {
  deleteAiPathsSettings,
  listAiPathsSettings,
  upsertAiPathsSetting,
  upsertAiPathsSettingsBulk,
} from '@/features/ai/ai-paths/server';
import { AI_PATHS_CONFIG_KEY_PREFIX } from '@/features/ai/ai-paths/server/settings-store.constants';
import {
  aiPathsSettingsBulkWriteRequestSchema,
  aiPathsSettingsDeleteRequestSchema,
  aiPathsSettingWriteSchema,
} from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const MAX_SETTINGS_QUERY_KEYS = 500;
const MAX_SETTINGS_QUERY_KEY_LENGTH = 200;
const VERSIONED_AI_PATHS_KEY_PATTERN = /^ai_paths_.*_v\d+$/;

const assertCanonicalAiPathsKey = (key: string): void => {
  if (key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX)) return;
  if (!VERSIONED_AI_PATHS_KEY_PATTERN.test(key)) return;
  throw badRequestError(
    `Versioned AI Paths key "${key}" is disabled. Use canonical unversioned keys.`
  );
};

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
    assertCanonicalAiPathsKey(key);
  });
  return unique;
};

export async function getHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const requestedKeys = parseRequestedKeys(req);
  const startedAt = Date.now();
  const settings =
    requestedKeys.length > 0
      ? await listAiPathsSettings(requestedKeys)
      : await listAiPathsSettings();
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

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const rawBody = await req.text();
  let body: unknown = {};

  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch (error) {
      void ErrorSystem.captureException(error);
      throw badRequestError('Invalid JSON body.');
    }
  }

  const parsedBulk = aiPathsSettingsBulkWriteRequestSchema.safeParse(body);
  if (parsedBulk.success) {
    parsedBulk.data.items.forEach((item) => assertCanonicalAiPathsKey(item.key));
    await upsertAiPathsSettingsBulk(parsedBulk.data.items);
    return NextResponse.json(parsedBulk.data.items);
  }

  const parsedSingle = aiPathsSettingWriteSchema.safeParse(body);
  if (parsedSingle.success) {
    assertCanonicalAiPathsKey(parsedSingle.data.key);
    await upsertAiPathsSetting(parsedSingle.data.key, parsedSingle.data.value);
    return NextResponse.json(parsedSingle.data);
  }

  throw badRequestError('Invalid AI Paths settings payload.');
}

export async function deleteHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const rawBody = await req.text();
  let body: unknown = {};

  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch (error) {
      void ErrorSystem.captureException(error);
      throw badRequestError('Invalid JSON body.');
    }
  }

  const parsed = aiPathsSettingsDeleteRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid AI Paths settings delete payload.');
  }

  const keys = [...(parsed.data.key ? [parsed.data.key] : []), ...(parsed.data.keys ?? [])];
  const deletedCount = await deleteAiPathsSettings(keys);
  return NextResponse.json({ deletedCount });
}
