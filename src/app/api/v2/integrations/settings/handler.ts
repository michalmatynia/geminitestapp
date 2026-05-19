import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  INTEGRATION_SETTINGS_KEYS,
  isIntegrationSettingKey,
  listIntegrationSettingValues,
  writeIntegrationSettingValue,
} from '@/features/integrations/services/integration-settings-store';
import { TRADERA_SETTINGS_KEYS } from '@/features/integrations/constants/tradera';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export const querySchema = z.object({
  keys: optionalTrimmedQueryString(),
});

export const integrationSettingsSavePayloadSchema = z.object({
  settings: z
    .array(
      z.object({
        key: z.string().trim().min(1),
        value: z.string(),
      })
    )
    .min(1),
});

const TRADERA_RELIST_SCHEDULER_SETTING_KEYS = new Set<string>([
  TRADERA_SETTINGS_KEYS.schedulerEnabled,
  TRADERA_SETTINGS_KEYS.schedulerIntervalMs,
]);

const parseRequestedKeys = (rawKeys?: string | null): string[] => {
  const keys = rawKeys
    ?.split(',')
    .map((key) => key.trim())
    .filter(Boolean);
  return keys && keys.length > 0 ? Array.from(new Set(keys)) : [...INTEGRATION_SETTINGS_KEYS];
};

const rejectUnknownKeysResponse = (keys: readonly string[]): NextResponse | null => {
  const unknownKeys = keys.filter((key) => !isIntegrationSettingKey(key));
  if (unknownKeys.length === 0) return null;
  return NextResponse.json(
    {
      error: 'Unsupported integration settings key.',
      keys: unknownKeys,
    },
    { status: 400 }
  );
};

const syncTraderaRelistSchedulerWorker = async (keys: readonly string[]): Promise<void> => {
  if (!keys.some((key) => TRADERA_RELIST_SCHEDULER_SETTING_KEYS.has(key))) return;
  const { startTraderaRelistSchedulerQueue } = await import('@/features/integrations/server');
  startTraderaRelistSchedulerQueue();
};

export async function getHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = (ctx.query ?? {}) as z.infer<typeof querySchema>;
  const keys = parseRequestedKeys(query.keys);
  const invalidResponse = rejectUnknownKeysResponse(keys);
  if (invalidResponse !== null) return invalidResponse;

  const values = await listIntegrationSettingValues(keys);
  return NextResponse.json(
    {
      settings: Object.fromEntries(values.entries()),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function postHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const parsed = await parseJsonBody(req, integrationSettingsSavePayloadSchema, {
    logPrefix: 'integrations.settings.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const keys = parsed.data.settings.map((setting) => setting.key);
  const invalidResponse = rejectUnknownKeysResponse(keys);
  if (invalidResponse !== null) return invalidResponse;

  await Promise.all(
    parsed.data.settings.map((setting) =>
      writeIntegrationSettingValue(setting.key, setting.value)
    )
  );
  await syncTraderaRelistSchedulerWorker(keys);

  const values = await listIntegrationSettingValues(keys);
  return NextResponse.json(
    {
      settings: Object.fromEntries(values.entries()),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
