"use client";

import { useToast } from "@/shared/ui";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import {
  Integration,
  IntegrationConnection,
  TestLogEntry,
  TestStatus,
  TestConnectionResponse,
  integrationDefinitions,
} from "@/features/integrations/types/integrations-ui";
import { defaultPlaywrightSettings } from "@/features/playwright";
import type { PlaywrightPersona } from "@/features/playwright";
import {
  buildPlaywrightSettings,
  fetchPlaywrightPersonas,
  findPlaywrightPersonaMatch,
} from "@/features/playwright";
import { normalizeSteps } from "@/features/integrations/utils/connections";
import { IntegrationList } from "@/features/integrations/components/connections/IntegrationList";
import { IntegrationModal } from "@/features/integrations/components/connections/IntegrationModal";
import {
  useConnectionSession,
  useIntegrationConnections,
  useIntegrations,
} from "@/features/integrations/hooks/useIntegrationQueries";
import {
  useCreateIntegration,
  useDeleteConnection,
  useUpsertConnection,
} from "@/features/integrations/hooks/useIntegrationMutations";

const EMPTY_INTEGRATIONS: Integration[] = [];
const EMPTY_CONNECTIONS: IntegrationConnection[] = [];

function IntegrationsContent(): React.JSX.Element {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const integrationsQuery = useIntegrations();
  const createIntegrationMutation = useCreateIntegration();
  const upsertConnectionMutation = useUpsertConnection();
  const deleteConnectionMutation = useDeleteConnection();
  const integrations = integrationsQuery.data ?? EMPTY_INTEGRATIONS;
  const [activeIntegration, setActiveIntegration] =
    useState<Integration | null>(null);
  const connectionsQuery = useIntegrationConnections(activeIntegration?.id);
  const connections = connectionsQuery.data ?? EMPTY_CONNECTIONS;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(
    null
  );
  const [connectionForm, setConnectionForm] = useState({
    name: "",
    username: "",
    password: "",
  });

  const [testLog, setTestLog] = useState<TestLogEntry[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [showTestLogModal, setShowTestLogModal] = useState(false);
  const [showTestErrorModal, setShowTestErrorModal] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testErrorMeta, setTestErrorMeta] = useState<{ 
    errorId?: string | undefined;
    integrationId?: string | null | undefined;
    connectionId?: string | null | undefined;
  } | null>(null);
  const [_lastTestError, setLastTestError] = useState<string | null>(null);
  const [showTestSuccessModal, setShowTestSuccessModal] = useState(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(
    null
  );
  const [showPlaywrightSaved, setShowPlaywrightSaved] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [savingAllegroSandbox, setSavingAllegroSandbox] = useState(false);
  const [baseApiMethod, setBaseApiMethod] = useState("getInventories");
  const [baseApiParams, setBaseApiParams] = useState("{}");
  const [baseApiResponse, setBaseApiResponse] = useState<{ 
    data: unknown;
  } | null>(null);
  const [baseApiError, setBaseApiError] = useState<string | null>(null);
  const [baseApiLoading, setBaseApiLoading] = useState(false);
  const [allegroApiMethod, setAllegroApiMethod] = useState("GET");
  const [allegroApiPath, setAllegroApiPath] = useState("/sale/categories");
  const [allegroApiBody, setAllegroApiBody] = useState("{}");
  const [allegroApiResponse, setAllegroApiResponse] = useState<{ 
    status: number;
    statusText: string;
    data: unknown;
    refreshed?: boolean | undefined;
  } | null>(null);
  const [allegroApiError, setAllegroApiError] = useState<string | null>(null);
  const [allegroApiLoading, setAllegroApiLoading] = useState(false);

  const [selectedStep, setSelectedStep] = useState< 
    (TestLogEntry & { status: Exclude<TestStatus, "pending"> }) | null
  >(null);

  const [playwrightSettings, setPlaywrightSettings] = useState(
    defaultPlaywrightSettings
  );
  const [playwrightPersonas, setPlaywrightPersonas] = useState<PlaywrightPersona[]>([]);
  const [playwrightPersonasLoading, setPlaywrightPersonasLoading] = useState(true);
  const [playwrightPersonaId, setPlaywrightPersonaId] = useState<string | null>(null);

  const activeConnection = connections[0] || null;
  const sessionQuery = useConnectionSession(activeConnection?.id, {
    enabled: showSessionModal,
  });
  const sessionPayload = sessionQuery.data as
    | {
        error?: string;
        cookies?: {
          name?: string;
          value?: string;
          domain?: string;
          path?: string;
          expires?: number;
          httpOnly?: boolean;
          secure?: boolean;
          sameSite?: string;
        }[];
        origins?: { origin?: string; localStorage?: { name?: string; value?: string }[] }[];
        updatedAt?: string | null;
      }
    | null;
  const sessionCookies = sessionPayload?.cookies ?? [];
  const sessionOrigins = sessionPayload?.origins ?? [];
  const sessionUpdatedAt = sessionPayload?.updatedAt ?? null;
  const sessionError = sessionQuery.isError
    ? sessionQuery.error instanceof Error
      ? sessionQuery.error.message
      : "Failed to load session cookies."
    : sessionPayload?.error ?? null;

  useEffect(() => {
    const status = searchParams.get("allegro");
    if (!status) return;
    if (status === "connected") {
      toast("Allegro connected.", { variant: "success" });
    } else {
      const reason = searchParams.get("reason");
      const message = reason
        ? `Allegro authorization failed: ${reason}`
        : "Allegro authorization failed.";
      toast(message, { variant: "error" });
    }
    router.replace("/admin/integrations");
  }, [router, searchParams, toast]);

  useEffect((): void => {
    if (!integrationsQuery.isError) return;
    const message =
      integrationsQuery.error instanceof Error
        ? integrationsQuery.error.message
        : "Failed to load integrations.";
    toast(message, { variant: "error" });
  }, [integrationsQuery.error, integrationsQuery.isError, toast]);

  useEffect((): void => {
    if (!connectionsQuery.isError) return;
    const message =
      connectionsQuery.error instanceof Error
        ? connectionsQuery.error.message
        : "Failed to load connections.";
    toast(message, { variant: "error" });
  }, [connectionsQuery.error, connectionsQuery.isError, toast]);

  useEffect(() => {
    if (!activeIntegration) return;
    if (integrations.find((item: Integration) => item.id === activeIntegration.id)) return;
    setActiveIntegration(null);
  }, [activeIntegration, integrations]);

  useEffect((): void | (() => void) => {
    if (!showPlaywrightSaved) return;
    const timeout = setTimeout(() => setShowPlaywrightSaved(false), 2500);
    return () => clearTimeout(timeout);
  }, [showPlaywrightSaved]);

  useEffect((): void | (() => void) => {
    let active = true;
    const loadPersonas = async (): Promise<void> => {
      try {
        const stored = await fetchPlaywrightPersonas();
        if (!active) return;
        setPlaywrightPersonas(stored);
      } catch (error: unknown) {
        if (!active) return;
        const message =
          error instanceof Error ? error.message : "Failed to load personas.";
        toast(message, { variant: "error" });
      } finally {
        if (active) setPlaywrightPersonasLoading(false);
      }
    };
    void loadPersonas();
    return () => {
      active = false;
    };
  }, [toast]);

  const refreshConnections = (integrationId: string): void => {
    void queryClient.invalidateQueries({
      queryKey: ["integration-connections", integrationId],
    });
  };

  useEffect(() => {
    if (connections.length === 0) {
      setEditingConnectionId(null);
      setConnectionForm({ name: "", username: "", password: "" });
      return;
    }
    if (!editingConnectionId) {
      const connection = connections[0];
      if (!connection) return; // Guard against undefined connection
      
      setEditingConnectionId(connection.id);
      setConnectionForm({
        name: connection.name,
        username: connection.username,
        password: "",
      });
      setPlaywrightSettings({
        headless:
          connection.playwrightHeadless ?? defaultPlaywrightSettings.headless,
        slowMo: connection.playwrightSlowMo ?? defaultPlaywrightSettings.slowMo,
        timeout:
          connection.playwrightTimeout ?? defaultPlaywrightSettings.timeout,
        navigationTimeout:
          connection.playwrightNavigationTimeout ??
          defaultPlaywrightSettings.navigationTimeout,
        humanizeMouse:
          connection.playwrightHumanizeMouse ??
          defaultPlaywrightSettings.humanizeMouse,
        mouseJitter:
          connection.playwrightMouseJitter ??
          defaultPlaywrightSettings.mouseJitter,
        clickDelayMin:
          connection.playwrightClickDelayMin ??
          defaultPlaywrightSettings.clickDelayMin,
        clickDelayMax:
          connection.playwrightClickDelayMax ??
          defaultPlaywrightSettings.clickDelayMax,
        inputDelayMin:
          connection.playwrightInputDelayMin ??
          defaultPlaywrightSettings.inputDelayMin,
        inputDelayMax:
          connection.playwrightInputDelayMax ??
          defaultPlaywrightSettings.inputDelayMax,
        actionDelayMin:
          connection.playwrightActionDelayMin ??
          defaultPlaywrightSettings.actionDelayMin,
        actionDelayMax:
          connection.playwrightActionDelayMax ??
          defaultPlaywrightSettings.actionDelayMax,
        proxyEnabled:
          connection.playwrightProxyEnabled ??
          defaultPlaywrightSettings.proxyEnabled,
        proxyServer:
          connection.playwrightProxyServer ??
          defaultPlaywrightSettings.proxyServer,
        proxyUsername:
          connection.playwrightProxyUsername ??
          defaultPlaywrightSettings.proxyUsername,
        proxyPassword: "",
        emulateDevice:
          connection.playwrightEmulateDevice ??
          defaultPlaywrightSettings.emulateDevice,
        deviceName:
          connection.playwrightDeviceName ??
          defaultPlaywrightSettings.deviceName,
      });
    }
  }, [connections, editingConnectionId]);

  useEffect(() => {
    if (playwrightPersonas.length === 0) {
      setPlaywrightPersonaId(null);
      return;
    }
    const match = findPlaywrightPersonaMatch(
      playwrightSettings,
      playwrightPersonas
    );
    setPlaywrightPersonaId(match?.id ?? null);
  }, [playwrightPersonas, playwrightSettings]);

  const ensureIntegration = async (
    definition: (typeof integrationDefinitions)[number]
  ): Promise<Integration | null> => {
    let currentIntegrations = integrations;
    if (!currentIntegrations.length && integrationsQuery.isFetching) {
      const refreshed = await integrationsQuery.refetch();
      currentIntegrations = refreshed.data ?? integrationsQuery.data ?? [];
    }
    const existing = currentIntegrations.find(
      (integration: Integration) => integration.slug === definition.slug
    );
    if (existing) return existing;
    try {
      const created = await createIntegrationMutation.mutateAsync({
        name: definition.name,
        slug: definition.slug,
      });
      return created;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : `Failed to add ${definition.name}.`;
      toast(message, { variant: "error" });
      return null;
    }
  };

  const handleIntegrationClick = async (
    definition: (typeof integrationDefinitions)[number]
  ): Promise<void> => {
    const integration = await ensureIntegration(definition);
    if (!integration) return;
    setActiveIntegration(integration);
    refreshConnections(integration.id);
    setIsModalOpen(true);
  };

  const handleSaveConnection = async (): Promise<void> => {
    if (!activeIntegration) return;
    if (!connectionForm.name.trim() || !connectionForm.username.trim()) {
      toast("Connection name and username are required.", {
        variant: "error",
      });
      return;
    }
    if (!editingConnectionId && !connectionForm.password.trim()) {
      toast("Password/Token is required.", { variant: "error" });
      return;
    }
    const payload = {
      name: connectionForm.name.trim(),
      username: connectionForm.username.trim(),
      ...(connectionForm.password.trim()
        ? { password: connectionForm.password.trim() }
        : {}),
    };
    try {
      await upsertConnectionMutation.mutateAsync({
        integrationId: activeIntegration.id,
        ...(editingConnectionId ? { connectionId: editingConnectionId } : {}),
        payload,
      });
      setConnectionForm({ name: "", username: "", password: "" });
      setEditingConnectionId(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to save connection.";
      toast(message, { variant: "error" });
    }
  };

  const handleAllegroAuthorize = (): void => {
    if (!activeIntegration || !activeConnection) {
      toast("Create an Allegro connection first.", { variant: "error" });
      return;
    }
    window.location.href = `/api/integrations/${activeIntegration.id}/connections/${activeConnection.id}/allegro/authorize`;
  };

  const handleAllegroDisconnect = async (): Promise<void> => {
    if (!activeIntegration || !activeConnection) return;
    try {
      const res = await fetch(
        `/api/integrations/${activeIntegration.id}/connections/${activeConnection.id}/allegro/disconnect`,
        { method: "POST" }
      );
      if (!res.ok) {
        const error = (await res.json()) as {
          error?: string;
          errorId?: string;
        };
        const message = error.error || "Failed to disconnect Allegro.";
        const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
        toast(`${message}${suffix}`, { variant: "error" });
        return;
      }
      toast("Allegro disconnected.", { variant: "success" });
      refreshConnections(activeIntegration.id);
    } catch (error: unknown) {
      console.error("Failed to disconnect Allegro:", error);
      toast("Failed to disconnect Allegro.", { variant: "error" });
    }
  };

  const handleDeleteConnection = async (connection: IntegrationConnection): Promise<void> => {
    const confirmed = window.confirm(`Delete connection "${connection.name}"?`);
    if (!confirmed) return;
    try {
      await deleteConnectionMutation.mutateAsync({
        integrationId: connection.integrationId,
        connectionId: connection.id,
      });
      if (editingConnectionId === connection.id) {
        setEditingConnectionId(null);
        setConnectionForm({ name: "", username: "", password: "" });
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete connection.";
      toast(message, { variant: "error" });
    }
  };

  const handleBaselinkerTest = async (connection: IntegrationConnection): Promise<void> => {
    if (!activeIntegration) return;
    setIsTesting(true);
    setTestLog([]);
    setSelectedStep(null);
    setShowTestLogModal(false);
    setShowTestErrorModal(false);
    setTestError(null);
    setTestErrorMeta(null);
    setLastTestError(null);
    setShowTestSuccessModal(false);
    setTestSuccessMessage(null);

    const requestUrl = `/api/integrations/${activeIntegration.id}/connections/${connection.id}/base/test`;
    const startedAt = performance.now();

    try {
      const res = await fetch(requestUrl, { method: "POST" });
      const contentType = res.headers.get("content-type") || "";

      let payload: TestConnectionResponse & { inventoryCount?: number };
      if (contentType.includes("application/json")) {
        payload = (await res.json()) as TestConnectionResponse & {
          inventoryCount?: number;
        };
      } else {
        payload = { error: await res.text() };
      }

      const normalizedSteps = normalizeSteps(payload.steps);

      if (!res.ok) {
        const failedStepDetail = 
          normalizedSteps.find((step: TestLogEntry) => step.status === "failed")?.detail ||
          "";

        const errorBody =
          payload.error || failedStepDetail || "No response body";
        const statusLabel = `${res.status} ${res.statusText}`.trim();
        const durationMs = Math.round(performance.now() - startedAt);

        const errorMessage = `Baselinker test failed.\nStatus: ${statusLabel}\nURL: ${requestUrl}\nDuration: ${durationMs}ms\n\nResponse:\n${errorBody}`;

        const steps: TestLogEntry[] = normalizedSteps.length
          ? normalizedSteps.map((step: TestLogEntry) =>
              step.status === "failed" && !step.detail
                ? { ...step, detail: errorMessage }
                : step
            )
          : [
              {
                step: "Connection test failed",
                status: "failed",
                timestamp: new Date().toISOString(),
                detail: errorMessage,
              },
            ];

        setTestLog(steps);
        setTestError(errorMessage);
        setTestErrorMeta({
          errorId: payload.errorId,
          integrationId: payload.integrationId,
          connectionId: payload.connectionId,
        });
        setLastTestError(errorMessage);
        setShowTestErrorModal(true);
        return;
      }

      if (normalizedSteps.length) {
        setTestLog(normalizedSteps);
      }

      const durationMs = Math.round(performance.now() - startedAt);
      const inventoryInfo = 
        payload.inventoryCount !== undefined
          ? `\nInventories found: ${payload.inventoryCount}`
          : "";
      setTestSuccessMessage(
        `Baselinker connection test succeeded.\nURL: ${requestUrl}\nDuration: ${durationMs}ms${inventoryInfo}`
      );
      setShowTestSuccessModal(true);
      setTestErrorMeta(null);
      refreshConnections(activeIntegration.id);
    } catch (error: unknown) {
      const durationMs = Math.round(performance.now() - startedAt);
      const message = error instanceof Error ? error.message : "Unknown error";
      const errorMessage = `Baselinker test failed.\nURL: ${requestUrl}\nDuration: ${durationMs}ms\nError: ${message}`;
      setTestError(errorMessage);
      setTestErrorMeta(null);
      setLastTestError(errorMessage);
      setShowTestErrorModal(true);
    } finally {
      setIsTesting(false);
    }
  };

  const handleAllegroTest = async (connection: IntegrationConnection): Promise<void> => {
    if (!activeIntegration) return;
    setIsTesting(true);
    setTestLog([]);
    setSelectedStep(null);
    setShowTestLogModal(false);
    setShowTestErrorModal(false);
    setTestError(null);
    setTestErrorMeta(null);
    setLastTestError(null);
    setShowTestSuccessModal(false);
    setTestSuccessMessage(null);

    const requestUrl = `/api/integrations/${activeIntegration.id}/connections/${connection.id}/allegro/test`;
    const startedAt = performance.now();

    try {
      const res = await fetch(requestUrl, { method: "POST" });
      const contentType = res.headers.get("content-type") || "";

      let payload: TestConnectionResponse;
      if (contentType.includes("application/json")) {
        payload = (await res.json()) as TestConnectionResponse;
      } else {
        payload = { error: await res.text() };
      }

      const normalizedSteps = normalizeSteps(payload.steps);

      if (!res.ok) {
        const failedStepDetail = 
          normalizedSteps.find((step: TestLogEntry) => step.status === "failed")?.detail ||
          "";
        const errorBody =
          payload.error || failedStepDetail || "No response body";
        const statusLabel = `${res.status} ${res.statusText}`.trim();
        const durationMs = Math.round(performance.now() - startedAt);

        const errorMessage = `Allegro connection test failed.\nStatus: ${statusLabel}\nURL: ${requestUrl}\nDuration: ${durationMs}ms\n\nResponse:\n${errorBody}`;

        const steps: TestLogEntry[] = normalizedSteps.length
          ? normalizedSteps.map((step: TestLogEntry) =>
              step.status === "failed" && !step.detail
                ? { ...step, detail: errorMessage }
                : step
            )
          : [
              {
                step: "Allegro connection test failed",
                status: "failed",
                timestamp: new Date().toISOString(),
                detail: errorMessage,
              },
            ];

        setTestLog(steps);
        setTestError(errorMessage);
        setTestErrorMeta({
          errorId: payload.errorId,
          integrationId: payload.integrationId,
          connectionId: payload.connectionId,
        });
        setLastTestError(errorMessage);
        setShowTestErrorModal(true);
        return;
      }

      if (normalizedSteps.length) {
        setTestLog(normalizedSteps);
      }

      const durationMs = Math.round(performance.now() - startedAt);
      let profileSummary = "";
      if (payload.profile && typeof payload.profile === "object") {
        const profile = payload.profile as Record<string, unknown>;
        const login = typeof profile.login === "string" ? profile.login : "";
        const name = typeof profile.name === "string" ? profile.name : "";
        const identifier = name || login;
        if (identifier) {
          profileSummary = `\nAccount: ${identifier}`;
        }
      }
      setTestSuccessMessage(
        `Allegro connection test succeeded.\nURL: ${requestUrl}\nDuration: ${durationMs}ms${profileSummary}`
      );
      setShowTestSuccessModal(true);
      setTestErrorMeta(null);
      refreshConnections(activeIntegration.id);
    } catch (error: unknown) {
      const durationMs = Math.round(performance.now() - startedAt);
      const message = error instanceof Error ? error.message : "Unknown error";
      const errorMessage = `Allegro connection test failed.\nURL: ${requestUrl}\nDuration: ${durationMs}ms\nError: ${message}`;
      setTestError(errorMessage);
      setTestErrorMeta(null);
      setLastTestError(errorMessage);
      setShowTestErrorModal(true);
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestConnection = async (connection: IntegrationConnection): Promise<void> => {
    if (!activeIntegration) return;
    setIsTesting(true);
    setTestLog([]);
    setSelectedStep(null);
    setShowTestLogModal(false);
    setShowTestErrorModal(false);
    setTestError(null);
    setTestErrorMeta(null);
    setLastTestError(null);
    setShowTestSuccessModal(false);
    setTestSuccessMessage(null);

    const requestUrl = `/api/integrations/${activeIntegration.id}/connections/${connection.id}/test`;
    const startedAt = performance.now();

    try {
      const res = await fetch(requestUrl, { method: "POST" });
      const contentType = res.headers.get("content-type") || "";

      let payload: TestConnectionResponse;
      if (contentType.includes("application/json")) {
        payload = (await res.json()) as TestConnectionResponse;
      } else {
        payload = { error: await res.text() };
      }

      const normalizedSteps = normalizeSteps(payload.steps);

      if (!res.ok) {
        const failedStepDetail = 
          normalizedSteps.find((step: TestLogEntry) => step.status === "failed")?.detail ||
          "";

        const errorBody =
          payload.error || failedStepDetail || "No response body";
        const statusLabel = `${res.status} ${res.statusText}`.trim();
        const durationMs = Math.round(performance.now() - startedAt);

        const errorMessage = `Connection test failed.\nStatus: ${statusLabel}\nURL: ${requestUrl}\nDuration: ${durationMs}ms\n\nResponse:\n${errorBody}`;

        const steps: TestLogEntry[] = normalizedSteps.length
          ? normalizedSteps.map((step: TestLogEntry) =>
              step.status === "failed" && !step.detail
                ? { ...step, detail: errorMessage }
                : step
            )
          : [
              {
                step: "Connection test failed",
                status: "failed",
                timestamp: new Date().toISOString(),
                detail: errorMessage,
              },
            ];

        setTestLog(steps);
        setTestError(errorMessage);
        setTestErrorMeta({
          errorId: payload.errorId,
          integrationId: payload.integrationId,
          connectionId: payload.connectionId,
        });
        setLastTestError(errorMessage);
        setShowTestErrorModal(true);
        return;
      }

      if (normalizedSteps.length) {
        setTestLog(normalizedSteps);
      }

      const durationMs = Math.round(performance.now() - startedAt);
      setTestSuccessMessage(
        `Connection test succeeded.\nURL: ${requestUrl}\nDuration: ${durationMs}ms`
      );
      setShowTestSuccessModal(true);
      setTestErrorMeta(null);
      refreshConnections(activeIntegration.id);
    } catch (error: unknown) {
      const durationMs = Math.round(performance.now() - startedAt);
      const message = error instanceof Error ? error.message : "Unknown error";
      const errorMessage = `Connection test failed.\nURL: ${requestUrl}\nDuration: ${durationMs}ms\nError: ${message}`;
      setTestError(errorMessage);
      setTestErrorMeta(null);
      setLastTestError(errorMessage);
      setShowTestErrorModal(true);
    } finally {
      setIsTesting(false);
    }
  };

  const handleOpenSessionModal = (): void => {
    if (!activeConnection) return;
    setShowSessionModal(true);
  };

  const handleSelectPlaywrightPersona = (personaId: string | null): void => {
    if (!personaId) {
      setPlaywrightPersonaId(null);
      return;
    }
    const persona = playwrightPersonas.find((item: PlaywrightPersona) => item.id === personaId);
    if (!persona) return;
    setPlaywrightPersonaId(persona.id);
    setPlaywrightSettings(buildPlaywrightSettings(persona.settings));
    toast(`Applied persona "${persona.name}".`, { variant: "success" });
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
          playwrightHeadless: playwrightSettings.headless,
          playwrightSlowMo: playwrightSettings.slowMo,
          playwrightTimeout: playwrightSettings.timeout,
          playwrightNavigationTimeout: playwrightSettings.navigationTimeout,
          playwrightHumanizeMouse: playwrightSettings.humanizeMouse,
          playwrightMouseJitter: playwrightSettings.mouseJitter,
          playwrightClickDelayMin: playwrightSettings.clickDelayMin,
          playwrightClickDelayMax: playwrightSettings.clickDelayMax,
          playwrightInputDelayMin: playwrightSettings.inputDelayMin,
          playwrightInputDelayMax: playwrightSettings.inputDelayMax,
          playwrightActionDelayMin: playwrightSettings.actionDelayMin,
          playwrightActionDelayMax: playwrightSettings.actionDelayMax,
          playwrightProxyEnabled: playwrightSettings.proxyEnabled,
          playwrightProxyServer: playwrightSettings.proxyServer,
          playwrightProxyUsername: playwrightSettings.proxyUsername,
          playwrightProxyPassword: playwrightSettings.proxyPassword,
          playwrightEmulateDevice: playwrightSettings.emulateDevice,
          playwrightDeviceName: playwrightSettings.deviceName,
        },
      });
      setShowPlaywrightSaved(true);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save Playwright settings.";
      toast(message, { variant: "error" });
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
      toast("Allegro sandbox setting updated.", { variant: "success" });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update Allegro sandbox setting.";
      toast(message, { variant: "error" });
    } finally {
      setSavingAllegroSandbox(false);
    }
  };

  const handleAllegroSandboxConnect = async (): Promise<void> => {
    if (!activeIntegration || !activeConnection) {
      toast("Create an Allegro connection first.", { variant: "error" });
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
      const message =
        error instanceof Error ? error.message : "Failed to enable Allegro sandbox.";
      toast(message, { variant: "error" });
    } finally {
      setSavingAllegroSandbox(false);
    }
  };

  const handleBaseApiRequest = async (): Promise<void> => {
    if (!activeIntegration || !activeConnection) {
      toast("Create a Base.com connection first.", { variant: "error" });
      return;
    }
    const methodInput = baseApiMethod.trim();
    const normalizedMethodKey = methodInput.toLowerCase().replace(/\s+/g, "");
    const methodAliases: Record<string, string> = {
      orderlog: "getOrdersLog",
      orderslog: "getOrdersLog",
      getorderslog: "getOrdersLog",
      detailedproductlist: "getInventoryProductsDetailed",
      detailedproducts: "getInventoryProductsDetailed",
      getinventoryproductsdetailed: "getInventoryProductsDetailed",
      detailedproduct: "getInventoryProductDetailed",
      getinventoryproductdetailed: "getInventoryProductDetailed",
      orders: "getOrders",
      getorders: "getOrders",
      inventories: "getInventories",
      getinventories: "getInventories",
      inventoryproducts: "getInventoryProductsList",
      getinventoryproductslist: "getInventoryProductsList",
      productslist: "getProductsList",
      getproductslist: "getProductsList",
      orderstatuses: "getOrderStatusList",
      getorderstatuslist: "getOrderStatusList",
    };
    const method = methodAliases[normalizedMethodKey] ?? methodInput;
    if (!method) {
      toast("Base API method is required.", { variant: "error" });
      return;
    }
    if (method !== methodInput) {
      setBaseApiMethod(method);
    }
    let params: unknown = {};
    if (baseApiParams.trim()) {
      try {
        params = JSON.parse(baseApiParams);
      } catch {
        toast("Parameters must be valid JSON.", { variant: "error" });
        return;
      }
    }
    const normalizedParams = 
      params && typeof params === "object" && !Array.isArray(params)
        ? { ...(params as Record<string, unknown>) }
        : {};
    const inventoryMethods = new Set([
      "getInventoryProductsList",
      "getInventoryProductsData",
      "getInventoryProductsDetailed",
    ]);
    const storageMethods = new Set(["getProductsList", "getProductsData"]);
    if (inventoryMethods.has(method)) {
      const inventoryValue = normalizedParams.inventory_id;
      const hasInventoryId =
        (typeof inventoryValue === "string" && inventoryValue.trim() !== "") ||
        (typeof inventoryValue === "number" && Number.isFinite(inventoryValue));
      const looksEmpty =
        !hasInventoryId || inventoryValue === 0 || inventoryValue === "0";
      if (looksEmpty && activeConnection.baseLastInventoryId) {
        normalizedParams.inventory_id = activeConnection.baseLastInventoryId;
      } else if (looksEmpty) {
        toast("Inventory ID is required. Run getInventories first.", {
          variant: "error",
        });
        return;
      }
    }
    if (storageMethods.has(method)) {
      const storageValue = normalizedParams.storage_id;
      const hasStorageId =
        (typeof storageValue === "string" && storageValue.trim() !== "") ||
        (typeof storageValue === "number" && Number.isFinite(storageValue));
      const looksEmpty =
        !hasStorageId || storageValue === 0 || storageValue === "0";
      if (looksEmpty && activeConnection.baseLastInventoryId) {
        normalizedParams.storage_id = activeConnection.baseLastInventoryId;
      } else if (looksEmpty) {
        toast("Storage ID is required. Run getInventories first.", {
          variant: "error",
        });
        return;
      }
    }
    const normalizedParamsText = JSON.stringify(normalizedParams, null, 2);
    if (normalizedParamsText !== baseApiParams) {
      setBaseApiParams(normalizedParamsText);
    }
    setBaseApiLoading(true);
    setBaseApiError(null);
    setBaseApiResponse(null);
    try {
      const res = await fetch(
        `/api/integrations/${activeIntegration.id}/connections/${activeConnection.id}/base/request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method, parameters: normalizedParams }),
        }
      );
      const payload = (await res.json()) as { error?: string; data?: unknown };
      if (!res.ok) {
        setBaseApiError(payload.error || "Request failed.");
        return;
      }
      setBaseApiResponse({ data: payload.data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to send request.";
      setBaseApiError(message);
    } finally {
      setBaseApiLoading(false);
    }
  };

  const handleAllegroApiRequest = async (): Promise<void> => {
    if (!activeIntegration || !activeConnection) {
      toast("Select an integration connection first.", { variant: "error" });
      return;
    }
    const path = allegroApiPath.trim();
    if (!path.startsWith("/")) {
      toast("Allegro API path must start with /", { variant: "error" });
      return;
    }
    let body: unknown = undefined;
    if (allegroApiMethod !== "GET" && allegroApiBody.trim()) {
      try {
        body = JSON.parse(allegroApiBody);
      } catch {
        toast("Request body must be valid JSON.", { variant: "error" });
        return;
      }
    }
    setAllegroApiLoading(true);
    setAllegroApiError(null);
    setAllegroApiResponse(null);
    try {
      const res = await fetch(
        `/api/integrations/${activeIntegration.id}/connections/${activeConnection.id}/allegro/request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: allegroApiMethod,
            path,
            body,
          }),
        }
      );
      const payload = (await res.json()) as {
        error?: string;
        status?: number;
        statusText?: string;
        data?: unknown;
        refreshed?: boolean;
      };
      if (!res.ok) {
        setAllegroApiError(payload.error || "Request failed.");
        return;
      }
      setAllegroApiResponse({
        status: payload.status ?? res.status,
        statusText: payload.statusText ?? "",
        data: payload.data,
        refreshed: payload.refreshed,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to send request.";
      setAllegroApiError(message);
    } finally {
      setAllegroApiLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <IntegrationList
        integrations={integrations}
        onIntegrationClick={(def: (typeof integrationDefinitions)[number]): void => { void handleIntegrationClick(def); }}
      />

      {isModalOpen && activeIntegration && (
        <IntegrationModal
          activeIntegration={activeIntegration}
          connections={connections}
          onClose={(): void => setIsModalOpen(false)}
          editingConnectionId={editingConnectionId}
          setEditingConnectionId={setEditingConnectionId}
          connectionForm={connectionForm}
          setConnectionForm={setConnectionForm}
          onSaveConnection={(): void => { void handleSaveConnection(); }}
          onDeleteConnection={(c: IntegrationConnection): void => { void handleDeleteConnection(c); }}
          onTestConnection={(c: IntegrationConnection): void => { void handleTestConnection(c); }}
          onBaselinkerTest={(c: IntegrationConnection): void => { void handleBaselinkerTest(c); }}
          onAllegroTest={(c: IntegrationConnection): void => { void handleAllegroTest(c); }}
          isTesting={isTesting}
          testLog={testLog}
          onShowLog={(step: TestLogEntry): void => {
            setSelectedStep(
              step.status !== "pending"
                ? (step as TestLogEntry & { status: "ok" | "failed" })
                : null
            );
            setShowTestLogModal(true);
          }}
          showTestLogModal={showTestLogModal}
          onCloseTestLogModal={(): void => setShowTestLogModal(false)}
          selectedStep={selectedStep}
          showTestErrorModal={showTestErrorModal}
          testError={testError}
          testErrorMeta={testErrorMeta}
          onCloseTestErrorModal={(): void => setShowTestErrorModal(false)}
          showTestSuccessModal={showTestSuccessModal}
          testSuccessMessage={testSuccessMessage}
          onCloseTestSuccessModal={(): void => setShowTestSuccessModal(false)}
          showSessionModal={showSessionModal}
          sessionLoading={sessionQuery.isFetching}
          sessionError={sessionError}
          sessionCookies={sessionCookies}
          sessionOrigins={sessionOrigins}
          sessionUpdatedAt={sessionUpdatedAt}
          onCloseSessionModal={(): void => setShowSessionModal(false)}
          playwrightPersonas={playwrightPersonas}
          playwrightPersonasLoading={playwrightPersonasLoading}
          playwrightPersonaId={playwrightPersonaId}
          onSelectPlaywrightPersona={handleSelectPlaywrightPersona}
          playwrightSettings={playwrightSettings}
          setPlaywrightSettings={setPlaywrightSettings}
          onSavePlaywrightSettings={(): void => { void handleSavePlaywrightSettings(); }}
          showPlaywrightSaved={showPlaywrightSaved}
          onOpenSessionModal={(): void => { void handleOpenSessionModal(); }}
          savingAllegroSandbox={savingAllegroSandbox}
          onToggleAllegroSandbox={(v: boolean): void => { void handleAllegroSandboxToggle(v); }}
          onAllegroAuthorize={(): void => { void handleAllegroAuthorize(); }}
          onDisconnect={(): void => { void handleAllegroDisconnect(); }}
          onAllegroSandboxConnect={(): void => { void handleAllegroSandboxConnect(); }}
          baseApiMethod={baseApiMethod}
          setBaseApiMethod={setBaseApiMethod}
          baseApiParams={baseApiParams}
          setBaseApiParams={setBaseApiParams}
          baseApiLoading={baseApiLoading}
          baseApiError={baseApiError}
          baseApiResponse={baseApiResponse}
          onBaseApiRequest={(): void => { void handleBaseApiRequest(); }}
          allegroApiMethod={allegroApiMethod}
          setAllegroApiMethod={setAllegroApiMethod}
          allegroApiPath={allegroApiPath}
          setAllegroApiPath={setAllegroApiPath}
          allegroApiBody={allegroApiBody}
          setAllegroApiBody={setAllegroApiBody}
          allegroApiLoading={allegroApiLoading}
          allegroApiError={allegroApiError}
          allegroApiResponse={allegroApiResponse}
          onAllegroApiRequest={(): void => { void handleAllegroApiRequest(); }}
        />
      )}
    </div>
  );
}

export default function IntegrationsPage(): React.JSX.Element {
  return (
    <Suspense fallback={<div>Loading integrations...</div>}>
      <IntegrationsContent />
    </Suspense>
  );
}
