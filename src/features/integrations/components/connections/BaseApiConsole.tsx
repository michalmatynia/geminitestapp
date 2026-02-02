"use client";

import { Button, Input, Textarea, Label, Alert } from "@/shared/ui";
import { IntegrationConnection } from "@/features/integrations/types/integrations-ui";




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
}: BaseApiConsoleProps): React.JSX.Element {
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
    <div className="rounded-lg border border-border bg-card/60 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-white">Base.com API Console</h3>
        <p className="text-xs text-gray-400">
          Send Base.com API requests using the active connection token.
        </p>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {baseApiPresets.map((preset: { label: string; method: string; params: Record<string, unknown> }) => (
          <Button
            key={preset.label}
            type="button"
            className="rounded-full border px-3 py-1 text-[11px] text-gray-300 hover:border-gray-500"
            onClick={(): void => {
              setMethod(preset.method);
              setParams(JSON.stringify(preset.params, null, 2));
            }}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <div>
        <Label className="text-xs text-gray-400">Method</Label>
        <Input
          className="mt-2 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-white"
          placeholder="getInventories"
          value={method}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setMethod(event.target.value)}
        />
      </div>
      <div className="mt-3">
        <Label className="text-xs text-gray-400">Parameters (JSON)</Label>
        <Textarea
          className="mt-2 h-32 w-full rounded-md border border-border bg-card px-3 py-2 text-xs text-white"
          value={params}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => setParams(event.target.value)}
        />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button
          className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-70"
          type="button"
          disabled={loading}
          onClick={onRequest}
        >
          {loading ? "Sending..." : "Send request"}
        </Button>
        <span className="text-xs text-gray-500">
          Endpoint: https://api.baselinker.com/connector.php
        </span>
      </div>
      {error && (
        <Alert variant="error" className="mt-3 text-xs">
          {error}
        </Alert>
      )}
      {response && (
        <div className="mt-3 rounded-md border border-border bg-card p-3">
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs text-gray-200">
            {JSON.stringify(response.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
