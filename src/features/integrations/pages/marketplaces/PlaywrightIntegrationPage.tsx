'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG } from '@/features/integrations/constants/slugs';
import { PlaywrightManagedRuntimeActionsSection } from '@/features/integrations/components/connections/PlaywrightManagedRuntimeActionsSection';
import { PlaywrightProgrammableSessionPreviewSection } from '@/features/integrations/components/connections/PlaywrightProgrammableSessionPreviewSection';
import {
  useIntegrations,
  usePlaywrightPersonas,
  useProgrammableIntegrationConnections,
} from '@/features/integrations/hooks/useIntegrationQueries';
import { buildIntegrationManagedPlaywrightActionSummaries, resolveIntegrationManagedRuntimeActionKeys } from '@/features/integrations/utils/playwright-managed-actions';
import { buildProgrammableSessionDiagnostics } from '@/features/integrations/utils/playwright-programmable-session-diagnostics';
import { buildProgrammableSessionPreview } from '@/features/integrations/utils/playwright-programmable-session-preview';
import { supportsProgrammableSessionProfile } from '@/features/integrations/utils/playwright-programmable-session-support';
import { useUpsertProgrammableConnection } from '@/features/integrations/hooks/useIntegrationMutations';
import { resolveStepSequencerActionHref } from '@/features/playwright/utils/step-sequencer-action-links';
import { usePlaywrightActions } from '@/shared/hooks/usePlaywrightStepSequencer';
import {
  PLAYWRIGHT_FIELD_MAPPER_TARGET_FIELDS,
  parsePlaywrightFieldMapperJson,
  type PlaywrightFieldMapperTargetField,
} from '@/features/integrations/services/playwright-listing/field-mapper';
import {
  defaultIntegrationConnectionPlaywrightSettings,
} from '@/features/integrations/utils/playwright-connection-settings';
import type { PlaywrightConfigCaptureRoute } from '@/shared/contracts/ai-paths-core/nodes/external-nodes';
import { playwrightConfigCaptureRouteSchema } from '@/shared/contracts/ai-paths-core/nodes/external-nodes';
import type { Integration } from '@/shared/contracts/integrations/base';
import type { ProgrammableIntegrationConnection } from '@/shared/contracts/integrations/connections';
import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';
import { api } from '@/shared/lib/api-client';
import { createEmptyPlaywrightCaptureRoute } from '@/shared/lib/ai-paths/core/playwright/capture-defaults';
import { PlaywrightCaptureRoutesEditor } from '@/shared/ui/playwright/PlaywrightCaptureRoutesEditor';
import { AdminIntegrationsPageLayout } from '@/shared/ui/admin.public';
import { Alert, Button, Card, Input, Textarea, useToast } from '@/shared/ui/primitives.public';
import { FormField, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { LoadingState } from '@/shared/ui/navigation-and-layout.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type PlaywrightIntegrationPageProps = {
  focusSection?: 'script' | 'import' | null;
};

type FieldMapperRow = {
  id: string;
  sourceKey: string;
  targetField: PlaywrightFieldMapperTargetField;
};

