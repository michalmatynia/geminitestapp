import {
  buildProgrammableConnectionPayload,
  createEmptyProgrammableCaptureRoute,
  createEmptyProgrammableFieldMapperRow,
  type ProgrammableFieldMapperRow,
} from '@/features/playwright/pages/playwright-programmable-integration-page.helpers';
import type {
  PlaywrightProgrammableIntegrationPageActionArgs,
  PlaywrightProgrammableIntegrationPageActions,
} from '@/features/playwright/pages/playwright-programmable-integration-page.types';
import { api } from '@/shared/lib/api-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const buildPromotionPayload = (
  args: Pick<
    PlaywrightProgrammableIntegrationPageActionArgs,
    | 'appearanceMode'
    | 'captureRoutes'
    | 'connectionName'
    | 'fieldMapperRows'
    | 'importActionId'
    | 'importBaseUrl'
    | 'importScript'
    | 'listingActionId'
    | 'listingScript'
    | 'promotionProxyPassword'
  >
): Record<string, unknown> => ({
  ...buildProgrammableConnectionPayload({
    connectionName: args.connectionName,
    listingScript: args.listingScript,
    importScript: args.importScript,
    importBaseUrl: args.importBaseUrl,
    listingActionId: args.listingActionId,
    importActionId: args.importActionId,
    captureRoutes: args.captureRoutes,
    appearanceMode: args.appearanceMode,
    fieldMapperRows: args.fieldMapperRows,
  }),
  proxyPassword:
    args.promotionProxyPassword.trim().length > 0
      ? args.promotionProxyPassword.trim()
      : null,
});

const saveCurrentConnection = async (
  args: PlaywrightProgrammableIntegrationPageActionArgs,
  showToastOnSuccess: boolean
): Promise<Awaited<ReturnType<PlaywrightProgrammableIntegrationPageActions['saveCurrentConnection']>>> => {
  if (args.programmableIntegration === null) {
    args.toast('Playwright (Programmable) integration is not available yet.', {
      variant: 'error',
    });
    return null;
  }

  const payload = buildProgrammableConnectionPayload({
    connectionName: args.connectionName,
    listingScript: args.listingScript,
    importScript: args.importScript,
    importBaseUrl: args.importBaseUrl,
    listingActionId: args.listingActionId,
    importActionId: args.importActionId,
    captureRoutes: args.captureRoutes,
    appearanceMode: args.appearanceMode,
    fieldMapperRows: args.fieldMapperRows,
    payloadPatch:
      args.isBrowserBehaviorActionOwned && args.selectedConnection !== null
        ? { resetPlaywrightOverrides: true }
        : {},
  });

  try {
    const saved = await args.upsertConnectionMutateAsync({
      integrationId: args.programmableIntegration.id,
      ...(args.selectedConnection !== null
        ? { connectionId: args.selectedConnection.id }
        : {}),
      payload,
    });
    args.setSelectedConnectionId(saved.id);
    if (showToastOnSuccess) {
      args.toast('Programmable Playwright connection saved.', { variant: 'success' });
    }
    return saved;
  } catch (error) {
    logClientError(error);
    args.toast(getErrorMessage(error, 'Failed to save connection.'), { variant: 'error' });
    return null;
  }
};

const handlePromoteConnectionSettings = async (
  args: PlaywrightProgrammableIntegrationPageActionArgs
): Promise<void> => {
  if (args.selectedConnection === null || args.migrationInfo === null) {
    args.toast('Select a programmable connection before promoting its browser settings.', {
      variant: 'error',
    });
    return;
  }

  args.setIsPromotingConnectionSettings(true);
  try {
    const response = await api.post<{
      connectionId: string;
      importActionId: string;
      importDraftActionName: string;
      listingActionId: string;
      listingDraftActionName: string;
    }>(
      `/api/v2/integrations/connections/${args.selectedConnection.id}/promote-playwright-browser-ownership`,
      buildPromotionPayload(args)
    );

    args.setSelectedConnectionId(response.connectionId);
    args.setListingActionId(response.listingActionId);
    args.setImportActionId(response.importActionId);
    args.setPromotionProxyPassword('');
    await Promise.all([args.playableActionsRefetch?.(), args.connectionsRefetch?.()]);
    args.toast(
      `Promoted browser settings into "${response.listingDraftActionName}" and "${response.importDraftActionName}".`,
      { variant: 'success' }
    );
  } catch (error) {
    logClientError(error);
    args.toast(
      getErrorMessage(
        error,
        'Failed to promote programmable browser settings into Step Sequencer drafts.'
      ),
      { variant: 'error' }
    );
  } finally {
    args.setIsPromotingConnectionSettings(false);
  }
};

const handleCleanupLegacyBrowserFields = async (
  args: PlaywrightProgrammableIntegrationPageActionArgs
): Promise<void> => {
  if (args.selectedConnection === null || args.migrationInfo === null) {
    args.toast('Select a programmable connection before clearing stored browser fields.', {
      variant: 'error',
    });
    return;
  }

  args.setIsCleaningLegacyBrowserFields(true);
  try {
    await api.post(
      `/api/v2/integrations/connections/${args.selectedConnection.id}/cleanup-playwright-browser-persistence`,
      {}
    );
    await args.connectionsRefetch?.();
    args.toast('Stored programmable browser fields cleared from the connection record.', {
      variant: 'success',
    });
  } catch (error) {
    logClientError(error);
    args.toast(
      getErrorMessage(error, 'Failed to clear stored programmable browser fields.'),
      { variant: 'error' }
    );
  } finally {
    args.setIsCleaningLegacyBrowserFields(false);
  }
};

