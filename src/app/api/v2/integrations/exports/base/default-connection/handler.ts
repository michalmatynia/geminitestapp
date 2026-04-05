import { NextRequest, NextResponse } from 'next/server';

import {
  getExportDefaultConnectionId,
  setExportDefaultInventoryId,
  setExportDefaultConnectionId,
} from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import { baseDefaultConnectionPreferencePayloadSchema } from '@/shared/contracts/integrations/preferences';
import { type BaseDefaultConnectionPreferenceResponse } from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const normalizeOptionalId = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * GET /api/v2/integrations/exports/base/default-connection
 * Returns the default Base.com connection ID for exports
 */
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const storedConnectionId = normalizeOptionalId(await getExportDefaultConnectionId());
    const response: BaseDefaultConnectionPreferenceResponse = {
      connectionId: storedConnectionId,
    };
    return NextResponse.json(response);
  } catch (error) {
    void ErrorSystem.captureException(error);
    void ErrorSystem.logWarning(
      'Failed to read Base.com default connection setting; returning null.',
      {
        service: 'exports.base.default-connection',
        error: error instanceof Error ? error.message : String(error),
      }
    );
    const response: BaseDefaultConnectionPreferenceResponse = { connectionId: null };
    return NextResponse.json(response);
  }
}

/**
 * POST /api/v2/integrations/exports/base/default-connection
 * Sets the default Base.com connection ID for exports
 */
export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, baseDefaultConnectionPreferencePayloadSchema, {
    logPrefix: 'exports.base.default-connection.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  const connectionId = normalizeOptionalId(data.connectionId);
  let previousConnectionId: string | null = null;
  try {
    previousConnectionId = normalizeOptionalId(await getExportDefaultConnectionId());
  } catch (error) {
    void ErrorSystem.captureException(error);
    previousConnectionId = null;
  }
  if (previousConnectionId !== connectionId) {
    await setExportDefaultInventoryId(null);
  }
  await setExportDefaultConnectionId(connectionId);
  const response: BaseDefaultConnectionPreferenceResponse = { connectionId };
  return NextResponse.json(response);
}
