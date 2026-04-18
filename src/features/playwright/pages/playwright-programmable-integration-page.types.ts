import type { Dispatch, RefObject, SetStateAction } from 'react';

import type { Integration } from '@/shared/contracts/integrations/base';
import type { PlaywrightConfigCaptureRoute } from '@/shared/contracts/ai-paths-core/nodes/external-nodes';
import type { usePlaywrightActions } from '@/shared/hooks/usePlaywrightStepSequencer';
import type {
  usePlaywrightProgrammableConnections,
  usePlaywrightProgrammableIntegration,
  useUpsertPlaywrightProgrammableConnection,
} from '@/features/playwright/hooks/usePlaywrightProgrammableIntegration';
import type {
  useCleanupAllPlaywrightBrowserPersistence,
  useCleanupPlaywrightBrowserPersistence,
  usePromotePlaywrightBrowserOwnership,
  useTestPlaywrightProgrammableConnection,
} from '@/features/playwright/hooks/usePlaywrightProgrammableAdminMutations';
import type {
  ProgrammableDraftMapperRow,
  ProgrammableFieldMapperRow,
} from '@/features/playwright/pages/playwright-programmable-integration-page.helpers';
import type { buildManagedPlaywrightActionSummaries } from '@/features/playwright/utils/playwright-managed-runtime-actions';
import type { buildProgrammableSessionDiagnostics } from '@/features/playwright/utils/playwright-programmable-session-diagnostics';
import type { buildProgrammableSessionPreview } from '@/features/playwright/utils/playwright-programmable-session-preview';

export type RunningTestType = 'listing' | 'import' | 'flow' | null;

export type UsePlaywrightProgrammableIntegrationPageModelArgs = {
  focusSection?: 'script' | 'import' | null;
};

export type ProgrammableConnectionsQuery = ReturnType<typeof usePlaywrightProgrammableConnections>;
export type ProgrammableConnection = NonNullable<ProgrammableConnectionsQuery['data']>[number];
export type ProgrammableConnections = NonNullable<ProgrammableConnectionsQuery['data']>;

export type ActionOption = { label: string; value: string };

export type ProgrammableImportSelectionHint = {
  importActionId: string;
  retainedRunId: string | null;
  matchedConnectionId: string | null;
};

export type PlaywrightProgrammableIntegrationPageActions = {
  handleAddDraftMapping: () => void;
  handleAddFieldMapping: () => void;
  handleCleanupAllLegacyBrowserFields: () => Promise<void>;
  handleCleanupLegacyBrowserFields: () => Promise<void>;
  handleCreateConnection: () => Promise<void>;
  handleCreateConnectionFromImportHint: (
    importActionId: string,
    flowMode?: 'preview' | 'draft'
  ) => Promise<void>;
  handleDeleteDraftMapping: (rowId: string) => void;
  handleDeleteFieldMapping: (rowId: string) => void;
  handlePromoteConnectionSettings: () => Promise<void>;
  handleRunFlow: () => Promise<void>;
  handleRunTest: (scriptType: 'listing' | 'import') => Promise<void>;
  handleUpdateDraftMapping: (
    rowId: string,
    patch: Partial<Omit<ProgrammableDraftMapperRow, 'id'>>
  ) => void;
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
  automationFlowJson: string;
  captureRoutes: PlaywrightConfigCaptureRoute[];
  cleanupReadyConnections: ProgrammableConnections;
  cleanupAllBrowserPersistenceMutateAsync: ReturnType<
    typeof useCleanupAllPlaywrightBrowserPersistence
  >['mutateAsync'];
  cleanupBrowserPersistenceMutateAsync: ReturnType<
    typeof useCleanupPlaywrightBrowserPersistence
  >['mutateAsync'];
  connectionName: string;
  connections: ProgrammableConnections;
  connectionsRefetch?: (() => Promise<unknown>) | undefined;
  draftMapperRows: ProgrammableDraftMapperRow[];
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
  promoteBrowserOwnershipMutateAsync: ReturnType<
    typeof usePromotePlaywrightBrowserOwnership
  >['mutateAsync'];
  promotionProxyPassword: string;
  selectedConnection: ProgrammableConnection | null;
  setAppearanceMode: StateSetter<string>;
  setAutomationFlowJson: StateSetter<string>;
  setCaptureRoutes: StateSetter<PlaywrightConfigCaptureRoute[]>;
  setConnectionName: StateSetter<string>;
  setDraftMapperRows: StateSetter<ProgrammableDraftMapperRow[]>;
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
  testProgrammableConnectionMutateAsync: ReturnType<
    typeof useTestPlaywrightProgrammableConnection
  >['mutateAsync'];
  upsertConnectionMutateAsync: (args: {
    connectionId?: string;
    payload: Record<string, unknown>;
  }) => Promise<ProgrammableConnection>;
};

export type PlaywrightProgrammableIntegrationPageModel =
  PlaywrightProgrammableIntegrationPageActions & {
    appearanceMode: string;
    automationFlowJson: string;
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
    cleanupAllBrowserPersistence: ReturnType<typeof useCleanupAllPlaywrightBrowserPersistence>;
    cleanupBrowserPersistence: ReturnType<typeof useCleanupPlaywrightBrowserPersistence>;
    draftMapperRows: ProgrammableDraftMapperRow[];
    fieldMapperRows: ProgrammableFieldMapperRow[];
    importActionId: string;
    importActionOptions: ActionOption[];
    importBaseUrl: string;
    importScript: string;
    importSectionRef: RefObject<HTMLDivElement | null>;
    importSessionPreview: ReturnType<typeof buildProgrammableSessionPreview>;
    integrationsQuery: ReturnType<typeof usePlaywrightProgrammableIntegration>['integrationQuery'];
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
    promoteBrowserOwnership: ReturnType<typeof usePromotePlaywrightBrowserOwnership>;
    programmableIntegration: Integration | null;
    promotionProxyPassword: string;
    runningTestType: RunningTestType;
    scriptSectionRef: RefObject<HTMLDivElement | null>;
    importSelectionHint: ProgrammableImportSelectionHint | null;
    selectedConnection: ProgrammableConnection | null;
    selectedConnectionId: string;
    sessionDiagnostics: ReturnType<typeof buildProgrammableSessionDiagnostics>;
    setAppearanceMode: StateSetter<string>;
    setAutomationFlowJson: StateSetter<string>;
    setCaptureRoutes: StateSetter<PlaywrightConfigCaptureRoute[]>;
    setConnectionName: StateSetter<string>;
    setDraftMapperRows: StateSetter<ProgrammableDraftMapperRow[]>;
    setImportActionId: StateSetter<string>;
    setImportBaseUrl: StateSetter<string>;
    setImportScript: StateSetter<string>;
    setListingActionId: StateSetter<string>;
    setListingScript: StateSetter<string>;
    setPromotionProxyPassword: StateSetter<string>;
    setSelectedConnectionId: StateSetter<string>;
    testResultJson: string;
    testProgrammableConnection: ReturnType<typeof useTestPlaywrightProgrammableConnection>;
    upsertConnection: ReturnType<typeof useUpsertPlaywrightProgrammableConnection>;
  };
