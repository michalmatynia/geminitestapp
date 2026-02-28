import { NextRequest, NextResponse } from 'next/server';

import { getIntegrationsWithConnections } from '@/features/integrations/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

/**
 * GET /api/integrations/with-connections
 * Fetches all integrations with their connections.
 * Used for the product listing dropdown selection.
 * Supports both MongoDB and Prisma based on provider settings.
 */
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const integrations = await getIntegrationsWithConnections();
  return NextResponse.json(integrations);
}
