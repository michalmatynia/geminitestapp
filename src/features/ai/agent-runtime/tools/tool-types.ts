import type { ExtractionPlan, FailureRecoveryPlan } from '@/shared/contracts/agent-runtime';

export type AgentToolRequest = {
  name: 'playwright';
  input: {
    prompt?: string;
    browser?: string;
    runId?: string;
    runHeadless?: boolean;
    stepId?: string;
    stepLabel?: string;
  };
};

type ToolOutput = {
  url?: string;
  domText?: string;
  snapshotId?: string | null;
  logCount?: number | null;
  extractedNames?: string[];
  extractedTotal?: number;
  extractedItems?: string[];
  extractionType?: 'product_names' | 'emails';
  extractionPlan?: unknown;
};

export type AgentToolResult = {
  ok: boolean;
  output?: ToolOutput;
  error?: string;
  errorId?: string;
};

export type AgentControlAction = 'goto' | 'reload' | 'snapshot';

export type AgentToolLog = (
  level: string,
  message: string,
  metadata?: Record<string, unknown>
) => Promise<void>;
