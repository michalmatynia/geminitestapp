import { NextResponse } from 'next/server';

import { assertSettingsManageAccess } from '@/features/auth/server';
import { isPlaywrightProgrammableSlug } from '@/features/integrations/constants/slugs';
import { getIntegrationRepository } from '@/features/integrations/server';
import { canCleanupProgrammableConnectionLegacyBrowserFields } from '@/features/integrations/utils/playwright-programmable-connection-migration';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { fetchResolvedPlaywrightRuntimeActions } from '@/shared/lib/browser-execution/runtime-action-resolver.server';

const requireConnectionId = (id: string | undefined): string => {
  if (typeof id !== 'string' || id.length === 0) {
    throw badRequestError('Connection id is required');
  }
  return id;
};

const assertProgrammableConnection = async (
  repo: Awaited<ReturnType<typeof getIntegrationRepository>>,
  connectionId: string
): Promise<IntegrationConnectionRecord> => {
  const existingConnection = await repo.getConnectionById(connectionId);
  if (!existingConnection) {
    throw notFoundError('Connection not found', { connectionId });
  }

  const integration = await repo.getIntegrationById(existingConnection.integrationId);
  if (!integration || !isPlaywrightProgrammableSlug(integration.slug)) {
    throw badRequestError(
      'Only programmable connections support legacy browser persistence cleanup.',
      {
        connectionId,
        integrationId: existingConnection.integrationId,
        integrationSlug: integration?.slug ?? null,
      }
    );
  }

  return existingConnection;
};

const assertCleanupReady = async (
  connection: IntegrationConnectionRecord
): Promise<void> => {
  const actions = await fetchResolvedPlaywrightRuntimeActions();
  const canCleanup = canCleanupProgrammableConnectionLegacyBrowserFields({
    connection,
    actions,
  });

  if (!canCleanup) {
    throw badRequestError(
      'This programmable connection cannot clear stored browser fields yet. Promote it into action drafts first, or re-select the generated programmable draft actions.',
      { connectionId: connection.id }
    );
  }
};

const postHandler = async (
  _req: Request,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> => {
  await assertSettingsManageAccess();

  const connectionId = requireConnectionId(params.id);
  const repo = await getIntegrationRepository();
  const existingConnection = await assertProgrammableConnection(repo, connectionId);
  await assertCleanupReady(existingConnection);

  const updated = await repo.updateConnection(connectionId, {
    resetPlaywrightOverrides: true,
    playwrightListingActionId: existingConnection.playwrightListingActionId ?? null,
    playwrightImportActionId: existingConnection.playwrightImportActionId ?? null,
  });

  return NextResponse.json({
    connectionId: updated.id,
    cleaned: true,
    playwrightListingActionId: updated.playwrightListingActionId ?? null,
    playwrightImportActionId: updated.playwrightImportActionId ?? null,
  });
};

export { postHandler as POST_handler };
