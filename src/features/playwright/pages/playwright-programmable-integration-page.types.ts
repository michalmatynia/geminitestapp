import type { Dispatch, RefObject, SetStateAction } from 'react';

import type { Integration } from '@/shared/contracts/integrations/base';
import type { PlaywrightConfigCaptureRoute } from '@/shared/contracts/ai-paths-core/nodes/external-nodes';
import { usePlaywrightActions } from '@/shared/hooks/usePlaywrightStepSequencer';
import { useIntegrations, useProgrammableIntegrationConnections } from '@/features/integrations/hooks/useIntegrationQueries';
import { useUpsertProgrammableConnection } from '@/features/integrations/hooks/useIntegrationMutations';
import type { ProgrammableFieldMapperRow } from '@/features/playwright/pages/playwright-programmable-integration-page.helpers';
import { buildManagedPlaywrightActionSummaries } from '@/features/playwright/utils/playwright-managed-runtime-actions';
import { buildProgrammableSessionDiagnostics } from '@/features/playwright/utils/playwright-programmable-session-diagnostics';
import { buildProgrammableSessionPreview } from '@/features/playwright/utils/playwright-programmable-session-preview';

export type RunningTestType = 'listing' | 'import' | null;

export type UsePlaywrightProgrammableIntegrationPageModelArgs = {
  focusSection?: 'script' | 'import' | null;
};

export type ProgrammableConnectionsQuery = ReturnType<typeof useProgrammableIntegrationConnections>;
export type ProgrammableConnection = NonNullable<ProgrammableConnectionsQuery['data']>[number];
export type ProgrammableConnections = NonNullable<ProgrammableConnectionsQuery['data']>;

export type ActionOption = { label: string; value: string };

export type PlaywrightProgrammableIntegrationPageActions = {
  handleAddFieldMapping: () => void;
  handleCleanupAllLegacyBrowserFields: () => Promise<void>;
  handleCleanupLegacyBrowserFields: () => Promise<void>;
  handleCreateConnection: () => Promise<void>;
  handleDeleteFieldMapping: (rowId: string) => void;
  handlePromoteConnectionSettings: () => Promise<void>;
  handleRunTest: (scriptType: 'listing' | 'import') => Promise<void>;
  handleUpdateFieldMapping: (
    rowId: string,
    patch: Partial<Omit<ProgrammableFieldMapperRow, 'id'>>
  ) => void;
  saveCurrentConnection: (
    showToastOnSuccess: boolean
  ) => Promise<ProgrammableConnection | null>;
};

type StateSetter<T> = Dispatch<SetStateAction<T>>;

export type PlaywrightProgrammableIntegrationPageActionArgs = {
  appearanceMode: string;
  captureRoutes: PlaywrightConfigCaptureRoute[];
  cleanupReadyConnections: ProgrammableConnections;
  connectionName: string;
  connections: ProgrammableConnections;
  connectionsRefetch?: (() => Promise<unknown>) | undefined;
  fieldMapperRows: ProgrammableFieldMapperRow[];
  importActionId: string;
  importBaseUrl: string;
  importScript: string;
  isBrowserBehaviorActionOwned: boolean;
  listingActionId: string;
  listingScript: string;
  migrationInfo: ProgrammableConnection['playwrightLegacyBrowserMigration'] | null;
  playableActionsRefetch?: (() => Promise<unknown>) | undefined;
  programmableIntegration: Pick<Integration, 'id'> | null;
  promotionProxyPassword: string;
  selectedConnection: ProgrammableConnection | null;
  setAppearanceMode: StateSetter<string>;
  setCaptureRoutes: StateSetter<PlaywrightConfigCaptureRoute[]>;
  setConnectionName: StateSetter<string>;
  setFieldMapperRows: StateSetter<ProgrammableFieldMapperRow[]>;
  setImportActionId: StateSetter<string>;
  setImportBaseUrl: StateSetter<string>;
  setImportScript: StateSetter<string>;
  setIsCleaningAllLegacyBrowserFields: StateSetter<boolean>;
  setIsCleaningLegacyBrowserFields: StateSetter<boolean>;
  setIsPromotingConnectionSettings: StateSetter<boolean>;
  setListingActionId: StateSetter<string>;
  setListingScript: StateSetter<string>;
  setPromotionProxyPassword: StateSetter<string>;
  setRunningTestType: StateSetter<RunningTestType>;
  setSelectedConnectionId: StateSetter<string>;
  setTestResultJson: StateSetter<string>;
  toast: (message: string, options: { variant: 'error' | 'success' }) => void;
  upsertConnectionMutateAsync: (args: {
    connectionId?: string;
    integrationId: string;
    payload: Record<string, unknown>;
  }) => Promise<ProgrammableConnection>;
};

export type PlaywrightProgrammableIntegrationPageModel =
  PlaywrightProgrammableIntegrationPageActions & {
    appearanceMode: string;
    captureRoutes: PlaywrightConfigCaptureRoute[];
    cleanupReadyConnections: ProgrammableConnections;
    cleanupReadyPreviewItems: Array<{
      id: string;
      importDraftActionId: string;
      importDraftActionName: string;
      listingDraftActionId: string;
      listingDraftActionName: string;
      name: string;
    }>;
    connectionName: string;
    connections: ProgrammableConnections;
    connectionsQuery: ProgrammableConnectionsQuery;
    fieldMapperRows: ProgrammableFieldMapperRow[];
    importActionId: string;
    importActionOptions: ActionOption[];
    importBaseUrl: string;
    importScript: string;
    importSectionRef: RefObject<HTMLDivElement | null>;
    importSessionPreview: ReturnType<typeof buildProgrammableSessionPreview>;
    integrationsQuery: ReturnType<typeof useIntegrations>;
    isBrowserBehaviorActionOwned: boolean;
    isCleaningAllLegacyBrowserFields: boolean;
    isCleaningLegacyBrowserFields: boolean;
    isPromotingConnectionSettings: boolean;
    listingActionId: string;
    listingActionOptions: ActionOption[];
    listingScript: string;
    listingSessionPreview: ReturnType<typeof buildProgrammableSessionPreview>;
    managedActionSummaries: ReturnType<typeof buildManagedPlaywrightActionSummaries>;
    migrationInfo: ProgrammableConnection['playwrightLegacyBrowserMigration'] | null;
    playwrightActionsQuery: ReturnType<typeof usePlaywrightActions>;
    programmableIntegration: Integration | null;
    promotionProxyPassword: string;
    runningTestType: RunningTestType;
    scriptSectionRef: RefObject<HTMLDivElement | null>;
    selectedConnection: ProgrammableConnection | null;
    selectedConnectionId: string;
    sessionDiagnostics: ReturnType<typeof buildProgrammableSessionDiagnostics>;
    setAppearanceMode: StateSetter<string>;
    setCaptureRoutes: StateSetter<PlaywrightConfigCaptureRoute[]>;
    setConnectionName: StateSetter<string>;
    setImportActionId: StateSetter<string>;
    setImportBaseUrl: StateSetter<string>;
    setImportScript: StateSetter<string>;
    setListingActionId: StateSetter<string>;
    setListingScript: StateSetter<string>;
    setPromotionProxyPassword: StateSetter<string>;
    setSelectedConnectionId: StateSetter<string>;
    testResultJson: string;
    upsertConnection: ReturnType<typeof useUpsertProgrammableConnection>;
  };
