import {
  buildProgrammableConnectionPayload,
  createEmptyProgrammableCaptureRoute,
  serializeProgrammableCaptureRouteConfigJson,
  serializeProgrammableFieldMapperRows,
  type ProgrammableFieldMapperRow,
} from '@/features/playwright/pages/playwright-programmable-integration-page.helpers';
import type { ProgrammableIntegrationConnection } from '@/shared/contracts/integrations/connections';
import type { PlaywrightConfigCaptureRoute } from '@/shared/contracts/ai-paths-core/nodes/external-nodes';
import { api } from '@/shared/lib/api-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type ToastFn = (message: string, options: { variant: 'error' | 'success' }) => void;

type MutableStateArgs = {
  appearanceMode: string;
  captureRoutes: PlaywrightConfigCaptureRoute[];
  cleanupReadyConnections: ProgrammableIntegrationConnection[];
  connectionName: string;
  connections: ProgrammableIntegrationConnection[];
  fieldMapperRows: ProgrammableFieldMapperRow[];
  importActionId: string;
  importBaseUrl: string;
  importScript: string;
  isBrowserBehaviorActionOwned: boolean;
  listingActionId: string;
  listingScript: string;
  migrationInfo: ProgrammableIntegrationConnection['playwrightLegacyBrowserMigration'] | null;
  playableActionsRefetch?: (() => Promise<unknown>) | undefined;
  programmableIntegration: { id: string } | null;
  promotionProxyPassword: string;
  selectedConnection: ProgrammableIntegrationConnection | null;
  setAppearanceMode: React.Dispatch<React.SetStateAction<string>>;
  setCaptureRoutes: React.Dispatch<React.SetStateAction<PlaywrightConfigCaptureRoute[]>>;
  setConnectionName: React.Dispatch<React.SetStateAction<string>>;
  setFieldMapperRows: React.Dispatch<React.SetStateAction<ProgrammableFieldMapperRow[]>>;
  setImportActionId: React.Dispatch<React.SetStateAction<string>>;
  setImportBaseUrl: React.Dispatch<React.SetStateAction<string>>;
  setImportScript: React.Dispatch<React.SetStateAction<string>>;
  setIsCleaningAllLegacyBrowserFields: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCleaningLegacyBrowserFields: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPromotingConnectionSettings: React.Dispatch<React.SetStateAction<boolean>>;
  setListingActionId: React.Dispatch<React.SetStateAction<string>>;
  setListingScript: React.Dispatch<React.SetStateAction<string>>;
  setPromotionProxyPassword: React.Dispatch<React.SetStateAction<string>>;
  setRunningTestType: React.Dispatch<React.SetStateAction<'listing' | 'import' | null>>;
  setSelectedConnectionId: React.Dispatch<React.SetStateAction<string>>;
  setTestResultJson: React.Dispatch<React.SetStateAction<string>>;
  toast: ToastFn;
  upsertConnectionMutateAsync: (args: {
    connectionId?: string;
    integrationId: string;
    payload: Record<string, unknown>;
  }) => Promise<ProgrammableIntegrationConnection>;
  connectionsRefetch?: (() => Promise<unknown>) | undefined;
};

const buildPromotionPayload = ({
  appearanceMode,
  captureRoutes,
  connectionName,
  fieldMapperRows,
  importActionId,
  importBaseUrl,
  importScript,
  listingActionId,
  listingScript,
  promotionProxyPassword,
}: Pick<
  MutableStateArgs,
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
>): Record<string, unknown> => ({
  ...buildProgrammableConnectionPayload({
    connectionName,
    listingScript,
    importScript,
    importBaseUrl,
    listingActionId,
    importActionId,
    captureRoutes,
    appearanceMode,
    fieldMapperRows,
  }),
  proxyPassword:
    promotionProxyPassword.trim().length > 0 ? promotionProxyPassword.trim() : null,
});

export const createPlaywrightProgrammableIntegrationPageActions = (
  args: MutableStateArgs
) => {
  const saveCurrentConnection = async (
    showToastOnSuccess: boolean
  ): Promise<ProgrammableIntegrationConnection | null> => {
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
      args.toast(error instanceof Error ? error.message : 'Failed to save connection.', {
        variant: 'error',
      });
      return null;
    }
  };

  const handlePromoteConnectionSettings = async (): Promise<void> => {
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
        error instanceof Error
          ? error.message
          : 'Failed to promote programmable browser settings into Step Sequencer drafts.',
        { variant: 'error' }
      );
    } finally {
      args.setIsPromotingConnectionSettings(false);
    }
  };

  const handleCleanupLegacyBrowserFields = async (): Promise<void> => {
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
        error instanceof Error
          ? error.message
          : 'Failed to clear stored programmable browser fields.',
        { variant: 'error' }
      );
    } finally {
      args.setIsCleaningLegacyBrowserFields(false);
    }
  };

  const handleCleanupAllLegacyBrowserFields = async (): Promise<void> => {
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
        error instanceof Error
          ? error.message
          : 'Failed to clear stored programmable browser fields in bulk.',
        { variant: 'error' }
      );
    } finally {
      args.setIsCleaningAllLegacyBrowserFields(false);
    }
  };

  const handleCreateConnection = async (): Promise<void> => {
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

    const created = await saveCurrentConnection(false);
    if (created !== null) {
      args.toast('New programmable Playwright connection created.', { variant: 'success' });
    }
  };

  const handleRunTest = async (scriptType: 'listing' | 'import'): Promise<void> => {
    args.setRunningTestType(scriptType);
    try {
      const saved = await saveCurrentConnection(false);
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
      const message = error instanceof Error ? error.message : 'Playwright test run failed.';
      args.setTestResultJson(JSON.stringify({ error: message }, null, 2));
      args.toast(message, { variant: 'error' });
    } finally {
      args.setRunningTestType(null);
    }
  };

  const handleAddFieldMapping = (): void => {
    args.setFieldMapperRows((current) => [...current, createEmptyFieldMapperRow()]);
  };

  const handleUpdateFieldMapping = (
    rowId: string,
    patch: Partial<Omit<ProgrammableFieldMapperRow, 'id'>>
  ): void => {
    args.setFieldMapperRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    );
  };

  const handleDeleteFieldMapping = (rowId: string): void => {
    args.setFieldMapperRows((current) => current.filter((row) => row.id !== rowId));
  };

  return {
    handleAddFieldMapping,
    handleCleanupAllLegacyBrowserFields,
    handleCleanupLegacyBrowserFields,
    handleCreateConnection,
    handleDeleteFieldMapping,
    handlePromoteConnectionSettings,
    handleRunTest,
    handleUpdateFieldMapping,
    saveCurrentConnection,
  };
};
