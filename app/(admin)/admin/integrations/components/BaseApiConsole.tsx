"use client";

import { IntegrationConnection } from "../types";

type BaseApiConsoleProps = {
  activeConnection: IntegrationConnection | null;
  method: string;
  setMethod: (value: string) => void;
  params: string;
  setParams: (value: string) => void;
  loading: boolean;
  error: string | null;
  response: { data: unknown } | null;
  onRequest: () => void;
};

export function BaseApiConsole({
  activeConnection,
  method,
  setMethod,
  params,
  setParams,
  loading,
  error,
  response,
  onRequest,
}: BaseApiConsoleProps) {
  const defaultInventoryId = activeConnection?.baseLastInventoryId ?? "";
  
  const baseApiPresets = [
    { label: "Inventories", method: "getInventories", params: {} },
    {
      label: "Products List",
      method: "getInventoryProductsList",
      params: { inventory_id: defaultInventoryId, limit: 10 },
    },
    {
      label: "Inventory Products",
      method: "getInventoryProductsList",
      params: { inventory_id: defaultInventoryId },
    },
    {
      label: "Detailed Product",
      method: "getInventoryProductDetailed",
      params: { inventory_id: defaultInventoryId, product_id: "" },
    },
    { label: "Orders", method: "getOrders", params: { get_unconfirmed_orders: 1, limit: 10 } },
    { label: "Order Statuses", method: "getOrderStatusList", params: {} },
    { label: "Orders Log", method: "getOrdersLog", params: { limit: 10 } },
  ];

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-white">Base.com API Console</h3>
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
              setMethod(preset.method);
              setParams(JSON.stringify(preset.params, null, 2));
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
          value={method}
          onChange={(event) => setMethod(event.target.value)}
        />
      </div>
      <div className="mt-3">
        <label className="text-xs text-gray-400">Parameters (JSON)</label>
        <textarea
          className="mt-2 h-32 w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-white"
          value={params}
          onChange={(event) => setParams(event.target.value)}
        />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-70"
          type="button"
          disabled={loading}
          onClick={onRequest}
        >
          {loading ? "Sending..." : "Send request"}
        </button>
        <span className="text-xs text-gray-500">
          Endpoint: https://api.baselinker.com/connector.php
        </span>
      </div>
      {error && (
        <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}
      {response && (
        <div className="mt-3 rounded-md border border-gray-800 bg-gray-950 p-3">
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs text-gray-200">
            {JSON.stringify(response.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
