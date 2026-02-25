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
  useRef,
  ReactNode,
} from 'react';

import {
  isTraderaApiIntegrationSlug,
  isTraderaIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import type {
  ConnectionFormState,
  IntegrationsContextType,
  SessionPayload,
  StepWithResult,
  IntegrationDefinition,
} from '@/features/integrations/context/integrations-context-types';
import { createEmptyConnectionForm } from '@/features/integrations/context/integrations-context-types';
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
import { logClientError } from '@/features/observability';
import { defaultPlaywrightSettings } from '@/features/playwright';
import type {
  Integration,
  IntegrationConnection,
  TestLogEntry,
  SessionCookie,
} from '@/shared/contracts/integrations';
import type { PlaywrightPersonaDto as PlaywrightPersona, PlaywrightSettingsDto as PlaywrightSettings } from '@/shared/contracts/playwright';
import { internalError } from '@/shared/errors/app-error';
import { useToast } from '@/shared/ui';

// --- Data Context ---
export interface IntegrationsData {
  integrations: Integration[];
  integrationsLoading: boolean;
  activeIntegration: Integration | null;
  setActiveIntegration: (integration: Integration | null) => void;
  connections: IntegrationConnection[];
  connectionsLoading: boolean;
  playwrightPersonas: PlaywrightPersona[];
  playwrightPersonasLoading: boolean;
}
const DataContext = createContext<IntegrationsData | null>(null);
export const useIntegrationsData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useIntegrationsData must be used within IntegrationsProvider');
  return context;
};

// --- Form Context ---
export interface IntegrationsForm {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  editingConnectionId: string | null;
  setEditingConnectionId: (id: string | null) => void;
  connectionForm: ConnectionFormState;
  setConnectionForm: React.Dispatch<React.SetStateAction<ConnectionFormState>>;
  connectionToDelete: IntegrationConnection | null;
  setConnectionToDelete: (conn: IntegrationConnection | null) => void;
  playwrightSettings: PlaywrightSettings;
  setPlaywrightSettings: React.Dispatch<React.SetStateAction<PlaywrightSettings>>;
  playwrightPersonaId: string | null;
  savingAllegroSandbox: boolean;
}
const FormContext = createContext<IntegrationsForm | null>(null);
export const useIntegrationsForm = () => {
  const context = useContext(FormContext);
  if (!context) throw new Error('useIntegrationsForm must be used within IntegrationsProvider');
  return context;
};

// --- Testing Context ---
export interface IntegrationsTesting {
  isTesting: boolean;
  testLog: TestLogEntry[];
  showTestLogModal: boolean;
  setShowTestLogModal: (open: boolean) => void;
  selectedStep: StepWithResult | null;
  setSelectedStep: (step: StepWithResult | null) => void;
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
}
const TestingContext = createContext<IntegrationsTesting | null>(null);
export const useIntegrationsTesting = () => {
  const context = useContext(TestingContext);
  if (!context) throw new Error('useIntegrationsTesting must be used within IntegrationsProvider');
  return context;
};

// --- Session Context ---
export interface IntegrationsSession {
  showSessionModal: boolean;
  setShowSessionModal: (open: boolean) => void;
  sessionLoading: boolean;
  sessionError: string | null;
  sessionCookies: SessionCookie[];
  sessionOrigins: unknown[];
  sessionUpdatedAt: string | null;
}
const SessionContext = createContext<IntegrationsSession | null>(null);
export const useIntegrationsSession = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useIntegrationsSession must be used within IntegrationsProvider');
  return context;
};

// --- API Console Context ---
export interface IntegrationsApiConsole {
  baseApiMethod: string;
  setBaseApiMethod: (method: string) => void;
  baseApiParams: string;
  setBaseApiParams: (params: string) => void;
  baseApiLoading: boolean;
  baseApiError: string | null;
  baseApiResponse: { data: unknown } | null;
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
}
const ApiConsoleContext = createContext<IntegrationsApiConsole | null>(null);
export const useIntegrationsApiConsole = () => {
  const context = useContext(ApiConsoleContext);
  if (!context) throw new Error('useIntegrationsApiConsole must be used within IntegrationsProvider');
  return context;
};