const handleCleanupAllLegacyBrowserFields = async (
  args: PlaywrightProgrammableIntegrationPageActionArgs
): Promise<void> => {
  if (args.programmableIntegration === null || args.cleanupReadyConnections.length === 0) {
    args.toast('No programmable connections are ready for stored browser-field cleanup.', {
      variant: 'error',
    });
    return;
  }

  args.setIsCleaningAllLegacyBrowserFields(true);
  try {
    const response = await api.post<{ cleanedCount: number }>(
      `/api/v2/integrations/${args.programmableIntegration.id}/connections/cleanup-playwright-browser-persistence`,
      {}
    );
    await args.connectionsRefetch?.();
    args.toast(
      `Cleared stored programmable browser fields for ${response.cleanedCount} connections.`,
      { variant: 'success' }
    );
  } catch (error) {
    logClientError(error);
    args.toast(
      getErrorMessage(error, 'Failed to clear stored programmable browser fields in bulk.'),
      { variant: 'error' }
    );
  } finally {
    args.setIsCleaningAllLegacyBrowserFields(false);
  }
};

const handleCreateConnection = async (
  args: PlaywrightProgrammableIntegrationPageActionArgs
): Promise<void> => {
  if (args.programmableIntegration === null) {
    args.toast('Create the Playwright (Programmable) integration first.', {
      variant: 'error',
    });
    return;
  }

  args.setConnectionName(`Playwright Connection ${args.connections.length + 1}`);
  args.setListingScript('');
  args.setImportScript('');
  args.setImportBaseUrl('');
  args.setListingActionId('');
  args.setImportActionId('');
  args.setCaptureRoutes([createEmptyProgrammableCaptureRoute(1)]);
  args.setAppearanceMode('');
  args.setFieldMapperRows([]);
  args.setSelectedConnectionId('');

  const created = await saveCurrentConnection(args, false);
  if (created !== null) {
    args.toast('New programmable Playwright connection created.', { variant: 'success' });
  }
};

const handleRunTest = async (
  args: PlaywrightProgrammableIntegrationPageActionArgs,
  scriptType: 'listing' | 'import'
): Promise<void> => {
  args.setRunningTestType(scriptType);
  try {
    const saved = await saveCurrentConnection(args, false);
    if (saved === null) {
      return;
    }

    const response = await api.post<Record<string, unknown>>(
      '/api/v2/integrations/playwright/test',
      { connectionId: saved.id, scriptType }
    );
    args.setTestResultJson(JSON.stringify(response, null, 2));
    args.toast(`${scriptType === 'listing' ? 'Listing' : 'Import'} script test completed.`, {
      variant: 'success',
    });
  } catch (error) {
    logClientError(error);
    const message = getErrorMessage(error, 'Playwright test run failed.');
    args.setTestResultJson(JSON.stringify({ error: message }, null, 2));
    args.toast(message, { variant: 'error' });
  } finally {
    args.setRunningTestType(null);
  }
};

const handleAddFieldMapping = (
  setFieldMapperRows: PlaywrightProgrammableIntegrationPageActionArgs['setFieldMapperRows']
): void => {
  setFieldMapperRows((current: ProgrammableFieldMapperRow[]) => [
    ...current,
    createEmptyProgrammableFieldMapperRow(),
  ]);
};

const handleUpdateFieldMapping = (
  setFieldMapperRows: PlaywrightProgrammableIntegrationPageActionArgs['setFieldMapperRows'],
  rowId: string,
  patch: Partial<Omit<ProgrammableFieldMapperRow, 'id'>>
): void => {
  setFieldMapperRows((current: ProgrammableFieldMapperRow[]) =>
    current.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
  );
};

const handleDeleteFieldMapping = (
  setFieldMapperRows: PlaywrightProgrammableIntegrationPageActionArgs['setFieldMapperRows'],
  rowId: string
): void => {
  setFieldMapperRows((current: ProgrammableFieldMapperRow[]) =>
    current.filter((row) => row.id !== rowId)
  );
};

export const createPlaywrightProgrammableIntegrationPageActions = (
  args: PlaywrightProgrammableIntegrationPageActionArgs
): PlaywrightProgrammableIntegrationPageActions => ({
  handleAddFieldMapping: () => handleAddFieldMapping(args.setFieldMapperRows),
  handleCleanupAllLegacyBrowserFields: () => handleCleanupAllLegacyBrowserFields(args),
  handleCleanupLegacyBrowserFields: () => handleCleanupLegacyBrowserFields(args),
  handleCreateConnection: () => handleCreateConnection(args),
  handleDeleteFieldMapping: (rowId) =>
    handleDeleteFieldMapping(args.setFieldMapperRows, rowId),
  handlePromoteConnectionSettings: () => handlePromoteConnectionSettings(args),
  handleRunTest: (scriptType) => handleRunTest(args, scriptType),
  handleUpdateFieldMapping: (rowId, patch) =>
    handleUpdateFieldMapping(args.setFieldMapperRows, rowId, patch),
  saveCurrentConnection: (showToastOnSuccess) =>
    saveCurrentConnection(args, showToastOnSuccess),
});
