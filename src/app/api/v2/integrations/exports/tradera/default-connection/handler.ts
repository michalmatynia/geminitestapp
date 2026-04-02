import { NextRequest, NextResponse } from 'next/server';

import {
  getTraderaDefaultConnectionId,
  setTraderaDefaultConnectionId,
} from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import {
  traderaDefaultConnectionPreferencePayloadSchema,
  type TraderaDefaultConnectionPreferenceResponse,
} from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const normalizeOptionalId = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const storedConnectionId = normalizeOptionalId(await getTraderaDefaultConnectionId());
    const response: TraderaDefaultConnectionPreferenceResponse = {
      connectionId: storedConnectionId,
    };
    return NextResponse.json(response);
  } catch (error) {
    void ErrorSystem.captureException(error);
    void ErrorSystem.logWarning(
      'Failed to read Tradera default connection setting; returning null.',
      {
        service: 'exports.tradera.default-connection',
        error: error instanceof Error ? error.message : String(error),
      }
    );
    const response: TraderaDefaultConnectionPreferenceResponse = { connectionId: null };
    return NextResponse.json(response);
  }
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, traderaDefaultConnectionPreferencePayloadSchema, {
    logPrefix: 'exports.tradera.default-connection.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const connectionId = normalizeOptionalId(parsed.data.connectionId);
  await setTraderaDefaultConnectionId(connectionId);
  const response: TraderaDefaultConnectionPreferenceResponse = { connectionId };
  return NextResponse.json(response);
}