// --- Actions Context ---
export interface IntegrationsActions {
  handleIntegrationClick: (definition: IntegrationDefinition) => Promise<void>;
  handleSaveConnection: () => Promise<void>;
  handleDeleteConnection: (connection: IntegrationConnection) => void;
  handleConfirmDeleteConnection: () => Promise<void>;
  handleBaselinkerTest: (connection: IntegrationConnection) => Promise<void>;
  handleAllegroTest: (connection: IntegrationConnection) => Promise<void>;
  handleTestConnection: (connection: IntegrationConnection) => Promise<void>;
  handleTraderaManualLogin: (connection: IntegrationConnection) => Promise<void>;
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
const ActionsContext = createContext<IntegrationsActions | null>(null);
export const useIntegrationsActions = () => {
  const context = useContext(ActionsContext);
  if (!context) throw new Error('useIntegrationsActions must be used within IntegrationsProvider');
  return context;
};

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
const NEW_CONNECTION_DRAFT_ID = '__new_connection__';

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
  const [connectionForm, setConnectionForm] =
    useState<ConnectionFormState>(createEmptyConnectionForm());
  const boundConnectionIdRef = useRef<string | null>(null);

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
    connections.find((connection: IntegrationConnection) => connection.id === editingConnectionId) ??
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
    ? sessionQuery.error?.message ?? 'Failed to load session cookies.'
    : sessionPayload?.error ?? null;

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

  const refreshConnections = useCallback((integrationId: string): void => {
    void invalidateIntegrationConnections(queryClient, integrationId);
  }, [queryClient]);

