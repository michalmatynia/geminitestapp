'use client';

import { useMemo } from 'react';

import { PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG } from '@/shared/lib/integration-slugs';
import { resolveIntegrationManagedRuntimeActionKeys } from '@/features/integrations/utils/playwright-managed-actions';
import { buildProgrammableActionOptions } from '@/features/playwright/pages/playwright-programmable-integration-page.helpers';
import type {
  ActionOption,
  ProgrammableConnection,
  ProgrammableConnections,
} from '@/features/playwright/pages/playwright-programmable-integration-page.types';
import { buildManagedPlaywrightActionSummaries } from '@/features/playwright/utils/playwright-managed-runtime-actions';
import { buildProgrammableSessionDiagnostics } from '@/features/playwright/utils/playwright-programmable-session-diagnostics';
import { buildProgrammableSessionPreview } from '@/features/playwright/utils/playwright-programmable-session-preview';
import { defaultIntegrationConnectionPlaywrightSettings } from '@/features/playwright/utils/playwright-settings-baseline';
import type { PlaywrightPersona } from '@/shared/contracts/playwright';
import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';

const isCleanupReady = (connection: ProgrammableConnection): boolean =>
  connection.playwrightLegacyBrowserMigration?.canCleanupPersistedLegacyBrowserFields === true;

const toCleanupPreviewItem = (
  connection: ProgrammableConnection
): {
  id: string;
  importDraftActionId: string;
  importDraftActionName: string;
  listingDraftActionId: string;
  listingDraftActionName: string;
  name: string;
} => {
  const migration = connection.playwrightLegacyBrowserMigration;

  if (migration === null || migration === undefined) {
    return {
      id: connection.id,
      importDraftActionId: '',
      importDraftActionName: 'Import draft',
      listingDraftActionId: '',
      listingDraftActionName: 'Listing draft',
      name: connection.name,
    };
  }

  return {
    id: connection.id,
    importDraftActionId: migration.importDraftActionId,
    importDraftActionName: migration.importDraftActionName,
    listingDraftActionId: migration.listingDraftActionId,
    listingDraftActionName: migration.listingDraftActionName,
    name: connection.name,
  };
};

const useProgrammableActionOptionsData = (
  playwrightActions: PlaywrightAction[] | undefined
): {
  importActionOptions: ActionOption[];
  listingActionOptions: ActionOption[];
  managedActionSummaries: ReturnType<typeof buildManagedPlaywrightActionSummaries>;
} => {
  const managedActionSummaries = useMemo(
    () =>
      buildManagedPlaywrightActionSummaries({
        actions: playwrightActions ?? [],
        runtimeKeys: resolveIntegrationManagedRuntimeActionKeys({
          integrationSlug: PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG,
        }),
      }),
    [playwrightActions]
  );
  const listingActionOptions = useMemo<ActionOption[]>(
    () =>
      buildProgrammableActionOptions(playwrightActions, 'Default programmable listing session'),
    [playwrightActions]
  );
  const importActionOptions = useMemo<ActionOption[]>(
    () =>
      buildProgrammableActionOptions(playwrightActions, 'Default programmable import session'),
    [playwrightActions]
  );

  return { importActionOptions, listingActionOptions, managedActionSummaries };
};

const useProgrammableSessionPreviewData = ({
  importActionId,
  listingActionId,
  personas,
  playwrightActions,
}: {
  importActionId: string;
  listingActionId: string;
  personas: PlaywrightPersona[] | undefined;
  playwrightActions: PlaywrightAction[] | undefined;
}): {
  importSessionPreview: ReturnType<typeof buildProgrammableSessionPreview>;
  listingSessionPreview: ReturnType<typeof buildProgrammableSessionPreview>;
  sessionDiagnostics: ReturnType<typeof buildProgrammableSessionDiagnostics>;
} => {
  const personaBaseline = defaultIntegrationConnectionPlaywrightSettings;
  const listingSessionPreview = useMemo(
    () =>
      buildProgrammableSessionPreview({
        actions: playwrightActions,
        selectedActionId: listingActionId,
        defaultRuntimeKey: 'playwright_programmable_listing',
        personaBaseline,
        currentSettings: defaultIntegrationConnectionPlaywrightSettings,
        personas,
      }),
    [listingActionId, personas, playwrightActions]
  );
  const importSessionPreview = useMemo(
    () =>
      buildProgrammableSessionPreview({
        actions: playwrightActions,
        selectedActionId: importActionId,
        defaultRuntimeKey: 'playwright_programmable_import',
        personaBaseline,
        currentSettings: defaultIntegrationConnectionPlaywrightSettings,
        personas,
      }),
    [importActionId, personas, playwrightActions]
  );
  const sessionDiagnostics = useMemo(
    () =>
      buildProgrammableSessionDiagnostics({
        listingPreview: listingSessionPreview,
        importPreview: importSessionPreview,
        currentSettings: defaultIntegrationConnectionPlaywrightSettings,
        personaBaseline,
      }),
    [importSessionPreview, listingSessionPreview]
  );

  return { importSessionPreview, listingSessionPreview, sessionDiagnostics };
};

export const usePlaywrightProgrammableIntegrationPageDerivedData = ({
  connections,
  importActionId,
  listingActionId,
  personas,
  playwrightActions,
  selectedConnection,
}: {
  connections: ProgrammableConnections;
  importActionId: string;
  listingActionId: string;
  personas: PlaywrightPersona[] | undefined;
  playwrightActions: PlaywrightAction[] | undefined;
  selectedConnection: ProgrammableConnection | null;
}): {
  cleanupReadyConnections: ProgrammableConnections;
  cleanupReadyPreviewItems: Array<ReturnType<typeof toCleanupPreviewItem>>;
  importActionOptions: ActionOption[];
  importSessionPreview: ReturnType<typeof buildProgrammableSessionPreview>;
  isBrowserBehaviorActionOwned: boolean;
  listingActionOptions: ActionOption[];
  listingSessionPreview: ReturnType<typeof buildProgrammableSessionPreview>;
  managedActionSummaries: ReturnType<typeof buildManagedPlaywrightActionSummaries>;
  migrationInfo: ProgrammableConnection['playwrightLegacyBrowserMigration'] | null;
  sessionDiagnostics: ReturnType<typeof buildProgrammableSessionDiagnostics>;
} => {
  const actionOptionsData = useProgrammableActionOptionsData(playwrightActions);
  const sessionPreviewData = useProgrammableSessionPreviewData({
    importActionId,
    listingActionId,
    personas,
    playwrightActions,
  });
  const cleanupReadyConnections = useMemo(
    () => connections.filter(isCleanupReady),
    [connections]
  );
  const cleanupReadyPreviewItems = useMemo(
    () => cleanupReadyConnections.map(toCleanupPreviewItem),
    [cleanupReadyConnections]
  );
  const migrationInfo = selectedConnection?.playwrightLegacyBrowserMigration ?? null;

  return {
    ...actionOptionsData,
    ...sessionPreviewData,
    cleanupReadyConnections,
    cleanupReadyPreviewItems,
    isBrowserBehaviorActionOwned:
      selectedConnection !== null && migrationInfo?.hasLegacyBrowserBehavior !== true,
    migrationInfo,
  };
};
