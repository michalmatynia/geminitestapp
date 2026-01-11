"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PlusIcon, SettingsIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [activeIntegration, setActiveIntegration] = useState<Integration | null>(null);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  const [connectionForm, setConnectionForm] = useState({
    name: "",
    username: "",
    password: "",
  });
  const [testLog, setTestLog] = useState<
    { step: string; status: "pending" | "ok" | "failed"; timestamp: string; detail?: string }[]
  >([]);
  const [isTesting, setIsTesting] = useState(false);
  const [showTestLogModal, setShowTestLogModal] = useState(false);
  const [showTestErrorModal, setShowTestErrorModal] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [lastTestError, setLastTestError] = useState<string | null>(null);
  const [showTestSuccessModal, setShowTestSuccessModal] = useState(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<
    { step: string; status: "ok" | "failed"; timestamp: string; detail?: string } | null
  >(null);

  useEffect(() => {
    const fetchIntegrations = async () => {
      const res = await fetch("/api/integrations");
      if (!res.ok) return;
      const data = (await res.json()) as Integration[];
      setIntegrations(data);
    };

    void fetchIntegrations();
  }, []);

  const integrationNames = integrations.map((integration) => integration.name);
  const traderaIntegration = useMemo(
    () => integrations.find((integration) => integration.slug === "tradera"),
    [integrations]
  );

  const refreshConnections = async (integrationId: string) => {
    const res = await fetch(`/api/integrations/${integrationId}/connections`);
    if (!res.ok) return;
    const data = (await res.json()) as IntegrationConnection[];
    setConnections(data);
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
    }
  }, [connections, editingConnectionId]);

  const ensureTradera = async () => {
    if (traderaIntegration) return traderaIntegration;
    const res = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Tradera", slug: "tradera" }),
    });
    if (!res.ok) {
      const error = (await res.json()) as { error?: string };
      alert(error.error || "Failed to add Tradera.");
      return null;
    }
    const created = (await res.json()) as Integration;
    setIntegrations((prev) => [created, ...prev]);
    return created;
  };

  const handleTraderaClick = async () => {
    const integration = await ensureTradera();
    if (!integration) return;
    setActiveIntegration(integration);
    await refreshConnections(integration.id);
    setIsModalOpen(true);
  };

  const handleSaveConnection = async () => {
    if (!activeIntegration) return;
    if (!connectionForm.name.trim() || !connectionForm.username.trim()) {
      alert("Connection name and username are required.");
      return;
    }
    if (!editingConnectionId && !connectionForm.password.trim()) {
      alert("Password is required.");
      return;
    }
    const payload = {
      name: connectionForm.name.trim(),
      username: connectionForm.username.trim(),
      ...(connectionForm.password.trim()
        ? { password: connectionForm.password.trim() }
        : {}),
    };
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
      const error = (await res.json()) as { error?: string };
      alert(error.error || "Failed to save connection.");
      return;
    }
    setConnectionForm({ name: "", username: "", password: "" });
    setEditingConnectionId(null);
    await refreshConnections(activeIntegration.id);
  };

  const handleDeleteConnection = async (connection: IntegrationConnection) => {
    const confirmed = window.confirm(`Delete connection "${connection.name}"?`);
    if (!confirmed) return;
    const res = await fetch(`/api/integrations/connections/${connection.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const error = (await res.json()) as { error?: string };
      alert(error.error || "Failed to delete connection.");
      return;
    }
    if (activeIntegration) {
      await refreshConnections(activeIntegration.id);
    }
    if (editingConnectionId === connection.id) {
      setEditingConnectionId(null);
      setConnectionForm({ name: "", username: "", password: "" });
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
    setLastTestError(null);
    setShowTestSuccessModal(false);
    setTestSuccessMessage(null);
    const requestUrl = `/api/integrations/${activeIntegration.id}/connections/${connection.id}/test`;
    const startedAt = performance.now();
    try {
      const res = await fetch(requestUrl, { method: "POST" });
      const contentType = res.headers.get("content-type") || "";
      const payload = contentType.includes("application/json")
        ? ((await res.json()) as {
            error?: string;
            steps?: {
              step: string;
              status: "pending" | "ok" | "failed";
              timestamp: string;
              detail?: string;
            }[];
          })
        : { error: await res.text() };
      if (!res.ok) {
        const failedStepDetail =
          payload.steps?.find((step) => step.status === "failed")?.detail || "";
        const errorBody =
          payload.error ||
          failedStepDetail ||
          (typeof payload === "string" ? payload : "") ||
          "No response body";
        const statusLabel = `${res.status} ${res.statusText}`.trim();
        const durationMs = Math.round(performance.now() - startedAt);
        const errorMessage = `Connection test failed.\nStatus: ${statusLabel}\nURL: ${requestUrl}\nDuration: ${durationMs}ms\n\nResponse:\n${errorBody}`;
        const steps = payload.steps?.length
          ? payload.steps.map((step) =>
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
        setLastTestError(errorMessage);
        setShowTestErrorModal(true);
        return;
      }
      if (payload.steps?.length) {
        setTestLog(payload.steps);
      }
      const durationMs = Math.round(performance.now() - startedAt);
      setTestSuccessMessage(
        `Connection test succeeded.\nURL: ${requestUrl}\nDuration: ${durationMs}ms`
      );
      setShowTestSuccessModal(true);
    } catch (error) {
      const durationMs = Math.round(performance.now() - startedAt);
      const message = error instanceof Error ? error.message : "Unknown error";
      const errorMessage = `Connection test failed.\nURL: ${requestUrl}\nDuration: ${durationMs}ms\nError: ${message}`;
      setTestError(errorMessage);
      setLastTestError(errorMessage);
      setShowTestErrorModal(true);
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyTestError = async () => {
    if (!testError) return;
    try {
      await navigator.clipboard.writeText(testError);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = testError;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  };

  const handleEditConnection = (connection: IntegrationConnection) => {
    setConnectionForm({
      name: connection.name,
      username: connection.username,
      password: "",
    });
    setEditingConnectionId(connection.id);
  };

  return (
    <div className="container mx-auto py-10">
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Integrations</h1>
            <p className="mt-1 text-sm text-gray-400">
              Visualize and manage marketplace connections.
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

          <div className="relative mx-auto flex min-h-[420px] max-w-5xl items-center justify-center">
            <div className="relative z-10 flex flex-col items-center gap-6">
              <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-6 py-5 text-center text-white shadow-lg">
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">
                  Core
                </p>
                <p className="mt-2 text-xl font-semibold">Stardb Hub</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {integrationNames.includes("Tradera") && (
                  <button
                    type="button"
                    onClick={handleTraderaClick}
                    className="flex items-center gap-2 rounded-full border border-sky-400/50 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-200 hover:bg-sky-500/20"
                  >
                    Tradera
                    <Link
                      href="/admin/integrations/tradera"
                      className="rounded-full border border-white/20 bg-white/10 p-1 text-white hover:bg-white/20"
                      onClick={(event) => event.stopPropagation()}
                      aria-label="Manage Tradera settings"
                    >
                      <SettingsIcon className="size-3.5" />
                    </Link>
                  </button>
                )}
                {!integrationNames.includes("Tradera") && (
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-4xl rounded-lg bg-gray-950 p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">
                  {activeIntegration.name} Integration
                </h2>
                <p className="text-sm text-gray-400">
                  Manage connections and marketplace settings.
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
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="connections">Connections</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="price-sync">Price Sync</TabsTrigger>
                <TabsTrigger value="inventory-sync">Inventory Sync</TabsTrigger>
                <TabsTrigger value="playwright">Playwright</TabsTrigger>
              </TabsList>
              <TabsContent value="connections" className="mt-4 space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4">
                    <h3 className="text-sm font-semibold text-white">
                      {editingConnectionId ? "Connection details" : "Add connection"}
                    </h3>
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="text-xs text-gray-400">
                          Connection name
                        </label>
                      <input
                        className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white"
                        placeholder="Integration name (e.g. John's Tradera)"
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
                          Tradera username
                        </label>
                      <input
                        className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white"
                        placeholder="Tradera username"
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
                          Tradera password
                        </label>
                      <input
                        className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white"
                        type="password"
                        placeholder={
                          editingConnectionId
                            ? "New password (leave blank to keep)"
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
                        {editingConnectionId ? "Update connection" : "Save connection"}
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
                              <button
                                className="text-xs text-sky-300 hover:text-sky-200"
                                type="button"
                                onClick={() => handleTestConnection(connection)}
                              >
                                Test
                              </button>
                              <button
                                className="text-xs text-gray-300 hover:text-white"
                                type="button"
                                onClick={() => handleEditConnection(connection)}
                              >
                                Edit
                              </button>
                              <button
                                className="text-xs text-red-400 hover:text-red-300"
                                type="button"
                                onClick={() => handleDeleteConnection(connection)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
                                        entry.status === "ok" ? "ok" : "failed",
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
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="settings" className="mt-4">
                <div className="rounded-lg border border-dashed border-gray-800 p-6 text-center text-sm text-gray-400">
                  Settings configuration coming soon.
                </div>
              </TabsContent>
              <TabsContent value="price-sync" className="mt-4">
                <div className="rounded-lg border border-dashed border-gray-800 p-6 text-center text-sm text-gray-400">
                  Price sync configuration coming soon.
                </div>
              </TabsContent>
              <TabsContent value="inventory-sync" className="mt-4">
                <div className="rounded-lg border border-dashed border-gray-800 p-6 text-center text-sm text-gray-400">
                  Inventory sync configuration coming soon.
                </div>
              </TabsContent>
              <TabsContent value="playwright" className="mt-4">
                <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4">
                  <h3 className="text-sm font-semibold text-white">
                    Playwright settings
                  </h3>
                  <p className="mt-1 text-xs text-gray-400">
                    Control how the browser behaves during crosslisting.
                  </p>
                  <div className="mt-4 space-y-4 text-sm text-gray-200">
                    <label className="flex items-center justify-between gap-4 rounded-md border border-gray-800 bg-gray-950 px-3 py-2">
                      <span className="text-xs text-gray-300">Run headless</span>
                      <input
                        type="checkbox"
                        className="size-4 accent-emerald-400"
                        defaultChecked
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
                        defaultValue={50}
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
                        defaultValue={15000}
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
                        defaultValue={30000}
                        className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white"
                      />
                    </label>
                    <div className="rounded-md border border-gray-800 bg-gray-950/60 p-3 text-xs text-gray-400">
                      Settings are UI-only for now. Hook these into your
                      Playwright runner when you are ready.
                    </div>
                  </div>
                </div>
              </TabsContent>
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
                <span className="text-gray-400">Step:</span>{" "}
                {selectedStep.step}
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
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-100">
                {testSuccessMessage}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
