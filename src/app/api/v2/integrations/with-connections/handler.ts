import { type NextRequest, NextResponse } from 'next/server';

import { getIntegrationsWithConnections } from '@/features/integrations/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

/**
 * GET /api/v2/integrations/with-connections
 * Fetches all integrations with their connections.
 * Used for the product listing dropdown selection.
 * Uses the configured MongoDB-backed integrations repository.
 */
export async function getHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const integrations = await getIntegrationsWithConnections();
  return NextResponse.json(integrations);
}
