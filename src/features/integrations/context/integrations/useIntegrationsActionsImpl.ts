'use client';

import { useCallback, useState } from 'react';

import {
  isVintedIntegrationSlug,
  isLinkedInIntegrationSlug,
  isTraderaApiIntegrationSlug,
  isTraderaIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  useCreateIntegration,
  useUpsertConnection,
  useDeleteConnection,
  useDisconnectAllegro,
  useDisconnectLinkedIn,
  useTestConnection,
  useBaseApiRequest,
  useAllegroApiRequest,
} from '@/features/integrations/hooks/useIntegrationMutations';
import { toPlaywrightConnectionPayload } from '@/features/integrations/utils/playwright-connection-payload';
import { normalizeSteps } from '@/features/integrations/utils/connections';
import type { IntegrationAllegroApiMethod, IntegrationAllegroApiResponse, IntegrationBaseApiResponse } from '@/shared/contracts/integrations/api';
import type { IntegrationConnectionTestType } from '@/shared/contracts/integrations/session-testing';
import { Integration } from '@/shared/contracts/integrations/base';
import { IntegrationConnection } from '@/shared/contracts/integrations/connections';
import { TestLogEntry } from '@/shared/contracts/integrations/session-testing';
import type { PlaywrightPersona, PlaywrightSettings } from '@/shared/contracts/playwright';
import type { ListQuery } from '@/shared/contracts/ui/queries';
import { buildPlaywrightSettings } from '@/shared/lib/playwright/personas';
import { useToast } from '@/shared/ui/primitives.public';
import { isObjectRecord } from '@/shared/utils/object-utils';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import {
  IntegrationDefinition,
  SaveConnectionOptions,
  StepWithResult,
} from '../integrations-context-types';

