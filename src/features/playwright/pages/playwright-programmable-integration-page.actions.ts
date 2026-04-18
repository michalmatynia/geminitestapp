import {
  buildDraftMapperAutomationFlowTemplate,
  buildDraftMapperPreviewAutomationFlowTemplate,
  buildProgrammableConnectionPayload,
  createEmptyProgrammableDraftMapperRule,
  createEmptyProgrammableCaptureRoute,
  createEmptyProgrammableFieldMapperRow,
  type ProgrammableDraftMapperRow,
  type ProgrammableFieldMapperRow,
} from '@/features/playwright/pages/playwright-programmable-integration-page.helpers';
import type {
  RunningTestType,
  PlaywrightProgrammableIntegrationPageActionArgs,
  PlaywrightProgrammableIntegrationPageActions,
} from '@/features/playwright/pages/playwright-programmable-integration-page.types';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type PlaywrightProgrammableExecutionMode = 'dry_run' | 'commit';

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const createHintedImportDraftMapperRows = (): ProgrammableDraftMapperRow[] => {
  const row = createEmptyProgrammableDraftMapperRule();
  return [
    {
      ...row,
      targetPath: 'name_en',
      mode: 'scraped',
      sourcePath: 'title',
      staticValue: '',
      transform: 'trim',
      required: true,
    },
  ];
};

const createHintedImportAutomationFlowJson = (flowMode: 'preview' | 'draft'): string =>
  flowMode === 'draft'
    ? buildDraftMapperAutomationFlowTemplate()
    : buildDraftMapperPreviewAutomationFlowTemplate();

