'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';

import {
  isTraderaApiIntegrationSlug,
  isTraderaIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import type {
  IntegrationsContextType,
  SessionPayload,
  StepWithResult,
  IntegrationDefinition,
  SaveConnectionOptions,
} from '@/features/integrations/context/integrations-context-types';
import { invalidateIntegrationConnections } from '@/features/integrations/hooks/integrationCache';
import {
  useCreateIntegration,
  useDeleteConnection,
  useUpsertConnection,
  useDisconnectAllegro,
  useTestConnection,
  useBaseApiRequest,
  useAllegroApiRequest,
} from '@/features/integrations/hooks/useIntegrationMutations';
import {
  useConnectionSession,
  useIntegrationConnections,
  useIntegrations,
  usePlaywrightPersonas,
} from '@/features/integrations/hooks/useIntegrationQueries';
import { normalizeSteps } from '@/features/integrations/utils/connections';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { defaultPlaywrightSettings } from '@/shared/lib/playwright';
import type {
  Integration,
  IntegrationConnection,
  TestLogEntry,
} from '@/shared/contracts/integrations';
import type { PlaywrightPersonaDto as PlaywrightPersona } from '@/shared/contracts/playwright';
import { internalError } from '@/shared/errors/app-error';
import { useToast } from '@/shared/ui';

import {
  IntegrationsDataContext,
  type IntegrationsData,
} from './integrations/IntegrationsDataContext';
import {
  IntegrationsFormContext,
  type IntegrationsForm,
} from './integrations/IntegrationsFormContext';
import {
  IntegrationsTestingContext,
  type IntegrationsTesting,
} from './integrations/IntegrationsTestingContext';
import {
  IntegrationsSessionContext,
  type IntegrationsSession,
} from './integrations/IntegrationsSessionContext';
import {
  IntegrationsApiConsoleContext,
  type IntegrationsApiConsole,
} from './integrations/IntegrationsApiConsoleContext';
import {
  IntegrationsActionsContext,
  type IntegrationsActions,
} from './integrations/IntegrationsActionsContext';

export { useIntegrationsData } from './integrations/IntegrationsDataContext';
export { useIntegrationsForm } from './integrations/IntegrationsFormContext';
export { useIntegrationsTesting } from './integrations/IntegrationsTestingContext';
export { useIntegrationsSession } from './integrations/IntegrationsSessionContext';
export { useIntegrationsApiConsole } from './integrations/IntegrationsApiConsoleContext';
export { useIntegrationsActions } from './integrations/IntegrationsActionsContext';

const IntegrationsContext = createContext<IntegrationsContextType | null>(null);

export function useIntegrationsContext(): IntegrationsContextType {
  const context = useContext(IntegrationsContext);
  if (!context) {
    throw internalError('useIntegrationsContext must be used within an IntegrationsProvider');
  }
  return context;
}

const EMPTY_INTEGRATIONS: Integration[] = [];
const EMPTY_CONNECTIONS: IntegrationConnection[] = [];
const EMPTY_PERSONAS: PlaywrightPersona[] = [];

export function IntegrationsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Queries
  const integrationsQuery = useIntegrations();
  const integrations = integrationsQuery.data ?? EMPTY_INTEGRATIONS;
  const integrationsLoading = integrationsQuery.isLoading;

  const [activeIntegration, setActiveIntegration] = useState<Integration | null>(null);
  const connectionsQuery = useIntegrationConnections(activeIntegration?.id);
  const connections = connectionsQuery.data ?? EMPTY_CONNECTIONS;
  const connectionsLoading = connectionsQuery.isLoading;

  const playwrightPersonasQuery = usePlaywrightPersonas();
  const playwrightPersonas = playwrightPersonasQuery.data ?? EMPTY_PERSONAS;
  const playwrightPersonasLoading = playwrightPersonasQuery.isLoading;

  // Mutations
  const createIntegrationMutation = useCreateIntegration();
  const upsertConnectionMutation = useUpsertConnection();
  const deleteConnectionMutation = useDeleteConnection();
  const disconnectAllegroMutation = useDisconnectAllegro();
  const testConnectionMutation = useTestConnection();
  const baseApiRequestMutation = useBaseApiRequest();
  const allegroApiRequestMutation = useAllegroApiRequest();

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  const [connectionToDelete, setConnectionToDelete] = useState<IntegrationConnection | null>(null);

  // Testing State
  const [testLog, setTestLog] = useState<TestLogEntry[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [showTestLogModal, setShowTestLogModal] = useState(false);
  const [showTestErrorModal, setShowTestErrorModal] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testErrorMeta, setTestErrorMeta] = useState<{
    errorId?: string;
    integrationId?: string | null;
    connectionId?: string | null;
  } | null>(null);
  const [showTestSuccessModal, setShowTestSuccessModal] = useState(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<StepWithResult | null>(null);

  // Session State
  const [showSessionModal, setShowSessionModal] = useState(false);
  const activeConnection =
    connections.find(
      (connection: IntegrationConnection) => connection.id === editingConnectionId
    ) ??
    connections[0] ??
    null;

  const sessionQuery = useConnectionSession(activeConnection?.id, {
    enabled: showSessionModal,
  });
  const sessionPayload = sessionQuery.data as SessionPayload | undefined;
  const sessionCookies = sessionPayload?.cookies ?? [];
  const sessionOrigins = sessionPayload?.origins ?? [];
  const sessionUpdatedAt = sessionPayload?.updatedAt ?? null;
  const sessionError = sessionQuery.isError
    ? (sessionQuery.error?.message ?? 'Failed to load session cookies.')
    : (sessionPayload?.error ?? null);

  // Playwright State
  const [playwrightSettings, setPlaywrightSettings] = useState(defaultPlaywrightSettings);
  const [playwrightPersonaId, setPlaywrightPersonaId] = useState<string | null>(null);

  // Allegro State
  const [savingAllegroSandbox, setSavingAllegroSandbox] = useState(false);

  // API Console State (Base)
  const [baseApiMethod, setBaseApiMethod] = useState('getInventories');
  const [baseApiParams, setBaseApiParams] = useState('{}');
  const [baseApiResponse, setBaseApiResponse] = useState<{ data: unknown } | null>(null);
  const [baseApiError, setBaseApiError] = useState<string | null>(null);
  const [baseApiLoading, setBaseApiLoading] = useState(false);

  // API Console State (Allegro)
  const [allegroApiMethod, setAllegroApiMethod] = useState('GET');
  const [allegroApiPath, setAllegroApiPath] = useState('/sale/categories');
  const [allegroApiBody, setAllegroApiBody] = useState('{}');
  const [allegroApiResponse, setAllegroApiResponse] = useState<{
    status: number;
    statusText: string;
    data?: unknown;
    refreshed?: boolean;
  } | null>(null);
  const [allegroApiError, setAllegroApiError] = useState<string | null>(null);
  const [allegroApiLoading, setAllegroApiLoading] = useState(false);

  // Effects
  useEffect(() => {
    const status = searchParams.get('allegro');
    if (!status) return;
    if (status === 'connected') {
      toast('Allegro connected.', { variant: 'success' });
    } else {
      const reason = searchParams.get('reason');
      const message = reason
        ? `Allegro authorization failed: ${reason}`
        : 'Allegro authorization failed.';
      toast(message, { variant: 'error' });
    }
    router.replace('/admin/integrations');
  }, [router, searchParams, toast]);

  useEffect(() => {
    if (!integrationsQuery.isError) return;
    toast(integrationsQuery.error?.message ?? 'Failed to load integrations.', { variant: 'error' });
  }, [integrationsQuery.error, integrationsQuery.isError, toast]);

  useEffect(() => {
    if (!connectionsQuery.isError) return;
    toast(connectionsQuery.error?.message ?? 'Failed to load connections.', { variant: 'error' });
  }, [connectionsQuery.error, connectionsQuery.isError, toast]);

  useEffect(() => {
    if (!activeIntegration) return;
    if (integrations.find((item: Integration) => item.id === activeIntegration.id)) return;
    setActiveIntegration(null);
  }, [activeIntegration, integrations]);

  const refreshConnections = useCallback(
    (integrationId: string): void => {
      void invalidateIntegrationConnections(queryClient, integrationId);
    },
    [queryClient]
  );

  useEffect(() => {
    if (connections.length === 0) {
      setEditingConnectionId(null);
      setPlaywrightSettings(defaultPlaywrightSettings);
      setPlaywrightPersonaId(null);
      return;
    }

    const connection =
      connections.find((item: IntegrationConnection) => item.id === editingConnectionId) ??
      connections[0];
    if (!connection) return;

    if (editingConnectionId !== connection.id) {
      setEditingConnectionId(connection.id);
    }
    setPlaywrightSettings({
      headless: connection.playwrightHeadless ?? defaultPlaywrightSettings.headless,
      slowMo: connection.playwrightSlowMo ?? defaultPlaywrightSettings.slowMo,
      timeout: connection.playwrightTimeout ?? defaultPlaywrightSettings.timeout,
      navigationTimeout:
        connection.playwrightNavigationTimeout ?? defaultPlaywrightSettings.navigationTimeout,
      humanizeMouse: connection.playwrightHumanizeMouse ?? defaultPlaywrightSettings.humanizeMouse,
      mouseJitter: connection.playwrightMouseJitter ?? defaultPlaywrightSettings.mouseJitter,
      clickDelayMin: connection.playwrightClickDelayMin ?? defaultPlaywrightSettings.clickDelayMin,
      clickDelayMax: connection.playwrightClickDelayMax ?? defaultPlaywrightSettings.clickDelayMax,
      inputDelayMin: connection.playwrightInputDelayMin ?? defaultPlaywrightSettings.inputDelayMin,
      inputDelayMax: connection.playwrightInputDelayMax ?? defaultPlaywrightSettings.inputDelayMax,
      actionDelayMin:
        connection.playwrightActionDelayMin ?? defaultPlaywrightSettings.actionDelayMin,
      actionDelayMax:
        connection.playwrightActionDelayMax ?? defaultPlaywrightSettings.actionDelayMax,
      proxyEnabled: connection.playwrightProxyEnabled ?? defaultPlaywrightSettings.proxyEnabled,
      proxyServer: connection.playwrightProxyServer ?? defaultPlaywrightSettings.proxyServer,
      proxyUsername: connection.playwrightProxyUsername ?? defaultPlaywrightSettings.proxyUsername,
      proxyPassword: '',
      emulateDevice: connection.playwrightEmulateDevice ?? defaultPlaywrightSettings.emulateDevice,
      deviceName: connection.playwrightDeviceName ?? defaultPlaywrightSettings.deviceName,
    });
    setPlaywrightPersonaId(connection.playwrightPersonaId ?? null);
  }, [connections, editingConnectionId, setPlaywrightSettings]);

  useEffect(() => {
    const loadPlaywrightUtils = async (): Promise<void> => {
      if (playwrightPersonas.length === 0) {
        setPlaywrightPersonaId(null);
        return;
      }
      if (
        playwrightPersonaId &&
        playwrightPersonas.some((persona: PlaywrightPersona) => persona.id === playwrightPersonaId)
      ) {
        return;
      }
      const { findPlaywrightPersonaMatch } = await import('@/shared/lib/playwright');
      const match = findPlaywrightPersonaMatch(playwrightSettings, playwrightPersonas);
      setPlaywrightPersonaId(match?.id ?? null);
    };
    void loadPlaywrightUtils();
  }, [playwrightPersonas, playwrightSettings, playwrightPersonaId]);

  // Handlers
  const handleIntegrationClick = async (definition: IntegrationDefinition): Promise<void> => {
    const ensureIntegration = async (def: IntegrationDefinition): Promise<Integration | null> => {
      let currentIntegrations = integrations;
      if (!currentIntegrations.length && integrationsQuery.isFetching) {
        const refreshed = await integrationsQuery.refetch();
        currentIntegrations = refreshed.data ?? integrationsQuery.data ?? [];
      }
      const existing = currentIntegrations.find((i: Integration) => i.slug === def.slug);
      if (existing) return existing;
      try {
        return await createIntegrationMutation.mutateAsync({
          name: def.name,
          slug: def.slug,
        });
      } catch (error: unknown) {
        toast((error as Error)?.message ?? `Failed to add ${def.name}`, { variant: 'error' });
        return null;
      }
    };

    const integration = await ensureIntegration(definition);
    if (!integration) return;
    setActiveIntegration(integration);
    refreshConnections(integration.id);
    setIsModalOpen(true);
  };

  const handleSaveConnection = async (
    options?: SaveConnectionOptions
  ): Promise<IntegrationConnection | null> => {
    if (!activeIntegration) return null;
    if (!options?.formData) {
      toast('Connection form data is missing.', { variant: 'error' });
      return null;
    }

    const formData = options.formData;
    const isTraderaIntegration = isTraderaIntegrationSlug(activeIntegration.slug);
    const isTraderaApiIntegration = isTraderaApiIntegrationSlug(activeIntegration.slug);
    const isBaselinkerIntegration = activeIntegration.slug === 'baselinker';
    const requestedConnectionId = options.connectionId?.trim() || null;
    const resolvedConnectionId = requestedConnectionId ?? editingConnectionId;
    const isCreateMode =
      options.mode === 'create' || (options.mode !== 'update' && !resolvedConnectionId);
    const normalizedName = formData.name.trim();
    const normalizedUsername = formData.username.trim();

    if (!normalizedName) {
      toast('Connection name is required.', { variant: 'error' });
      return null;
    }
    if (!isBaselinkerIntegration && !normalizedUsername) {
      toast('Username is required for this integration.', { variant: 'error' });
      return null;
    }
    if (!isCreateMode && !resolvedConnectionId) {
      toast('Connection id is required for update.', { variant: 'error' });
      return null;
    }
    if (isCreateMode && !formData.password.trim()) {
      toast('Password/Token is required.', { variant: 'error' });
      return null;
    }
    if (isTraderaApiIntegration) {
      if (!formData.traderaApiAppId.trim()) {
        toast('Tradera API App ID is required.', { variant: 'error' });
        return null;
      }
      if (!formData.traderaApiUserId.trim()) {
        toast('Tradera API User ID is required.', { variant: 'error' });
        return null;
      }
      if (isCreateMode && !formData.traderaApiAppKey.trim()) {
        toast('Tradera API App Key is required on create.', { variant: 'error' });
        return null;
      }
      if (isCreateMode && !formData.traderaApiToken.trim()) {
        toast('Tradera API token is required on create.', { variant: 'error' });
        return null;
      }
    }
    const normalizedPassword = formData.password.trim();
    const normalizedTraderaApiAppKey = formData.traderaApiAppKey.trim();
    const normalizedTraderaApiToken = formData.traderaApiToken.trim();
    const traderaApiAppId = Number.parseInt(formData.traderaApiAppId, 10);
    const traderaApiUserId = Number.parseInt(formData.traderaApiUserId, 10);
    const payload = {
      name: normalizedName,
      username: normalizedUsername,
      ...(normalizedPassword ? { password: normalizedPassword } : {}),
      ...(isTraderaIntegration
        ? {
            traderaDefaultTemplateId: formData.traderaDefaultTemplateId.trim() || null,
            traderaDefaultDurationHours: Math.max(
              1,
              Math.min(720, Math.floor(formData.traderaDefaultDurationHours))
            ),
            traderaAutoRelistEnabled: formData.traderaAutoRelistEnabled,
            traderaAutoRelistLeadMinutes: Math.max(
              0,
              Math.min(10080, Math.floor(formData.traderaAutoRelistLeadMinutes))
            ),
          }
        : {}),
      ...(isTraderaApiIntegration
        ? {
            ...(Number.isFinite(traderaApiAppId) && traderaApiAppId > 0 ? { traderaApiAppId } : {}),
            ...(normalizedTraderaApiAppKey ? { traderaApiAppKey: normalizedTraderaApiAppKey } : {}),
            traderaApiPublicKey: formData.traderaApiPublicKey.trim() || null,
            ...(Number.isFinite(traderaApiUserId) && traderaApiUserId > 0
              ? { traderaApiUserId }
              : {}),
            ...(normalizedTraderaApiToken ? { traderaApiToken: normalizedTraderaApiToken } : {}),
            traderaApiSandbox: formData.traderaApiSandbox,
          }
        : {}),
    };
    try {
      const saved = await upsertConnectionMutation.mutateAsync({
        integrationId: activeIntegration.id,
        ...(!isCreateMode ? { connectionId: resolvedConnectionId } : {}),
        payload,
      });
      if (!isCreateMode) {
        setEditingConnectionId(saved.id);
      }
      return saved;
    } catch (error: unknown) {
      toast((error as Error)?.message ?? 'Failed to save connection.', { variant: 'error' });
      return null;
    }
  };

  const handleDeleteConnection = useCallback((connection: IntegrationConnection): void => {
    setConnectionToDelete(connection);
  }, []);

  const handleConfirmDeleteConnection = async (userPassword: string): Promise<boolean> => {
    if (!connectionToDelete) return false;

    const normalizedPassword = userPassword.trim();
    if (!normalizedPassword) {
      toast('Password is required to delete this connection.', { variant: 'error' });
      return false;
    }

    try {
      await deleteConnectionMutation.mutateAsync({
        integrationId: connectionToDelete.integrationId,
        connectionId: connectionToDelete.id,
        userPassword: normalizedPassword,
      });
      if (editingConnectionId === connectionToDelete.id) {
        setEditingConnectionId(null);
      }
      setConnectionToDelete(null);
      return true;
    } catch (error: unknown) {
      toast((error as Error)?.message ?? 'Failed to delete connection.', { variant: 'error' });
      return false;
    }
  };

  const handleConnectionTest = React.useCallback(
    async (
      connection: IntegrationConnection,
      type: 'test' | 'base/test' | 'allegro/test',
      title: string,
      options?: {
        body?: Record<string, unknown>;
        timeoutMs?: number;
      }
    ): Promise<void> => {
      if (!activeIntegration) return;
      setIsTesting(true);
      setTestLog([]);
      setSelectedStep(null);
      setShowTestLogModal(false);
      setShowTestErrorModal(false);
      setTestError(null);
      setTestErrorMeta(null);
      setShowTestSuccessModal(false);
      setTestSuccessMessage(null);

      const requestUrl = `/api/integrations/${activeIntegration.id}/connections/${connection.id}/${type}`;
      const startedAt = performance.now();

      try {
        const payload = await testConnectionMutation.mutateAsync({
          integrationId: activeIntegration.id,
          connectionId: connection.id,
          type,
          ...(options?.body ? { body: options.body } : {}),
          ...(typeof options?.timeoutMs === 'number' ? { timeoutMs: options.timeoutMs } : {}),
        });

        const normalizedSteps = normalizeSteps((payload.steps as unknown[]) || []);
        if (normalizedSteps.length) setTestLog(normalizedSteps);

        const durationMs = Math.round(performance.now() - startedAt);
        let extraInfo = '';
        if (type === 'base/test' && payload['inventoryCount'] !== undefined) {
          extraInfo = `\nInventories found: ${String(payload['inventoryCount'])}`;
        } else if (type === 'allegro/test' && payload.profile) {
          const profile = payload.profile as Record<string, unknown>;
          const login = (profile['login'] as string) ?? '';
          const name = (profile['name'] as string) ?? '';
          const identifier = name || login;
          if (identifier) extraInfo = `\nAccount: ${identifier}`;
        }

        setTestSuccessMessage(
          `${title} succeeded.\nURL: ${requestUrl}\nDuration: ${durationMs}ms${extraInfo}`
        );
        setShowTestSuccessModal(true);
        refreshConnections(activeIntegration.id);
      } catch (error: unknown) {
        const durationMs = Math.round(performance.now() - startedAt);
        const message = (error as Error)?.message ?? 'Unknown error';
        const data = (error as Record<string, unknown>)['data'] as
          | Record<string, unknown>
          | undefined;

        let errorMessage = `${title} failed.\nURL: ${requestUrl}\nDuration: ${durationMs}ms\nError: ${message}`;

        if (data) {
          const normalizedSteps = normalizeSteps((data['steps'] as unknown[]) || []);
          const failedStep = normalizedSteps.find((s: TestLogEntry) => s.status === 'failed');
          const failedStepDetail = failedStep?.detail || '';
          const errorBody = (data['error'] as string) || failedStepDetail || 'No response body';
          errorMessage = `${title} failed.\nURL: ${requestUrl}\nDuration: ${durationMs}ms\n\nResponse:\n${errorBody}`;

          const steps = normalizedSteps.length
            ? normalizedSteps.map((s: TestLogEntry) =>
                s.status === 'failed' && !s.detail ? { ...s, detail: errorMessage } : s
              )
            : [
                {
                  step: `${title} failed`,
                  status: 'failed' as const,
                  timestamp: new Date().toISOString(),
                  detail: errorMessage,
                },
              ];

          setTestLog(steps);
          setTestErrorMeta({
            errorId: data['errorId'] as string,
            integrationId: data['integrationId'] as string,
            connectionId: data['connectionId'] as string,
          });
        } else {
          setTestLog([
            {
              step: `${title} failed`,
              status: 'failed' as const,
              timestamp: new Date().toISOString(),
              detail: errorMessage,
            },
          ]);
        }

        setTestError(errorMessage);
        setShowTestErrorModal(true);
      } finally {
        setIsTesting(false);
      }
    },
    [activeIntegration, testConnectionMutation, refreshConnections]
  );

  const handleBaselinkerTest = (c: IntegrationConnection) =>
    handleConnectionTest(c, 'base/test', 'Baselinker connection test');
  const handleAllegroTest = (c: IntegrationConnection) =>
    handleConnectionTest(c, 'allegro/test', 'Allegro connection test');
  const handleTestConnection = (c: IntegrationConnection) =>
    handleConnectionTest(c, 'test', 'Connection test');
  const handleTraderaManualLogin = (c: IntegrationConnection) =>
    handleConnectionTest(c, 'test', 'Manual login test', {
      body: { mode: 'manual', manualTimeoutMs: 240000 },
      timeoutMs: 300000,
    });

  const handleSelectPlaywrightPersona = async (personaId: string | null): Promise<void> => {
    if (!personaId) {
      setPlaywrightPersonaId(null);
      return;
    }
    const persona = playwrightPersonas.find((p: PlaywrightPersona) => p.id === personaId);
    if (!persona) return;
    const { buildPlaywrightSettings } = await import('@/shared/lib/playwright');
    setPlaywrightPersonaId(persona.id);
    setPlaywrightSettings(buildPlaywrightSettings(persona.settings));
    toast(`Applied persona "${persona.name}".`, { variant: 'success' });
  };

  const handleSavePlaywrightSettings = async (): Promise<void> => {
    const connection = activeConnection;
    if (!connection) return;
    try {
      await upsertConnectionMutation.mutateAsync({
        integrationId: activeIntegration?.id ?? connection.integrationId,
        connectionId: connection.id,
        payload: {
          name: connection.name,
          username: connection.username,
          playwrightPersonaId,
          ...playwrightSettings,
          proxyPassword: playwrightSettings.proxyPassword,
        } as Record<string, unknown>,
      });
      toast('Playwright settings saved.', { variant: 'success' });
    } catch (error: unknown) {
      toast((error as Error)?.message ?? 'Failed to save Playwright settings.', {
        variant: 'error',
      });
    }
  };

  const handleAllegroAuthorize = (): void => {
    if (!activeIntegration || !activeConnection) {
      toast('Create an Allegro connection first.', { variant: 'error' });
      return;
    }
    window.location.href = `/api/integrations/${activeIntegration.id}/connections/${activeConnection.id}/allegro/authorize`;
  };

  const handleAllegroDisconnect = async (): Promise<void> => {
    if (!activeIntegration || !activeConnection) return;
    try {
      await disconnectAllegroMutation.mutateAsync({
        integrationId: activeIntegration.id,
        connectionId: activeConnection.id,
      });
      toast('Allegro disconnected.', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error, {
        context: { source: 'IntegrationsContext', action: 'disconnectAllegro' },
      });
      toast('Failed to disconnect Allegro.', { variant: 'error' });
    }
  };

  const handleAllegroSandboxToggle = async (value: boolean): Promise<void> => {
    if (!activeConnection) return;
    if (savingAllegroSandbox) return;
    setSavingAllegroSandbox(true);
    try {
      await upsertConnectionMutation.mutateAsync({
        integrationId: activeIntegration?.id ?? activeConnection.integrationId,
        connectionId: activeConnection.id,
        payload: {
          name: activeConnection.name,
          username: activeConnection.username,
          allegroUseSandbox: value,
        },
      });
      toast('Allegro sandbox setting updated.', { variant: 'success' });
    } catch (error: unknown) {
      toast((error as Error)?.message ?? 'Failed to update Allegro sandbox setting.', {
        variant: 'error',
      });
    } finally {
      setSavingAllegroSandbox(false);
    }
  };

  const handleAllegroSandboxConnect = async (): Promise<void> => {
    if (!activeIntegration || !activeConnection) {
      toast('Create an Allegro connection first.', { variant: 'error' });
      return;
    }
    if (savingAllegroSandbox) return;
    setSavingAllegroSandbox(true);
    try {
      await upsertConnectionMutation.mutateAsync({
        integrationId: activeIntegration.id,
        connectionId: activeConnection.id,
        payload: {
          name: activeConnection.name,
          username: activeConnection.username,
          allegroUseSandbox: true,
        },
      });
      window.location.href = `/api/integrations/${activeIntegration.id}/connections/${activeConnection.id}/allegro/authorize`;
    } catch (error: unknown) {
      toast((error as Error)?.message ?? 'Failed to enable Allegro sandbox.', { variant: 'error' });
    } finally {
      setSavingAllegroSandbox(false);
    }
  };

  const handleBaseApiRequest = async (): Promise<void> => {
    if (!activeIntegration || !activeConnection) {
      toast('Create a Base.com connection first.', { variant: 'error' });
      return;
    }
    let params: Record<string, unknown> = {};
    try {
      if (baseApiParams.trim()) params = JSON.parse(baseApiParams) as Record<string, unknown>;
    } catch {
      toast('Parameters must be valid JSON.', { variant: 'error' });
      return;
    }
    setBaseApiLoading(true);
    setBaseApiError(null);
    setBaseApiResponse(null);
    try {
      const payload = await baseApiRequestMutation.mutateAsync({
        integrationId: activeIntegration.id,
        connectionId: activeConnection.id,
        method: baseApiMethod,
        parameters: params,
      });
      setBaseApiResponse({ data: payload.data });
    } catch (error: unknown) {
      setBaseApiError((error as Error)?.message ?? 'Failed to send request.');
    } finally {
      setBaseApiLoading(false);
    }
  };

  const handleAllegroApiRequest = async (): Promise<void> => {
    if (!activeIntegration || !activeConnection) {
      toast('Select an integration connection first.', { variant: 'error' });
      return;
    }
    let body: unknown = undefined;
    if (allegroApiMethod !== 'GET' && allegroApiBody.trim()) {
      try {
        body = JSON.parse(allegroApiBody);
      } catch {
        toast('Request body must be valid JSON.', { variant: 'error' });
        return;
      }
    }
    setAllegroApiLoading(true);
    setAllegroApiError(null);
    setAllegroApiResponse(null);
    try {
      const payload = await allegroApiRequestMutation.mutateAsync({
        integrationId: activeIntegration.id,
        connectionId: activeConnection.id,
        method: allegroApiMethod,
        path: allegroApiPath,
        body,
      });
      setAllegroApiResponse(payload);
    } catch (error: unknown) {
      setAllegroApiError((error as Error)?.message ?? 'Failed to send request.');
    } finally {
      setAllegroApiLoading(false);
    }
  };

  const onCloseModal = () => setIsModalOpen(false);
  const onOpenSessionModal = () => setShowSessionModal(true);

  const dataValue = useMemo<IntegrationsData>(
    () => ({
      integrations,
      integrationsLoading,
      activeIntegration,
      setActiveIntegration,
      connections,
      connectionsLoading,
      playwrightPersonas,
      playwrightPersonasLoading,
    }),
    [
      integrations,
      integrationsLoading,
      activeIntegration,
      connections,
      connectionsLoading,
      playwrightPersonas,
      playwrightPersonasLoading,
    ]
  );

  const formValue = useMemo<IntegrationsForm>(
    () => ({
      isModalOpen,
      setIsModalOpen,
      editingConnectionId,
      setEditingConnectionId,
      connectionToDelete,
      setConnectionToDelete,
      playwrightSettings,
      setPlaywrightSettings,
      playwrightPersonaId,
      savingAllegroSandbox,
    }),
    [
      isModalOpen,
      editingConnectionId,
      connectionToDelete,
      playwrightSettings,
      playwrightPersonaId,
      savingAllegroSandbox,
    ]
  );

  const testingValue = useMemo<IntegrationsTesting>(
    () => ({
      isTesting,
      testLog,
      showTestLogModal,
      setShowTestLogModal,
      selectedStep,
      setSelectedStep,
      showTestErrorModal,
      setShowTestErrorModal,
      testError,
      testErrorMeta,
      showTestSuccessModal,
      setShowTestSuccessModal,
      testSuccessMessage,
    }),
    [
      isTesting,
      testLog,
      showTestLogModal,
      selectedStep,
      showTestErrorModal,
      testError,
      testErrorMeta,
      showTestSuccessModal,
      testSuccessMessage,
    ]
  );

  const sessionValue = useMemo<IntegrationsSession>(
    () => ({
      showSessionModal,
      setShowSessionModal,
      sessionLoading: sessionQuery.isFetching,
      sessionError,
      sessionCookies,
      sessionOrigins,
      sessionUpdatedAt,
    }),
    [
      showSessionModal,
      sessionQuery.isFetching,
      sessionError,
      sessionCookies,
      sessionOrigins,
      sessionUpdatedAt,
    ]
  );

  const apiConsoleValue = useMemo<IntegrationsApiConsole>(
    () => ({
      baseApiMethod,
      setBaseApiMethod,
      baseApiParams,
      setBaseApiParams,
      baseApiLoading,
      baseApiError,
      baseApiResponse,
      allegroApiMethod,
      setAllegroApiMethod,
      allegroApiPath,
      setAllegroApiPath,
      allegroApiBody,
      setAllegroApiBody,
      allegroApiLoading,
      allegroApiError,
      allegroApiResponse,
    }),
    [
      baseApiMethod,
      baseApiParams,
      baseApiLoading,
      baseApiError,
      baseApiResponse,
      allegroApiMethod,
      allegroApiPath,
      allegroApiBody,
      allegroApiLoading,
      allegroApiError,
      allegroApiResponse,
    ]
  );

  const actionsValue = useMemo<IntegrationsActions>(
    () => ({
      handleIntegrationClick,
      handleSaveConnection,
      handleDeleteConnection,
      handleConfirmDeleteConnection,
      handleBaselinkerTest,
      handleAllegroTest,
      handleTestConnection,
      handleTraderaManualLogin,
      handleSelectPlaywrightPersona,
      handleSavePlaywrightSettings,
      handleAllegroAuthorize,
      handleAllegroDisconnect,
      handleAllegroSandboxToggle,
      handleAllegroSandboxConnect,
      handleBaseApiRequest,
      handleAllegroApiRequest,
      onCloseModal,
      onOpenSessionModal,
    }),
    [
      handleIntegrationClick,
      handleSaveConnection,
      handleDeleteConnection,
      handleConfirmDeleteConnection,
      handleBaselinkerTest,
      handleAllegroTest,
      handleTestConnection,
      handleTraderaManualLogin,
      handleSelectPlaywrightPersona,
      handleSavePlaywrightSettings,
      handleAllegroAuthorize,
      handleAllegroDisconnect,
      handleAllegroSandboxToggle,
      handleAllegroSandboxConnect,
      handleBaseApiRequest,
      handleAllegroApiRequest,
      onCloseModal,
      onOpenSessionModal,
    ]
  );

  const aggregatedValue = useMemo<IntegrationsContextType>(
    () => ({
      ...dataValue,
      ...formValue,
      ...testingValue,
      ...sessionValue,
      ...apiConsoleValue,
      ...actionsValue,
    }),
    [dataValue, formValue, testingValue, sessionValue, apiConsoleValue, actionsValue]
  );

  return (
    <IntegrationsDataContext.Provider value={dataValue}>
      <IntegrationsFormContext.Provider value={formValue}>
        <IntegrationsTestingContext.Provider value={testingValue}>
          <IntegrationsSessionContext.Provider value={sessionValue}>
            <IntegrationsApiConsoleContext.Provider value={apiConsoleValue}>
              <IntegrationsActionsContext.Provider value={actionsValue}>
                <IntegrationsContext.Provider value={aggregatedValue}>
                  {children}
                </IntegrationsContext.Provider>
              </IntegrationsActionsContext.Provider>
            </IntegrationsApiConsoleContext.Provider>
          </IntegrationsSessionContext.Provider>
        </IntegrationsTestingContext.Provider>
      </IntegrationsFormContext.Provider>
    </IntegrationsDataContext.Provider>
  );
}
