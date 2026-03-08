import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getExportDefaultConnectionId,
  setExportDefaultConnectionId,
} from '@/features/integrations/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const postSchema = z.object({
  connectionId: z.string().nullable(),
});

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
    return NextResponse.json({ connectionId: storedConnectionId });
  } catch (error) {
    void ErrorSystem.logWarning(
      'Failed to read Base.com default connection setting; returning null.',
      {
        service: 'exports.base.default-connection',
        error: error instanceof Error ? error.message : String(error),
      }
    );
    return NextResponse.json({ connectionId: null });
  }
}

/**
 * POST /api/v2/integrations/exports/base/default-connection
 * Sets the default Base.com connection ID for exports
 */
export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, postSchema, {
    logPrefix: 'exports.base.default-connection.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  await setExportDefaultConnectionId(data.connectionId);
  return NextResponse.json({ success: true });
}