export function useIntegrationsActionsImpl(args: {
  integrations: Integration[];
  activeIntegration: Integration | null;
  setActiveIntegration: (i: Integration | null) => void;
  connections: IntegrationConnection[];
  editingConnectionId: string | null;
  setEditingConnectionId: (id: string | null) => void;
  setIsModalOpen: (open: boolean) => void;
  setConnectionToDelete: (c: IntegrationConnection | null) => void;
  connectionToDelete: IntegrationConnection | null;
  setIsTesting: (testing: boolean) => void;
  setTestLog: (log: TestLogEntry[]) => void;
  setSelectedStep: (step: StepWithResult | null) => void;
  setShowTestLogModal: (show: boolean) => void;
  setShowTestErrorModal: (show: boolean) => void;
  setTestError: (error: string | null) => void;
  setTestErrorMeta: (
    meta: {
      errorId?: string;
      integrationId?: string | null;
      connectionId?: string | null;
    } | null
  ) => void;
  setShowTestSuccessModal: (show: boolean) => void;
  setTestSuccessMessage: (msg: string | null) => void;
  playwrightPersonas: PlaywrightPersona[];
  setPlaywrightPersonaId: (id: string | null) => void;
  setPlaywrightSettings: (s: PlaywrightSettings) => void;
  playwrightPersonaId: string | null;
  playwrightSettings: PlaywrightSettings;
  setShowSessionModal: (show: boolean) => void;
  baseApiMethod: string;
  baseApiParams: string;
  setBaseApiResponse: (res: IntegrationBaseApiResponse | null) => void;
  setBaseApiError: (err: string | null) => void;
  setBaseApiLoading: (loading: boolean) => void;
  allegroApiMethod: IntegrationAllegroApiMethod;
  allegroApiBody: string;
  allegroApiPath: string;
  setAllegroApiResponse: (res: IntegrationAllegroApiResponse | null) => void;
  setAllegroApiError: (err: string | null) => void;
  setAllegroApiLoading: (loading: boolean) => void;
  integrationsQuery: ListQuery<Integration>;
}) {
  const { toast } = useToast();

  const createIntegrationMutation = useCreateIntegration();
  const upsertConnectionMutation = useUpsertConnection();
  const deleteConnectionMutation = useDeleteConnection();
  const disconnectAllegroMutation = useDisconnectAllegro();
  const disconnectLinkedInMutation = useDisconnectLinkedIn();
  const testConnectionMutation = useTestConnection();
  const baseApiRequestMutation = useBaseApiRequest();
  const allegroApiRequestMutation = useAllegroApiRequest();

  const [savingAllegroSandbox, setSavingAllegroSandbox] = useState(false);

  const activeConnection =
    args.connections.find(
      (connection: IntegrationConnection) => connection.id === args.editingConnectionId
    ) ??
    args.connections[0] ??
    null;

  const handleIntegrationClick = async (definition: IntegrationDefinition): Promise<void> => {
    const ensureIntegration = async (def: IntegrationDefinition): Promise<Integration | null> => {
      let currentIntegrations = args.integrations;
      if (!currentIntegrations.length && args.integrationsQuery.isFetching) {
        const refreshed = await args.integrationsQuery.refetch();
        currentIntegrations =
          (refreshed.data as Integration[]) ?? args.integrationsQuery.data ?? [];
      }
      const existing = currentIntegrations.find((i: Integration) => i.slug === def.slug);
      if (existing) return existing;
      try {
        return await createIntegrationMutation.mutateAsync({
          name: def.name,
          slug: def.slug,
        });
      } catch (error: unknown) {
        logClientCatch(error, {
          source: 'IntegrationsContext',
          action: 'ensureIntegration',
          slug: def.slug,
        });
        toast((error as Error)?.message ?? `Failed to add ${def.name}`, { variant: 'error' });
        return null;
      }
    };

    const integration = await ensureIntegration(definition);
    if (!integration) return;
    args.setActiveIntegration(integration);
    args.setIsModalOpen(true);
  };

  const handleSaveConnection = async (
    options?: SaveConnectionOptions
  ): Promise<IntegrationConnection | null> => {
    if (!args.activeIntegration) return null;
    if (!options?.formData) {
      toast('Connection form data is missing.', { variant: 'error' });
      return null;
    }

    const formData = options.formData;
    const isTraderaIntegration = isTraderaIntegrationSlug(args.activeIntegration.slug);
    const isTraderaApiIntegration = isTraderaApiIntegrationSlug(args.activeIntegration.slug);
    const isTraderaBrowserIntegration =
      isTraderaIntegration && !isTraderaApiIntegration;
    const isVintedIntegration = isVintedIntegrationSlug(args.activeIntegration.slug);
    const isBrowserIntegration = isTraderaBrowserIntegration || isVintedIntegration;
    const isBaselinkerIntegration = args.activeIntegration.slug === 'baselinker';
    const isLinkedInIntegration = isLinkedInIntegrationSlug(args.activeIntegration.slug);
    const requestedConnectionId = options.connectionId?.trim() || null;
    const resolvedConnectionId = requestedConnectionId ?? args.editingConnectionId;
    const isCreateMode =
      options.mode === 'create' || (options.mode !== 'update' && !resolvedConnectionId);
    const normalizedName = formData.name.trim();
    const normalizedUsername = formData.username.trim();

    if (!normalizedName) {
      toast('Connection name is required.', { variant: 'error' });
      return null;
    }
    if (
      !isBaselinkerIntegration &&
      !isLinkedInIntegration &&
      !isVintedIntegration &&
      !normalizedUsername
    ) {
      toast('Username is required for this integration.', { variant: 'error' });
      return null;
    }
    if (!isCreateMode && !resolvedConnectionId) {
      toast('Connection id is required for update.', { variant: 'error' });
      return null;
    }
    if (isCreateMode && !isLinkedInIntegration && !isVintedIntegration && !formData.password.trim()) {
      toast('Password/Token is required.', { variant: 'error' });
      return null;
    }
    const payload: Record<string, unknown> = {
      name: normalizedName,
      ...(normalizedUsername || !isCreateMode || !isVintedIntegration
        ? { username: normalizedUsername }
        : {}),
      ...(formData.password.trim() ? { password: formData.password.trim() } : {}),
      ...(isBrowserIntegration ? { playwrightBrowser: formData.playwrightBrowser } : {}),
      ...(isTraderaIntegration
        ? {
          ...(isTraderaBrowserIntegration
            ? {
              traderaBrowserMode: formData.traderaBrowserMode,
              playwrightListingScript: formData.playwrightListingScript.trim() || null,
            }
            : {}),
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
          traderaApiAppId: Number.parseInt(formData.traderaApiAppId, 10),
          traderaApiAppKey: formData.traderaApiAppKey.trim(),
          traderaApiPublicKey: formData.traderaApiPublicKey.trim() || null,
          traderaApiUserId: Number.parseInt(formData.traderaApiUserId, 10),
          traderaApiToken: formData.traderaApiToken.trim(),
          traderaApiSandbox: formData.traderaApiSandbox,
        }
        : {}),
    };
    try {
      const saved = await upsertConnectionMutation.mutateAsync({
        integrationId: args.activeIntegration.id,
        ...(!isCreateMode ? { connectionId: resolvedConnectionId } : {}),
        payload,
      });
      if (!isCreateMode) {
        args.setEditingConnectionId(saved.id);
      }
      return saved;
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'IntegrationsContext',
        action: 'handleSaveConnection',
        integrationId: args.activeIntegration.id,
        connectionId: resolvedConnectionId,
        mode: isCreateMode ? 'create' : 'update',
      });
      toast((error as Error)?.message ?? 'Failed to save connection.', { variant: 'error' });
      return null;
    }
  };

  const handleDeleteConnection = useCallback(
    (connection: IntegrationConnection): void => {
      args.setConnectionToDelete(connection);
    },
    [args]
  );

  const handleConfirmDeleteConnection = async (userPassword: string): Promise<boolean> => {
    if (!args.connectionToDelete) return false;

    const normalizedPassword = userPassword.trim();
    if (!normalizedPassword) {
      toast('Password is required to delete this connection.', { variant: 'error' });
      return false;
    }

    try {
      await deleteConnectionMutation.mutateAsync({
        integrationId: args.connectionToDelete.integrationId,
        connectionId: args.connectionToDelete.id,
        userPassword: normalizedPassword,
      });
      if (args.editingConnectionId === args.connectionToDelete.id) {
        args.setEditingConnectionId(null);
      }
      args.setConnectionToDelete(null);
      return true;
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'IntegrationsContext',
        action: 'handleConfirmDeleteConnection',
        integrationId: args.connectionToDelete.integrationId,
        connectionId: args.connectionToDelete.id,
      });
      toast((error as Error)?.message ?? 'Failed to delete connection.', { variant: 'error' });
      return false;
    }
  };

  const handleConnectionTest = useCallback(
    async (
      connection: IntegrationConnection,
      type: IntegrationConnectionTestType,
      title: string,
      options?: {
        body?: Record<string, unknown>;
        timeoutMs?: number;
      }
    ): Promise<void> => {
      if (!args.activeIntegration) return;
      args.setIsTesting(true);
      args.setTestLog([]);
      args.setSelectedStep(null);
      args.setShowTestLogModal(false);
      args.setShowTestErrorModal(false);
      args.setTestError(null);
      args.setTestErrorMeta(null);
      args.setShowTestSuccessModal(false);
      args.setTestSuccessMessage(null);

      const requestUrl = `/api/v2/integrations/${args.activeIntegration.id}/connections/${connection.id}/${type}`;
      const startedAt = performance.now();

      try {
        const payload = await testConnectionMutation.mutateAsync({
          integrationId: args.activeIntegration.id,
          connectionId: connection.id,
          type,
          ...(options?.body ? { body: options.body } : {}),
          ...(typeof options?.timeoutMs === 'number' ? { timeoutMs: options.timeoutMs } : {}),
        });

        const normalizedSteps = normalizeSteps((payload.steps as unknown[]) || []);
        if (normalizedSteps.length) args.setTestLog(normalizedSteps);

        const durationMs = Math.round(performance.now() - startedAt);
        let extraInfo = '';
        if (type === 'base/test' && payload['inventoryCount'] !== undefined) {
          extraInfo = `\nInventories found: ${String(payload['inventoryCount'])}`;
        } else if (type === 'allegro/test' && isObjectRecord(payload['profile'])) {
          const profile = payload['profile'];
          const login = profile['login'] ?? '';
          const name = profile['name'] ?? '';
          const identifier = name || login;
          if (identifier) extraInfo = `\nAccount: ${identifier}`;
        }

        args.setTestSuccessMessage(
          `${title} succeeded.\nURL: ${requestUrl}\nDuration: ${durationMs}ms${extraInfo}`
        );
        args.setShowTestSuccessModal(true);
      } catch (error: unknown) {
        const durationMs = Math.round(performance.now() - startedAt);
        logClientCatch(error, {
          source: 'IntegrationsContext',
          action: 'handleConnectionTest',
          integrationId: args.activeIntegration.id,
          connectionId: connection.id,
          type,
          requestUrl,
          durationMs,
        });
        const message = (error as Error)?.message ?? 'Unknown error';
        const data = isObjectRecord((error as { data?: unknown } | null)?.data)
          ? (error as { data?: Record<string, unknown> }).data
          : undefined;

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

          args.setTestLog(steps);
          args.setTestErrorMeta({
            errorId: (data['errorId'] as string) ?? undefined,
            integrationId: (data['integrationId'] as string) ?? null,
            connectionId: (data['connectionId'] as string) ?? null,
          });
        } else {
          args.setTestLog([
            {
              step: `${title} failed`,
              status: 'failed' as const,
              timestamp: new Date().toISOString(),
              detail: errorMessage,
            },
          ]);
        }

        args.setTestError(errorMessage);
        args.setShowTestErrorModal(true);
      } finally {
        args.setIsTesting(false);
      }
    },
    [args, testConnectionMutation]
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
  const handleVintedManualLogin = (c: IntegrationConnection) =>
    handleConnectionTest(c, 'test', 'Vinted manual login test', {
      body: { mode: 'manual', manualTimeoutMs: 240000 },
      timeoutMs: 300000,
    });

  const handleSelectPlaywrightPersona = async (personaId: string | null): Promise<void> => {
    if (!personaId) {
      args.setPlaywrightPersonaId(null);
      return;
    }
    const persona = args.playwrightPersonas.find((p: PlaywrightPersona) => p.id === personaId);
    if (!persona) return;
    args.setPlaywrightPersonaId(persona.id);
    args.setPlaywrightSettings(buildPlaywrightSettings(persona.settings));
    toast(`Applied persona "${persona.name}".`, { variant: 'success' });
  };

  const handleSavePlaywrightSettings = async (): Promise<void> => {
    const connection = activeConnection;
    if (!connection) return;
    try {
      await upsertConnectionMutation.mutateAsync({
        integrationId: args.activeIntegration?.id ?? connection.integrationId,
        connectionId: connection.id,
        payload: {
          name: connection.name,
          username: connection.username,
          playwrightPersonaId: args.playwrightPersonaId,
          ...toPlaywrightConnectionPayload(args.playwrightSettings),
        },
      });
      toast('Playwright settings saved.', { variant: 'success' });
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'IntegrationsContext',
        action: 'handleSavePlaywrightSettings',
        connectionId: connection.id,
      });
      toast((error as Error)?.message ?? 'Failed to save Playwright settings.', {
        variant: 'error',
      });
    }
  };

  const handleAllegroAuthorize = (): void => {
    if (!args.activeIntegration || !activeConnection) {
      toast('Create an Allegro connection first.', { variant: 'error' });
      return;
    }
    window.location.href = `/api/v2/integrations/${args.activeIntegration.id}/connections/${activeConnection.id}/allegro/authorize`;
  };

  const handleAllegroDisconnect = async (): Promise<void> => {
    if (!args.activeIntegration || !activeConnection) return;
    try {
      await disconnectAllegroMutation.mutateAsync({
        integrationId: args.activeIntegration.id,
        connectionId: activeConnection.id,
      });
      toast('Allegro disconnected.', { variant: 'success' });
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'IntegrationsContext',
        action: 'disconnectAllegro',
        integrationId: args.activeIntegration.id,
        connectionId: activeConnection.id,
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
        integrationId: args.activeIntegration?.id ?? activeConnection.integrationId,
        connectionId: activeConnection.id,
        payload: {
          name: activeConnection.name,
          username: activeConnection.username,
          allegroUseSandbox: value,
        },
      });
      toast('Allegro sandbox setting updated.', { variant: 'success' });
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'IntegrationsContext',
        action: 'handleAllegroSandboxToggle',
        connectionId: activeConnection.id,
        value,
      });
      toast((error as Error)?.message ?? 'Failed to update Allegro sandbox setting.', {
        variant: 'error',
      });
    } finally {
      setSavingAllegroSandbox(false);
    }
  };

  const handleAllegroSandboxConnect = async (): Promise<void> => {
    if (!args.activeIntegration || !activeConnection) {
      toast('Create an Allegro connection first.', { variant: 'error' });
      return;
    }
    if (savingAllegroSandbox) return;
    setSavingAllegroSandbox(true);
    try {
      await upsertConnectionMutation.mutateAsync({
        integrationId: args.activeIntegration.id,
        connectionId: activeConnection.id,
        payload: {
          name: activeConnection.name,
          username: activeConnection.username,
          allegroUseSandbox: true,
        },
      });
      window.location.href = `/api/v2/integrations/${args.activeIntegration.id}/connections/${activeConnection.id}/allegro/authorize`;
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'IntegrationsContext',
        action: 'handleAllegroSandboxConnect',
        integrationId: args.activeIntegration.id,
        connectionId: activeConnection.id,
      });
      toast((error as Error)?.message ?? 'Failed to enable Allegro sandbox.', { variant: 'error' });
    } finally {
      setSavingAllegroSandbox(false);
    }
  };

  const handleLinkedInAuthorize = (): void => {
    if (!args.activeIntegration || !activeConnection) {
      toast('Create a LinkedIn connection first.', { variant: 'error' });
      return;
    }
    window.location.href = `/api/v2/integrations/${args.activeIntegration.id}/connections/${activeConnection.id}/linkedin/authorize`;
  };

  const handleLinkedInDisconnect = async (): Promise<void> => {
    if (!args.activeIntegration || !activeConnection) return;
    try {
      await disconnectLinkedInMutation.mutateAsync({
        integrationId: args.activeIntegration.id,
        connectionId: activeConnection.id,
      });
      toast('LinkedIn disconnected.', { variant: 'success' });
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'IntegrationsContext',
        action: 'disconnectLinkedIn',
        integrationId: args.activeIntegration.id,
        connectionId: activeConnection.id,
      });
      toast('Failed to disconnect LinkedIn.', { variant: 'error' });
    }
  };

  const handleBaseApiRequest = async (): Promise<void> => {
    if (!args.activeIntegration || !activeConnection) {
      toast('Create a Base.com connection first.', { variant: 'error' });
      return;
    }
    let params: Record<string, unknown> = {};
    try {
      if (args.baseApiParams.trim())
        params = JSON.parse(args.baseApiParams) as Record<string, unknown>;
    } catch (error) {
      logClientCatch(error, {
        source: 'IntegrationsContext',
        action: 'handleBaseApiRequest.parseParams',
        method: args.baseApiMethod,
      });
      toast('Parameters must be valid JSON.', { variant: 'error' });
      return;
    }
    args.setBaseApiLoading(true);
    args.setBaseApiError(null);
    args.setBaseApiResponse(null);
    try {
      const payload = await baseApiRequestMutation.mutateAsync({
        integrationId: args.activeIntegration.id,
        connectionId: activeConnection.id,
        method: args.baseApiMethod,
        parameters: params,
      });
      args.setBaseApiResponse(payload);
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'IntegrationsContext',
        action: 'handleBaseApiRequest',
        integrationId: args.activeIntegration.id,
        connectionId: activeConnection.id,
        method: args.baseApiMethod,
      });
      args.setBaseApiError((error as Error)?.message ?? 'Failed to send request.');
    } finally {
      args.setBaseApiLoading(false);
    }
  };

  const handleAllegroApiRequest = async (): Promise<void> => {
    if (!args.activeIntegration || !activeConnection) {
      toast('Select an integration connection first.', { variant: 'error' });
      return;
    }
    let body: unknown = undefined;
    if (args.allegroApiMethod !== 'GET' && args.allegroApiBody.trim()) {
      try {
        body = JSON.parse(args.allegroApiBody);
      } catch (error) {
        logClientCatch(error, {
          source: 'IntegrationsContext',
          action: 'handleAllegroApiRequest.parseBody',
          method: args.allegroApiMethod,
          path: args.allegroApiPath,
        });
        toast('Request body must be valid JSON.', { variant: 'error' });
        return;
      }
    }
    args.setAllegroApiLoading(true);
    args.setAllegroApiError(null);
    args.setAllegroApiResponse(null);
    try {
      const payload = await allegroApiRequestMutation.mutateAsync({
        integrationId: args.activeIntegration.id,
        connectionId: activeConnection.id,
        method: args.allegroApiMethod,
        path: args.allegroApiPath,
        body,
      });
      args.setAllegroApiResponse(payload);
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'IntegrationsContext',
        action: 'handleAllegroApiRequest',
        integrationId: args.activeIntegration.id,
        connectionId: activeConnection.id,
        method: args.allegroApiMethod,
        path: args.allegroApiPath,
      });
      args.setAllegroApiError((error as Error)?.message ?? 'Failed to send request.');
    } finally {
      args.setAllegroApiLoading(false);
    }
  };

  const handleResetListingScript = useCallback(async (): Promise<void> => {
    if (!activeConnection || !args.activeIntegration) return;
    try {
      await upsertConnectionMutation.mutateAsync({
        integrationId: args.activeIntegration.id,
        connectionId: activeConnection.id,
        payload: {
          name: activeConnection.name,
          playwrightListingScript: null,
        },
      });
      toast('Listing script reset to managed default.', { variant: 'success' });
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'IntegrationsContext',
        action: 'handleResetListingScript',
        connectionId: activeConnection?.id,
      });
      toast('Failed to reset listing script.', { variant: 'error' });
    }
  }, [activeConnection, args.activeIntegration, toast, upsertConnectionMutation]);

  const onCloseModal = () => args.setIsModalOpen(false);
  const onOpenSessionModal = () => args.setShowSessionModal(true);

  return {
    handleIntegrationClick,
    handleSaveConnection,
    handleDeleteConnection,
    handleConfirmDeleteConnection,
    handleBaselinkerTest,
    handleAllegroTest,
    handleTestConnection,
    handleTraderaManualLogin,
    handleVintedManualLogin,
    handleSelectPlaywrightPersona,
    handleSavePlaywrightSettings,
    handleAllegroAuthorize,
    handleAllegroDisconnect,
    handleAllegroSandboxToggle,
    handleAllegroSandboxConnect,
    handleLinkedInAuthorize,
    handleLinkedInDisconnect,
    handleBaseApiRequest,
    handleAllegroApiRequest,
    onCloseModal,
    onOpenSessionModal,
    handleResetListingScript,
    savingAllegroSandbox,
  };
}
