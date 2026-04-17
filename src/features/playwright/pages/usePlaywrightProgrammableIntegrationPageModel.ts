'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG } from '@/features/integrations/constants/slugs';
import {
  useIntegrations,
  useProgrammableIntegrationConnections,
} from '@/features/integrations/hooks/useIntegrationQueries';
import { useUpsertProgrammableConnection } from '@/features/integrations/hooks/useIntegrationMutations';
import {
  buildProgrammableActionOptions,
  connectionToProgrammableFieldMapperRows,
  parseProgrammableCaptureRouteConfigJson,
  type ProgrammableFieldMapperRow,
} from '@/features/playwright/pages/playwright-programmable-integration-page.helpers';
import { createPlaywrightProgrammableIntegrationPageActions } from '@/features/playwright/pages/playwright-programmable-integration-page.actions';
import { usePlaywrightPersonas } from '@/features/playwright/hooks/usePlaywrightPersonas';
import { buildManagedPlaywrightActionSummaries } from '@/features/playwright/utils/playwright-managed-runtime-actions';
import { buildProgrammableSessionDiagnostics } from '@/features/playwright/utils/playwright-programmable-session-diagnostics';
import { buildProgrammableSessionPreview } from '@/features/playwright/utils/playwright-programmable-session-preview';
import { defaultIntegrationConnectionPlaywrightSettings } from '@/features/playwright/utils/playwright-settings-baseline';
import { resolveIntegrationManagedRuntimeActionKeys } from '@/features/integrations/utils/playwright-managed-actions';
import type { PlaywrightConfigCaptureRoute } from '@/shared/contracts/ai-paths-core/nodes/external-nodes';
import type { Integration } from '@/shared/contracts/integrations/base';
import { usePlaywrightActions } from '@/shared/hooks/usePlaywrightStepSequencer';
import { useToast } from '@/shared/ui/primitives.public';

type RunningTestType = 'listing' | 'import' | null;

type UsePlaywrightProgrammableIntegrationPageModelArgs = {
  focusSection?: 'script' | 'import' | null;
};

export type PlaywrightProgrammableIntegrationPageModel = ReturnType<
  typeof createPlaywrightProgrammableIntegrationPageActions
> & {
  appearanceMode: string;
  captureRoutes: PlaywrightConfigCaptureRoute[];
  cleanupReadyConnections: Array<
    NonNullable<ReturnType<typeof useProgrammableIntegrationConnections>['data']>[number]
  >;
  cleanupReadyPreviewItems: Array<{
    id: string;
    importDraftActionId: string;
    importDraftActionName: string;
    listingDraftActionId: string;
    listingDraftActionName: string;
    name: string;
  }>;
  connectionName: string;
  connections: NonNullable<ReturnType<typeof useProgrammableIntegrationConnections>['data']>;
  connectionsQuery: ReturnType<typeof useProgrammableIntegrationConnections>;
  fieldMapperRows: ProgrammableFieldMapperRow[];
  importActionId: string;
  importActionOptions: Array<{ label: string; value: string }>;
  importBaseUrl: string;
  importScript: string;
  importSectionRef: React.RefObject<HTMLDivElement | null>;
  importSessionPreview: ReturnType<typeof buildProgrammableSessionPreview>;
  integrationsQuery: ReturnType<typeof useIntegrations>;
  isBrowserBehaviorActionOwned: boolean;
  isCleaningAllLegacyBrowserFields: boolean;
  isCleaningLegacyBrowserFields: boolean;
  isPromotingConnectionSettings: boolean;
  listingActionId: string;
  listingActionOptions: Array<{ label: string; value: string }>;
  listingScript: string;
  listingSessionPreview: ReturnType<typeof buildProgrammableSessionPreview>;
  managedActionSummaries: ReturnType<typeof buildManagedPlaywrightActionSummaries>;
  migrationInfo: NonNullable<
    NonNullable<ReturnType<typeof useProgrammableIntegrationConnections>['data']>[number]
  >['playwrightLegacyBrowserMigration'] | null;
  playwrightActionsQuery: ReturnType<typeof usePlaywrightActions>;
  programmableIntegration: Integration | null;
  promotionProxyPassword: string;
  runningTestType: RunningTestType;
  scriptSectionRef: React.RefObject<HTMLDivElement | null>;
  selectedConnection:
    | NonNullable<ReturnType<typeof useProgrammableIntegrationConnections>['data']>[number]
    | null;
  selectedConnectionId: string;
  sessionDiagnostics: ReturnType<typeof buildProgrammableSessionDiagnostics>;
  setAppearanceMode: React.Dispatch<React.SetStateAction<string>>;
  setCaptureRoutes: React.Dispatch<React.SetStateAction<PlaywrightConfigCaptureRoute[]>>;
  setConnectionName: React.Dispatch<React.SetStateAction<string>>;
  setImportActionId: React.Dispatch<React.SetStateAction<string>>;
  setImportBaseUrl: React.Dispatch<React.SetStateAction<string>>;
  setImportScript: React.Dispatch<React.SetStateAction<string>>;
  setListingActionId: React.Dispatch<React.SetStateAction<string>>;
  setListingScript: React.Dispatch<React.SetStateAction<string>>;
  setPromotionProxyPassword: React.Dispatch<React.SetStateAction<string>>;
  setSelectedConnectionId: React.Dispatch<React.SetStateAction<string>>;
  testResultJson: string;
  upsertConnection: ReturnType<typeof useUpsertProgrammableConnection>;
};

