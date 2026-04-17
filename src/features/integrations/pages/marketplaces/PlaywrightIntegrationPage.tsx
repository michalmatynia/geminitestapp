'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG } from '@/features/integrations/constants/slugs';
import { PlaywrightManagedRuntimeActionsSection } from '@/features/integrations/components/connections/PlaywrightManagedRuntimeActionsSection';
import { PlaywrightProgrammableSessionPreviewSection } from '@/features/integrations/components/connections/PlaywrightProgrammableSessionPreviewSection';
import {
  useIntegrationConnections,
  useIntegrations,
  usePlaywrightPersonas,
} from '@/features/integrations/hooks/useIntegrationQueries';
import { buildIntegrationManagedPlaywrightActionSummaries, resolveIntegrationManagedRuntimeActionKeys } from '@/features/integrations/utils/playwright-managed-actions';
import {
  buildProgrammableConnectionActionMigrationPreview,
  mergePlaywrightActionsWithProgrammableConnectionDrafts,
  type ProgrammableConnectionActionMigrationSource,
} from '@/features/integrations/utils/playwright-programmable-connection-migration';
import { buildProgrammableSessionDiagnostics } from '@/features/integrations/utils/playwright-programmable-session-diagnostics';
import { buildProgrammableSessionPreview } from '@/features/integrations/utils/playwright-programmable-session-preview';
import { supportsProgrammableSessionProfile } from '@/features/integrations/utils/playwright-programmable-session-support';
import { useUpsertConnection } from '@/features/integrations/hooks/useIntegrationMutations';
import {
  usePlaywrightActions,
  useSavePlaywrightActionsMutation,
} from '@/shared/hooks/usePlaywrightStepSequencer';
import {
  PLAYWRIGHT_FIELD_MAPPER_TARGET_FIELDS,
  parsePlaywrightFieldMapperJson,
  type PlaywrightFieldMapperTargetField,
} from '@/features/integrations/services/playwright-listing/field-mapper';
import { toPlaywrightConnectionOverridePayload } from '@/features/integrations/utils/playwright-connection-payload';
import {
  defaultIntegrationConnectionPlaywrightSettings,
  normalizeIntegrationConnectionPlaywrightPersonaId,
  resolveIntegrationConnectionPlaywrightSettingsWithPersona,
  resolveIntegrationPlaywrightPersonaSettings,
} from '@/features/integrations/utils/playwright-connection-settings';
import { PlaywrightSettingsForm } from '@/shared/ui/playwright/PlaywrightSettingsForm';
import type { PlaywrightConfigCaptureRoute } from '@/shared/contracts/ai-paths-core/nodes/external-nodes';
import { playwrightConfigCaptureRouteSchema } from '@/shared/contracts/ai-paths-core/nodes/external-nodes';
import type { Integration } from '@/shared/contracts/integrations/base';
import type { IntegrationConnection } from '@/shared/contracts/integrations/connections';
import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';
import type { PlaywrightSettings } from '@/shared/contracts/playwright';
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

const connectionToSettings = (
  connection: IntegrationConnection | null,
  personas: Array<{ id: string; settings: PlaywrightSettings }> | undefined
): PlaywrightSettings =>
  resolveIntegrationConnectionPlaywrightSettingsWithPersona(connection, personas);

const connectionToFieldMapperRows = (connection: IntegrationConnection | null): FieldMapperRow[] =>
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

const getConnectionOptions = (connections: IntegrationConnection[]) =>
  connections.map((connection) => ({
    value: connection.id,
    label: connection.name,
  }));

const getPersonaOptions = (
  personas: Array<{ id: string; name: string }> | undefined
): Array<{ value: string; label: string }> => [
  { value: '', label: 'Default engine settings' },
  ...((personas ?? []).map((persona) => ({
    value: persona.id,
    label: persona.name,
  })) as Array<{ value: string; label: string }>),
];

const resolvePlaywrightPersonaBaseline = (
  personas: Array<{ id: string; settings: PlaywrightSettings }> | undefined,
  personaId: string
): PlaywrightSettings =>
  resolveIntegrationPlaywrightPersonaSettings(personas, personaId);

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

const buildEditableProgrammableConnectionMigrationSource = ({
  connection,
  connectionName,
  personaId,
  listingActionId,
  importActionId,
  settings,
  baselineSettings,
}: {
  connection: IntegrationConnection;
  connectionName: string;
  personaId: string;
  listingActionId: string;
  importActionId: string;
  settings: PlaywrightSettings;
  baselineSettings: PlaywrightSettings;
}): ProgrammableConnectionActionMigrationSource => ({
  id: connection.id,
  integrationId: connection.integrationId,
  name: connectionName.trim() || connection.name,
  playwrightPersonaId: personaId.trim() || null,
  playwrightBrowser: connection.playwrightBrowser ?? null,
  playwrightProxyHasPassword: connection.playwrightProxyHasPassword === true,
  playwrightListingActionId: listingActionId.trim() || null,
  playwrightImportActionId: importActionId.trim() || null,
  ...toPlaywrightConnectionOverridePayload({
    settings,
    baselineSettings,
  }),
});