const createRowId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `mapper-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const LISTING_SCRIPT_PLACEHOLDER = `export default async function run({ page, input, emit, log }) {
  await page.goto('https://marketplace.example.com/new-listing');
  await page.fill('#title', input.title);
  await page.fill('#price', String(input.price ?? ''));
  await page.click('button[type="submit"]');

  const listingUrl = page.url();
  const externalListingId = listingUrl.split('/').pop() ?? null;
  emit('result', { listingUrl, externalListingId });
}`;

const IMPORT_SCRIPT_PLACEHOLDER = `export default async function run({ page, input, emit, log }) {
  const products = [];

  for (const capture of input.captures ?? []) {
    await page.goto(capture.url);
    const title = await page.locator('h1').first().textContent();
    products.push({ title, sourceUrl: capture.url });
  }

  emit('result', products);
}`;

const parseCaptureRouteConfigJson = (
  rawValue: string | null | undefined
): { routes: PlaywrightConfigCaptureRoute[]; appearanceMode: string } => {
  if (!rawValue?.trim()) {
    return { routes: [], appearanceMode: '' };
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (Array.isArray(parsed)) {
      return {
        routes: parsed
          .map((entry) => playwrightConfigCaptureRouteSchema.safeParse(entry))
          .filter((entry) => entry.success)
          .map((entry) => entry.data),
        appearanceMode: '',
      };
    }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      return {
        routes: Array.isArray(record['routes'])
          ? record['routes']
              .map((entry) => playwrightConfigCaptureRouteSchema.safeParse(entry))
              .filter((entry) => entry.success)
              .map((entry) => entry.data)
          : [],
        appearanceMode:
          typeof record['appearanceMode'] === 'string' ? record['appearanceMode'] : '',
      };
    }
  } catch (error) {
    logClientError(error);
  }

  return { routes: [], appearanceMode: '' };
};

const serializeCaptureRouteConfigJson = ({
  routes,
  appearanceMode,
}: {
  routes: PlaywrightConfigCaptureRoute[];
  appearanceMode: string;
}): string =>
  JSON.stringify({
    routes,
    appearanceMode,
  });

const connectionToFieldMapperRows = (
  connection: ProgrammableIntegrationConnection | null
): FieldMapperRow[] =>
  parsePlaywrightFieldMapperJson(connection?.playwrightFieldMapperJson).map((entry) => ({
    id: createRowId(),
    sourceKey: entry.sourceKey,
    targetField: entry.targetField,
  }));

const serializeFieldMapperRows = (rows: FieldMapperRow[]): string | null => {
  const filtered = rows
    .map((row) => ({
      sourceKey: row.sourceKey.trim(),
      targetField: row.targetField,
    }))
    .filter((row) => row.sourceKey.length > 0);

  return filtered.length > 0 ? JSON.stringify(filtered) : null;
};

const getConnectionOptions = (connections: ProgrammableIntegrationConnection[]) =>
  connections.map((connection) => ({
    value: connection.id,
    label: connection.name,
  }));

const FIELD_TARGET_OPTIONS = PLAYWRIGHT_FIELD_MAPPER_TARGET_FIELDS.map((field) => ({
  value: field,
  label: field,
}));

const buildProgrammableActionOptions = (
  actions: PlaywrightAction[] | undefined,
  defaultLabel: string
): Array<{ value: string; label: string }> => [
  { value: '', label: defaultLabel },
  ...((actions ?? [])
    .filter((action) => supportsProgrammableSessionProfile(action))
    .map((action) => ({
      value: action.id,
      label:
        action.runtimeKey !== null ? `${action.name} (${action.runtimeKey})` : action.name,
    })) as Array<{ value: string; label: string }>),
];

const buildProgrammableConnectionPayload = ({
  connectionName,
  listingScript,
  importScript,
  importBaseUrl,
  listingActionId,
  importActionId,
  captureRoutes,
  appearanceMode,
  fieldMapperRows,
  payloadPatch = {},
}: {
  connectionName: string;
  listingScript: string;
  importScript: string;
  importBaseUrl: string;
  listingActionId: string;
  importActionId: string;
  captureRoutes: PlaywrightConfigCaptureRoute[];
  appearanceMode: string;
  fieldMapperRows: FieldMapperRow[];
  payloadPatch?: Record<string, unknown>;
}): Record<string, unknown> => ({
  name: connectionName.trim() || 'Playwright Connection',
  playwrightListingScript: listingScript.trim() || null,
  playwrightImportScript: importScript.trim() || null,
  playwrightImportBaseUrl: importBaseUrl.trim() || null,
  playwrightListingActionId: listingActionId.trim() || null,
  playwrightImportActionId: importActionId.trim() || null,
  playwrightImportCaptureRoutesJson: serializeCaptureRouteConfigJson({
    routes: captureRoutes,
    appearanceMode,
  }),
  playwrightFieldMapperJson: serializeFieldMapperRows(fieldMapperRows),
  ...payloadPatch,
});

export default function PlaywrightIntegrationPage({
  focusSection = null,
}: PlaywrightIntegrationPageProps): React.JSX.Element {
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
  const managedRuntimeKeys = useMemo(
    () =>
      resolveIntegrationManagedRuntimeActionKeys({
        integrationSlug: PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG,
      }),
    []
  );
  const managedActionSummaries = useMemo(
    () =>
      buildIntegrationManagedPlaywrightActionSummaries({
        actions: playwrightActionsQuery.data ?? [],
        runtimeKeys: managedRuntimeKeys,
      }),
    [managedRuntimeKeys, playwrightActionsQuery.data]
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
  const [fieldMapperRows, setFieldMapperRows] = useState<FieldMapperRow[]>([]);
  const [promotionProxyPassword, setPromotionProxyPassword] = useState('');
  const [testResultJson, setTestResultJson] = useState('');
  const [runningTestType, setRunningTestType] = useState<'listing' | 'import' | null>(null);
  const [isPromotingConnectionSettings, setIsPromotingConnectionSettings] = useState(false);
  const [isCleaningLegacyBrowserFields, setIsCleaningLegacyBrowserFields] = useState(false);
  const [isCleaningAllLegacyBrowserFields, setIsCleaningAllLegacyBrowserFields] = useState(false);

  const selectedConnection =
    connections.find(
      (connection: ProgrammableIntegrationConnection) => connection.id === selectedConnectionId
    ) ??
    null;
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
    [
      listingActionId,
      personaBaseline,
      personasQuery.data,
      playwrightActionsQuery.data,
    ]
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
    [
      importActionId,
      personaBaseline,
      personasQuery.data,
      playwrightActionsQuery.data,
    ]
  );
  const sessionDiagnostics = useMemo(
    () =>
      buildProgrammableSessionDiagnostics({
        listingPreview: listingSessionPreview,
        importPreview: importSessionPreview,
        currentSettings: defaultIntegrationConnectionPlaywrightSettings,
        personaBaseline,
      }),
    [importSessionPreview, listingSessionPreview, personaBaseline]
  );
  const isBrowserBehaviorActionOwned =
    selectedConnection !== null &&
    migrationInfo?.hasLegacyBrowserBehavior !== true;

  useEffect(() => {
    if (!focusSection) return;
    const target =
      focusSection === 'script' ? scriptSectionRef.current : importSectionRef.current;
    target?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [focusSection]);

  useEffect(() => {
    if (!connections.length) {
      if (selectedConnectionId !== '') setSelectedConnectionId('');
      return;
    }

    const currentStillExists = connections.some(
      (connection: ProgrammableIntegrationConnection) => connection.id === selectedConnectionId
    );
    if (!currentStillExists) {
      setSelectedConnectionId(connections[0]?.id ?? '');
    }
  }, [connections, selectedConnectionId]);

  useEffect(() => {
    const captureConfig = parseCaptureRouteConfigJson(
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
    setFieldMapperRows(connectionToFieldMapperRows(selectedConnection));
    setTestResultJson('');
  }, [selectedConnection]);

  const saveCurrentConnection = async (
    showToastOnSuccess: boolean
  ): Promise<ProgrammableIntegrationConnection | null> => {
    if (!programmableIntegration) {
      toast('Playwright (Programmable) integration is not available yet.', { variant: 'error' });
      return null;
    }

    const payload = buildProgrammableConnectionPayload({
      connectionName,
      listingScript,
      importScript,
      importBaseUrl,
      listingActionId,
      importActionId,
      captureRoutes,
      appearanceMode,
      fieldMapperRows,
      payloadPatch:
        isBrowserBehaviorActionOwned && selectedConnection !== null
          ? {
              resetPlaywrightOverrides: true,
            }
          : {},
    });

    try {
      const saved = await upsertConnection.mutateAsync({
        integrationId: programmableIntegration.id,
        ...(selectedConnection ? { connectionId: selectedConnection.id } : {}),
        payload,
      });
      setSelectedConnectionId(saved.id);
      if (showToastOnSuccess) {
        toast('Programmable Playwright connection saved.', { variant: 'success' });
      }
      return saved;
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to save connection.', {
        variant: 'error',
      });
      return null;
    }
  };

  const handlePromoteConnectionSettings = async (): Promise<void> => {
    if (!selectedConnection || migrationInfo === null) {
      toast('Select a programmable connection before promoting its browser settings.', {
        variant: 'error',
      });
      return;
    }

    setIsPromotingConnectionSettings(true);
    try {
      const response = await api.post<{
        connectionId: string;
        listingActionId: string;
        importActionId: string;
        listingDraftActionName: string;
        importDraftActionName: string;
      }>(
        `/api/v2/integrations/connections/${selectedConnection.id}/promote-playwright-browser-ownership`,
        {
          name: connectionName.trim() || 'Playwright Connection',
          playwrightListingScript: listingScript.trim() || null,
          playwrightImportScript: importScript.trim() || null,
          playwrightImportBaseUrl: importBaseUrl.trim() || null,
          playwrightListingActionId: listingActionId.trim() || null,
          playwrightImportActionId: importActionId.trim() || null,
          playwrightImportCaptureRoutesJson: serializeCaptureRouteConfigJson({
            routes: captureRoutes,
            appearanceMode,
          }),
          playwrightFieldMapperJson: serializeFieldMapperRows(fieldMapperRows),
          proxyPassword: promotionProxyPassword.trim() || null,
        }
      );

      setSelectedConnectionId(response.connectionId);
      setListingActionId(response.listingActionId);
      setImportActionId(response.importActionId);
      setPromotionProxyPassword('');
      await Promise.all([
        playwrightActionsQuery.refetch?.(),
        connectionsQuery.refetch?.(),
      ]);
      toast(
        `Promoted browser settings into "${response.listingDraftActionName}" and "${response.importDraftActionName}".`,
        { variant: 'success' }
      );
    } catch (error) {
      logClientError(error);
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to promote programmable browser settings into Step Sequencer drafts.',
        { variant: 'error' }
      );
    } finally {
      setIsPromotingConnectionSettings(false);
    }
  };

  const handleCleanupLegacyBrowserFields = async (): Promise<void> => {
    if (!selectedConnection || migrationInfo === null) {
      toast('Select a programmable connection before clearing stored browser fields.', {
        variant: 'error',
      });
      return;
    }

    setIsCleaningLegacyBrowserFields(true);
    try {
      await api.post<{
        connectionId: string;
        cleaned: boolean;
        playwrightListingActionId: string | null;
        playwrightImportActionId: string | null;
      }>(
        `/api/v2/integrations/connections/${selectedConnection.id}/cleanup-playwright-browser-persistence`,
        {}
      );
      await connectionsQuery.refetch?.();
      toast('Stored programmable browser fields cleared from the connection record.', {
        variant: 'success',
      });
    } catch (error) {
      logClientError(error);
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to clear stored programmable browser fields.',
        { variant: 'error' }
      );
    } finally {
      setIsCleaningLegacyBrowserFields(false);
    }
  };

  const handleCleanupAllLegacyBrowserFields = async (): Promise<void> => {
    if (!programmableIntegration || cleanupReadyConnections.length === 0) {
      toast('No programmable connections are ready for stored browser-field cleanup.', {
        variant: 'error',
      });
      return;
    }

    setIsCleaningAllLegacyBrowserFields(true);
    try {
      const response = await api.post<{
        integrationId: string;
        cleanedCount: number;
        cleanedConnectionIds: string[];
      }>(
        `/api/v2/integrations/${programmableIntegration.id}/connections/cleanup-playwright-browser-persistence`,
        {}
      );
      await connectionsQuery.refetch?.();
      toast(
        `Cleared stored programmable browser fields for ${response.cleanedCount} connections.`,
        { variant: 'success' }
      );
    } catch (error) {
      logClientError(error);
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to clear stored programmable browser fields in bulk.',
        { variant: 'error' }
      );
    } finally {
      setIsCleaningAllLegacyBrowserFields(false);
    }
  };

  const handleCreateConnection = async (): Promise<void> => {
    if (!programmableIntegration) {
      toast('Create the Playwright (Programmable) integration first.', { variant: 'error' });
      return;
    }

    setConnectionName(`Playwright Connection ${connections.length + 1}`);
    setListingScript('');
    setImportScript('');
    setImportBaseUrl('');
    setListingActionId('');
    setImportActionId('');
    setCaptureRoutes([createEmptyPlaywrightCaptureRoute(1)]);
    setAppearanceMode('');
    setFieldMapperRows([]);
    setSelectedConnectionId('');

    const created = await saveCurrentConnection(false);
    if (created) {
      toast('New programmable Playwright connection created.', { variant: 'success' });
    }
  };

  const handleRunTest = async (scriptType: 'listing' | 'import'): Promise<void> => {
    setRunningTestType(scriptType);
    try {
      const saved = await saveCurrentConnection(false);
      if (!saved) return;

      const response = await api.post<Record<string, unknown>>(
        '/api/v2/integrations/playwright/test',
        {
          connectionId: saved.id,
          scriptType,
        }
      );
      setTestResultJson(JSON.stringify(response, null, 2));
      toast(`${scriptType === 'listing' ? 'Listing' : 'Import'} script test completed.`, {
        variant: 'success',
      });
    } catch (error) {
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Playwright test run failed.';
      setTestResultJson(JSON.stringify({ error: message }, null, 2));
      toast(message, { variant: 'error' });
    } finally {
      setRunningTestType(null);
    }
  };

  const handleAddFieldMapping = (): void => {
    setFieldMapperRows((current) => [
      ...current,
      {
        id: createRowId(),
        sourceKey: '',
        targetField: 'title',
      },
    ]);
  };

  const handleUpdateFieldMapping = (
    rowId: string,
    patch: Partial<Omit<FieldMapperRow, 'id'>>
  ): void => {
    setFieldMapperRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    );
  };

  const handleDeleteFieldMapping = (rowId: string): void => {
    setFieldMapperRows((current) => current.filter((row) => row.id !== rowId));
  };

  return (
    <AdminIntegrationsPageLayout
      title='Playwright (Programmable)'
      current='Playwright (Programmable)'
      parent={{ label: 'Marketplaces', href: '/admin/integrations/marketplaces' }}
      description='Configure programmable marketplace scripts, capture routes, field mapping, and the selected Step Sequencer session actions that own browser behavior.'
    >
      {integrationsQuery.isLoading || (programmableIntegration?.id && connectionsQuery.isLoading) ? (
        <LoadingState message='Loading marketplace integrations…' className='py-12' />
      ) : !programmableIntegration ? (
        <Card variant='subtle' padding='md' className='border-border bg-card/40'>
          <div className='space-y-2'>
            <h2 className='text-base font-semibold text-white'>Integration not initialized</h2>
            <p className='text-sm text-gray-400'>
              The <code>playwright-programmable</code> integration does not exist in the current
              database yet. Add it from the integrations setup flow first.
            </p>
          </div>
        </Card>
      ) : (
        <div className='space-y-6'>
          <Card variant='subtle' padding='md' className='border-border bg-card/40'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
              <div className='space-y-2'>
                <h2 className='text-base font-semibold text-white'>Runtime Ownership</h2>
                <p className='text-sm text-gray-400'>
                  The Step Sequencer owns marketplace-native runtime actions like Tradera and
                  Vinted browser flows, including headless or headed mode and
                  <code className='mx-1'>browser_preparation</code> step settings.
                </p>
                <p className='text-sm text-gray-400'>
                  This programmable page owns connection-scoped scripts, import routing, field
                  mapping, and the selected listing or import session action. The Step Sequencer
                  now owns browser mode and browser_preparation for programmable runs too.
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button variant='outline' size='sm' asChild>
                  <Link href='/admin/playwright/step-sequencer'>Open Step Sequencer</Link>
                </Button>
                <Button variant='outline' size='sm' asChild>
                  <Link href='/admin/settings/playwright'>Manage Personas</Link>
                </Button>
              </div>
            </div>
          </Card>

          <PlaywrightManagedRuntimeActionsSection
            description='Programmable listing and import runs now resolve headless or headed mode, browser preference, and browser_preparation step overrides from these Step Sequencer runtime actions.'
            isLoading={playwrightActionsQuery.isPending}
            summaries={managedActionSummaries}
          />

          <Card variant='subtle' padding='md' className='border-border bg-card/40'>
            <div className='grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end'>
              <FormField
                label='Connection'
                description='Each programmable connection stores its own scripts, import routes, field mapping, persona selection, and selected listing or import session actions.'
              >
                <SelectSimple
                  value={selectedConnectionId}
                  onValueChange={setSelectedConnectionId}
                  options={getConnectionOptions(connections)}
                  placeholder={connections.length > 0 ? 'Select connection' : 'No connections yet'}
                  ariaLabel='Programmable Playwright connection'
                  title='Programmable Playwright connection'
                />
              </FormField>
              <div className='flex gap-2'>
                <Button type='button' variant='outline' onClick={() => void handleCreateConnection()}>
                  <Plus className='mr-1.5 h-3.5 w-3.5' />
                  New Connection
                </Button>
                <Button
                  type='button'
                  onClick={() => {
                    void saveCurrentConnection(true);
                  }}
                  loading={
                    !isPromotingConnectionSettings &&
                    upsertConnection.isPending &&
                    runningTestType === null
                  }
                >
                  Save Connection
                </Button>
              </div>
            </div>
          </Card>

          {cleanupReadyConnections.length > 1 ? (
            <Alert variant='warning' className='text-xs'>
              <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                <div className='space-y-2'>
                  <strong>{cleanupReadyConnections.length}</strong> programmable connections
                  already point at their generated Step Sequencer drafts and still carry stale
                  browser fields in the connection record. Clear those stored fields in one pass.
                  <div className='space-y-1 text-[11px] text-amber-100/90'>
                    {cleanupReadyPreviewItems.map((item) => (
                      <div key={item.id}>
                        <button
                          type='button'
                          className='font-semibold underline underline-offset-2 transition hover:text-white'
                          onClick={() => {
                            setSelectedConnectionId(item.id);
                          }}
                        >
                          {item.name}
                        </button>
                        :{' '}
                        <Link
                          href={resolveStepSequencerActionHref(item.listingDraftActionId)}
                          className='underline underline-offset-2 transition hover:text-white'
                        >
                          {item.listingDraftActionName}
                        </Link>{' '}
                        and{' '}
                        <Link
                          href={resolveStepSequencerActionHref(item.importDraftActionId)}
                          className='underline underline-offset-2 transition hover:text-white'
                        >
                          {item.importDraftActionName}
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  type='button'
                  size='sm'
                  onClick={() => {
                    void handleCleanupAllLegacyBrowserFields();
                  }}
                  loading={isCleaningAllLegacyBrowserFields}
                >
                  Clear all safe stored browser fields
                </Button>
              </div>
            </Alert>
          ) : null}

          <Card variant='subtle' padding='md' className='border-border bg-card/40'>
            <div className='grid gap-4 lg:grid-cols-2'>
              <FormField label='Connection Name'>
                <Input
                  value={connectionName}
                  onChange={(event) => setConnectionName(event.target.value)}
                  placeholder='Playwright Connection'
                  aria-label='Playwright connection name'
                />
              </FormField>
              <Alert
                variant={migrationInfo?.hasLegacyBrowserBehavior ? 'warning' : 'info'}
                className='text-xs'
              >
                {migrationInfo?.hasLegacyBrowserBehavior
                  ? 'This connection still has legacy browser behavior stored on the connection model. It is read-only here now. Promote it into action drafts to keep editing browser posture in the Step Sequencer.'
                  : 'This connection no longer owns persona or browser overrides. Browser behavior now comes from the selected listing and import session actions. Edit those actions in the Step Sequencer to change persona, headed or headless mode, browser choice, or browser_preparation.'}
              </Alert>
            </div>

            <div className='mt-4 grid gap-4 lg:grid-cols-2'>
              <FormField
                label='Listing Runtime Action'
                description='Select which Step Sequencer action owns browser mode and browser_preparation for programmable listing runs on this connection.'
              >
                <SelectSimple
                  value={listingActionId}
                  onValueChange={setListingActionId}
                  options={listingActionOptions}
                  ariaLabel='Programmable listing runtime action'
                  title='Programmable listing runtime action'
                />
              </FormField>
              <FormField
                label='Import Runtime Action'
                description='Select which Step Sequencer action owns browser mode and browser_preparation for programmable import runs on this connection.'
              >
                <SelectSimple
                  value={importActionId}
                  onValueChange={setImportActionId}
                  options={importActionOptions}
                  ariaLabel='Programmable import runtime action'
                  title='Programmable import runtime action'
                />
              </FormField>
            </div>

            {isBrowserBehaviorActionOwned ? (
              <p className='mt-4 text-xs text-gray-400'>
                Saving this connection keeps legacy Playwright browser fields cleared. The selected
                session actions remain the only browser-behavior editor for this connection.
              </p>
            ) : null}
          </Card>

          <PlaywrightProgrammableSessionPreviewSection
            diagnostics={sessionDiagnostics}
            listingPreview={listingSessionPreview}
            importPreview={importSessionPreview}
          />

          {migrationInfo?.hasLegacyBrowserBehavior ? (
            <Alert variant='warning' className='text-xs'>
              <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                <div>
                  This programmable connection still stores browser behavior on the connection
                  model: <strong>{migrationInfo.legacySummary.join(', ')}</strong>. The safe
                  {migrationInfo.canCleanupPersistedLegacyBrowserFields
                    ? (
                      <>
                        {' '}cleanup path is to clear those stored fields now. This connection
                        already points at its generated action drafts:
                        {' '}
                        <Link
                          href={resolveStepSequencerActionHref(
                            migrationInfo.listingDraftActionId
                          )}
                          className='font-semibold underline underline-offset-2 transition hover:text-white'
                        >
                          {migrationInfo.listingDraftActionName}
                        </Link>{' '}
                        and{' '}
                        <Link
                          href={resolveStepSequencerActionHref(
                            migrationInfo.importDraftActionId
                          )}
                          className='font-semibold underline underline-offset-2 transition hover:text-white'
                        >
                          {migrationInfo.importDraftActionName}
                        </Link>.
                      </>
                    )
                    : (
                      <>
                        {' '}migration path is to fork the selected session actions into
                        connection-owned drafts and clear the connection-level Playwright settings
                        afterward. Planned drafts:{' '}
                        <Link
                          href={resolveStepSequencerActionHref(
                            migrationInfo.listingDraftActionId
                          )}
                          className='font-semibold underline underline-offset-2 transition hover:text-white'
                        >
                          {migrationInfo.listingDraftActionName}
                        </Link>{' '}
                        and{' '}
                        <Link
                          href={resolveStepSequencerActionHref(
                            migrationInfo.importDraftActionId
                          )}
                          className='font-semibold underline underline-offset-2 transition hover:text-white'
                        >
                          {migrationInfo.importDraftActionName}
                        </Link>.
                      </>
                    )}
                </div>
                {migrationInfo.canCleanupPersistedLegacyBrowserFields ? (
                  <Button
                    type='button'
                    size='sm'
                    onClick={() => {
                      void handleCleanupLegacyBrowserFields();
                    }}
                    loading={isCleaningLegacyBrowserFields}
                  >
                    Clear stored browser fields
                  </Button>
                ) : (
                  <Button
                    type='button'
                    size='sm'
                    onClick={() => {
                      void handlePromoteConnectionSettings();
                    }}
                    disabled={
                      playwrightActionsQuery.isPending ||
                      migrationInfo.requiresManualProxyPasswordInput
                    }
                    loading={isPromotingConnectionSettings}
                  >
                    Promote to action drafts
                  </Button>
                )}
              </div>
              {migrationInfo.requiresManualProxyPasswordInput &&
              !migrationInfo.canCleanupPersistedLegacyBrowserFields ? (
                <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_320px] md:items-end'>
                  <div className='text-[11px] text-amber-200/90'>
                    Re-enter the proxy password before promotion. The stored password is masked in
                    the connection payload and cannot be copied into the action drafts unless you
                    provide it again here.
                  </div>
                  <FormField label='Proxy Password'>
                    <Input
                      type='password'
                      value={promotionProxyPassword}
                      onChange={(event) => setPromotionProxyPassword(event.target.value)}
                      aria-label='Proxy password for promotion'
                    />
                  </FormField>
                </div>
              ) : null}
            </Alert>
          ) : null}

          <div ref={scriptSectionRef}>
            <Card variant='subtle' padding='md' className='border-border bg-card/40'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <h2 className='text-base font-semibold text-white'>Listing Script</h2>
                  <p className='mt-1 text-sm text-gray-400'>
                    Receives one product input and must emit
                    <code className='ml-1'>{'result'}</code> with at least
                    <code className='ml-1'>{'listingUrl'}</code> or
                    <code className='ml-1'>{'externalListingId'}</code>.
                  </p>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    void handleRunTest('listing');
                  }}
                  loading={runningTestType === 'listing'}
                >
                  Test Script
                </Button>
              </div>

              <div className='mt-4 space-y-4'>
                <FormField label='Script'>
                  <Textarea
                    value={listingScript}
                    onChange={(event) => setListingScript(event.target.value)}
                    placeholder={LISTING_SCRIPT_PLACEHOLDER}
                    aria-label='Listing script editor'
                    className='min-h-[320px] font-mono text-xs'
                  />
                </FormField>
              </div>
            </Card>
          </div>

          <div ref={importSectionRef}>
            <Card variant='subtle' padding='md' className='border-border bg-card/40'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <h2 className='text-base font-semibold text-white'>Import Configuration</h2>
                  <p className='mt-1 text-sm text-gray-400'>
                    Capture routes define where the programmable import script navigates before it
                    emits raw product objects.
                  </p>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    void handleRunTest('import');
                  }}
                  loading={runningTestType === 'import'}
                >
                  Test Import
                </Button>
              </div>

              <div className='mt-4 space-y-4'>
                <PlaywrightCaptureRoutesEditor
                  routes={captureRoutes}
                  baseUrl={importBaseUrl}
                  appearanceMode={appearanceMode}
                  onChange={({ routes, baseUrl, appearanceMode: nextAppearanceMode }) => {
                    if (routes) setCaptureRoutes(routes);
                    if (baseUrl !== undefined) setImportBaseUrl(baseUrl);
                    if (nextAppearanceMode !== undefined) setAppearanceMode(nextAppearanceMode);
                  }}
                />

                <FormField label='Import Script'>
                  <Textarea
                    value={importScript}
                    onChange={(event) => setImportScript(event.target.value)}
                    placeholder={IMPORT_SCRIPT_PLACEHOLDER}
                    aria-label='Import script editor'
                    className='min-h-[280px] font-mono text-xs'
                  />
                </FormField>
              </div>
            </Card>
          </div>

          <Card variant='subtle' padding='md' className='border-border bg-card/40'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <h2 className='text-base font-semibold text-white'>Field Mapper</h2>
                <p className='mt-1 text-sm text-gray-400'>
                  Map arbitrary script output keys into normalized product fields before import.
                </p>
              </div>
              <Button type='button' variant='outline' onClick={handleAddFieldMapping}>
                <Plus className='mr-1.5 h-3.5 w-3.5' />
                Add Mapping
              </Button>
            </div>

            <div className='mt-4 space-y-3'>
              {fieldMapperRows.length === 0 ? (
                <div className='rounded-lg border border-dashed border-border/60 px-4 py-6 text-sm text-gray-400'>
                  No field mappings configured. Fallback keys like <code>title</code>,
                  <code className='ml-1'>description</code>, <code className='ml-1'>price</code>,
                  and <code className='ml-1'>images</code> will still be read when present.
                </div>
              ) : (
                fieldMapperRows.map((row) => (
                  <div
                    key={row.id}
                    className='grid gap-3 rounded-lg border border-border/50 bg-background/30 p-3 md:grid-cols-[minmax(0,1fr)_220px_auto]'
                  >
                    <FormField label='Source Key'>
                      <Input
                        value={row.sourceKey}
                        onChange={(event) =>
                          handleUpdateFieldMapping(row.id, { sourceKey: event.target.value })
                        }
                        placeholder='product.title or data.name'
                        aria-label='Field mapper source key'
                      />
                    </FormField>
                    <FormField label='Target Field'>
                      <SelectSimple
                        value={row.targetField}
                        onValueChange={(value) =>
                          handleUpdateFieldMapping(row.id, {
                            targetField: value as PlaywrightFieldMapperTargetField,
                          })
                        }
                        options={FIELD_TARGET_OPTIONS}
                        ariaLabel='Field mapper target field'
                        title='Field mapper target field'
                      />
                    </FormField>
                    <div className='flex items-end'>
                      <Button
                        type='button'
                        variant='ghost'
                        onClick={() => handleDeleteFieldMapping(row.id)}
                      >
                        <Trash2 className='mr-1.5 h-3.5 w-3.5' />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {migrationInfo?.hasLegacyBrowserBehavior ? (
            <Card variant='subtle' padding='md' className='border-border bg-card/40'>
              <div className='space-y-2'>
                <h2 className='text-base font-semibold text-white'>
                  {migrationInfo.canCleanupPersistedLegacyBrowserFields
                    ? 'Stored browser fields can be cleared'
                    : 'Legacy browser settings require promotion'}
                </h2>
                <p className='text-sm text-gray-400'>
                  {migrationInfo.canCleanupPersistedLegacyBrowserFields
                    ? (
                      <>
                        This programmable connection already points at{' '}
                        <Link
                          href={resolveStepSequencerActionHref(
                            migrationInfo.listingDraftActionId
                          )}
                          className='font-semibold underline underline-offset-2 transition hover:text-white'
                        >
                          {migrationInfo.listingDraftActionName}
                        </Link>{' '}
                        and{' '}
                        <Link
                          href={resolveStepSequencerActionHref(
                            migrationInfo.importDraftActionId
                          )}
                          className='font-semibold underline underline-offset-2 transition hover:text-white'
                        >
                          {migrationInfo.importDraftActionName}
                        </Link>. Clear the stored
                        legacy browser fields to finish the ownership cleanup.
                      </>
                    )
                    : (
                      <>
                        Connection-scoped Playwright browser settings are now read-only on the
                        programmable connection. Promote the stored legacy behavior into{' '}
                        <Link
                          href={resolveStepSequencerActionHref(
                            migrationInfo.listingDraftActionId
                          )}
                          className='font-semibold underline underline-offset-2 transition hover:text-white'
                        >
                          {migrationInfo.listingDraftActionName}
                        </Link>{' '}
                        and{' '}
                        <Link
                          href={resolveStepSequencerActionHref(
                            migrationInfo.importDraftActionId
                          )}
                          className='font-semibold underline underline-offset-2 transition hover:text-white'
                        >
                          {migrationInfo.importDraftActionName}
                        </Link>, then continue
                        editing browser posture in the Step Sequencer.
                      </>
                    )}
                </p>
              </div>
            </Card>
          ) : (
            <Card variant='subtle' padding='md' className='border-border bg-card/40'>
              <div className='space-y-2'>
                <h2 className='text-base font-semibold text-white'>
                  Browser behavior owned by selected actions
                </h2>
                <p className='text-sm text-gray-400'>
                  Connection-scoped Playwright persona and override fields are disabled for this
                  connection. Update{' '}
                  <Link
                    href={resolveStepSequencerActionHref(listingSessionPreview.action.id)}
                    className='font-semibold underline underline-offset-2 transition hover:text-white'
                  >
                    {listingSessionPreview.action.name}
                  </Link>{' '}
                  and{' '}
                  <Link
                    href={resolveStepSequencerActionHref(importSessionPreview.action.id)}
                    className='font-semibold underline underline-offset-2 transition hover:text-white'
                  >
                    {importSessionPreview.action.name}
                  </Link>{' '}
                  in the Step Sequencer when you need to change browser posture.
                </p>
              </div>
            </Card>
          )}

          <Card variant='subtle' padding='md' className='border-border bg-card/40'>
            <h2 className='text-base font-semibold text-white'>Last Test Result</h2>
            <p className='mt-1 text-sm text-gray-400'>
              The test API runs the saved script once through the same Playwright runner used by the
              queue.
            </p>
            <pre className='mt-4 overflow-x-auto rounded-lg border border-border/50 bg-background/60 p-4 text-xs text-gray-200'>
              {testResultJson || 'No test run yet.'}
            </pre>
          </Card>
        </div>
      )}
    </AdminIntegrationsPageLayout>
  );
}
