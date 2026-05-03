import type {
  IntegrationConnection,
} from '@/shared/contracts/integrations/connections';
import {
  type PlaywrightAction,
} from '@/shared/contracts/playwright-steps';
import {
  buildLegacyBrowserBehaviorSummary,
  buildProgrammableMigrationDraftAction,
  extractConnectionActionExecutionSettings,
  resolveProgrammableBaseAction,
  type ProgrammableConnectionActionMigrationSource,
} from './playwright-programmable-connection-migration.helpers';

export type ProgrammableConnectionActionMigrationPreview = {
  hasLegacyBrowserBehavior: boolean;
  legacySummary: string[];
  requiresManualProxyPasswordInput: boolean;
  listingBaseAction: PlaywrightAction;
  importBaseAction: PlaywrightAction;
  listingDraftAction: PlaywrightAction;
  importDraftAction: PlaywrightAction;
  cleanupPayload: {
    resetPlaywrightOverrides: boolean;
  };
};

export type ProgrammableConnectionLegacyBrowserMigrationSummary = NonNullable<
  IntegrationConnection['playwrightLegacyBrowserMigration']
>;

export const hasProgrammableConnectionLegacyBrowserBehavior = (
  connection: ProgrammableConnectionActionMigrationSource
): boolean => {
  const { personaId, executionSettings } = extractConnectionActionExecutionSettings(connection);
  const hasStoredProxyPassword =
    connection.playwrightProxyHasPassword === true ||
    (typeof connection.playwrightProxyPassword === 'string' &&
      connection.playwrightProxyPassword.trim().length > 0);

  return (
    buildLegacyBrowserBehaviorSummary({
      personaId,
      executionSettings,
      hasStoredProxyPassword,
    }).length > 0
  );
};

const resolveGeneratedDraftActionIds = (
  preview: ProgrammableConnectionActionMigrationPreview
): { importActionId: string; listingActionId: string } => ({
  listingActionId: preview.listingDraftAction.id,
  importActionId: preview.importDraftAction.id,
});

const hasMatchingGeneratedDraftActionIds = ({
  connection,
  preview,
}: {
  connection: ProgrammableConnectionActionMigrationSource;
  preview: ProgrammableConnectionActionMigrationPreview;
}): boolean => {
  const listingActionId = connection.playwrightListingActionId?.trim() ?? '';
  const importActionId = connection.playwrightImportActionId?.trim() ?? '';
  const expectedIds = resolveGeneratedDraftActionIds(preview);

  return (
    listingActionId.length > 0 &&
    importActionId.length > 0 &&
    listingActionId === expectedIds.listingActionId &&
    importActionId === expectedIds.importActionId
  );
};

const hasStoredGeneratedDraftActions = ({
  actions,
  preview,
}: {
  actions: PlaywrightAction[] | undefined;
  preview: ProgrammableConnectionActionMigrationPreview;
}): boolean => {
  const expectedIds = new Set(Object.values(resolveGeneratedDraftActionIds(preview)));
  return (actions ?? []).filter((action) => expectedIds.has(action.id)).length === 2;
};

export const buildProgrammableConnectionActionMigrationPreview = ({
  connection,
  actions,
}: {
  connection: ProgrammableConnectionActionMigrationSource;
  actions: PlaywrightAction[] | undefined;
}): ProgrammableConnectionActionMigrationPreview => {
  const listingBaseAction = resolveProgrammableBaseAction({
    actions,
    selectedActionId: connection.playwrightListingActionId,
    defaultRuntimeKey: 'playwright_programmable_listing',
  });
  const importBaseAction = resolveProgrammableBaseAction({
    actions,
    selectedActionId: connection.playwrightImportActionId,
    defaultRuntimeKey: 'playwright_programmable_import',
  });
  const { personaId, executionSettings } = extractConnectionActionExecutionSettings(connection);
  const hasStoredProxyPassword = connection.playwrightProxyHasPassword === true;
  const legacySummary = buildLegacyBrowserBehaviorSummary({
    personaId,
    executionSettings,
    hasStoredProxyPassword,
  });

  return {
    hasLegacyBrowserBehavior: legacySummary.length > 0,
    legacySummary,
    requiresManualProxyPasswordInput:
      hasStoredProxyPassword && executionSettings.proxyPassword === undefined,
    listingBaseAction,
    importBaseAction,
    listingDraftAction: buildProgrammableMigrationDraftAction({
      baseAction: listingBaseAction,
      connection,
      sessionKind: 'listing',
      personaId,
      executionSettings,
    }),
    importDraftAction: buildProgrammableMigrationDraftAction({
      baseAction: importBaseAction,
      connection,
      sessionKind: 'import',
      personaId,
      executionSettings,
    }),
    cleanupPayload: {
      resetPlaywrightOverrides: legacySummary.length > 0,
    },
  };
};

export const mergePlaywrightActionsWithProgrammableConnectionDrafts = ({
  actions,
  listingDraftAction,
  importDraftAction,
}: {
  actions: PlaywrightAction[] | undefined;
  listingDraftAction: PlaywrightAction;
  importDraftAction: PlaywrightAction;
}): PlaywrightAction[] => {
  const merged = new Map((actions ?? []).map((action) => [action.id, action]));
  merged.set(listingDraftAction.id, listingDraftAction);
  merged.set(importDraftAction.id, importDraftAction);
  return Array.from(merged.values());
};

export const canCleanupProgrammableConnectionLegacyBrowserFields = ({
  connection,
  actions,
}: {
  connection: ProgrammableConnectionActionMigrationSource;
  actions: PlaywrightAction[] | undefined;
}): boolean => {
  const preview = buildProgrammableConnectionActionMigrationPreview({
    connection,
    actions,
  });

  if (!preview.hasLegacyBrowserBehavior) {
    return false;
  }

  if (!hasMatchingGeneratedDraftActionIds({ connection, preview })) {
    return false;
  }

  return hasStoredGeneratedDraftActions({ actions, preview });
};

export const serializeProgrammableConnectionLegacyBrowserMigration = ({
  connection,
  actions,
}: {
  connection: ProgrammableConnectionActionMigrationSource;
  actions: PlaywrightAction[] | undefined;
}): ProgrammableConnectionLegacyBrowserMigrationSummary => {
  const preview = buildProgrammableConnectionActionMigrationPreview({
    connection,
    actions,
  });

  return {
    hasLegacyBrowserBehavior: preview.hasLegacyBrowserBehavior,
    legacySummary: preview.legacySummary,
    requiresManualProxyPasswordInput: preview.requiresManualProxyPasswordInput,
    canCleanupPersistedLegacyBrowserFields:
      canCleanupProgrammableConnectionLegacyBrowserFields({
        connection,
        actions,
      }),
    listingDraftActionId: preview.listingDraftAction.id,
    listingDraftActionName: preview.listingDraftAction.name,
    importDraftActionId: preview.importDraftAction.id,
    importDraftActionName: preview.importDraftAction.name,
  };
};
