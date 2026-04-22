import { type NextRequest, NextResponse } from 'next/server';

import {
  getVintedDefaultConnectionId,
  setVintedDefaultConnectionId,
} from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import { vintedDefaultConnectionPreferencePayloadSchema } from '@/shared/contracts/integrations/preferences';
import { type VintedDefaultConnectionPreferenceResponse } from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const normalizeOptionalId = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function getHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const storedConnectionId = normalizeOptionalId(await getVintedDefaultConnectionId());
    const response: VintedDefaultConnectionPreferenceResponse = {
      connectionId: storedConnectionId,
    };
    return NextResponse.json(response);
  } catch (error) {
    void ErrorSystem.captureException(error);
    void ErrorSystem.logWarning(
      'Failed to read Vinted default connection setting; returning null.',
      {
        service: 'exports.vinted.default-connection',
        error: error instanceof Error ? error.message : String(error),
      }
    );
    const response: VintedDefaultConnectionPreferenceResponse = { connectionId: null };
    return NextResponse.json(response);
  }
}

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, vintedDefaultConnectionPreferencePayloadSchema, {
    logPrefix: 'exports.vinted.default-connection.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const connectionId = normalizeOptionalId(parsed.data.connectionId);
  await setVintedDefaultConnectionId(connectionId);
  const response: VintedDefaultConnectionPreferenceResponse = { connectionId };
  return NextResponse.json(response);
}
