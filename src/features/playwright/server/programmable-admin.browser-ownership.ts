import { badRequestError } from '@/shared/errors/app-error';
import { fetchResolvedPlaywrightRuntimeActions } from '@/shared/lib/browser-execution/runtime-action-resolver.server';
import { serializeSetting } from '@/shared/utils/settings-json';

import type { PromotePlaywrightProgrammableBrowserOwnershipInput } from './programmable-admin.schemas';
import {
  assertProgrammableIntegration,
  requireConnectionId,
  requireIntegrationId,
  requireProgrammableConnection,
  upsertPlaywrightActionsSetting,
} from './programmable-admin.shared';
import {
  listPlaywrightProgrammableConnectionRecords,
  updatePlaywrightProgrammableConnectionRecord,
} from './programmable-storage';
import {
  buildProgrammableConnectionActionMigrationPreview,
  canCleanupProgrammableConnectionLegacyBrowserFields,
  mergePlaywrightActionsWithProgrammableConnectionDrafts,
} from '../utils/playwright-programmable-connection-migration';

const createPromotionPreview = async (
  connectionId: string,
  payload: PromotePlaywrightProgrammableBrowserOwnershipInput
): Promise<{
  actions: Awaited<ReturnType<typeof fetchResolvedPlaywrightRuntimeActions>>;
  preview: ReturnType<typeof buildProgrammableConnectionActionMigrationPreview>;
}> => {
  const existingConnection = await requireProgrammableConnection(
    connectionId,
    'Only programmable connections support Step Sequencer browser ownership promotion.'
  );
  const actions = await fetchResolvedPlaywrightRuntimeActions();
  const preview = buildProgrammableConnectionActionMigrationPreview({
    connection: {
      ...existingConnection,
      name: payload.name,
      playwrightListingActionId: payload.playwrightListingActionId ?? null,
      playwrightImportActionId: payload.playwrightImportActionId ?? null,
      ...(typeof payload.proxyPassword === 'string' && payload.proxyPassword.length > 0
        ? { playwrightProxyPassword: payload.proxyPassword }
        : {}),
    },
    actions,
  });

  return { actions, preview };
};

export const promotePlaywrightProgrammableConnectionBrowserOwnership = async ({
  connectionId,
  payload,
}: {
  connectionId: string;
  payload: PromotePlaywrightProgrammableBrowserOwnershipInput;
}): Promise<{
  connectionId: string;
  listingActionId: string;
  importActionId: string;
  listingDraftActionName: string;
  importDraftActionName: string;
}> => {
  const nextConnectionId = requireConnectionId(connectionId);
  const { actions, preview } = await createPromotionPreview(nextConnectionId, payload);

  if (!preview.hasLegacyBrowserBehavior) {
    throw badRequestError('This programmable connection no longer has legacy browser settings to promote.', {
      connectionId: nextConnectionId,
    });
  }

  if (preview.requiresManualProxyPasswordInput) {
    throw badRequestError(
      'Re-enter the programmable connection proxy password before promoting browser ownership into action drafts.',
      { connectionId: nextConnectionId }
    );
  }

  await upsertPlaywrightActionsSetting(
    serializeSetting(
      mergePlaywrightActionsWithProgrammableConnectionDrafts({
        actions,
        listingDraftAction: preview.listingDraftAction,
        importDraftAction: preview.importDraftAction,
      })
    )
  );

  await updatePlaywrightProgrammableConnectionRecord({
    connectionId: nextConnectionId,
    input: {
      name: payload.name,
      playwrightListingScript: payload.playwrightListingScript ?? null,
      playwrightImportScript: payload.playwrightImportScript ?? null,
      playwrightImportBaseUrl: payload.playwrightImportBaseUrl ?? null,
      playwrightImportCaptureRoutesJson: payload.playwrightImportCaptureRoutesJson ?? null,
      playwrightFieldMapperJson: payload.playwrightFieldMapperJson ?? null,
      playwrightImportAutomationFlowJson: payload.playwrightImportAutomationFlowJson ?? null,
      playwrightListingActionId: preview.listingDraftAction.id,
      playwrightImportActionId: preview.importDraftAction.id,
      resetPlaywrightOverrides: true,
    },
  });

  return {
    connectionId: nextConnectionId,
    listingActionId: preview.listingDraftAction.id,
    importActionId: preview.importDraftAction.id,
    listingDraftActionName: preview.listingDraftAction.name,
    importDraftActionName: preview.importDraftAction.name,
  };
};

const requireCleanupReadyConnection = async (
  connectionId: string
): Promise<Awaited<ReturnType<typeof requireProgrammableConnection>>> => {
  const connection = await requireProgrammableConnection(
    connectionId,
    'Only programmable connections support legacy browser persistence cleanup.'
  );
  const actions = await fetchResolvedPlaywrightRuntimeActions();

  if (
    !canCleanupProgrammableConnectionLegacyBrowserFields({
      connection,
      actions,
    })
  ) {
    throw badRequestError(
      'This programmable connection cannot clear stored browser fields yet. Promote it into action drafts first, or re-select the generated programmable draft actions.',
      { connectionId: connection.id }
    );
  }

  return connection;
};

export const cleanupPlaywrightProgrammableConnectionBrowserPersistence = async (
  connectionId: string
): Promise<{
  connectionId: string;
  cleaned: true;
  playwrightListingActionId: string | null;
  playwrightImportActionId: string | null;
}> => {
  const nextConnectionId = requireConnectionId(connectionId);
  const connection = await requireCleanupReadyConnection(nextConnectionId);
  const updated = await updatePlaywrightProgrammableConnectionRecord({
    connectionId: nextConnectionId,
    input: {
      resetPlaywrightOverrides: true,
      playwrightListingActionId: connection.playwrightListingActionId ?? null,
      playwrightImportActionId: connection.playwrightImportActionId ?? null,
    },
  });

  return {
    connectionId: updated.id,
    cleaned: true,
    playwrightListingActionId: updated.playwrightListingActionId ?? null,
    playwrightImportActionId: updated.playwrightImportActionId ?? null,
  };
};

export const cleanupAllPlaywrightProgrammableConnectionsBrowserPersistence = async (
  integrationId: string
): Promise<{
  integrationId: string;
  cleanedCount: number;
  cleanedConnectionIds: string[];
}> => {
  const nextIntegrationId = requireIntegrationId(integrationId);
  await assertProgrammableIntegration(
    nextIntegrationId,
    'Only programmable integrations support bulk cleanup of stored browser fields.'
  );

  const actions = await fetchResolvedPlaywrightRuntimeActions();
  const cleanupReadyConnections = (
    await listPlaywrightProgrammableConnectionRecords(nextIntegrationId)
  ).filter((connection) =>
    canCleanupProgrammableConnectionLegacyBrowserFields({
      connection,
      actions,
    })
  );

  if (cleanupReadyConnections.length === 0) {
    throw badRequestError('No programmable connections are ready for stored browser-field cleanup.', {
      integrationId: nextIntegrationId,
    });
  }

  const updatedConnections = await Promise.all(
    cleanupReadyConnections.map((connection) =>
      updatePlaywrightProgrammableConnectionRecord({
        connectionId: connection.id,
        input: {
          resetPlaywrightOverrides: true,
          playwrightListingActionId: connection.playwrightListingActionId ?? null,
          playwrightImportActionId: connection.playwrightImportActionId ?? null,
        },
      })
    )
  );

  return {
    integrationId: nextIntegrationId,
    cleanedCount: updatedConnections.length,
    cleanedConnectionIds: updatedConnections.map((connection) => connection.id),
  };
};