  useEffect(() => {
    if (connections.length === 0) {
      setEditingConnectionId(null);
      setConnectionForm(createEmptyConnectionForm());
      boundConnectionIdRef.current = null;
      return;
    }
    if (editingConnectionId === NEW_CONNECTION_DRAFT_ID) return;

    const connection =
      connections.find((item: IntegrationConnection) => item.id === editingConnectionId) ??
      connections[0];
    if (!connection) return;

    if (editingConnectionId !== connection.id) {
      setEditingConnectionId(connection.id);
    }
    const preserveSecrets = boundConnectionIdRef.current === connection.id;
    setConnectionForm((prev) => ({
      name: connection.name,
      username: connection.username ?? '',
      password: preserveSecrets ? prev.password : '',
      traderaDefaultTemplateId: connection.traderaDefaultTemplateId ?? '',
      traderaDefaultDurationHours: connection.traderaDefaultDurationHours ?? 72,
      traderaAutoRelistEnabled:
        connection.traderaAutoRelistEnabled ?? true,
      traderaAutoRelistLeadMinutes:
        connection.traderaAutoRelistLeadMinutes ?? 180,
      traderaApiAppId:
        typeof connection.traderaApiAppId === 'number'
          ? String(connection.traderaApiAppId)
          : '',
      traderaApiAppKey: preserveSecrets ? prev.traderaApiAppKey : '',
      traderaApiPublicKey: connection.traderaApiPublicKey ?? '',
      traderaApiUserId:
        typeof connection.traderaApiUserId === 'number'
          ? String(connection.traderaApiUserId)
          : '',
      traderaApiToken: preserveSecrets ? prev.traderaApiToken : '',
      traderaApiSandbox: connection.traderaApiSandbox ?? false,
    }));
    boundConnectionIdRef.current = connection.id;
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
    setPlaywrightPersonaId(connection.playwrightPersonaId ?? null);
  }, [connections, editingConnectionId]);

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
      const { findPlaywrightPersonaMatch } = await import('@/features/playwright');
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
        toast((error as Error)?.message ?? 'Failed to add ${def.name}', { variant: 'error' });
        return null;
      }
    };

    const integration = await ensureIntegration(definition);
    if (!integration) return;
    setActiveIntegration(integration);
    refreshConnections(integration.id);
    setIsModalOpen(true);
  };

  const handleSaveConnection = async (): Promise<void> => {
    if (!activeIntegration) return;
    const isTraderaIntegration = isTraderaIntegrationSlug(activeIntegration.slug);
    const isTraderaApiIntegration = isTraderaApiIntegrationSlug(
      activeIntegration.slug
    );
    const isCreateMode =
      !editingConnectionId || editingConnectionId === NEW_CONNECTION_DRAFT_ID;
    if (!connectionForm.name.trim() || !connectionForm.username.trim()) {
      toast('Connection name and username are required.', { variant: 'error' });
      return;
    }
    if (isCreateMode && !connectionForm.password.trim()) {
      toast('Password/Token is required.', { variant: 'error' });
      return;
    }
    if (isTraderaApiIntegration) {
      if (!connectionForm.traderaApiAppId.trim()) {
        toast('Tradera API App ID is required.', { variant: 'error' });
        return;
      }
      if (!connectionForm.traderaApiUserId.trim()) {
        toast('Tradera API User ID is required.', { variant: 'error' });
        return;
      }
      if (isCreateMode && !connectionForm.traderaApiAppKey.trim()) {
        toast('Tradera API App Key is required on create.', { variant: 'error' });
        return;
      }
      if (isCreateMode && !connectionForm.traderaApiToken.trim()) {
        toast('Tradera API token is required on create.', { variant: 'error' });
        return;
      }
    }
    const normalizedPassword = connectionForm.password.trim();
    const normalizedTraderaApiAppKey = connectionForm.traderaApiAppKey.trim();
    const normalizedTraderaApiToken = connectionForm.traderaApiToken.trim();
    const traderaApiAppId = Number.parseInt(connectionForm.traderaApiAppId, 10);
    const traderaApiUserId = Number.parseInt(
      connectionForm.traderaApiUserId,
      10
    );
    const payload = {
      name: connectionForm.name.trim(),
      username: connectionForm.username.trim(),
      ...(normalizedPassword ? { password: normalizedPassword } : {}),
      ...(isTraderaIntegration
        ? {
          traderaDefaultTemplateId:
              connectionForm.traderaDefaultTemplateId.trim() || null,
          traderaDefaultDurationHours:
              Math.max(
                1,
                Math.min(720, Math.floor(connectionForm.traderaDefaultDurationHours))
              ),
          traderaAutoRelistEnabled: connectionForm.traderaAutoRelistEnabled,
          traderaAutoRelistLeadMinutes: Math.max(
            0,
            Math.min(10080, Math.floor(connectionForm.traderaAutoRelistLeadMinutes))
          ),
        }
        : {}),
      ...(isTraderaApiIntegration
        ? {
          ...(Number.isFinite(traderaApiAppId) && traderaApiAppId > 0
            ? { traderaApiAppId }
            : {}),
          ...(normalizedTraderaApiAppKey
            ? { traderaApiAppKey: normalizedTraderaApiAppKey }
            : {}),
          traderaApiPublicKey:
            connectionForm.traderaApiPublicKey.trim() || null,
          ...(Number.isFinite(traderaApiUserId) && traderaApiUserId > 0
            ? { traderaApiUserId }
            : {}),
          ...(normalizedTraderaApiToken
            ? { traderaApiToken: normalizedTraderaApiToken }
            : {}),
          traderaApiSandbox: connectionForm.traderaApiSandbox,
        }
        : {}),
    };
    try {
      const saved = await upsertConnectionMutation.mutateAsync({
        integrationId: activeIntegration.id,
        ...(!isCreateMode ? { connectionId: editingConnectionId } : {}),
        payload,
      });
      setEditingConnectionId(saved.id);
      setConnectionForm({
        name: saved.name,
        username: saved.username ?? '',
        password: normalizedPassword,
        traderaDefaultTemplateId: saved.traderaDefaultTemplateId ?? '',
        traderaDefaultDurationHours: saved.traderaDefaultDurationHours ?? 72,
        traderaAutoRelistEnabled: saved.traderaAutoRelistEnabled ?? true,
        traderaAutoRelistLeadMinutes:
          saved.traderaAutoRelistLeadMinutes ?? 180,
        traderaApiAppId:
          typeof saved.traderaApiAppId === 'number'
            ? String(saved.traderaApiAppId)
            : '',
        traderaApiAppKey: normalizedTraderaApiAppKey,
        traderaApiPublicKey: saved.traderaApiPublicKey ?? '',
        traderaApiUserId:
          typeof saved.traderaApiUserId === 'number'
            ? String(saved.traderaApiUserId)
            : '',
        traderaApiToken: normalizedTraderaApiToken,
        traderaApiSandbox: saved.traderaApiSandbox ?? false,
      });
      boundConnectionIdRef.current = saved.id;
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
        setConnectionForm(createEmptyConnectionForm());
        boundConnectionIdRef.current = null;
      }
    } catch (error: unknown) {
      toast((error as Error)?.message ?? 'Failed to delete connection.', { variant: 'error' });
    } finally {
      setConnectionToDelete(null);
    }
  };

  const handleConnectionTest = React.useCallback(async (
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

    const requestUrl = '/api/integrations/${activeIntegration.id}/connections/${connection.id}/${type}';
    const startedAt = performance.now();

    try {
      const payload = (await testConnectionMutation.mutateAsync({
        integrationId: activeIntegration.id,
        connectionId: connection.id,
        type,
        ...(options?.body ? { body: options.body } : {}),
        ...(typeof options?.timeoutMs === 'number'
          ? { timeoutMs: options.timeoutMs }
          : {}),
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
        setTestLog([{ step: '${title} failed', status: 'failed' as const, timestamp: new Date().toISOString(), detail: errorMessage }]);
      }

      setTestError(errorMessage);
      setShowTestErrorModal(true);
    } finally {
      setIsTesting(false);
    }
  }, [activeIntegration, testConnectionMutation, refreshConnections]);

  const handleBaselinkerTest = (c: IntegrationConnection) => handleConnectionTest(c, 'base/test', 'Baselinker connection test');
  const handleAllegroTest = (c: IntegrationConnection) => handleConnectionTest(c, 'allegro/test', 'Allegro connection test');
  const handleTestConnection = (c: IntegrationConnection) => handleConnectionTest(c, 'test', 'Connection test');
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
    const { buildPlaywrightSettings } = await import('@/features/playwright');
    setPlaywrightPersonaId(persona.id);
    setPlaywrightSettings(buildPlaywrightSettings(persona.settings));
    toast('Applied persona "${persona.name}".', { variant: 'success' });
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
      toast((error as Error)?.message ?? 'Failed to save Playwright settings.', { variant: 'error' });
    }
  };

  const handleAllegroAuthorize = (): void => {
    if (!activeIntegration || !activeConnection) {
      toast('Create an Allegro connection first.', { variant: 'error' });
      return;
    }
    window.location.href = '/api/integrations/${activeIntegration.id}/connections/${activeConnection.id}/allegro/authorize';
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
      window.location.href = '/api/integrations/${activeIntegration.id}/connections/${activeConnection.id}/allegro/authorize';
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

  const dataValue = useMemo<IntegrationsData>(() => ({
    integrations,
    integrationsLoading,
    activeIntegration,
    setActiveIntegration,
    connections,
    connectionsLoading,
    playwrightPersonas,
    playwrightPersonasLoading,
  }), [integrations, integrationsLoading, activeIntegration, connections, connectionsLoading, playwrightPersonas, playwrightPersonasLoading]);

  const formValue = useMemo<IntegrationsForm>(() => ({
    isModalOpen,
    setIsModalOpen,
    editingConnectionId,
    setEditingConnectionId,
    connectionForm,
    setConnectionForm,
    connectionToDelete,
    setConnectionToDelete,
    playwrightSettings,
    setPlaywrightSettings,
    playwrightPersonaId,
    savingAllegroSandbox,
  }), [isModalOpen, editingConnectionId, connectionForm, connectionToDelete, playwrightSettings, playwrightPersonaId, savingAllegroSandbox]);

  const testingValue = useMemo<IntegrationsTesting>(() => ({
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
  }), [isTesting, testLog, showTestLogModal, selectedStep, showTestErrorModal, testError, testErrorMeta, showTestSuccessModal, testSuccessMessage]);

  const sessionValue = useMemo<IntegrationsSession>(() => ({
    showSessionModal,
    setShowSessionModal,
    sessionLoading: sessionQuery.isFetching,
    sessionError,
    sessionCookies,
    sessionOrigins,
    sessionUpdatedAt,
  }), [showSessionModal, sessionQuery.isFetching, sessionError, sessionCookies, sessionOrigins, sessionUpdatedAt]);

  const apiConsoleValue = useMemo<IntegrationsApiConsole>(() => ({
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
  }), [baseApiMethod, baseApiParams, baseApiLoading, baseApiError, baseApiResponse, allegroApiMethod, allegroApiPath, allegroApiBody, allegroApiLoading, allegroApiError, allegroApiResponse]);

  const actionsValue = useMemo<IntegrationsActions>(() => ({
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
  }), [
    handleIntegrationClick, handleSaveConnection, handleDeleteConnection, handleConfirmDeleteConnection,
    handleBaselinkerTest, handleAllegroTest, handleTestConnection, handleTraderaManualLogin,
    handleSelectPlaywrightPersona, handleSavePlaywrightSettings, handleAllegroAuthorize,
    handleAllegroDisconnect, handleAllegroSandboxToggle, handleAllegroSandboxConnect,
    handleBaseApiRequest, handleAllegroApiRequest, onCloseModal, onOpenSessionModal
  ]);

  const aggregatedValue = useMemo<IntegrationsContextType>(() => ({
    ...dataValue,
    ...formValue,
    ...testingValue,
    ...sessionValue,
    ...apiConsoleValue,
    ...actionsValue,
  }), [dataValue, formValue, testingValue, sessionValue, apiConsoleValue, actionsValue]);

  return (
    <DataContext.Provider value={dataValue}>
      <FormContext.Provider value={formValue}>
        <TestingContext.Provider value={testingValue}>
          <SessionContext.Provider value={sessionValue}>
            <ApiConsoleContext.Provider value={apiConsoleValue}>
              <ActionsContext.Provider value={actionsValue}>
                <IntegrationsContext.Provider value={aggregatedValue}>
                  {children}
                </IntegrationsContext.Provider>
              </ActionsContext.Provider>
            </ApiConsoleContext.Provider>
          </SessionContext.Provider>
        </TestingContext.Provider>
      </FormContext.Provider>
    </DataContext.Provider>
  );
}
