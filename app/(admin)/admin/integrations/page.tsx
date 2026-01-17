"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PlusIcon, SettingsIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";

type Integration = {
  id: string;
  name: string;
  slug: string;
};

type IntegrationConnection = {
  id: string;
  integrationId: string;
  name: string;
  username: string;
  hasAllegroAccessToken?: boolean;
  allegroTokenUpdatedAt?: string | null;
  allegroExpiresAt?: string | null;
  allegroScope?: string | null;
  allegroUseSandbox?: boolean;
  hasBaseApiToken?: boolean;
  baseTokenUpdatedAt?: string | null;
  baseLastInventoryId?: string | null;
  hasPlaywrightStorageState?: boolean;
  playwrightStorageStateUpdatedAt?: string | null;
  playwrightHeadless?: boolean;
  playwrightSlowMo?: number;
  playwrightTimeout?: number;
  playwrightNavigationTimeout?: number;
  playwrightHumanizeMouse?: boolean;
  playwrightMouseJitter?: number;
  playwrightClickDelayMin?: number;
  playwrightClickDelayMax?: number;
  playwrightInputDelayMin?: number;
  playwrightInputDelayMax?: number;
  playwrightActionDelayMin?: number;
  playwrightActionDelayMax?: number;
  playwrightProxyEnabled?: boolean;
  playwrightProxyServer?: string | null;
  playwrightProxyUsername?: string | null;
  playwrightProxyHasPassword?: boolean;
  playwrightEmulateDevice?: boolean;
  playwrightDeviceName?: string | null;
};

const TEST_STATUSES = ["pending", "ok", "failed"] as const;
type TestStatus = (typeof TEST_STATUSES)[number];

type TestLogEntry = {
  step: string;
  status: TestStatus;
  timestamp: string;
  detail?: string;
};

type TestConnectionResponse = {
  error?: string;
  errorId?: string;
  integrationId?: string | null;
  connectionId?: string | null;
  steps?: unknown;
  profile?: unknown;
};

const coerceStatus = (value: unknown): TestStatus => {
  return value === "pending" || value === "ok" || value === "failed"
    ? value
    : "failed";
};

const normalizeSteps = (value: unknown): TestLogEntry[] => {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    const s =
      raw && typeof raw === "object"
        ? (raw as Record<string, unknown>)
        : {};
    const stepValue = s?.step;
    return {
      step:
        typeof stepValue === "string"
          ? stepValue
          : stepValue == null
            ? ""
            : typeof stepValue === "number" || typeof stepValue === "boolean"
              ? String(stepValue)
              : JSON.stringify(stepValue),
      status: coerceStatus(s?.status),
      timestamp:
        typeof s?.timestamp === "string"
          ? s.timestamp
          : new Date().toISOString(),
      detail: typeof s?.detail === "string" ? s.detail : undefined,
    };
  });
};

const defaultPlaywrightSettings = {
  headless: true,
  slowMo: 50,
  timeout: 15000,
  navigationTimeout: 30000,
  humanizeMouse: false,
  mouseJitter: 6,
  clickDelayMin: 30,
  clickDelayMax: 120,
  inputDelayMin: 20,
  inputDelayMax: 120,
  actionDelayMin: 200,
  actionDelayMax: 900,
  proxyEnabled: false,
  proxyServer: "",
  proxyUsername: "",
  proxyPassword: "",
  emulateDevice: false,
  deviceName: "Desktop Chrome",
};

const integrationDefinitions = [
  { name: "Tradera", slug: "tradera" },
  { name: "Allegro", slug: "allegro" },
  { name: "Baselinker", slug: "baselinker" },
] as const;

