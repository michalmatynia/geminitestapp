import { NextRequest, NextResponse } from 'next/server';

import {
  get1688DefaultConnectionId,
  set1688DefaultConnectionId,
} from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import {
  scanner1688DefaultConnectionPreferencePayloadSchema,
  type Scanner1688DefaultConnectionPreferenceResponse,
} from '@/shared/contracts/integrations/preferences';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const normalizeOptionalId = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const storedConnectionId = normalizeOptionalId(await get1688DefaultConnectionId());
    const response: Scanner1688DefaultConnectionPreferenceResponse = {
      connectionId: storedConnectionId,
    };
    return NextResponse.json(response);
  } catch (error) {
    void ErrorSystem.captureException(error);
    void ErrorSystem.logWarning(
      'Failed to read default 1688 connection setting; returning null.',
      {
        service: 'exports.1688.default-connection',
        error: error instanceof Error ? error.message : String(error),
      }
    );
    const response: Scanner1688DefaultConnectionPreferenceResponse = { connectionId: null };
    return NextResponse.json(response);
  }
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, scanner1688DefaultConnectionPreferencePayloadSchema, {
    logPrefix: 'exports.1688.default-connection.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const connectionId = normalizeOptionalId(parsed.data.connectionId);
  await set1688DefaultConnectionId(connectionId);
  const response: Scanner1688DefaultConnectionPreferenceResponse = { connectionId };
  return NextResponse.json(response);
}
