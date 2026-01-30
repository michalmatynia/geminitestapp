"use client";

import { ChatbotDebugState } from "@/shared/types/chatbot";

interface LogEntry {
  id: string;
  createdAt: string | number | Date;
  level: string;
  message: string;
}

interface DebugPanelProps {
  debugState: ChatbotDebugState;
  agentRunLogs: LogEntry[];
}

export function DebugPanel({
  debugState,
  agentRunLogs,
}: Omit<DebugPanelProps, "_agentRunAudits">): React.JSX.Element {
  return (
    <div className="h-full overflow-y-auto bg-card p-4 text-xs text-gray-300">
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
            {agentRunLogs.map((log: LogEntry): React.JSX.Element => (
              <div key={log.id} className="mb-1 border-b border-border pb-1">
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
