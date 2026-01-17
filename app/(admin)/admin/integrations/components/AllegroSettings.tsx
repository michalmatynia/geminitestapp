"use client";

import { IntegrationConnection } from "../types";

type AllegroSettingsProps = {
  activeConnection: IntegrationConnection | null;
  savingSandbox: boolean;
  onToggleSandbox: (checked: boolean) => void;
  onAuthorize: () => void;
  onDisconnect: () => void;
  onSandboxConnect: () => void;
};

export function AllegroSettings({
  activeConnection,
  savingSandbox,
  onToggleSandbox,
  onAuthorize,
  onDisconnect,
  onSandboxConnect,
}: AllegroSettingsProps) {
  const allegroConnected = Boolean(activeConnection?.hasAllegroAccessToken);
  const allegroExpiresAt = activeConnection?.allegroExpiresAt
    ? new Date(activeConnection.allegroExpiresAt).toLocaleString()
    : "—";

  return (
    <div className="space-y-4 rounded-lg border border-gray-800 bg-gray-900/60 p-4 text-sm text-gray-200">
      <div>
        <h3 className="text-sm font-semibold text-white">Allegro OAuth</h3>
        <p className="mt-1 text-xs text-gray-400">
          Provide your Allegro client ID and client secret in the connection
          fields, then authorize access.
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
            onChange={(event) => onToggleSandbox(event.target.checked)}
            disabled={!activeConnection || savingSandbox}
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
              <span className="text-gray-400">Expires:</span> {allegroExpiresAt}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onAuthorize}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
            >
              {allegroConnected ? "Reauthorize" : "Connect Allegro"}
            </button>
            <button
              type="button"
              onClick={onSandboxConnect}
              className="rounded-md border border-amber-500/50 px-3 py-2 text-sm font-semibold text-amber-200 hover:border-amber-400"
              disabled={savingSandbox}
            >
              {savingSandbox ? "Preparing..." : "Test Sandbox Connection"}
            </button>
            <span className="rounded-full border border-gray-700 bg-gray-950/60 px-2 py-1 text-[10px] font-semibold text-gray-300">
              {activeConnection?.allegroUseSandbox ? "Sandbox" : "Production"}
            </span>
            {allegroConnected && (
              <button
                type="button"
                onClick={onDisconnect}
                className="rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-200 hover:border-gray-500"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