export function usePlaywrightProgrammableIntegrationPageModel({
  focusSection = null,
}: UsePlaywrightProgrammableIntegrationPageModelArgs): PlaywrightProgrammableIntegrationPageModel {
  const { toast } = useToast();
  const integrationsQuery = useIntegrations();
  const personasQuery = usePlaywrightPersonas();
  const playwrightActionsQuery = usePlaywrightActions();
  const upsertConnection = useUpsertProgrammableConnection();

  const scriptSectionRef = useRef<HTMLDivElement | null>(null);
  const importSectionRef = useRef<HTMLDivElement | null>(null);

  const programmableIntegration =
    integrationsQuery.data?.find(
      (integration: Integration) => integration.slug === PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG
    ) ?? null;
  const connectionsQuery = useProgrammableIntegrationConnections(programmableIntegration?.id, {
    enabled: Boolean(programmableIntegration?.id),
  });
  const connections = connectionsQuery.data ?? [];
  const managedActionSummaries = useMemo(
    () =>
      buildManagedPlaywrightActionSummaries({
        actions: playwrightActionsQuery.data ?? [],
        runtimeKeys: resolveIntegrationManagedRuntimeActionKeys({
          integrationSlug: PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG,
        }),
      }),
    [playwrightActionsQuery.data]
  );
  const listingActionOptions = useMemo(
    () =>
      buildProgrammableActionOptions(
        playwrightActionsQuery.data,
        'Default programmable listing session'
      ),
    [playwrightActionsQuery.data]
  );
  const importActionOptions = useMemo(
    () =>
      buildProgrammableActionOptions(
        playwrightActionsQuery.data,
        'Default programmable import session'
      ),
    [playwrightActionsQuery.data]
  );

  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [connectionName, setConnectionName] = useState('');
  const [listingScript, setListingScript] = useState('');
  const [importScript, setImportScript] = useState('');
  const [importBaseUrl, setImportBaseUrl] = useState('');
  const [listingActionId, setListingActionId] = useState('');
  const [importActionId, setImportActionId] = useState('');
  const [captureRoutes, setCaptureRoutes] = useState<PlaywrightConfigCaptureRoute[]>([]);
  const [appearanceMode, setAppearanceMode] = useState('');
  const [fieldMapperRows, setFieldMapperRows] = useState<ProgrammableFieldMapperRow[]>([]);
  const [promotionProxyPassword, setPromotionProxyPassword] = useState('');
  const [testResultJson, setTestResultJson] = useState('');
  const [runningTestType, setRunningTestType] = useState<RunningTestType>(null);
  const [isPromotingConnectionSettings, setIsPromotingConnectionSettings] = useState(false);
  const [isCleaningLegacyBrowserFields, setIsCleaningLegacyBrowserFields] = useState(false);
  const [isCleaningAllLegacyBrowserFields, setIsCleaningAllLegacyBrowserFields] =
    useState(false);

  const selectedConnection =
    connections.find((connection) => connection.id === selectedConnectionId) ?? null;
  const migrationInfo = selectedConnection?.playwrightLegacyBrowserMigration ?? null;
  const cleanupReadyConnections = useMemo(
    () =>
      connections.filter(
        (connection) =>
          connection.playwrightLegacyBrowserMigration?.canCleanupPersistedLegacyBrowserFields ===
          true
      ),
    [connections]
  );
  const cleanupReadyPreviewItems = useMemo(
    () =>
      cleanupReadyConnections.map((connection) => ({
        id: connection.id,
        name: connection.name,
        listingDraftActionId:
          connection.playwrightLegacyBrowserMigration?.listingDraftActionId ?? '',
        listingDraftActionName:
          connection.playwrightLegacyBrowserMigration?.listingDraftActionName ?? 'Listing draft',
        importDraftActionId:
          connection.playwrightLegacyBrowserMigration?.importDraftActionId ?? '',
        importDraftActionName:
          connection.playwrightLegacyBrowserMigration?.importDraftActionName ?? 'Import draft',
      })),
    [cleanupReadyConnections]
  );
  const personaBaseline = defaultIntegrationConnectionPlaywrightSettings;
  const listingSessionPreview = useMemo(
    () =>
      buildProgrammableSessionPreview({
        actions: playwrightActionsQuery.data,
        selectedActionId: listingActionId,
        defaultRuntimeKey: 'playwright_programmable_listing',
        personaBaseline,
        currentSettings: defaultIntegrationConnectionPlaywrightSettings,
        personas: personasQuery.data,
      }),
    [listingActionId, personasQuery.data, playwrightActionsQuery.data]
  );
  const importSessionPreview = useMemo(
    () =>
      buildProgrammableSessionPreview({
        actions: playwrightActionsQuery.data,
        selectedActionId: importActionId,
        defaultRuntimeKey: 'playwright_programmable_import',
        personaBaseline,
        currentSettings: defaultIntegrationConnectionPlaywrightSettings,
        personas: personasQuery.data,
      }),
    [importActionId, personasQuery.data, playwrightActionsQuery.data]
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
  const isBrowserBehaviorActionOwned =
    selectedConnection !== null && migrationInfo?.hasLegacyBrowserBehavior !== true;

  useEffect(() => {
    if (focusSection === null) {
      return;
    }

    const target =
      focusSection === 'script' ? scriptSectionRef.current : importSectionRef.current;
    target?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [focusSection]);

  useEffect(() => {
    if (connections.length === 0) {
      if (selectedConnectionId !== '') {
        setSelectedConnectionId('');
      }
      return;
    }

    if (!connections.some((connection) => connection.id === selectedConnectionId)) {
      setSelectedConnectionId(connections[0]?.id ?? '');
    }
  }, [connections, selectedConnectionId]);

  useEffect(() => {
    const captureConfig = parseProgrammableCaptureRouteConfigJson(
      selectedConnection?.playwrightImportCaptureRoutesJson
    );

    setConnectionName(selectedConnection?.name ?? '');
    setListingScript(selectedConnection?.playwrightListingScript ?? '');
    setImportScript(selectedConnection?.playwrightImportScript ?? '');
    setImportBaseUrl(selectedConnection?.playwrightImportBaseUrl ?? '');
    setListingActionId(selectedConnection?.playwrightListingActionId ?? '');
    setImportActionId(selectedConnection?.playwrightImportActionId ?? '');
    setCaptureRoutes(captureConfig.routes);
    setAppearanceMode(captureConfig.appearanceMode);
    setFieldMapperRows(connectionToProgrammableFieldMapperRows(selectedConnection));
    setTestResultJson('');
  }, [selectedConnection]);

  const {
    handleAddFieldMapping,
    handleCleanupAllLegacyBrowserFields,
    handleCleanupLegacyBrowserFields,
    handleCreateConnection,
    handleDeleteFieldMapping,
    handlePromoteConnectionSettings,
    handleRunTest,
    handleUpdateFieldMapping,
    saveCurrentConnection,
  } = createPlaywrightProgrammableIntegrationPageActions({
    appearanceMode,
    captureRoutes,
    cleanupReadyConnections,
    connectionName,
    connections,
    fieldMapperRows,
    importActionId,
    importBaseUrl,
    importScript,
    isBrowserBehaviorActionOwned,
    listingActionId,
    listingScript,
    migrationInfo,
    playableActionsRefetch: playwrightActionsQuery.refetch,
    programmableIntegration,
    promotionProxyPassword,
    selectedConnection,
    setAppearanceMode,
    setCaptureRoutes,
    setConnectionName,
    setFieldMapperRows,
    setImportActionId,
    setImportBaseUrl,
    setImportScript,
    setIsCleaningAllLegacyBrowserFields,
    setIsCleaningLegacyBrowserFields,
    setIsPromotingConnectionSettings,
    setListingActionId,
    setListingScript,
    setPromotionProxyPassword,
    setRunningTestType,
    setSelectedConnectionId,
    setTestResultJson,
    toast,
    upsertConnectionMutateAsync: upsertConnection.mutateAsync,
    connectionsRefetch: connectionsQuery.refetch,
  });

  return {
    appearanceMode,
    captureRoutes,
    cleanupReadyConnections,
    cleanupReadyPreviewItems,
    connectionName,
    connections,
    connectionsQuery,
    fieldMapperRows,
    handleAddFieldMapping,
    handleCleanupAllLegacyBrowserFields,
    handleCleanupLegacyBrowserFields,
    handleCreateConnection,
    handleDeleteFieldMapping,
    handlePromoteConnectionSettings,
    handleRunTest,
    handleUpdateFieldMapping,
    importActionId,
    importActionOptions,
    importBaseUrl,
    importScript,
    importSectionRef,
    importSessionPreview,
    integrationsQuery,
    isBrowserBehaviorActionOwned,
    isCleaningAllLegacyBrowserFields,
    isCleaningLegacyBrowserFields,
    isPromotingConnectionSettings,
    listingActionId,
    listingActionOptions,
    listingScript,
    listingSessionPreview,
    managedActionSummaries,
    migrationInfo,
    playwrightActionsQuery,
    programmableIntegration,
    promotionProxyPassword,
    runningTestType,
    saveCurrentConnection,
    scriptSectionRef,
    selectedConnection,
    selectedConnectionId,
    sessionDiagnostics,
    setAppearanceMode,
    setCaptureRoutes,
    setConnectionName,
    setImportActionId,
    setImportBaseUrl,
    setImportScript,
    setListingActionId,
    setListingScript,
    setPromotionProxyPassword,
    setSelectedConnectionId,
    testResultJson,
    upsertConnection,
  };
}