export default function PlaywrightIntegrationPage({
  focusSection = null,
}: PlaywrightIntegrationPageProps): React.JSX.Element {
  const { toast } = useToast();
  const integrationsQuery = useIntegrations();
  const personasQuery = usePlaywrightPersonas();
  const playwrightActionsQuery = usePlaywrightActions();
  const savePlaywrightActions = useSavePlaywrightActionsMutation();
  const upsertConnection = useUpsertConnection();

  const scriptSectionRef = useRef<HTMLDivElement | null>(null);
  const importSectionRef = useRef<HTMLDivElement | null>(null);

  const programmableIntegration =
    integrationsQuery.data?.find(
      (integration: Integration) => integration.slug === PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG
    ) ?? null;
  const connectionsQuery = useIntegrationConnections(programmableIntegration?.id, {
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
  const [personaId, setPersonaId] = useState('');
  const [listingScript, setListingScript] = useState('');
  const [importScript, setImportScript] = useState('');
  const [importBaseUrl, setImportBaseUrl] = useState('');
  const [listingActionId, setListingActionId] = useState('');
  const [importActionId, setImportActionId] = useState('');
  const [captureRoutes, setCaptureRoutes] = useState<PlaywrightConfigCaptureRoute[]>([]);
  const [appearanceMode, setAppearanceMode] = useState('');
  const [fieldMapperRows, setFieldMapperRows] = useState<FieldMapperRow[]>([]);
  const [playwrightSettings, setPlaywrightSettings] = useState<PlaywrightSettings>(
    defaultIntegrationConnectionPlaywrightSettings
  );
  const [testResultJson, setTestResultJson] = useState('');
  const [runningTestType, setRunningTestType] = useState<'listing' | 'import' | null>(null);
  const [isPromotingConnectionSettings, setIsPromotingConnectionSettings] = useState(false);

  const selectedConnection =
    connections.find((connection: IntegrationConnection) => connection.id === selectedConnectionId) ??
    null;
  const personaBaseline = useMemo(
    () => resolvePlaywrightPersonaBaseline(personasQuery.data, personaId.trim()),
    [personaId, personasQuery.data]
  );
  const listingSessionPreview = useMemo(
    () =>
      buildProgrammableSessionPreview({
        actions: playwrightActionsQuery.data,
        selectedActionId: listingActionId,
        defaultRuntimeKey: 'playwright_programmable_listing',
        personaBaseline,
        currentSettings: playwrightSettings,
      }),
    [listingActionId, personaBaseline, playwrightActionsQuery.data, playwrightSettings]
  );
  const importSessionPreview = useMemo(
    () =>
      buildProgrammableSessionPreview({
        actions: playwrightActionsQuery.data,
        selectedActionId: importActionId,
        defaultRuntimeKey: 'playwright_programmable_import',
        personaBaseline,
        currentSettings: playwrightSettings,
      }),
    [importActionId, personaBaseline, playwrightActionsQuery.data, playwrightSettings]
  );
  const sessionDiagnostics = useMemo(
    () =>
      buildProgrammableSessionDiagnostics({
        listingPreview: listingSessionPreview,
        importPreview: importSessionPreview,
        currentSettings: playwrightSettings,
        personaBaseline,
      }),
    [importSessionPreview, listingSessionPreview, personaBaseline, playwrightSettings]
  );
  const editableMigrationConnection = useMemo(
    () =>
      selectedConnection === null
        ? null
        : buildEditableProgrammableConnectionMigrationSource({
            connection: selectedConnection,
            connectionName,
            personaId,
            listingActionId,
            importActionId,
            settings: playwrightSettings,
            baselineSettings: personaBaseline,
          }),
    [
      connectionName,
      importActionId,
      listingActionId,
      personaBaseline,
      personaId,
      playwrightSettings,
      selectedConnection,
    ]
  );
  const migrationPreview = useMemo(
    () =>
      editableMigrationConnection === null
        ? null
        : buildProgrammableConnectionActionMigrationPreview({
            connection: editableMigrationConnection,
            actions: playwrightActionsQuery.data,
          }),
    [editableMigrationConnection, playwrightActionsQuery.data]
  );

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
      (connection: IntegrationConnection) => connection.id === selectedConnectionId
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
    setPersonaId(
      normalizeIntegrationConnectionPlaywrightPersonaId(selectedConnection?.playwrightPersonaId) ??
        ''
    );
    setListingScript(selectedConnection?.playwrightListingScript ?? '');
    setImportScript(selectedConnection?.playwrightImportScript ?? '');
    setImportBaseUrl(selectedConnection?.playwrightImportBaseUrl ?? '');
    setListingActionId(selectedConnection?.playwrightListingActionId ?? '');
    setImportActionId(selectedConnection?.playwrightImportActionId ?? '');
    setCaptureRoutes(captureConfig.routes);
    setAppearanceMode(captureConfig.appearanceMode);
    setFieldMapperRows(connectionToFieldMapperRows(selectedConnection));
    setPlaywrightSettings(connectionToSettings(selectedConnection, personasQuery.data));
    setTestResultJson('');
  }, [personasQuery.data, selectedConnection]);

  const saveCurrentConnection = async (showToastOnSuccess: boolean): Promise<IntegrationConnection | null> => {
    if (!programmableIntegration) {
      toast('Playwright (Programmable) integration is not available yet.', { variant: 'error' });
      return null;
    }

    const settingsPayload = toPlaywrightConnectionOverridePayload({
      settings: playwrightSettings,
      baselineSettings: personaBaseline,
      includeResetFlag: Boolean(selectedConnection),
    });
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
      payloadPatch: {
        playwrightPersonaId: personaId.trim() || null,
        ...settingsPayload,
      },
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
    if (!programmableIntegration || !selectedConnection || !migrationPreview) {
      toast('Select a programmable connection before promoting its browser settings.', {
        variant: 'error',
      });
      return;
    }

    setIsPromotingConnectionSettings(true);
    try {
      await savePlaywrightActions.mutateAsync({
        actions: mergePlaywrightActionsWithProgrammableConnectionDrafts({
          actions: playwrightActionsQuery.data ?? [],
          listingDraftAction: migrationPreview.listingDraftAction,
          importDraftAction: migrationPreview.importDraftAction,
        }),
      });

      const saved = await upsertConnection.mutateAsync({
        integrationId: programmableIntegration.id,
        connectionId: selectedConnection.id,
        payload: buildProgrammableConnectionPayload({
          connectionName,
          listingScript,
          importScript,
          importBaseUrl,
          listingActionId: migrationPreview.listingDraftAction.id,
          importActionId: migrationPreview.importDraftAction.id,
          captureRoutes,
          appearanceMode,
          fieldMapperRows,
          payloadPatch: migrationPreview.cleanupPayload,
        }),
      });

      setSelectedConnectionId(saved.id);
      setPersonaId('');
      setListingActionId(migrationPreview.listingDraftAction.id);
      setImportActionId(migrationPreview.importDraftAction.id);
      setPlaywrightSettings(defaultIntegrationConnectionPlaywrightSettings);
      toast(
        `Promoted browser settings into "${migrationPreview.listingDraftAction.name}" and "${migrationPreview.importDraftAction.name}".`,
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
    setPlaywrightSettings(defaultIntegrationConnectionPlaywrightSettings);
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
      description='Configure programmable marketplace scripts, capture routes, field mapping, selected Step Sequencer session actions, and connection-scoped Playwright overrides.'
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
              <FormField
                label='Connection Persona'
                description='Reuse a shared persona as the baseline for this programmable connection before applying the selected session action and any connection overrides.'
              >
                <SelectSimple
                  value={personaId}
                  onValueChange={(value) => {
                    setPersonaId(value);
                    setPlaywrightSettings(
                      resolvePlaywrightPersonaBaseline(personasQuery.data, value.trim())
                    );
                  }}
                  options={getPersonaOptions(personasQuery.data)}
                  ariaLabel='Playwright persona'
                  title='Playwright persona'
                />
              </FormField>
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
          </Card>

          <PlaywrightProgrammableSessionPreviewSection
            diagnostics={sessionDiagnostics}
            listingPreview={listingSessionPreview}
            importPreview={importSessionPreview}
          />

          {migrationPreview?.hasLegacyBrowserBehavior ? (
            <Alert variant='warning' className='text-xs'>
              <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                <div>
                  This programmable connection still stores browser behavior on the connection
                  model: <strong>{migrationPreview.legacySummary.join(', ')}</strong>. The safe
                  migration path is to fork the selected session actions into connection-owned
                  drafts and clear the connection-level Playwright settings afterward. Planned
                  drafts: <strong>{migrationPreview.listingDraftAction.name}</strong> and{' '}
                  <strong>{migrationPreview.importDraftAction.name}</strong>.
                </div>
                <Button
                  type='button'
                  size='sm'
                  onClick={() => {
                    void handlePromoteConnectionSettings();
                  }}
                  disabled={
                    playwrightActionsQuery.isPending ||
                    migrationPreview.requiresManualProxyPasswordInput
                  }
                  loading={isPromotingConnectionSettings || savePlaywrightActions.isPending}
                >
                  Promote to action drafts
                </Button>
              </div>
              {migrationPreview.requiresManualProxyPasswordInput ? (
                <div className='text-[11px] text-amber-200/90'>
                  Re-enter the proxy password in Programmable Connection Overrides before
                  promotion. The stored password is masked in the connection payload and cannot be
                  copied into the action drafts unless you provide it again here.
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

          <Card variant='subtle' padding='md' className='border-border bg-card/40'>
            <PlaywrightSettingsForm
              settings={playwrightSettings}
              setSettings={setPlaywrightSettings}
              showSave={false}
              title='Programmable Connection Overrides'
              description='These compatibility overrides are applied after the selected persona baseline and the selected listing or import session action. Keep them for connection-specific exceptions; move reusable browser mode and browser_preparation behavior into the Step Sequencer action.'
            />
          </Card>

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
