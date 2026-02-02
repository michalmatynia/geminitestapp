"use client";

import React from "react";

interface IntegrationAccountSummaryProps {
  integrationName: string | undefined;
  connectionName: string | undefined;
}

export function IntegrationAccountSummary({
  integrationName,
  connectionName,
}: IntegrationAccountSummaryProps): React.JSX.Element {
  return (
    <div className="rounded-md border bg-card/50 px-4 py-3">
      <p className="text-sm text-gray-300">
        <span className="text-gray-500">Integration:</span>{" "}
        <span className="font-medium">{integrationName || "Loading..."}</span>
      </p>
      <p className="text-sm text-gray-300">
        <span className="text-gray-500">Account:</span>{" "}
        <span className="font-medium">{connectionName || "Loading..."}</span>
      </p>
    </div>
  );
}
