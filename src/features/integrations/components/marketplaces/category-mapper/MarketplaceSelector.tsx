"use client";

import { Button } from "@/shared/ui";
import { Store } from "lucide-react";

type Integration = {
  id: string;
  name: string;
  slug: string;
};

type Connection = {
  id: string;
  integrationId: string;
  name: string;
};

type IntegrationWithConnections = Integration & {
  connections: Connection[];
};

type MarketplaceSelectorProps = {
  integrations: IntegrationWithConnections[];
  loading: boolean;
  selectedConnectionId: string | null;
  onSelectConnection: (connectionId: string) => void;
};

export function MarketplaceSelector({
  integrations,
  loading,
  selectedConnectionId,
  onSelectConnection,
}: MarketplaceSelectorProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        <h2 className="mb-4 text-sm font-semibold text-gray-300">Connections</h2>
        <div className="animate-pulse space-y-2">
          <div className="h-8 rounded bg-gray-800" />
          <div className="h-8 rounded bg-gray-800" />
        </div>
      </div>
    );
  }

  if (integrations.length === 0) {
    return (
      <div className="space-y-2">
        <h2 className="mb-4 text-sm font-semibold text-gray-300">Connections</h2>
        <p className="text-sm text-gray-500">
          No marketplace connections found. Configure a Base.com connection in{" "}
          <a href="/admin/integrations" className="text-blue-400 hover:underline">
            Integrations
          </a>{" "}
          first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-300">Connections</h2>

      {integrations.map((integration) => (
        <div key={integration.id} className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Store className="h-3 w-3" />
            <span>{integration.name}</span>
          </div>

          <div className="ml-5 space-y-1">
            {integration.connections.length === 0 ? (
              <p className="text-xs text-gray-600">No connections</p>
            ) : (
              integration.connections.map((connection) => (
                <Button
                  key={connection.id}
                  onClick={() => onSelectConnection(connection.id)}
                  className={`w-full rounded px-3 py-2 text-left text-sm transition ${
                    selectedConnectionId === connection.id
                      ? "bg-gray-800 text-white"
                      : "text-gray-300 hover:bg-muted/50/60"
                  }`}
                >
                  {connection.name}
                </Button>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
