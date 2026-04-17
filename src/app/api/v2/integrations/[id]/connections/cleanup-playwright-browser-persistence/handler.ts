import { NextResponse } from 'next/server';

import { assertSettingsManageAccess } from '@/features/auth/server';
import { isPlaywrightProgrammableSlug } from '@/features/integrations/constants/slugs';
import { getIntegrationRepository } from '@/features/integrations/server';
import { canCleanupProgrammableConnectionLegacyBrowserFields } from '@/features/playwright/utils/playwright-programmable-connection-migration';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { fetchResolvedPlaywrightRuntimeActions } from '@/shared/lib/browser-execution/runtime-action-resolver.server';

const requireIntegrationId = (id: string | undefined): string => {
  if (typeof id !== 'string' || id.length === 0) {
    throw badRequestError('Integration id is required');
  }
  return id;
};

const assertProgrammableIntegration = async (
  repo: Awaited<ReturnType<typeof getIntegrationRepository>>,
  integrationId: string
): Promise<void> => {
  const integration = await repo.getIntegrationById(integrationId);
  if (!integration) {
    throw notFoundError('Integration not found', { integrationId });
  }
  if (!isPlaywrightProgrammableSlug(integration.slug)) {
    throw badRequestError(
      'Only programmable integrations support bulk cleanup of stored browser fields.',
      {
        integrationId,
        integrationSlug: integration.slug,
      }
    );
  }
};

const resolveCleanupReadyConnections = async (
  repo: Awaited<ReturnType<typeof getIntegrationRepository>>,
  integrationId: string
): Promise<IntegrationConnectionRecord[]> => {
  const actions = await fetchResolvedPlaywrightRuntimeActions();
  const connections = await repo.listConnections(integrationId);

  return connections.filter((connection) =>
    canCleanupProgrammableConnectionLegacyBrowserFields({
      connection,
      actions,
    })
  );
};

const postHandler = async (
  _req: Request,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> => {
  await assertSettingsManageAccess();

  const integrationId = requireIntegrationId(params.id);
  const repo = await getIntegrationRepository();
  await assertProgrammableIntegration(repo, integrationId);

  const cleanupReadyConnections = await resolveCleanupReadyConnections(repo, integrationId);
  if (cleanupReadyConnections.length === 0) {
    throw badRequestError(
      'No programmable connections are ready for stored browser-field cleanup.',
      { integrationId }
    );
  }

  const updatedConnections = await Promise.all(
    cleanupReadyConnections.map((connection) =>
      repo.updateConnection(connection.id, {
        resetPlaywrightOverrides: true,
        playwrightListingActionId: connection.playwrightListingActionId ?? null,
        playwrightImportActionId: connection.playwrightImportActionId ?? null,
      })
    )
  );

  return NextResponse.json({
    integrationId,
    cleanedCount: updatedConnections.length,
    cleanedConnectionIds: updatedConnections.map((connection) => connection.id),
  });
};

export { postHandler as POST_handler };
