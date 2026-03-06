import { NextRequest, NextResponse } from 'next/server';

import { getIntegrationRepository } from '@/features/integrations/server';
import { fetchBaseInventories } from '@/features/integrations/server';
import { resolveBaseConnectionToken } from '@/features/integrations/services/base-token-resolver';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { mapStatusToAppError } from '@/shared/errors/error-mapper';

type TestLogEntry = {
  step: string;
  status: 'pending' | 'ok' | 'failed';
  timestamp: string;
  detail: string;
};

/**
 * POST /api/v2/integrations/[id]/connections/[connectionId]/base/test
 * Tests the Base.com API connection by verifying the token and fetching inventories.
 */
export async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string; connectionId: string }
): Promise<Response> {
  const steps: TestLogEntry[] = [];

  const pushStep = (step: string, status: 'pending' | 'ok' | 'failed', detail: string) => {
    steps.push({
      step,
      status,
      detail,
      timestamp: new Date().toISOString(),
    });
  };

  const fail = async (step: string, detail: string, status = 400) => {
    const safeDetail = detail?.trim() ? detail : 'Unknown error';
    pushStep(step, 'failed', safeDetail);

    throw mapStatusToAppError(safeDetail, status);
  };

  const { id, connectionId } = params;
  if (!id || !connectionId) {
    return fail('Loading connection', 'Integration id and connection id are required', 400);
  }

  pushStep('Loading connection', 'pending', 'Fetching stored credentials');
  const repo = await getIntegrationRepository();
  const connection = await repo.getConnectionByIdAndIntegration(connectionId, id);

  if (!connection) {
    return fail('Loading connection', 'Connection not found', 404);
  }
  pushStep('Loading connection', 'ok', 'Connection loaded');

  const integration = await repo.getIntegrationById(id);

  if (!integration) {
    return fail('Loading integration', 'Integration not found', 404);
  }

  if (integration.slug !== 'baselinker') {
    return fail(
      'Connection test',
      `This endpoint is for Base.com/Baselinker connections only. Got: ${integration.name}`,
      400
    );
  }

  pushStep('Resolving token', 'pending', 'Resolving Base API token');
  const tokenResolution = resolveBaseConnectionToken({
    baseApiToken: connection.baseApiToken,
  });
  if (!tokenResolution.token) {
    return fail(
      'Token validation',
      tokenResolution.error ?? 'No Base API token configured for this connection'
    );
  }
  const baseToken = tokenResolution.token;
  pushStep('Resolving token', 'ok', 'Base API token resolved');

  // Test 1: Make a simple API call to verify the token works
  pushStep('Testing API connection', 'pending', 'Calling Base.com API');
  try {
    // Try to get inventories as a simple API test
    const inventories = await fetchBaseInventories(baseToken);
    pushStep(
      'Testing API connection',
      'ok',
      `API connection successful. Found ${inventories.length} inventory/inventories.`
    );

    pushStep('Updating token metadata', 'pending', 'Updating token check timestamp');
    try {
      await repo.updateConnection(connection.id, {
        baseTokenUpdatedAt: new Date().toISOString(),
      });
      pushStep('Updating token metadata', 'ok', 'Token check timestamp updated');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      pushStep('Updating token metadata', 'failed', `Failed to update token metadata: ${message}`);
    }

    // Store the first inventory ID as default if available
    if (inventories.length > 0 && !connection.baseLastInventoryId) {
      pushStep('Storing default inventory', 'pending', 'Setting default inventory');
      try {
        await repo.updateConnection(connection.id, {
          baseLastInventoryId: inventories[0]!.id,
        });
        pushStep(
          'Storing default inventory',
          'ok',
          `Default inventory set to: ${inventories[0]!.name} (${inventories[0]!.id})`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        pushStep('Storing default inventory', 'failed', `Failed to set default: ${message}`);
      }
    }

    // Return success with inventory information
    return NextResponse.json({
      ok: true,
      steps,
      inventories: inventories.map((inv) => ({ id: inv.id, name: inv.name })),
      inventoryCount: inventories.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return fail('Testing API connection', `Base.com API error: ${message}`);
  }
}