export default function IntegrationsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [activeIntegration, setActiveIntegration] =
    useState<Integration | null>(null);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
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
    errorId?: string;
    integrationId?: string | null;
    connectionId?: string | null;
  } | null>(null);
  const [lastTestError, setLastTestError] = useState<string | null>(null);
  const [showTestSuccessModal, setShowTestSuccessModal] = useState(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(
    null
  );
  const [showPlaywrightSaved, setShowPlaywrightSaved] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionCookies, setSessionCookies] = useState<
    {
      name?: string;
      value?: string;
      domain?: string;
      path?: string;
      expires?: number;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: string;
    }[]
  >([]);
  const [sessionOrigins, setSessionOrigins] = useState<
    { origin?: string; localStorage?: { name?: string; value?: string }[] }[]
  >([]);
  const [sessionUpdatedAt, setSessionUpdatedAt] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
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
    refreshed?: boolean;
  } | null>(null);
  const [allegroApiError, setAllegroApiError] = useState<string | null>(null);
  const [allegroApiLoading, setAllegroApiLoading] = useState(false);

  const [selectedStep, setSelectedStep] = useState<
    (TestLogEntry & { status: Exclude<TestStatus, "pending"> }) | null
  >(null);

  const deviceOptions = [
    { value: "Desktop Chrome", label: "Desktop Chrome" },
    { value: "Desktop Firefox", label: "Desktop Firefox" },
    { value: "Desktop Safari", label: "Desktop Safari" },
    { value: "iPhone 13", label: "iPhone 13" },
    { value: "iPhone 14 Pro", label: "iPhone 14 Pro" },
    { value: "Pixel 7", label: "Pixel 7" },
    { value: "iPad (gen 7)", label: "iPad (gen 7)" },
  ];

  const [playwrightSettings, setPlaywrightSettings] = useState(
    defaultPlaywrightSettings
  );

  const activeConnection = connections[0] || null;
  const integrationSlug = activeIntegration?.slug ?? "";
  const isTradera = integrationSlug === "tradera";
  const isAllegro = integrationSlug === "allegro";
  const isBaselinker = integrationSlug === "baselinker";
  const showPlaywright = isTradera;
  const showAllegroConsole = isAllegro;
  const showBaseConsole = isBaselinker;
  const allegroConnected = Boolean(activeConnection?.hasAllegroAccessToken);
  const baselinkerConnected = Boolean(activeConnection?.hasBaseApiToken);
  const allegroExpiresAt = activeConnection?.allegroExpiresAt
    ? new Date(activeConnection.allegroExpiresAt).toLocaleString()
    : "—";
  const connectionNamePlaceholder = isAllegro
    ? "Integration name (e.g. Allegro Main)"
    : isBaselinker
      ? "Integration name (e.g. Main Baselinker)"
      : "Integration name (e.g. John's Tradera)";
  const usernameLabel = isAllegro
    ? "Allegro client ID"
    : isBaselinker
      ? "Account name (optional)"
      : "Tradera username";
  const usernamePlaceholder = isAllegro
    ? "Allegro client ID"
    : isBaselinker
      ? "Account name (for reference)"
      : "Tradera username";
  const passwordLabel = isAllegro
    ? "Allegro client secret"
    : isBaselinker
      ? "Baselinker API token"
      : "Tradera password";
  const usernameRequiredLabel = isAllegro ? "client ID" : isBaselinker ? "account name" : "username";
  const passwordRequiredLabel = isAllegro ? "Client secret" : isBaselinker ? "API token" : "Password";
  const baseTokenUpdatedAt = activeConnection?.baseTokenUpdatedAt
    ? new Date(activeConnection.baseTokenUpdatedAt).toLocaleString()
    : "—";

  const allegroApiPresets = [
    { label: "Categories", method: "GET", path: "/sale/categories" },
    { label: "Offers", method: "GET", path: "/sale/offers?limit=10" },
    { label: "Offer Events", method: "GET", path: "/sale/offer-events?limit=10" },
    { label: "Checkout Forms", method: "GET", path: "/order/checkout-forms?limit=10" },
    { label: "Shipping Rates", method: "GET", path: "/sale/shipping-rates" },
    { label: "Return Policies", method: "GET", path: "/after-sales-service-returns" },
    { label: "Implied Warranties", method: "GET", path: "/after-sales-service-conditions" },
  ] as const;

  const baseApiPresets = [
    { label: "Inventories", method: "getInventories", params: {} },
    { label: "Products List", method: "getProductsList", params: { limit: 10 } },
    { label: "Inventory Products", method: "getInventoryProductsList", params: { inventory_id: 0 } },
    { label: "Orders", method: "getOrders", params: { get_unconfirmed_orders: 1, limit: 10 } },
    { label: "Order Statuses", method: "getOrderStatusList", params: {} },
    { label: "Orders Log", method: "getOrdersLog", params: { limit: 10 } },
  ] as const;

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

  const handleAllegroApiRequest = async () => {
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
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send request.";
      setAllegroApiError(message);
    } finally {
      setAllegroApiLoading(false);
    }
  };

  useEffect(() => {
    if (!showPlaywrightSaved) return;
    const timeout = setTimeout(() => setShowPlaywrightSaved(false), 2500);
    return () => clearTimeout(timeout);
  }, [showPlaywrightSaved]);

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const res = await fetch("/api/integrations");
        if (!res.ok) {
          const error = (await res.json()) as { error?: string; errorId?: string };
          const message = error.error || "Failed to load integrations.";
          const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
          toast(`${message}${suffix}`, { variant: "error" });
          return;
        }
        const data = (await res.json()) as Integration[];
        setIntegrations(data);
      } catch (error) {
        console.error("Failed to load integrations:", error);
        toast("Failed to load integrations.", { variant: "error" });
      }
    };

    void fetchIntegrations();
  }, [toast]);

  const integrationSlugs = integrations.map((integration) => integration.slug);
  const hasIntegrations = integrations.length > 0;

  const refreshConnections = async (integrationId: string) => {
    try {
      const res = await fetch(`/api/integrations/${integrationId}/connections`);
      if (!res.ok) {
        const error = (await res.json()) as { error?: string; errorId?: string };
        const message = error.error || "Failed to load connections.";
        const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
        toast(`${message}${suffix}`, { variant: "error" });
        return;
      }
      const data = (await res.json()) as IntegrationConnection[];
      setConnections(data);
    } catch (error) {
      console.error("Failed to load connections:", error);
      toast("Failed to load connections.", { variant: "error" });
    }
  };

  useEffect(() => {
    if (connections.length === 0) {
      setEditingConnectionId(null);
      setConnectionForm({ name: "", username: "", password: "" });
      return;
    }
    if (!editingConnectionId) {
      const connection = connections[0];
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

  const ensureIntegration = async (definition: (typeof integrationDefinitions)[number]) => {
    const existing = integrations.find(
      (integration) => integration.slug === definition.slug
    );
    if (existing) return existing;
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: definition.name, slug: definition.slug }),
      });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string; errorId?: string };
        const message = error.error || `Failed to add ${definition.name}.`;
        const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
        toast(`${message}${suffix}`, { variant: "error" });
        return null;
      }
      const created = (await res.json()) as Integration;
      setIntegrations((prev) => [created, ...prev]);
      return created;
    } catch (error) {
      console.error(`Failed to add integration ${definition.slug}:`, error);
      toast(`Failed to add ${definition.name}.`, { variant: "error" });
      return null;
    }
  };

  const handleIntegrationClick = async (
    definition: (typeof integrationDefinitions)[number]
  ) => {
    const integration = await ensureIntegration(definition);
    if (!integration) return;
    setActiveIntegration(integration);
    await refreshConnections(integration.id);
    setIsModalOpen(true);
  };

  const handleSaveConnection = async () => {
    if (!activeIntegration) return;
    if (!connectionForm.name.trim() || !connectionForm.username.trim()) {
      toast(`Connection name and ${usernameRequiredLabel} are required.`, {
        variant: "error",
      });
      return;
    }
    if (!editingConnectionId && !connectionForm.password.trim()) {
      toast(`${passwordRequiredLabel} is required.`, { variant: "error" });
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
      const res = await fetch(
        editingConnectionId
          ? `/api/integrations/connections/${editingConnectionId}`
          : `/api/integrations/${activeIntegration.id}/connections`,
        {
          method: editingConnectionId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const error = (await res.json()) as { error?: string; errorId?: string };
        const message = error.error || "Failed to save connection.";
        const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
        toast(`${message}${suffix}`, { variant: "error" });
        return;
      }
      setConnectionForm({ name: "", username: "", password: "" });
      setEditingConnectionId(null);
      await refreshConnections(activeIntegration.id);
    } catch (error) {
      console.error("Failed to save connection:", error);
      toast("Failed to save connection.", { variant: "error" });
    }
  };

  const handleAllegroAuthorize = () => {
    if (!activeIntegration || !activeConnection) {
      toast("Create an Allegro connection first.", { variant: "error" });
      return;
    }
    window.location.href = `/api/integrations/${activeIntegration.id}/connections/${activeConnection.id}/allegro/authorize`;
  };

  const handleAllegroDisconnect = async () => {
    if (!activeIntegration || !activeConnection) return;
    try {
      const res = await fetch(
        `/api/integrations/${activeIntegration.id}/connections/${activeConnection.id}/allegro/disconnect`,
        { method: "POST" }
      );
      if (!res.ok) {
        const error = (await res.json()) as { error?: string; errorId?: string };
        const message = error.error || "Failed to disconnect Allegro.";
        const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
        toast(`${message}${suffix}`, { variant: "error" });
        return;
      }
      toast("Allegro disconnected.", { variant: "success" });
      await refreshConnections(activeIntegration.id);
    } catch (error) {
      console.error("Failed to disconnect Allegro:", error);
      toast("Failed to disconnect Allegro.", { variant: "error" });
    }
  };

  const handleDeleteConnection = async (connection: IntegrationConnection) => {
    const confirmed = window.confirm(`Delete connection "${connection.name}"?`);
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/integrations/connections/${connection.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = (await res.json()) as { error?: string; errorId?: string };
        const message = error.error || "Failed to delete connection.";
        const suffix = error.errorId ? ` (Error ID: ${error.errorId})` : "";
        toast(`${message}${suffix}`, { variant: "error" });
        return;
      }
      if (activeIntegration) {
        await refreshConnections(activeIntegration.id);
      }
      if (editingConnectionId === connection.id) {
        setEditingConnectionId(null);
        setConnectionForm({ name: "", username: "", password: "" });
      }
    } catch (error) {
      console.error("Failed to delete connection:", error);
      toast("Failed to delete connection.", { variant: "error" });
    }
  };

  const handleBaselinkerTest = async (connection: IntegrationConnection) => {
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
        payload = (await res.json()) as TestConnectionResponse & { inventoryCount?: number };
      } else {
        payload = { error: await res.text() };
      }

      const normalizedSteps = normalizeSteps(payload.steps);

      if (!res.ok) {
        const failedStepDetail =
          normalizedSteps.find((step) => step.status === "failed")?.detail ||
          "";

        const errorBody =
          payload.error || failedStepDetail || "No response body";
        const statusLabel = `${res.status} ${res.statusText}`.trim();
        const durationMs = Math.round(performance.now() - startedAt);

        const errorMessage = `Baselinker test failed.\nStatus: ${statusLabel}\nURL: ${requestUrl}\nDuration: ${durationMs}ms\n\nResponse:\n${errorBody}`;

        const steps: TestLogEntry[] = normalizedSteps.length
          ? normalizedSteps.map((step) =>
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
      const inventoryInfo = payload.inventoryCount !== undefined
        ? `\nInventories found: ${payload.inventoryCount}`
        : "";
      setTestSuccessMessage(
        `Baselinker connection test succeeded.\nURL: ${requestUrl}\nDuration: ${durationMs}ms${inventoryInfo}`
      );
      setShowTestSuccessModal(true);
      setTestErrorMeta(null);
      await refreshConnections(activeIntegration.id);
    } catch (error) {
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

  const handleAllegroTest = async (connection: IntegrationConnection) => {
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
          normalizedSteps.find((step) => step.status === "failed")?.detail ||
          "";
        const errorBody =
          payload.error || failedStepDetail || "No response body";
        const statusLabel = `${res.status} ${res.statusText}`.trim();
        const durationMs = Math.round(performance.now() - startedAt);

        const errorMessage = `Allegro connection test failed.\nStatus: ${statusLabel}\nURL: ${requestUrl}\nDuration: ${durationMs}ms\n\nResponse:\n${errorBody}`;

        const steps: TestLogEntry[] = normalizedSteps.length
          ? normalizedSteps.map((step) =>
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
      await refreshConnections(activeIntegration.id);
    } catch (error) {
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

  const handleTestConnection = async (connection: IntegrationConnection) => {
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
          normalizedSteps.find((step) => step.status === "failed")?.detail ||
          "";

        const errorBody =
          payload.error || failedStepDetail || "No response body";
        const statusLabel = `${res.status} ${res.statusText}`.trim();
        const durationMs = Math.round(performance.now() - startedAt);

        const errorMessage = `Connection test failed.\nStatus: ${statusLabel}\nURL: ${requestUrl}\nDuration: ${durationMs}ms\n\nResponse:\n${errorBody}`;

        const steps: TestLogEntry[] = normalizedSteps.length
          ? normalizedSteps.map((step) =>
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
      await refreshConnections(activeIntegration.id);
    } catch (error) {
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

  const handleCopyTestError = async () => {
    if (!testError) return;
    try {
      const metaLines = [
        testErrorMeta?.errorId ? `Error ID: ${testErrorMeta.errorId}` : null,
        testErrorMeta?.integrationId
          ? `Integration ID: ${testErrorMeta.integrationId}`
          : null,
        testErrorMeta?.connectionId
          ? `Connection ID: ${testErrorMeta.connectionId}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");

      const copyText = metaLines ? `${metaLines}\n\n${testError}` : testError;
      await navigator.clipboard.writeText(copyText);
    } catch {
      const textarea = document.createElement("textarea");
      const metaLines = [
        testErrorMeta?.errorId ? `Error ID: ${testErrorMeta.errorId}` : null,
        testErrorMeta?.integrationId
          ? `Integration ID: ${testErrorMeta.integrationId}`
          : null,
        testErrorMeta?.connectionId
          ? `Connection ID: ${testErrorMeta.connectionId}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");
      textarea.value = metaLines ? `${metaLines}\n\n${testError}` : testError;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  };

  const handleOpenSessionModal = async () => {
    if (!activeConnection) return;
    setShowSessionModal(true);
    setSessionError(null);
    setIsSessionLoading(true);
    try {
      const res = await fetch(
        `/api/integrations/connections/${activeConnection.id}/session`
      );
      const payload = (await res.json()) as {
        error?: string;
        cookies?: typeof sessionCookies;
        origins?: typeof sessionOrigins;
        updatedAt?: string | null;
      };
      if (!res.ok) {
        setSessionError(payload.error || "Failed to load session cookies.");
        setSessionCookies([]);
        setSessionOrigins([]);
        setSessionUpdatedAt(null);
        return;
      }
      setSessionCookies(payload.cookies || []);
      setSessionOrigins(payload.origins || []);
      setSessionUpdatedAt(payload.updatedAt ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setSessionError(message);
      setSessionCookies([]);
      setSessionOrigins([]);
      setSessionUpdatedAt(null);
    } finally {
      setIsSessionLoading(false);
    }
  };

  const handleSavePlaywrightSettings = async () => {
    const connection = connections[0];
    if (!connection) return;

    const res = await fetch(`/api/integrations/connections/${connection.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      }),
    });

    if (!res.ok) {
      const error = (await res.json()) as { error?: string };
      toast(error.error || "Failed to save Playwright settings.", {
        variant: "error",
      });
      return;
    }

    const updated = (await res.json()) as IntegrationConnection;
    setConnections((prev) =>
      prev.map((item) =>
        item.id === updated.id ? { ...item, ...updated } : item
      )
    );
    setShowPlaywrightSaved(true);
  };

  const handleAllegroSandboxToggle = async (value: boolean) => {
    if (!activeConnection) return;
    if (savingAllegroSandbox) return;
    setSavingAllegroSandbox(true);
    try {
      const res = await fetch(
        `/api/integrations/connections/${activeConnection.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: activeConnection.name,
            username: activeConnection.username,
            allegroUseSandbox: value,
          }),
        }
      );
      const payload = (await res.json()) as IntegrationConnection & {
        error?: string;
      };
      if (!res.ok) {
        toast(payload.error || "Failed to update Allegro sandbox setting.", {
          variant: "error",
        });
        return;
      }
      setConnections((prev) =>
        prev.map((item) =>
          item.id === payload.id ? { ...item, ...payload } : item
        )
      );
      toast("Allegro sandbox setting updated.", { variant: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast(message, { variant: "error" });
    } finally {
      setSavingAllegroSandbox(false);
    }
  };

  const handleAllegroSandboxConnect = async () => {
    if (!activeIntegration || !activeConnection) {
      toast("Create an Allegro connection first.", { variant: "error" });
      return;
    }
    if (savingAllegroSandbox) return;
    setSavingAllegroSandbox(true);
    try {
      const res = await fetch(
        `/api/integrations/connections/${activeConnection.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: activeConnection.name,
            username: activeConnection.username,
            allegroUseSandbox: true,
          }),
        }
      );
      const payload = (await res.json()) as IntegrationConnection & {
        error?: string;
      };
      if (!res.ok) {
        toast(payload.error || "Failed to enable Allegro sandbox.", {
          variant: "error",
        });
        return;
      }
      setConnections((prev) =>
        prev.map((item) =>
          item.id === payload.id ? { ...item, ...payload } : item
        )
      );
      window.location.href = `/api/integrations/${activeIntegration.id}/connections/${activeConnection.id}/allegro/authorize`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast(message, { variant: "error" });
    } finally {
      setSavingAllegroSandbox(false);
    }
  };

  const handleBaseApiRequest = async () => {
    if (!activeIntegration || !activeConnection) {
      toast("Create a Base.com connection first.", { variant: "error" });
      return;
    }
    const method = baseApiMethod.trim();
    if (!method) {
      toast("Base API method is required.", { variant: "error" });
      return;
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
    setBaseApiLoading(true);
    setBaseApiError(null);
    setBaseApiResponse(null);
    try {
      const res = await fetch(
        `/api/integrations/${activeIntegration.id}/connections/${activeConnection.id}/base/request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method, parameters: params }),
        }
      );
      const payload = (await res.json()) as { error?: string; data?: unknown };
      if (!res.ok) {
        setBaseApiError(payload.error || "Request failed.");
        return;
      }
      setBaseApiResponse({ data: payload.data });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send request.";
      setBaseApiError(message);
    } finally {
      setBaseApiLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      {showPlaywrightSaved && (
        <div className="fixed right-6 top-6 z-[200] rounded-md border border-emerald-400/40 bg-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-100 shadow-lg">
          Playwright settings saved
        </div>
      )}

      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Integrations</h1>
            <p className="mt-1 text-sm text-gray-400">
              Visualize and manage marketplace and platform connections.
            </p>
          </div>
          <Link
            href="/admin/integrations/add"
            className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
          >
            <PlusIcon className="size-4" />
            Add Integration
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/60 p-6">
          <div className="absolute -left-20 -top-20 size-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute -bottom-24 right-10 size-72 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="absolute -right-16 top-20 size-48 rounded-full bg-purple-500/10 blur-3xl" />

          <div className="relative mx-auto flex min-h-[420px] max-w-5xl items-center justify-center">
            <div className="relative z-10 flex flex-col items-center gap-6">
              <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-6 py-5 text-center text-white shadow-lg">
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">
                  Core
                </p>
                <p className="mt-2 text-xl font-semibold">Stardb Hub</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {integrationSlugs.includes("tradera") && (
                  <div className="flex items-center gap-2 rounded-full border border-sky-400/50 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-200">
                    <span className="rounded bg-orange-500/30 px-1 py-0.5 text-[9px] uppercase tracking-wider text-orange-100">
                      Browser
                    </span>
                    Tradera
                    <button
                      type="button"
                      onClick={() =>
                        handleIntegrationClick(integrationDefinitions[0])
                      }
                      className="rounded-full border border-white/20 bg-white/10 p-1 text-white hover:bg-white/20"
                      aria-label="Manage Tradera settings"
                    >
                      <SettingsIcon className="size-3.5" />
                    </button>
                  </div>
                )}
                {integrationSlugs.includes("allegro") && (
                  <div className="flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">
                    <span className="rounded bg-blue-500/30 px-1 py-0.5 text-[9px] uppercase tracking-wider text-blue-100">
                      API
                    </span>
                    Allegro
                    <button
                      type="button"
                      onClick={() =>
                        handleIntegrationClick(integrationDefinitions[1])
                      }
                      className="rounded-full border border-white/20 bg-white/10 p-1 text-white hover:bg-white/20"
                      aria-label="Manage Allegro settings"
                    >
                      <SettingsIcon className="size-3.5" />
                    </button>
                  </div>
                )}
                {integrationSlugs.includes("baselinker") && (
                  <div className="flex items-center gap-2 rounded-full border border-purple-400/50 bg-purple-500/10 px-3 py-1.5 text-xs text-purple-200">
                    <span className="rounded bg-purple-500/30 px-1 py-0.5 text-[9px] uppercase tracking-wider text-purple-100">
                      Platform
                    </span>
                    Baselinker
                    <button
                      type="button"
                      onClick={() =>
                        handleIntegrationClick(integrationDefinitions[2])
                      }
                      className="rounded-full border border-white/20 bg-white/10 p-1 text-white hover:bg-white/20"
                      aria-label="Manage Baselinker settings"
                    >
                      <SettingsIcon className="size-3.5" />
                    </button>
                  </div>
                )}
                {!hasIntegrations && (
                  <div className="text-xs text-gray-500">
                    No integrations added yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-xs text-gray-500 md:grid-cols-3">
            <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
              Connect marketplaces and automate listings.
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
              Monitor sync status and data flow.
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
              Add new nodes to expand your stack.
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && activeIntegration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            className="w-full max-w-4xl rounded-lg bg-gray-950 p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">
                  {activeIntegration.name} Integration
                  {isTradera && (
                    <span className="ml-2 rounded bg-orange-500/30 px-1.5 py-0.5 text-xs font-normal uppercase tracking-wider text-orange-200">
                      Browser
                    </span>
                  )}
                  {isAllegro && (
                    <span className="ml-2 rounded bg-blue-500/30 px-1.5 py-0.5 text-xs font-normal uppercase tracking-wider text-blue-200">
                      API
                    </span>
                  )}
                  {isBaselinker && (
                    <span className="ml-2 rounded bg-purple-500/30 px-1.5 py-0.5 text-xs font-normal uppercase tracking-wider text-purple-200">
                      Platform
                    </span>
                  )}
                </h2>
                <p className="text-sm text-gray-400">
                  {isBaselinker
                    ? "Manage connections and warehouse sync settings."
                    : isTradera
                      ? "Manage connections via browser automation (Playwright)."
                      : "Manage connections and marketplace API settings."}
                </p>
              </div>
              <button
                className="text-sm text-gray-400 hover:text-white"
                type="button"
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </button>
            </div>

            <Tabs defaultValue="connections">
              <TabsList
                className={`grid w-full ${
                  showPlaywright || showAllegroConsole || showBaseConsole
                    ? "grid-cols-5"
                    : "grid-cols-4"
                }`}
              >
                <TabsTrigger value="connections">Connections</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                {showAllegroConsole && (
                  <TabsTrigger value="allegro-api">Allegro API</TabsTrigger>
                )}
                {showBaseConsole && (
                  <TabsTrigger value="base-api">Base API</TabsTrigger>
                )}
                <TabsTrigger value="price-sync">Price Sync</TabsTrigger>
                <TabsTrigger value="inventory-sync">Inventory Sync</TabsTrigger>
                {showPlaywright && (
                  <TabsTrigger value="playwright">Playwright</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="connections" className="mt-4 space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4">
                    <h3 className="text-sm font-semibold text-white">
                      {editingConnectionId
                        ? "Connection details"
                        : "Add connection"}
                    </h3>
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="text-xs text-gray-400">
                          Connection name
                        </label>
                        <input
                          className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white"
                          placeholder={connectionNamePlaceholder}
                          value={connectionForm.name}
                          onChange={(event) =>
                            setConnectionForm((prev) => ({
                              ...prev,
                              name: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">
                          {usernameLabel}
                        </label>
                        <input
                          className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white"
                          placeholder={usernamePlaceholder}
                          value={connectionForm.username}
                          onChange={(event) =>
                            setConnectionForm((prev) => ({
                              ...prev,
                              username: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">
                          {passwordLabel}
                        </label>
                        <input
                          className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white"
                          type="password"
                          placeholder={
                            editingConnectionId
                              ? isAllegro
                                ? "New client secret (leave blank to keep)"
                                : "New password (leave blank to keep)"
                              : isAllegro
                                ? "Allegro client secret"
                                : "Tradera password"
                          }
                          value={connectionForm.password}
                          onChange={(event) =>
                            setConnectionForm((prev) => ({
                              ...prev,
                              password: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <button
                        className="w-full rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
                        type="button"
                        onClick={handleSaveConnection}
                      >
                        {editingConnectionId
                          ? "Update connection"
                          : "Save connection"}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4">
                    <h3 className="text-sm font-semibold text-white">
                      Existing connection
                    </h3>
                    {connections.length === 0 ? (
                      <p className="mt-3 text-sm text-gray-400">
                        No connections yet.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {connections.slice(0, 1).map((connection) => (
                          <div
                            key={connection.id}
                            className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-950/70 px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {connection.name}
                              </p>
                              <p className="text-xs text-gray-400">
                                {connection.username}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              {showPlaywright && (
                                <button
                                  className="text-xs text-sky-300 hover:text-sky-200"
                                  type="button"
                                  onClick={() => handleTestConnection(connection)}
                                >
                                  Test
                                </button>
                              )}
                              {isBaselinker && (
                                <button
                                  className="text-xs text-purple-300 hover:text-purple-200"
                                  type="button"
                                  onClick={() => handleBaselinkerTest(connection)}
                                  disabled={isTesting}
                                >
                                  {isTesting ? "Testing..." : "Test"}
                                </button>
                              )}
                              {isAllegro && (
                                <button
                                  className="text-xs text-amber-300 hover:text-amber-200"
                                  type="button"
                                  onClick={() => handleAllegroTest(connection)}
                                  disabled={isTesting}
                                >
                                  {isTesting ? "Testing..." : "Test"}
                                </button>
                              )}
                              <button
                                className="text-xs text-red-400 hover:text-red-300"
                                type="button"
                                onClick={() =>
                                  handleDeleteConnection(connection)
                                }
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {showPlaywright && (
                      <div className="mt-4 rounded-md border border-gray-800 bg-gray-950/60 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-gray-300">
                            Playwright live update
                          </p>
                          <span className="text-xs text-gray-500">
                            {isTesting ? "Running..." : "Idle"}
                          </span>
                        </div>

                        {testLog.length === 0 ? (
                          <p className="mt-2 text-xs text-gray-500">
                            Run a connection test to see live updates.
                          </p>
                        ) : (
                          <div className="mt-2 max-h-40 space-y-2 overflow-y-auto text-xs text-gray-400">
                            {testLog.map((entry, index) => (
                              <div
                                key={`${entry.step}-${index}`}
                                className="flex items-center justify-between gap-3"
                              >
                                <p>{entry.step}</p>
                                {entry.status !== "pending" && (
                                  <button
                                    type="button"
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                      entry.status === "ok"
                                        ? "bg-emerald-500/20 text-emerald-200"
                                        : "bg-red-500/20 text-red-200"
                                    }`}
                                    onClick={() => {
                                      const detail =
                                        entry.detail ||
                                        (entry.status === "failed"
                                          ? lastTestError || ""
                                          : "");
                                      setSelectedStep({
                                        step: entry.step,
                                        status:
                                          entry.status === "ok"
                                            ? "ok"
                                            : "failed",
                                        timestamp: entry.timestamp,
                                        detail,
                                      });
                                      setShowTestLogModal(true);
                                    }}
                                  >
                                    {entry.status === "ok" ? "OK" : "FAILED"}
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="mt-4">
                {isAllegro ? (
                  <div className="space-y-4 rounded-lg border border-gray-800 bg-gray-900/60 p-4 text-sm text-gray-200">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Allegro OAuth
                      </h3>
                      <p className="mt-1 text-xs text-gray-400">
                        Provide your Allegro client ID and client secret in the
                        connection fields, then authorize access.
                      </p>
                    </div>
                    <div className="rounded-md border border-gray-800 bg-gray-950/60 p-3 text-xs text-gray-300">
                      <label className="flex items-center justify-between gap-3">
                        <span>
                          Use Allegro sandbox
                          <span className="ml-2 text-[11px] text-gray-500">
                            Switches API + OAuth to sandbox endpoints.
                          </span>
                        </span>
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-emerald-400"
                          checked={Boolean(activeConnection?.allegroUseSandbox)}
                          onChange={(event) =>
                            handleAllegroSandboxToggle(event.target.checked)
                          }
                          disabled={!activeConnection || savingAllegroSandbox}
                        />
                      </label>
                    </div>
                    {!activeConnection ? (
                      <div className="rounded-md border border-dashed border-gray-800 p-4 text-xs text-gray-400">
                        Add a connection first to enable Allegro authorization.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="rounded-md border border-gray-800 bg-gray-950/60 p-3 text-xs text-gray-300">
                          <div className="flex items-center justify-between">
                            <span>Authorization status</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                allegroConnected
                                  ? "bg-emerald-500/20 text-emerald-200"
                                  : "bg-amber-500/20 text-amber-200"
                              }`}
                            >
                              {allegroConnected ? "Connected" : "Not connected"}
                            </span>
                          </div>
                          <p className="mt-2">
                            <span className="text-gray-400">Expires:</span>{" "}
                            {allegroExpiresAt}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={handleAllegroAuthorize}
                            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
                          >
                            {allegroConnected ? "Reauthorize" : "Connect Allegro"}
                          </button>
                          <button
                            type="button"
                            onClick={handleAllegroSandboxConnect}
                            className="rounded-md border border-amber-500/50 px-3 py-2 text-sm font-semibold text-amber-200 hover:border-amber-400"
                            disabled={savingAllegroSandbox}
                          >
                            {savingAllegroSandbox
                              ? "Preparing..."
                              : "Test Sandbox Connection"}
                          </button>
                          <span className="rounded-full border border-gray-700 bg-gray-950/60 px-2 py-1 text-[10px] font-semibold text-gray-300">
                            {activeConnection?.allegroUseSandbox
                              ? "Sandbox"
                              : "Production"}
                          </span>
                          {allegroConnected && (
                            <button
                              type="button"
                              onClick={handleAllegroDisconnect}
                              className="rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-200 hover:border-gray-500"
                            >
                              Disconnect
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : isBaselinker ? (
                  <div className="space-y-4 rounded-lg border border-gray-800 bg-gray-900/60 p-4 text-sm text-gray-200">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Baselinker API
                      </h3>
                      <p className="mt-1 text-xs text-gray-400">
                        Enter your Baselinker API token in the connection fields,
                        then test the connection to verify it works.
                      </p>
                    </div>
                    {!activeConnection ? (
                      <div className="rounded-md border border-dashed border-gray-800 p-4 text-xs text-gray-400">
                        Add a connection first to enable Baselinker API access.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="rounded-md border border-gray-800 bg-gray-950/60 p-3 text-xs text-gray-300">
                          <div className="flex items-center justify-between">
                            <span>Connection status</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                baselinkerConnected
                                  ? "bg-emerald-500/20 text-emerald-200"
                                  : "bg-amber-500/20 text-amber-200"
                              }`}
                            >
                              {baselinkerConnected ? "Connected" : "Not tested"}
                            </span>
                          </div>
                          <p className="mt-2">
                            <span className="text-gray-400">Last verified:</span>{" "}
                            {baseTokenUpdatedAt}
                          </p>
                          {activeConnection.baseLastInventoryId && (
                            <p className="mt-1">
                              <span className="text-gray-400">Last inventory:</span>{" "}
                              {activeConnection.baseLastInventoryId}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleBaselinkerTest(activeConnection)}
                            disabled={isTesting}
                            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:opacity-50"
                          >
                            {isTesting ? "Testing..." : baselinkerConnected ? "Re-test Connection" : "Test Connection"}
                          </button>
                        </div>
                        <div className="rounded-md border border-gray-800 bg-gray-950/60 p-3 text-xs text-gray-400">
                          <p>
                            To get your API token, log in to{" "}
                            <a
                              href="https://baselinker.com"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-300 hover:text-purple-200"
                            >
                              Baselinker
                            </a>
                            {" "}→ My Account → API.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="min-h-[220px]" />
                )}
              </TabsContent>

              {showBaseConsole && (
                <TabsContent value="base-api" className="mt-4">
                  <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4">
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold text-white">
                        Base.com API Console
                      </h3>
                      <p className="text-xs text-gray-400">
                        Send Base.com API requests using the active connection token.
                      </p>
                    </div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {baseApiPresets.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          className="rounded-full border border-gray-700 px-3 py-1 text-[11px] text-gray-300 hover:border-gray-500"
                          onClick={() => {
                            setBaseApiMethod(preset.method);
                            setBaseApiParams(JSON.stringify(preset.params, null, 2));
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Method</label>
                      <input
                        className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white"
                        placeholder="getInventories"
                        value={baseApiMethod}
                        onChange={(event) => setBaseApiMethod(event.target.value)}
                      />
                    </div>
                    <div className="mt-3">
                      <label className="text-xs text-gray-400">Parameters (JSON)</label>
                      <textarea
                        className="mt-2 h-32 w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-white"
                        value={baseApiParams}
                        onChange={(event) => setBaseApiParams(event.target.value)}
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-70"
                        type="button"
                        disabled={baseApiLoading}
                        onClick={handleBaseApiRequest}
                      >
                        {baseApiLoading ? "Sending..." : "Send request"}
                      </button>
                      <span className="text-xs text-gray-500">
                        Endpoint: https://api.baselinker.com/connector.php
                      </span>
                    </div>
                    {baseApiError && (
                      <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                        {baseApiError}
                      </div>
                    )}
                    {baseApiResponse && (
                      <div className="mt-3 rounded-md border border-gray-800 bg-gray-950 p-3">
                        <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs text-gray-200">
                          {JSON.stringify(baseApiResponse.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}
              {showAllegroConsole && (
                <TabsContent value="allegro-api" className="mt-4">
                  <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4">
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold text-white">
                        Allegro API Console
                      </h3>
                      <p className="text-xs text-gray-400">
                        Send requests using the active Allegro connection token.
                      </p>
                    </div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {allegroApiPresets.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          className="rounded-full border border-gray-700 px-3 py-1 text-[11px] text-gray-300 hover:border-gray-500"
                          onClick={() => {
                            setAllegroApiMethod(preset.method);
                            setAllegroApiPath(preset.path);
                            setAllegroApiBody("{}");
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    {!allegroConnected && (
                      <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                        Connect Allegro to enable API requests.
                      </div>
                    )}
                    <div className="grid gap-3 md:grid-cols-[120px_1fr]">
                      <div>
                        <label className="text-xs text-gray-400">Method</label>
                        <select
                          className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white"
                          value={allegroApiMethod}
                          onChange={(event) =>
                            setAllegroApiMethod(event.target.value)
                          }
                        >
                          {["GET", "POST", "PUT", "PATCH", "DELETE"].map(
                            (method) => (
                              <option key={method} value={method}>
                                {method}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">
                          Endpoint path
                        </label>
                        <input
                          className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white"
                          placeholder="/sale/categories"
                          value={allegroApiPath}
                          onChange={(event) =>
                            setAllegroApiPath(event.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="text-xs text-gray-400">JSON body</label>
                      <textarea
                        className="mt-2 h-32 w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-white"
                        value={allegroApiBody}
                        onChange={(event) =>
                          setAllegroApiBody(event.target.value)
                        }
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-70"
                        type="button"
                        disabled={allegroApiLoading || !allegroConnected}
                        onClick={handleAllegroApiRequest}
                      >
                        {allegroApiLoading ? "Sending..." : "Send request"}
                      </button>
                      <span className="text-xs text-gray-500">
                        Base URL:{" "}
                        {activeConnection?.allegroUseSandbox
                          ? "https://api.allegro.pl.allegrosandbox.pl"
                          : "https://api.allegro.pl"}
                      </span>
                    </div>
                    {allegroApiError && (
                      <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                        {allegroApiError}
                      </div>
                    )}
                    {allegroApiResponse && (
                      <div className="mt-3 rounded-md border border-gray-800 bg-gray-950 p-3">
                        <div className="text-xs text-gray-400">
                          Status:{" "}
                          <span className="text-gray-200">
                            {allegroApiResponse.status}{" "}
                            {allegroApiResponse.statusText}
                          </span>
                          {allegroApiResponse.refreshed ? (
                            <span className="ml-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">
                              Token refreshed
                            </span>
                          ) : null}
                        </div>
                        <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-gray-200">
                          {JSON.stringify(allegroApiResponse.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}
              <TabsContent value="price-sync" className="mt-4">
                <div className="min-h-[220px]" />
              </TabsContent>
              <TabsContent value="inventory-sync" className="mt-4">
                <div className="min-h-[220px]" />
              </TabsContent>

              {showPlaywright && (
                <TabsContent value="playwright" className="mt-4">
                  <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-gray-800 bg-gray-900/60 p-4">
                  <h3 className="text-sm font-semibold text-white">
                    Playwright settings
                  </h3>
                  <p className="mt-1 text-xs text-gray-400">
                    Control how the browser behaves during crosslisting.
                  </p>

                  <div className="mt-4 rounded-md border border-gray-800 bg-gray-950/60 p-3 text-xs text-gray-300">
                    <div className="flex items-center justify-between gap-3">
                      <p>
                        <span className="text-gray-400">Session cookie:</span>{" "}
                        {activeConnection?.hasPlaywrightStorageState
                          ? "Retained"
                          : "Not stored"}
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenSessionModal}
                        disabled={!activeConnection?.hasPlaywrightStorageState}
                        className="text-xs text-emerald-200 hover:text-emerald-100 disabled:cursor-not-allowed disabled:text-gray-600"
                      >
                        View details
                      </button>
                    </div>
                    <p className="mt-1">
                      <span className="text-gray-400">Obtained:</span>{" "}
                      {activeConnection?.playwrightStorageStateUpdatedAt
                        ? new Date(
                            activeConnection.playwrightStorageStateUpdatedAt
                          ).toLocaleString()
                        : "—"}
                    </p>
                  </div>

                  <div className="mt-4 space-y-4 text-sm text-gray-200">
                    <label className="flex items-center justify-between gap-4 rounded-md border border-gray-800 bg-gray-950 px-3 py-2">
                      <span className="text-xs text-gray-300">
                        Run headless
                      </span>
                      <input
                        type="checkbox"
                        className="size-4 accent-emerald-400"
                        checked={playwrightSettings.headless}
                        onChange={(event) =>
                          setPlaywrightSettings((prev) => ({
                            ...prev,
                            headless: event.target.checked,
                          }))
                        }
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="text-xs text-gray-300">
                        Slow motion (ms)
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={playwrightSettings.slowMo}
                        onChange={(event) =>
                          setPlaywrightSettings((prev) => ({
                            ...prev,
                            slowMo: Number(event.target.value),
                          }))
                        }
                        className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white"
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="text-xs text-gray-300">
                        Default timeout (ms)
                      </span>
                      <input
                        type="number"
                        min={1000}
                        step={1000}
                        value={playwrightSettings.timeout}
                        onChange={(event) =>
                          setPlaywrightSettings((prev) => ({
                            ...prev,
                            timeout: Number(event.target.value),
                          }))
                        }
                        className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white"
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="text-xs text-gray-300">
                        Navigation wait (ms)
                      </span>
                      <input
                        type="number"
                        min={1000}
                        step={1000}
                        value={playwrightSettings.navigationTimeout}
                        onChange={(event) =>
                          setPlaywrightSettings((prev) => ({
                            ...prev,
                            navigationTimeout: Number(event.target.value),
                          }))
                        }
                        className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white"
                      />
                    </label>

                    <label className="flex items-center justify-between gap-4 rounded-md border border-gray-800 bg-gray-950 px-3 py-2">
                      <span className="text-xs text-gray-300">
                        Humanize mouse & clicks
                      </span>
                      <input
                        type="checkbox"
                        className="size-4 accent-emerald-400"
                        checked={playwrightSettings.humanizeMouse}
                        onChange={(event) =>
                          setPlaywrightSettings((prev) => ({
                            ...prev,
                            humanizeMouse: event.target.checked,
                          }))
                        }
                      />
                    </label>

                    <div
                      className={`grid gap-3 md:grid-cols-2 lg:grid-cols-3 ${
                        playwrightSettings.humanizeMouse ? "" : "opacity-50"
                      }`}
                      title={
                        playwrightSettings.humanizeMouse
                          ? undefined
                          : "Enable humanization to edit these settings."
                      }
                    >
                      <label className="block space-y-2">
                        <span className="text-xs text-gray-300">
                          Mouse jitter (px)
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={playwrightSettings.mouseJitter}
                          onChange={(event) =>
                            setPlaywrightSettings((prev) => ({
                              ...prev,
                              mouseJitter: Number(event.target.value),
                            }))
                          }
                          disabled={!playwrightSettings.humanizeMouse}
                          className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:text-gray-500"
                        />
                      </label>

                      <label className="block space-y-2">
                        <span className="text-xs text-gray-300">
                          Click delay min (ms)
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={5}
                          value={playwrightSettings.clickDelayMin}
                          onChange={(event) =>
                            setPlaywrightSettings((prev) => ({
                              ...prev,
                              clickDelayMin: Number(event.target.value),
                            }))
                          }
                          disabled={!playwrightSettings.humanizeMouse}
                          className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:text-gray-500"
                        />
                      </label>

                      <label className="block space-y-2">
                        <span className="text-xs text-gray-300">
                          Click delay max (ms)
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={5}
                          value={playwrightSettings.clickDelayMax}
                          onChange={(event) =>
                            setPlaywrightSettings((prev) => ({
                              ...prev,
                              clickDelayMax: Number(event.target.value),
                            }))
                          }
                          disabled={!playwrightSettings.humanizeMouse}
                          className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:text-gray-500"
                        />
                      </label>

                      <label className="block space-y-2">
                        <span className="text-xs text-gray-300">
                          Input delay min (ms)
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={5}
                          value={playwrightSettings.inputDelayMin}
                          onChange={(event) =>
                            setPlaywrightSettings((prev) => ({
                              ...prev,
                              inputDelayMin: Number(event.target.value),
                            }))
                          }
                          disabled={!playwrightSettings.humanizeMouse}
                          className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:text-gray-500"
                        />
                      </label>

                      <label className="block space-y-2">
                        <span className="text-xs text-gray-300">
                          Input delay max (ms)
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={5}
                          value={playwrightSettings.inputDelayMax}
                          onChange={(event) =>
                            setPlaywrightSettings((prev) => ({
                              ...prev,
                              inputDelayMax: Number(event.target.value),
                            }))
                          }
                          disabled={!playwrightSettings.humanizeMouse}
                          className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:text-gray-500"
                        />
                      </label>

                      <label className="block space-y-2">
                        <span className="text-xs text-gray-300">
                          Action delay min (ms)
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={50}
                          value={playwrightSettings.actionDelayMin}
                          onChange={(event) =>
                            setPlaywrightSettings((prev) => ({
                              ...prev,
                              actionDelayMin: Number(event.target.value),
                            }))
                          }
                          disabled={!playwrightSettings.humanizeMouse}
                          className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:text-gray-500"
                        />
                      </label>

                      <label className="block space-y-2">
                        <span className="text-xs text-gray-300">
                          Action delay max (ms)
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={50}
                          value={playwrightSettings.actionDelayMax}
                          onChange={(event) =>
                            setPlaywrightSettings((prev) => ({
                              ...prev,
                              actionDelayMax: Number(event.target.value),
                            }))
                          }
                          disabled={!playwrightSettings.humanizeMouse}
                          className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:text-gray-500"
                        />
                      </label>
                    </div>

                    <div className="pt-2">
                      <div className="text-xs uppercase tracking-[0.2em] text-gray-500">
                        Proxy simulation
                      </div>

                      <label className="mt-3 flex items-center justify-between gap-4 rounded-md border border-gray-800 bg-gray-950 px-3 py-2">
                        <span className="text-xs text-gray-300">
                          Enable proxy
                        </span>
                        <input
                          type="checkbox"
                          className="size-4 accent-emerald-400"
                          checked={playwrightSettings.proxyEnabled}
                          onChange={(event) =>
                            setPlaywrightSettings((prev) => ({
                              ...prev,
                              proxyEnabled: event.target.checked,
                            }))
                          }
                        />
                      </label>

                      <div
                        className={`mt-3 grid gap-3 md:grid-cols-2 ${
                          playwrightSettings.proxyEnabled ? "" : "opacity-50"
                        }`}
                        title={
                          playwrightSettings.proxyEnabled
                            ? undefined
                            : "Enable proxy to edit these settings."
                        }
                      >
                        <label className="block space-y-2 md:col-span-2">
                          <span className="text-xs text-gray-300">
                            Proxy server (e.g. http://host:port)
                          </span>
                          <input
                            type="text"
                            value={playwrightSettings.proxyServer}
                            onChange={(event) =>
                              setPlaywrightSettings((prev) => ({
                                ...prev,
                                proxyServer: event.target.value,
                              }))
                            }
                            disabled={!playwrightSettings.proxyEnabled}
                            className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:text-gray-500"
                          />
                        </label>

                        <label className="block space-y-2">
                          <span className="text-xs text-gray-300">
                            Proxy username
                          </span>
                          <input
                            type="text"
                            value={playwrightSettings.proxyUsername}
                            onChange={(event) =>
                              setPlaywrightSettings((prev) => ({
                                ...prev,
                                proxyUsername: event.target.value,
                              }))
                            }
                            disabled={!playwrightSettings.proxyEnabled}
                            className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:text-gray-500"
                          />
                        </label>

                        <label className="block space-y-2">
                          <span className="text-xs text-gray-300">
                            Proxy password
                          </span>
                          <input
                            type="password"
                            value={playwrightSettings.proxyPassword}
                            onChange={(event) =>
                              setPlaywrightSettings((prev) => ({
                                ...prev,
                                proxyPassword: event.target.value,
                              }))
                            }
                            disabled={!playwrightSettings.proxyEnabled}
                            placeholder={
                              activeConnection?.playwrightProxyHasPassword
                                ? "Saved (leave blank to keep)"
                                : ""
                            }
                            className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white placeholder:text-gray-500 disabled:cursor-not-allowed disabled:text-gray-500"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="text-xs uppercase tracking-[0.2em] text-gray-500">
                        Device simulation
                      </div>

                      <label className="mt-3 flex items-center justify-between gap-4 rounded-md border border-gray-800 bg-gray-950 px-3 py-2">
                        <span className="text-xs text-gray-300">
                          Emulate device profile
                        </span>
                        <input
                          type="checkbox"
                          className="size-4 accent-emerald-400"
                          checked={playwrightSettings.emulateDevice}
                          onChange={(event) =>
                            setPlaywrightSettings((prev) => ({
                              ...prev,
                              emulateDevice: event.target.checked,
                            }))
                          }
                        />
                      </label>

                      <div
                        className={`mt-3 ${
                          playwrightSettings.emulateDevice ? "" : "opacity-50"
                        }`}
                        title={
                          playwrightSettings.emulateDevice
                            ? undefined
                            : "Enable device emulation to edit this setting."
                        }
                      >
                        <label className="block space-y-2">
                          <span className="text-xs text-gray-300">
                            Device profile
                          </span>
                          <select
                            value={playwrightSettings.deviceName}
                            onChange={(event) =>
                              setPlaywrightSettings((prev) => ({
                                ...prev,
                                deviceName: event.target.value,
                              }))
                            }
                            disabled={!playwrightSettings.emulateDevice}
                            className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:text-gray-500"
                          >
                            {deviceOptions.map((device) => (
                              <option key={device.value} value={device.value}>
                                {device.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>

                    <button
                      className="w-full rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
                      type="button"
                      onClick={handleSavePlaywrightSettings}
                    >
                      Save Playwright settings
                    </button>

                    <div className="rounded-md border border-gray-800 bg-gray-950/60 p-3 text-xs text-gray-400">
                      Settings are saved per connection and used during
                      Playwright runs.
                    </div>
                  </div>
                </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      )}

      {showTestLogModal && selectedStep && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowTestLogModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-gray-950 p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Playwright Log
              </h3>
              <button
                className="text-sm text-gray-400 hover:text-white"
                type="button"
                onClick={() => setShowTestLogModal(false)}
              >
                Close
              </button>
            </div>
            <div className="space-y-2 text-sm text-gray-300">
              <p>
                <span className="text-gray-400">Step:</span> {selectedStep.step}
              </p>
              <p>
                <span className="text-gray-400">Status:</span>{" "}
                {selectedStep.status === "ok" ? "OK" : "FAILED"}
              </p>
              <p>
                <span className="text-gray-400">Time:</span>{" "}
                {new Date(selectedStep.timestamp).toLocaleString()}
              </p>
              {selectedStep.detail && (
                <p>
                  <span className="text-gray-400">Detail:</span>{" "}
                  {selectedStep.detail}
                </p>
              )}
              <div className="rounded-md border border-gray-800 bg-gray-900/60 p-3 text-xs text-gray-400">
                {selectedStep.status === "ok"
                  ? "Playwright completed this step successfully."
                  : "Playwright stopped after this step due to a failure."}
              </div>
            </div>
          </div>
        </div>
      )}

      {showTestErrorModal && testError && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowTestErrorModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-lg bg-gray-950 p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Playwright Error
              </h3>
              <button
                className="text-sm text-gray-400 hover:text-white"
                type="button"
                onClick={() => setShowTestErrorModal(false)}
              >
                Close
              </button>
            </div>
            <div className="space-y-3">
              <div className="rounded-md border border-gray-800 bg-gray-900/60 p-3 text-xs text-gray-300">
                Copy the raw error to share or debug it.
              </div>
              {(testErrorMeta?.errorId ||
                testErrorMeta?.integrationId ||
                testErrorMeta?.connectionId) && (
                <div className="grid gap-2 rounded-md border border-gray-800 bg-gray-950/60 p-3 text-xs text-gray-300 md:grid-cols-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">
                      Error ID
                    </p>
                    <p className="mt-1 break-all text-gray-200">
                      {testErrorMeta?.errorId || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">
                      Integration ID
                    </p>
                    <p className="mt-1 break-all text-gray-200">
                      {testErrorMeta?.integrationId || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">
                      Connection ID
                    </p>
                    <p className="mt-1 break-all text-gray-200">
                      {testErrorMeta?.connectionId || "—"}
                    </p>
                  </div>
                </div>
              )}
              <pre className="max-h-72 overflow-auto rounded-md border border-gray-800 bg-gray-950 p-3 text-xs text-gray-200">
                <code className="select-text whitespace-pre-wrap">
                  {testError}
                </code>
              </pre>
              <div className="flex items-center justify-end gap-2">
                <button
                  className="rounded-md border border-gray-700 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-800"
                  type="button"
                  onClick={handleCopyTestError}
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTestSuccessModal && testSuccessMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowTestSuccessModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-gray-950 p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Playwright Test
              </h3>
              <button
                className="text-sm text-gray-400 hover:text-white"
                type="button"
                onClick={() => setShowTestSuccessModal(false)}
              >
                Close
              </button>
            </div>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="max-h-64 overflow-y-auto rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-100">
                <p className="whitespace-pre-wrap break-words">
                  {testSuccessMessage}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-gray-950 p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Session cookies
                </h3>
                <p className="text-xs text-gray-400">
                  Stored Playwright session details.
                </p>
              </div>
              <button
                className="text-sm text-gray-400 hover:text-white"
                type="button"
                onClick={() => setShowSessionModal(false)}
              >
                Close
              </button>
            </div>

            {isSessionLoading ? (
              <div className="rounded-md border border-gray-800 bg-gray-950/60 p-4 text-sm text-gray-400">
                Loading session details...
              </div>
            ) : sessionError ? (
              <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
                {sessionError}
              </div>
            ) : (
              <div className="space-y-4 text-sm text-gray-200">
                <div className="rounded-md border border-gray-800 bg-gray-950/60 p-3 text-xs text-gray-300">
                  <span className="text-gray-400">Obtained:</span>{" "}
                  {sessionUpdatedAt
                    ? new Date(sessionUpdatedAt).toLocaleString()
                    : "—"}
                </div>

                <div className="max-h-96 space-y-3 overflow-y-auto">
                  {sessionCookies.length === 0 ? (
                    <div className="rounded-md border border-gray-800 bg-gray-950/60 p-4 text-sm text-gray-400">
                      No cookies stored.
                    </div>
                  ) : (
                    sessionCookies.map((cookie, index) => (
                      <div
                        key={`${cookie.name || "cookie"}-${index}`}
                        className="rounded-md border border-gray-800 bg-gray-950/60 p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
                          <span className="rounded-full bg-gray-800 px-2 py-0.5 text-gray-200">
                            {cookie.name || "unknown"}
                          </span>
                          <span className="text-gray-500">
                            {cookie.domain || "—"}
                          </span>
                        </div>
                        <div className="mt-2 grid gap-2 text-xs text-gray-400 md:grid-cols-2">
                          <p>
                            <span className="text-gray-500">Value:</span>{" "}
                            <span className="break-all text-gray-200">
                              {cookie.value || "—"}
                            </span>
                          </p>
                          <p>
                            <span className="text-gray-500">Path:</span>{" "}
                            {cookie.path || "—"}
                          </p>
                          <p>
                            <span className="text-gray-500">Expires:</span>{" "}
                            {cookie.expires
                              ? new Date(cookie.expires * 1000).toLocaleString()
                              : "Session"}
                          </p>
                          <p>
                            <span className="text-gray-500">Secure:</span>{" "}
                            {cookie.secure ? "Yes" : "No"}
                          </p>
                          <p>
                            <span className="text-gray-500">HttpOnly:</span>{" "}
                            {cookie.httpOnly ? "Yes" : "No"}
                          </p>
                          <p>
                            <span className="text-gray-500">SameSite:</span>{" "}
                            {cookie.sameSite || "—"}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {sessionOrigins.length > 0 && (
                  <div className="rounded-md border border-gray-800 bg-gray-950/60 p-3">
                    <p className="text-xs text-gray-400">
                      Origins stored: {sessionOrigins.length}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
