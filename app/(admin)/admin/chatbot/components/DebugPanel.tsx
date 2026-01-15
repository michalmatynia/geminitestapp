"use client";

import React from "react";
import { ChatbotDebugState } from "@/types/chatbot";

interface DebugPanelProps {
  debugState: ChatbotDebugState;
  agentRunLogs: any[];
  agentRunAudits: any[];
}

export function DebugPanel({
  debugState,
  agentRunLogs,
  agentRunAudits,
}: DebugPanelProps) {
  return (
    <div className="h-full overflow-y-auto bg-gray-950 p-4 text-xs text-gray-300">
      <h3 className="mb-2 font-semibold text-white">Debug Information</h3>
      <div className="space-y-4">
        <div>
          <h4 className="mb-1 font-medium text-gray-400">Last Request</h4>
          <pre className="overflow-x-auto rounded bg-gray-900 p-2">
            {JSON.stringify(debugState.lastRequest, null, 2)}
          </pre>
        </div>
        <div>
          <h4 className="mb-1 font-medium text-gray-400">Last Response</h4>
          <pre className="overflow-x-auto rounded bg-gray-900 p-2">
            {JSON.stringify(debugState.lastResponse, null, 2)}
          </pre>
        </div>
        <div>
          <h4 className="mb-1 font-medium text-gray-400">Agent Logs</h4>
          <div className="max-h-60 overflow-y-auto rounded bg-gray-900 p-2">
            {agentRunLogs.map((log) => (
              <div key={log.id} className="mb-1 border-b border-gray-800 pb-1">
                <span className="text-gray-500">
                  [{new Date(log.createdAt).toLocaleTimeString()}]
                </span>{" "}
                <span
                  className={
                    log.level === "error"
                      ? "text-red-400"
                      : log.level === "warning"
                        ? "text-yellow-400"
                        : "text-gray-300"
                  }
                >
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
