"use client";

import { IntegrationConnection } from "../types";

type AllegroApiConsoleProps = {
  activeConnection: IntegrationConnection | null;
  method: string;
  setMethod: (value: string) => void;
  path: string;
  setPath: (value: string) => void;
  body: string;
  setBody: (value: string) => void;
  loading: boolean;
  error: string | null;
  response: {
    status: number;
    statusText: string;
    data: unknown;
    refreshed?: boolean;
  } | null;
  onRequest: () => void;
  isConnected: boolean;
};

export function AllegroApiConsole({
  activeConnection,
  method,
  setMethod,
  path,
  setPath,
  body,
  setBody,
  loading,
  error,
  response,
  onRequest,
  isConnected,
}: AllegroApiConsoleProps) {
  const allegroApiPresets = [
    { label: "Categories", method: "GET", path: "/sale/categories" },
    { label: "Offers", method: "GET", path: "/sale/offers?limit=10" },
    { label: "Offer Events", method: "GET", path: "/sale/offer-events?limit=10" },
    { label: "Checkout Forms", method: "GET", path: "/order/checkout-forms?limit=10" },
    { label: "Shipping Rates", method: "GET", path: "/sale/shipping-rates" },
    { label: "Return Policies", method: "GET", path: "/after-sales-service-returns" },
    { label: "Implied Warranties", method: "GET", path: "/after-sales-service-conditions" },
  ];

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-white">Allegro API Console</h3>
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
              setMethod(preset.method);
              setPath(preset.path);
              setBody("{}");
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {!isConnected && (
        <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Connect Allegro to enable API requests.
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-[120px_1fr]">
        <div>
          <label className="text-xs text-gray-400">Method</label>
          <select
            className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white"
            value={method}
            onChange={(event) => setMethod(event.target.value)}
          >
            {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400">Endpoint path</label>
          <input
            className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white"
            placeholder="/sale/categories"
            value={path}
            onChange={(event) => setPath(event.target.value)}
          />
        </div>
      </div>
      <div className="mt-3">
        <label className="text-xs text-gray-400">JSON body</label>
        <textarea
          className="mt-2 h-32 w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-white"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-70"
          type="button"
          disabled={loading || !isConnected}
          onClick={onRequest}
        >
          {loading ? "Sending..." : "Send request"}
        </button>
        <span className="text-xs text-gray-500">
          Base URL:{" "}
          {activeConnection?.allegroUseSandbox
            ? "https://api.allegro.pl.allegrosandbox.pl"
            : "https://api.allegro.pl"}
        </span>
      </div>
      {error && (
        <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}
      {response && (
        <div className="mt-3 rounded-md border border-gray-800 bg-gray-950 p-3">
          <div className="text-xs text-gray-400">
            Status:{" "}
            <span className="text-gray-200">
              {response.status} {response.statusText}
            </span>
            {response.refreshed ? (
              <span className="ml-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">
                Token refreshed
              </span>
            ) : null}
          </div>
          <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-gray-200">
            {JSON.stringify(response.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
