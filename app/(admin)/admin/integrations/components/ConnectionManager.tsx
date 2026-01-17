"use client";

import { Dispatch, SetStateAction } from "react";
import { Integration, IntegrationConnection, TestLogEntry } from "../types";

type ConnectionManagerProps = {
  activeIntegration: Integration;
  connections: IntegrationConnection[];
  editingConnectionId: string | null;
  setEditingConnectionId: (id: string | null) => void;
  connectionForm: { name: string; username: string; password: string };
  setConnectionForm: Dispatch<
    SetStateAction<{ name: string; username: string; password: string }>
  >;
  onSave: () => void;
  onDelete: (connection: IntegrationConnection) => void;
  onTest: (connection: IntegrationConnection) => void;
  isTesting: boolean;
  testLog: TestLogEntry[];
  onShowLog: (step: TestLogEntry) => void;
};

export function ConnectionManager({
  activeIntegration,
  connections,
  editingConnectionId,
  setEditingConnectionId,
  connectionForm,
  setConnectionForm,
  onSave,
  onDelete,
  onTest,
  isTesting,
  testLog,
  onShowLog,
}: ConnectionManagerProps) {
  const integrationSlug = activeIntegration.slug;
  const isTradera = integrationSlug === "tradera";
  const isAllegro = integrationSlug === "allegro";
  const isBaselinker = integrationSlug === "baselinker";
  const showPlaywright = isTradera;

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

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4">
        <h3 className="text-sm font-semibold text-white">
          {editingConnectionId ? "Connection details" : "Add connection"}
        </h3>
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-xs text-gray-400">Connection name</label>
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
            <label className="text-xs text-gray-400">{usernameLabel}</label>
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
            <label className="text-xs text-gray-400">{passwordLabel}</label>
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
            onClick={onSave}
          >
            {editingConnectionId ? "Update connection" : "Save connection"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4">
        <h3 className="text-sm font-semibold text-white">Existing connection</h3>
        {connections.length === 0 ? (
          <p className="mt-3 text-sm text-gray-400">No connections yet.</p>
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
                  <p className="text-xs text-gray-400">{connection.username}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    className={`text-xs ${
                      isBaselinker
                        ? "text-purple-300 hover:text-purple-200"
                        : isAllegro
                        ? "text-amber-300 hover:text-amber-200"
                        : "text-sky-300 hover:text-sky-200"
                    }`}
                    type="button"
                    onClick={() => onTest(connection)}
                    disabled={isTesting}
                  >
                    {isTesting ? "Testing..." : "Test"}
                  </button>
                  <button
                    className="text-xs text-red-400 hover:text-red-300"
                    type="button"
                    onClick={() => onDelete(connection)}
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
                        onClick={() => onShowLog(entry)}
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
  );
}
