'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

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
import {
  Integration,
  IntegrationConnection,
  TestLogEntry,
  SessionCookie,
  integrationDefinitions,
} from '@/features/integrations/types/integrations-ui';
import { normalizeSteps } from '@/features/integrations/utils/connections';
import { logClientError } from '@/features/observability';
import { defaultPlaywrightSettings } from '@/features/playwright';
import type { PlaywrightPersona, PlaywrightSettings } from '@/features/playwright';
import { internalError } from '@/shared/errors/app-error';
import { useToast } from '@/shared/ui';

interface IntegrationsContextType {
  // Queries
  integrations: Integration[];
  integrationsLoading: boolean;
  activeIntegration: Integration | null;
  connections: IntegrationConnection[];
  connectionsLoading: boolean;
  playwrightPersonas: PlaywrightPersona[];
  playwrightPersonasLoading: boolean;
  
  // Active state setters
  setActiveIntegration: (integration: Integration | null) => void;
  
  // UI State
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  editingConnectionId: string | null;
  setEditingConnectionId: (id: string | null) => void;
  connectionForm: { name: string; username: string; password: string };
  setConnectionForm: React.Dispatch<React.SetStateAction<{ name: string; username: string; password: string }>>;
  
  // Testing State
  isTesting: boolean;
  testLog: TestLogEntry[];
  showTestLogModal: boolean;
  setShowTestLogModal: (open: boolean) => void;
  selectedStep: (TestLogEntry & { status: 'ok' | 'failed' }) | null;
  setSelectedStep: (step: (TestLogEntry & { status: 'ok' | 'failed' }) | null) => void;
  
  showTestErrorModal: boolean;
  setShowTestErrorModal: (open: boolean) => void;
  testError: string | null;
  testErrorMeta: {
    errorId?: string;
    integrationId?: string | null;
    connectionId?: string | null;
  } | null;
  
  showTestSuccessModal: boolean;
  setShowTestSuccessModal: (open: boolean) => void;
  testSuccessMessage: string | null;
  
  // Session State
  showSessionModal: boolean;
  setShowSessionModal: (open: boolean) => void;
  sessionLoading: boolean;
  sessionError: string | null;
  sessionCookies: SessionCookie[];
  sessionOrigins: unknown[];
  sessionUpdatedAt: string | null;
  
  // Playwright State
  playwrightSettings: PlaywrightSettings;
  setPlaywrightSettings: React.Dispatch<React.SetStateAction<PlaywrightSettings>>;
  playwrightPersonaId: string | null;
  showPlaywrightSaved: boolean;
  
  // API Console State (Base)
  baseApiMethod: string;
  setBaseApiMethod: (method: string) => void;
  baseApiParams: string;
  setBaseApiParams: (params: string) => void;
  baseApiLoading: boolean;
  baseApiError: string | null;
  baseApiResponse: { data: unknown } | null;
  
  // API Console State (Allegro)
  allegroApiMethod: string;
  setAllegroApiMethod: (method: string) => void;
  allegroApiPath: string;
  setAllegroApiPath: (path: string) => void;
  allegroApiBody: string;
  setAllegroApiBody: (body: string) => void;
  allegroApiLoading: boolean;
  allegroApiError: string | null;
  allegroApiResponse: {
    status: number;
    statusText: string;
    data?: unknown;
    refreshed?: boolean;
  } | null;
  
  // Allegro specific
  savingAllegroSandbox: boolean;

  // Actions
  handleIntegrationClick: (definition: (typeof integrationDefinitions)[number]) => Promise<void>;
  handleSaveConnection: () => Promise<void>;
  handleDeleteConnection: (connection: IntegrationConnection) => void;
  handleConfirmDeleteConnection: () => Promise<void>;
  connectionToDelete: IntegrationConnection | null;
  setConnectionToDelete: (conn: IntegrationConnection | null) => void;
  
  handleBaselinkerTest: (connection: IntegrationConnection) => Promise<void>;
  handleAllegroTest: (connection: IntegrationConnection) => Promise<void>;
  handleTestConnection: (connection: IntegrationConnection) => Promise<void>;
  
  handleSelectPlaywrightPersona: (personaId: string | null) => Promise<void>;
  handleSavePlaywrightSettings: () => Promise<void>;
  
  handleAllegroAuthorize: () => void;
  handleAllegroDisconnect: () => Promise<void>;
  handleAllegroSandboxToggle: (value: boolean) => Promise<void>;
  handleAllegroSandboxConnect: () => Promise<void>;
  
  handleBaseApiRequest: () => Promise<void>;
  handleAllegroApiRequest: () => Promise<void>;
  