const buildPromotionPayload = (
  args: Pick<
    PlaywrightProgrammableIntegrationPageActionArgs,
    | 'appearanceMode'
    | 'automationFlowJson'
    | 'captureRoutes'
    | 'connectionName'
    | 'draftMapperRows'
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
    automationFlowJson: args.automationFlowJson,
    draftMapperRows: args.draftMapperRows,
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
    automationFlowJson: args.automationFlowJson,
    draftMapperRows: args.draftMapperRows,
    fieldMapperRows: args.fieldMapperRows,
    payloadPatch:
      args.isBrowserBehaviorActionOwned && args.selectedConnection !== null
        ? { resetPlaywrightOverrides: true }
        : {},
  });

  try {
    const saved = await args.upsertConnectionMutateAsync({
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
    const response = await args.promoteBrowserOwnershipMutateAsync({
      connectionId: args.selectedConnection.id,
      payload: buildPromotionPayload(args),
    });

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
    await args.cleanupBrowserPersistenceMutateAsync({
      connectionId: args.selectedConnection.id,
    });
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
    const response = await args.cleanupAllBrowserPersistenceMutateAsync();
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
  args: PlaywrightProgrammableIntegrationPageActionArgs,
  options: {
    connectionName?: string;
    flowMode?: 'preview' | 'draft';
    importActionId?: string;
  } = {}
): Promise<void> => {
  if (args.programmableIntegration === null) {
    args.toast('Create the Playwright (Programmable) integration first.', {
      variant: 'error',
    });
    return;
  }

  const normalizedHintedImportActionId = options.importActionId?.trim() ?? '';
  const flowMode = options.flowMode ?? 'preview';
  const hintedDraftMapperRows =
    normalizedHintedImportActionId.length > 0 ? createHintedImportDraftMapperRows() : [];
  const hintedAutomationFlowJson =
    normalizedHintedImportActionId.length > 0
      ? createHintedImportAutomationFlowJson(flowMode)
      : '';
  const nextConnectionName =
    options.connectionName?.trim() ??
    (normalizedHintedImportActionId.length > 0
      ? `Import ${normalizedHintedImportActionId}`
      : `Playwright Connection ${args.connections.length + 1}`);

  args.setConnectionName(nextConnectionName);
  args.setListingScript('');
  args.setImportScript('');
  args.setImportBaseUrl('');
  args.setAutomationFlowJson(hintedAutomationFlowJson);
  args.setListingActionId('');
  args.setImportActionId(normalizedHintedImportActionId);
  args.setCaptureRoutes([createEmptyProgrammableCaptureRoute(1)]);
  args.setAppearanceMode('');
  args.setDraftMapperRows(hintedDraftMapperRows);
  args.setFieldMapperRows([]);
  args.setSelectedConnectionId('');

  try {
    const created = await args.upsertConnectionMutateAsync({
      payload: buildProgrammableConnectionPayload({
        connectionName: nextConnectionName,
        listingScript: '',
        importScript: '',
        importBaseUrl: '',
        listingActionId: '',
        importActionId: normalizedHintedImportActionId,
        captureRoutes: [createEmptyProgrammableCaptureRoute(1)],
        appearanceMode: '',
        automationFlowJson: hintedAutomationFlowJson,
        draftMapperRows: hintedDraftMapperRows,
        fieldMapperRows: [],
      }),
    });
    args.setSelectedConnectionId(created.id);
    if (normalizedHintedImportActionId.length > 0 && flowMode === 'preview') {
      args.setRunningTestType('import');
      try {
        const response = await args.testProgrammableConnectionMutateAsync({
          connectionId: created.id,
          executionMode: 'dry_run',
          scriptType: 'import',
        });
        args.setTestResultJson(JSON.stringify(response, null, 2));
        args.toast(
          `New programmable Playwright connection created for import action "${normalizedHintedImportActionId}" and preview run completed.`,
          { variant: 'success' }
        );
      } catch (error) {
        logClientError(error);
        const message = getErrorMessage(error, 'Preview run failed.');
        args.setTestResultJson(JSON.stringify({ error: message }, null, 2));
        args.toast(
          `New programmable Playwright connection created for import action "${normalizedHintedImportActionId}", but preview run failed: ${message}`,
          { variant: 'error' }
        );
      } finally {
        args.setRunningTestType(null);
      }
      return;
    }

    args.toast(
      normalizedHintedImportActionId.length > 0
        ? flowMode === 'draft'
          ? `New programmable Playwright connection created for import action "${normalizedHintedImportActionId}" with a draft-write flow.`
          : `New programmable Playwright connection created for import action "${normalizedHintedImportActionId}".`
        : 'New programmable Playwright connection created.',
      { variant: 'success' }
    );
  } catch (error) {
    logClientError(error);
    args.toast(getErrorMessage(error, 'Failed to create connection.'), {
      variant: 'error',
    });
  }
};

const runProgrammableExecution = async (
  args: PlaywrightProgrammableIntegrationPageActionArgs,
  {
    executionMode,
    failureMessage,
    runningTestType,
    scriptType,
    successMessage,
  }: {
    executionMode: PlaywrightProgrammableExecutionMode;
    failureMessage: string;
    runningTestType: RunningTestType;
    scriptType: 'listing' | 'import';
    successMessage: string;
  }
): Promise<void> => {
  args.setRunningTestType(runningTestType);
  try {
    const saved = await saveCurrentConnection(args, false);
    if (saved === null) {
      return;
    }

    const response = await args.testProgrammableConnectionMutateAsync({
      connectionId: saved.id,
      executionMode,
      scriptType,
    });
    args.setTestResultJson(JSON.stringify(response, null, 2));
    args.toast(successMessage, { variant: 'success' });
  } catch (error) {
    logClientError(error);
    const message = getErrorMessage(error, failureMessage);
    args.setTestResultJson(JSON.stringify({ error: message }, null, 2));
    args.toast(message, { variant: 'error' });
  } finally {
    args.setRunningTestType(null);
  }
};

const handleRunTest = async (
  args: PlaywrightProgrammableIntegrationPageActionArgs,
  scriptType: 'listing' | 'import'
): Promise<void> => {
  const resultLabel = scriptType === 'listing' ? 'Listing' : 'Import';

  await runProgrammableExecution(args, {
    executionMode: 'dry_run',
    failureMessage: 'Playwright test run failed.',
    runningTestType: scriptType,
    scriptType,
    successMessage: `${resultLabel} script test completed.`,
  });
};

const handleRunFlow = async (
  args: PlaywrightProgrammableIntegrationPageActionArgs
): Promise<void> => {
  if (args.automationFlowJson.trim().length === 0) {
    args.toast('Add automation flow JSON before running the import flow.', {
      variant: 'error',
    });
    return;
  }

  await runProgrammableExecution(args, {
    executionMode: 'commit',
    failureMessage: 'Playwright flow run failed.',
    runningTestType: 'flow',
    scriptType: 'import',
    successMessage: 'Import flow run completed.',
  });
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

const handleAddDraftMapping = (
  setDraftMapperRows: PlaywrightProgrammableIntegrationPageActionArgs['setDraftMapperRows']
): void => {
  setDraftMapperRows((current: ProgrammableDraftMapperRow[]) => [
    ...current,
    createEmptyProgrammableDraftMapperRule(),
  ]);
};

const handleUpdateDraftMapping = (
  setDraftMapperRows: PlaywrightProgrammableIntegrationPageActionArgs['setDraftMapperRows'],
  rowId: string,
  patch: Partial<Omit<ProgrammableDraftMapperRow, 'id'>>
): void => {
  setDraftMapperRows((current: ProgrammableDraftMapperRow[]) =>
    current.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
  );
};

const handleDeleteDraftMapping = (
  setDraftMapperRows: PlaywrightProgrammableIntegrationPageActionArgs['setDraftMapperRows'],
  rowId: string
): void => {
  setDraftMapperRows((current: ProgrammableDraftMapperRow[]) =>
    current.filter((row) => row.id !== rowId)
  );
};

export const createPlaywrightProgrammableIntegrationPageActions = (
  args: PlaywrightProgrammableIntegrationPageActionArgs
): PlaywrightProgrammableIntegrationPageActions => ({
  handleAddDraftMapping: () => handleAddDraftMapping(args.setDraftMapperRows),
  handleAddFieldMapping: () => handleAddFieldMapping(args.setFieldMapperRows),
  handleCleanupAllLegacyBrowserFields: () => handleCleanupAllLegacyBrowserFields(args),
  handleCleanupLegacyBrowserFields: () => handleCleanupLegacyBrowserFields(args),
  handleCreateConnection: () => handleCreateConnection(args),
  handleCreateConnectionFromImportHint: (importActionId, flowMode = 'preview') =>
    handleCreateConnection(args, { importActionId, flowMode }),
  handleDeleteDraftMapping: (rowId) =>
    handleDeleteDraftMapping(args.setDraftMapperRows, rowId),
  handleDeleteFieldMapping: (rowId) =>
    handleDeleteFieldMapping(args.setFieldMapperRows, rowId),
  handlePromoteConnectionSettings: () => handlePromoteConnectionSettings(args),
  handleRunFlow: () => handleRunFlow(args),
  handleRunTest: (scriptType) => handleRunTest(args, scriptType),
  handleUpdateDraftMapping: (rowId, patch) =>
    handleUpdateDraftMapping(args.setDraftMapperRows, rowId, patch),
  handleUpdateFieldMapping: (rowId, patch) =>
    handleUpdateFieldMapping(args.setFieldMapperRows, rowId, patch),
  saveCurrentConnection: (showToastOnSuccess) =>
    saveCurrentConnection(args, showToastOnSuccess),
});
