import type {
  PlaywrightToolRequest as AgentToolRequest,
  ToolOutput,
  AgentToolResultV2 as AgentToolResult,
  FailureRecoveryPlan,
} from '@/shared/contracts/agent-runtime';

export type { AgentToolRequest, ToolOutput, AgentToolResult, FailureRecoveryPlan };

export type ToolLlmContext = {
  model: string;
  runId: string;
  log: (level: string, message: string, metadata?: Record<string, unknown>) => Promise<void>;
  activeStepId?: string | null;
  stepLabel?: string;
};
