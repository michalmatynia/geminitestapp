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
import { normalizeSteps } from "@/features/integrations/utils/connections";
import { IntegrationList } from "@/features/integrations/components/connections/IntegrationList";
import { IntegrationModal } from "@/features/integrations/components/connections/IntegrationModal";
import {
  useConnectionSession,
  useIntegrationConnections,
  useIntegrations,
  usePlaywrightPersonas,
} from "@/features/integrations/hooks/useIntegrationQueries";
import {
  useCreateIntegration,
  useDeleteConnection,
  useUpsertConnection,
  useDisconnectAllegro,
  useTestConnection,
  useBaseApiRequest,
  useAllegroApiRequest,
} from "@/features/integrations/hooks/useIntegrationMutations";

const EMPTY_INTEGRATIONS: Integration[] = [];
const EMPTY_CONNECTIONS: IntegrationConnection[] = [];
const EMPTY_PERSONAS: PlaywrightPersona[] = [];

function IntegrationsContent(): React.JSX.Element {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  
  // Queries
  const integrationsQuery = useIntegrations();
  const integrations = integrationsQuery.data ?? EMPTY_INTEGRATIONS;
  
  const [activeIntegration, setActiveIntegration] = useState<Integration | null>(null);
  const connectionsQuery = useIntegrationConnections(activeIntegration?.id);
  const connections = connectionsQuery.data ?? EMPTY_CONNECTIONS;
  
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
    const loadPlaywrightUtils = async (): Promise<void> => {
      if (playwrightPersonas.length === 0) {
        setPlaywrightPersonaId(null);
        return;
      }
      const { findPlaywrightPersonaMatch } = await import("@/features/playwright");
      const match = findPlaywrightPersonaMatch(
        playwrightSettings,
        playwrightPersonas
      );
      setPlaywrightPersonaId(match?.id ?? null);
    };
    void loadPlaywrightUtils();
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
          : `Failed to add ${definition.name}`;
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
      await disconnectAllegroMutation.mutateAsync({
        integrationId: activeIntegration.id,
        connectionId: activeConnection.id,
      });
      toast("Allegro disconnected.", { variant: "success" });
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

  const handleConnectionTest = async (
    connection: IntegrationConnection,
    type: "test" | "base/test" | "allegro/test",
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
    setLastTestError(null);
    setShowTestSuccessModal(false);
    setTestSuccessMessage(null);

    const requestUrl = `/api/integrations/${activeIntegration.id}/connections/${connection.id}/${type}`;
    const startedAt = performance.now();

    try {
      const payload = (await testConnectionMutation.mutateAsync({
        integrationId: activeIntegration.id,
        connectionId: connection.id,
        type,
      })) as TestConnectionResponse & { inventoryCount?: number; profile?: Record<string, unknown> };

      const normalizedSteps = normalizeSteps(payload.steps || []);

      if (normalizedSteps.length) {
        setTestLog(normalizedSteps);
      }

      const durationMs = Math.round(performance.now() - startedAt);
      
      let extraInfo = "";
      if (type === "base/test" && payload.inventoryCount !== undefined) {
        extraInfo = `\nInventories found: ${payload.inventoryCount}`;
      } else if (type === "allegro/test" && payload.profile) {
        const login = typeof payload.profile.login === "string" ? payload.profile.login : "";
        const name = typeof payload.profile.name === "string" ? payload.profile.name : "";
        const identifier = name || login;
        if (identifier) {
          extraInfo = `\nAccount: ${identifier}`;
        }
      }

      setTestSuccessMessage(
        `${title} succeeded.\nURL: ${requestUrl}\nDuration: ${durationMs}ms${extraInfo}`
      );
      setShowTestSuccessModal(true);
      setTestErrorMeta(null);
      refreshConnections(activeIntegration.id);
    } catch (error: unknown) {
      const durationMs = Math.round(performance.now() - startedAt);
      const message = error instanceof Error ? error.message : "Unknown error";
      
      const err = error as Error & { data?: TestConnectionResponse };
      const data = err.data;
      
      let errorMessage = `${title} failed.\nURL: ${requestUrl}\nDuration: ${durationMs}ms\nError: ${message}`;
      
      if (data) {
        const normalizedSteps = normalizeSteps(data.steps || []);
        
        const failedStepDetail =
          normalizedSteps.find((step: TestLogEntry) => step.status === "failed")?.detail ||
          "";

        const errorBody =
          data.error || failedStepDetail || "No response body";
        
        errorMessage = `${title} failed.\nURL: ${requestUrl}\nDuration: ${durationMs}ms\n\nResponse:\n${errorBody}`;

        const steps: TestLogEntry[] = normalizedSteps.length
          ? normalizedSteps.map((step: TestLogEntry) =>
              step.status === "failed" && !step.detail
                ? { ...step, detail: errorMessage }
                : step
            )
          : [
              {
                step: `${title} failed`,
                status: "failed",
                timestamp: new Date().toISOString(),
                detail: errorMessage,
              },
            ];
          
        setTestLog(steps);
        setTestErrorMeta({
          errorId: data.errorId,
          integrationId: data.integrationId,
          connectionId: data.connectionId,
        });
      } else {
        // Fallback log if no structured data
         setTestLog([
              {
                step: `${title} failed`,
                status: "failed",
                timestamp: new Date().toISOString(),
                detail: errorMessage,
              },
            ]);
      }

      setTestError(errorMessage);
      setLastTestError(errorMessage);
      setShowTestErrorModal(true);
    } finally {
      setIsTesting(false);
    }
  };

  const handleBaselinkerTest = (connection: IntegrationConnection): Promise<void> => {
    return handleConnectionTest(connection, "base/test", "Baselinker connection test");
  };

  const handleAllegroTest = (connection: IntegrationConnection): Promise<void> => {
    return handleConnectionTest(connection, "allegro/test", "Allegro connection test");
  };

  const handleTestConnection = (connection: IntegrationConnection): Promise<void> => {
    return handleConnectionTest(connection, "test", "Connection test");
  };

  const handleOpenSessionModal = (): void => {
    if (!activeConnection) return;
    setShowSessionModal(true);
  };

  const handleSelectPlaywrightPersona = async (personaId: string | null): Promise<void> => {
    if (!personaId) {
      setPlaywrightPersonaId(null);
      return;
    }
    const persona = playwrightPersonas.find((item: PlaywrightPersona) => item.id === personaId);
    if (!persona) return;
    const { buildPlaywrightSettings } = await import("@/features/playwright");
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
      const payload = await baseApiRequestMutation.mutateAsync({
        integrationId: activeIntegration.id,
        connectionId: activeConnection.id,
        method,
        parameters: normalizedParams,
      });
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
      const payload = await allegroApiRequestMutation.mutateAsync({
        integrationId: activeIntegration.id,
        connectionId: activeConnection.id,
        method: allegroApiMethod,
        path,
        body,
      });
      setAllegroApiResponse({
        status: payload.status,
        statusText: payload.statusText,
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
          onSelectPlaywrightPersona={(personaId: string | null): void => { void handleSelectPlaywrightPersona(personaId); }}
          playwrightSettings={playwrightSettings}
          setPlaywrightSettings={setPlaywrightSettings}
          onSavePlaywrightSettings={(): void => { void handleSavePlaywrightSettings(); }}
          showPlaywrightSaved={showPlaywrightSaved}
          onOpenSessionModal={(): void => { void handleOpenSessionModal(); }}
          savingAllegroSandbox={savingAllegroSandbox}
          onToggleAllegroSandbox={(v: boolean): void => { void handleAllegroSandboxToggle(v); }}
          onAllegroAuthorize={(): void => { void handleAllegroAuthorize(); }}
          onAllegroDisconnect={(): void => { void handleAllegroDisconnect(); }}
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