"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import {
  Integration,
  IntegrationConnection,
  TestLogEntry,
  TestStatus,
  TestConnectionResponse,
  integrationDefinitions,
  defaultPlaywrightSettings,
} from "./types";
import { normalizeSteps } from "./utils";
import { IntegrationList } from "./components/IntegrationList";
import { IntegrationModal } from "./components/IntegrationModal";

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

  const [playwrightSettings, setPlaywrightSettings] = useState(
    defaultPlaywrightSettings
  );

  const activeConnection = connections[0] || null;

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
          const error = (await res.json()) as {
            error?: string;
            errorId?: string;
          };
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

  const refreshConnections = async (integrationId: string) => {
    try {
      const res = await fetch(`/api/integrations/${integrationId}/connections`);
      if (!res.ok) {
        const error = (await res.json()) as {
          error?: string;
          errorId?: string;
        };
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

  const ensureIntegration = async (
    definition: (typeof integrationDefinitions)[number]
  ) => {
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
        const error = (await res.json()) as {
          error?: string;
          errorId?: string;
        };
        const message = error.error || `Failed to add ${definition.name}`;
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
        const error = (await res.json()) as {
          error?: string;
          errorId?: string;
        };
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
      const res = await fetch(
        `/api/integrations/connections/${connection.id}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) {
        const error = (await res.json()) as {
          error?: string;
          errorId?: string;
        };
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
        payload = (await res.json()) as TestConnectionResponse & {
          inventoryCount?: number;
        };
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
      const inventoryInfo = 
        payload.inventoryCount !== undefined
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
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send request.";
      setBaseApiError(message);
    } finally {
      setBaseApiLoading(false);
    }
  };

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

  return (
    <div className="container mx-auto py-10">
      <IntegrationList
        integrations={integrations}
        onIntegrationClick={handleIntegrationClick}
      />

      {isModalOpen && activeIntegration && (
        <IntegrationModal
          activeIntegration={activeIntegration}
          connections={connections}
          onClose={() => setIsModalOpen(false)}
          editingConnectionId={editingConnectionId}
          setEditingConnectionId={setEditingConnectionId}
          connectionForm={connectionForm}
          setConnectionForm={setConnectionForm}
          onSaveConnection={handleSaveConnection}
          onDeleteConnection={handleDeleteConnection}
          onTestConnection={handleTestConnection}
          onBaselinkerTest={handleBaselinkerTest}
          onAllegroTest={handleAllegroTest}
          isTesting={isTesting}
          testLog={testLog}
          onShowLog={(step) => {
            setSelectedStep(
              step.status !== "pending"
                ? (step as TestLogEntry & { status: "ok" | "failed" })
                : null
            );
            setShowTestLogModal(true);
          }}
          showTestLogModal={showTestLogModal}
          onCloseTestLogModal={() => setShowTestLogModal(false)}
          selectedStep={selectedStep}
          showTestErrorModal={showTestErrorModal}
          testError={testError}
          testErrorMeta={testErrorMeta}
          onCloseTestErrorModal={() => setShowTestErrorModal(false)}
          showTestSuccessModal={showTestSuccessModal}
          testSuccessMessage={testSuccessMessage}
          onCloseTestSuccessModal={() => setShowTestSuccessModal(false)}
          showSessionModal={showSessionModal}
          sessionLoading={isSessionLoading}
          sessionError={sessionError}
          sessionCookies={sessionCookies}
          sessionOrigins={sessionOrigins}
          sessionUpdatedAt={sessionUpdatedAt}
          onCloseSessionModal={() => setShowSessionModal(false)}
          playwrightSettings={playwrightSettings}
          setPlaywrightSettings={setPlaywrightSettings}
          onSavePlaywrightSettings={handleSavePlaywrightSettings}
          showPlaywrightSaved={showPlaywrightSaved}
          onOpenSessionModal={handleOpenSessionModal}
          savingAllegroSandbox={savingAllegroSandbox}
          onToggleAllegroSandbox={handleAllegroSandboxToggle}
          onAllegroAuthorize={handleAllegroAuthorize}
          onAllegroDisconnect={handleAllegroDisconnect}
          onAllegroSandboxConnect={handleAllegroSandboxConnect}
          baseApiMethod={baseApiMethod}
          setBaseApiMethod={setBaseApiMethod}
          baseApiParams={baseApiParams}
          setBaseApiParams={setBaseApiParams}
          baseApiLoading={baseApiLoading}
          baseApiError={baseApiError}
          baseApiResponse={baseApiResponse}
          onBaseApiRequest={handleBaseApiRequest}
          allegroApiMethod={allegroApiMethod}
          setAllegroApiMethod={setAllegroApiMethod}
          allegroApiPath={allegroApiPath}
          setAllegroApiPath={setAllegroApiPath}
          allegroApiBody={allegroApiBody}
          setAllegroApiBody={setAllegroApiBody}
          allegroApiLoading={allegroApiLoading}
          allegroApiError={allegroApiError}
          allegroApiResponse={allegroApiResponse}
          onAllegroApiRequest={handleAllegroApiRequest}
        />
      )}
    </div>
  );
}