  onCloseModal: () => void;
  onOpenSessionModal: () => void;
}

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
  const [connectionForm, setConnectionForm] = useState({
    name: '',
    username: '',
    password: '',
  });

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
  const [selectedStep, setSelectedStep] = useState<(TestLogEntry & { status: 'ok' | 'failed' }) | null>(null);

  // Session State
  const [showSessionModal, setShowSessionModal] = useState(false);
  const activeConnection = connections[0] || null;
  const sessionQuery = useConnectionSession(activeConnection?.id, {
    enabled: showSessionModal,
  });
  const sessionPayload = sessionQuery.data as Record<string, unknown> | undefined;
  const sessionCookies = (sessionPayload?.['cookies'] as SessionCookie[]) ?? [];
  const sessionOrigins = (sessionPayload?.['origins'] as unknown[]) ?? [];
  const sessionUpdatedAt = (sessionPayload?.['updatedAt'] as string) ?? null;
  const sessionError = sessionQuery.isError
    ? (sessionQuery.error)?.message ?? 'Failed to load session cookies.'
    : (sessionPayload?.['error'] as string) ?? null;

  // Playwright State
  const [playwrightSettings, setPlaywrightSettings] = useState(defaultPlaywrightSettings);
  const [playwrightPersonaId, setPlaywrightPersonaId] = useState<string | null>(null);
  const [showPlaywrightSaved, setShowPlaywrightSaved] = useState(false);

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

  // Effects from IntegrationsContent
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
    toast((integrationsQuery.error)?.message ?? 'Failed to load integrations.', { variant: 'error' });
  }, [integrationsQuery.error, integrationsQuery.isError, toast]);

  useEffect(() => {
    if (!connectionsQuery.isError) return;
    toast((connectionsQuery.error)?.message ?? 'Failed to load connections.', { variant: 'error' });
  }, [connectionsQuery.error, connectionsQuery.isError, toast]);

  useEffect(() => {
    if (!activeIntegration) return;
    if (integrations.find((item: Integration) => item.id === activeIntegration.id)) return;
    setActiveIntegration(null);
  }, [activeIntegration, integrations]);

  useEffect(() => {
    if (!showPlaywrightSaved) return;
    const timeout = setTimeout(() => setShowPlaywrightSaved(false), 2500);
    return () => clearTimeout(timeout);
  }, [showPlaywrightSaved]);

  const refreshConnections = useCallback((integrationId: string): void => {
    void invalidateIntegrationConnections(queryClient, integrationId);
  }, [queryClient]);

  useEffect(() => {
    if (connections.length === 0) {
      setEditingConnectionId(null);
      setConnectionForm({ name: '', username: '', password: '' });
      return;
    }
    if (!editingConnectionId) {
      const connection = connections[0];
      if (!connection) return;
      
      setEditingConnectionId(connection.id);
      setConnectionForm({
        name: connection.name,
        username: connection.username ?? '',
        password: '',
      });
      setPlaywrightSettings({
        headless: connection.playwrightHeadless ?? defaultPlaywrightSettings.headless,
        slowMo: connection.playwrightSlowMo ?? defaultPlaywrightSettings.slowMo,
        timeout: connection.playwrightTimeout ?? defaultPlaywrightSettings.timeout,
        navigationTimeout: connection.playwrightNavigationTimeout ?? defaultPlaywrightSettings.navigationTimeout,
        humanizeMouse: connection.playwrightHumanizeMouse ?? defaultPlaywrightSettings.humanizeMouse,
        mouseJitter: connection.playwrightMouseJitter ?? defaultPlaywrightSettings.mouseJitter,
        clickDelayMin: connection.playwrightClickDelayMin ?? defaultPlaywrightSettings.clickDelayMin,
        clickDelayMax: connection.playwrightClickDelayMax ?? defaultPlaywrightSettings.clickDelayMax,
        inputDelayMin: connection.playwrightInputDelayMin ?? defaultPlaywrightSettings.inputDelayMin,
        inputDelayMax: connection.playwrightInputDelayMax ?? defaultPlaywrightSettings.inputDelayMax,
        actionDelayMin: connection.playwrightActionDelayMin ?? defaultPlaywrightSettings.actionDelayMin,
        actionDelayMax: connection.playwrightActionDelayMax ?? defaultPlaywrightSettings.actionDelayMax,
        proxyEnabled: connection.playwrightProxyEnabled ?? defaultPlaywrightSettings.proxyEnabled,
        proxyServer: connection.playwrightProxyServer ?? defaultPlaywrightSettings.proxyServer,
        proxyUsername: connection.playwrightProxyUsername ?? defaultPlaywrightSettings.proxyUsername,
        proxyPassword: '',
        emulateDevice: connection.playwrightEmulateDevice ?? defaultPlaywrightSettings.emulateDevice,
        deviceName: connection.playwrightDeviceName ?? defaultPlaywrightSettings.deviceName,
      });
    }
  }, [connections, editingConnectionId]);

  useEffect(() => {
    const loadPlaywrightUtils = async (): Promise<void> => {
      if (playwrightPersonas.length === 0) {
        setPlaywrightPersonaId(null);
        return;
      }
      const { findPlaywrightPersonaMatch } = await import('@/features/playwright');
      const match = findPlaywrightPersonaMatch(playwrightSettings, playwrightPersonas);
      setPlaywrightPersonaId(match?.id ?? null);
    };
    void loadPlaywrightUtils();
  }, [playwrightPersonas, playwrightSettings]);

  // Handlers
  const ensureIntegration = async (definition: (typeof integrationDefinitions)[number]): Promise<Integration | null> => {
    let currentIntegrations = integrations;
    if (!currentIntegrations.length && integrationsQuery.isFetching) {
      const refreshed = await integrationsQuery.refetch();
      currentIntegrations = refreshed.data ?? integrationsQuery.data ?? [];
    }
    const existing = currentIntegrations.find((i: Integration) => i.slug === definition.slug);
    if (existing) return existing;
    try {
      return await createIntegrationMutation.mutateAsync({
        name: definition.name,
        slug: definition.slug,
      });
    } catch (error: unknown) {
      toast((error as Error)?.message ?? `Failed to add ${definition.name}`, { variant: 'error' });
      return null;
    }
  };

  const handleIntegrationClick = async (definition: (typeof integrationDefinitions)[number]): Promise<void> => {
    const integration = await ensureIntegration(definition);
    if (!integration) return;
    setActiveIntegration(integration);
    refreshConnections(integration.id);
    setIsModalOpen(true);
  };

  const handleSaveConnection = async (): Promise<void> => {
    if (!activeIntegration) return;
    if (!connectionForm.name.trim() || !connectionForm.username.trim()) {
      toast('Connection name and username are required.', { variant: 'error' });
      return;
    }
    if (!editingConnectionId && !connectionForm.password.trim()) {
      toast('Password/Token is required.', { variant: 'error' });
      return;
    }
    const payload = {
      name: connectionForm.name.trim(),
      username: connectionForm.username.trim(),
      ...(connectionForm.password.trim() ? { password: connectionForm.password.trim() } : {}),
    };
    try {
      await upsertConnectionMutation.mutateAsync({
        integrationId: activeIntegration.id,
        ...(editingConnectionId ? { connectionId: editingConnectionId } : {}),
        payload,
      });
      setConnectionForm({ name: '', username: '', password: '' });
      setEditingConnectionId(null);
    } catch (error: unknown) {
      toast((error as Error)?.message ?? 'Failed to save connection.', { variant: 'error' });
    }
  };

  const handleDeleteConnection = useCallback((connection: IntegrationConnection): void => {
    setConnectionToDelete(connection);
  }, []);

  const handleConfirmDeleteConnection = async (): Promise<void> => {
    if (!connectionToDelete) return;
    try {
      await deleteConnectionMutation.mutateAsync({
        integrationId: connectionToDelete.integrationId,
        connectionId: connectionToDelete.id,
      });
      if (editingConnectionId === connectionToDelete.id) {
        setEditingConnectionId(null);
        setConnectionForm({ name: '', username: '', password: '' });
      }
    } catch (error: unknown) {
      toast((error as Error)?.message ?? 'Failed to delete connection.', { variant: 'error' });
    } finally {
      setConnectionToDelete(null);
    }
  };

  const handleConnectionTest = async (
    connection: IntegrationConnection,
    type: 'test' | 'base/test' | 'allegro/test',
    title: string
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
      const payload = (await testConnectionMutation.mutateAsync({
        integrationId: activeIntegration.id,
        connectionId: connection.id,
        type,
      }));

      const normalizedSteps = normalizeSteps((payload['steps'] as unknown[]) || []);
      if (normalizedSteps.length) setTestLog(normalizedSteps);

      const durationMs = Math.round(performance.now() - startedAt);
      let extraInfo = '';
      if (type === 'base/test' && payload['inventoryCount'] !== undefined) {
        extraInfo = `
Inventories found: \${String(payload['inventoryCount'])}`;
      } else if (type === 'allegro/test' && payload['profile']) {
        const profile = payload['profile'] as Record<string, unknown>;
        const login = (profile['login'] as string) ?? '';
        const name = (profile['name'] as string) ?? '';
        const identifier = name || login;
        if (identifier) extraInfo = `
Account: \${identifier}`;
      }

      setTestSuccessMessage(`${title} succeeded.
URL: ${requestUrl}
Duration: ${durationMs}ms${extraInfo}`);
      setShowTestSuccessModal(true);
      refreshConnections(activeIntegration.id);
    } catch (error: unknown) {
      const durationMs = Math.round(performance.now() - startedAt);
      const message = (error as Error)?.message ?? 'Unknown error';
      const data = (error as Record<string, unknown>)['data'] as Record<string, unknown> | undefined;
      
      let errorMessage = `${title} failed.
URL: ${requestUrl}
Duration: ${durationMs}ms
Error: ${message}`;
      
      if (data) {
        const normalizedSteps = normalizeSteps((data['steps'] as unknown[]) || []);
        const failedStep = normalizedSteps.find((s: TestLogEntry) => s.status === 'failed');
        const failedStepDetail = failedStep?.detail || '';
        const errorBody = (data['error'] as string) || failedStepDetail || 'No response body';
        errorMessage = `${title} failed.
URL: ${requestUrl}
Duration: ${durationMs}ms

Response:
${errorBody}`;

        const steps = normalizedSteps.length
          ? normalizedSteps.map((s: TestLogEntry) => s.status === 'failed' && !s.detail ? { ...s, detail: errorMessage } : s)
          : [{ step: `${title} failed`, status: 'failed' as const, timestamp: new Date().toISOString(), detail: errorMessage }];
          
        setTestLog(steps);
        setTestErrorMeta({
          errorId: data['errorId'] as string,
          integrationId: data['integrationId'] as string,
          connectionId: data['connectionId'] as string,
        });
      } else {
        setTestLog([{ step: `${title} failed`, status: 'failed' as const, timestamp: new Date().toISOString(), detail: errorMessage }]);
      }

      setTestError(errorMessage);
      setShowTestErrorModal(true);
    } finally {
      setIsTesting(false);
    }
  };

  const handleBaselinkerTest = (c: IntegrationConnection) => handleConnectionTest(c, 'base/test', 'Baselinker connection test');
  const handleAllegroTest = (c: IntegrationConnection) => handleConnectionTest(c, 'allegro/test', 'Allegro connection test');
  const handleTestConnection = (c: IntegrationConnection) => handleConnectionTest(c, 'test', 'Connection test');

  const handleSelectPlaywrightPersona = async (personaId: string | null): Promise<void> => {
    if (!personaId) {
      setPlaywrightPersonaId(null);
      return;
    }
    const persona = playwrightPersonas.find((p: PlaywrightPersona) => p.id === personaId);
    if (!persona) return;
    const { buildPlaywrightSettings } = await import('@/features/playwright');
    setPlaywrightPersonaId(persona.id);
    setPlaywrightSettings(buildPlaywrightSettings(persona.settings));
    toast(`Applied persona "${persona.name}".`, { variant: 'success' });
  };

  const handleSavePlaywrightSettings = async (): Promise<void> => {
    const connection = connections[0];
    if (!connection) return;
    try {
      await upsertConnectionMutation.mutateAsync({
        integrationId: activeIntegration?.id ?? connection.integrationId,
        connectionId: connection.id,
        payload: {
          name: connection.name,
          username: connection.username,
          ...playwrightSettings,
          proxyPassword: playwrightSettings.proxyPassword, // Ensure password is sent if provided
        } as Record<string, unknown>,
      });
      setShowPlaywrightSaved(true);
    } catch (error: unknown) {
      toast((error as Error)?.message ?? 'Failed to save Playwright settings.', { variant: 'error' });
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
      logClientError(error, { context: { source: 'IntegrationsContext', action: 'disconnectAllegro' } });
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
      toast((error as Error)?.message ?? 'Failed to update Allegro sandbox setting.', { variant: 'error' });
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

  const value = {
    integrations,
    integrationsLoading,
    activeIntegration,
    setActiveIntegration,
    connections,
    connectionsLoading,
    playwrightPersonas,
    playwrightPersonasLoading,
    isModalOpen,
    setIsModalOpen,
    editingConnectionId,
    setEditingConnectionId,
    connectionForm,
    setConnectionForm,
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
    showSessionModal,
    setShowSessionModal,
    sessionLoading: sessionQuery.isFetching,
    sessionError,
    sessionCookies,
    sessionOrigins,
    sessionUpdatedAt,
    playwrightSettings,
    setPlaywrightSettings,
    playwrightPersonaId,
    showPlaywrightSaved,
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
    savingAllegroSandbox,
    handleIntegrationClick,
    handleSaveConnection,
    handleDeleteConnection,
    handleConfirmDeleteConnection,
    connectionToDelete,
    setConnectionToDelete,
    handleBaselinkerTest,
    handleAllegroTest,
    handleTestConnection,
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
  };

  return (
    <IntegrationsContext.Provider value={value}>
      {children}
    </IntegrationsContext.Provider>
  );
}
