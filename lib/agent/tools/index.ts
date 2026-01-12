export type AgentToolRequest = {
  name: "playwright";
  input: Record<string, unknown>;
};

export type AgentToolResult = {
  ok: boolean;
  output?: Record<string, unknown>;
  error?: string;
};

export async function runAgentTool(_request: AgentToolRequest): Promise<AgentToolResult> {
  return {
    ok: false,
    error: "Tool execution not wired yet.",
  };
}
