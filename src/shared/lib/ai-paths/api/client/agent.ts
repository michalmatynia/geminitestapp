import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';

import { apiPost, apiFetch, ApiResponse } from './base';

export type AgentEnqueuePayload = {
  prompt: string;
  model?: string;
  plannerModel?: string;
  selfCheckModel?: string;
  extractionValidationModel?: string;
  toolRouterModel?: string;
  memoryValidationModel?: string;
  memorySummarizationModel?: string;
  loopGuardModel?: string;
  approvalGateModel?: string;
  selectorInferenceModel?: string;
  outputNormalizationModel?: string;
  tools?: string[];
  searchProvider?: string;
  agentBrowser?: string;
  runHeadless?: boolean;
  ignoreRobotsTxt?: boolean;
  requireHumanApproval?: boolean;
  planSettings?: {
    maxSteps?: number;
    maxStepAttempts?: number;
    maxReplanCalls?: number;
    replanEverySteps?: number;
    maxSelfChecks?: number;
    loopGuardThreshold?: number;
    loopBackoffBaseMs?: number;
    loopBackoffMaxMs?: number;
  };
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
};

export type PlaywrightNodeEnqueuePayload = {
  script: string;
  input?: Record<string, unknown> | undefined;
  startUrl?: string | undefined;
  timeoutMs?: number | undefined;
  waitForResult?: boolean | undefined;
  browserEngine?: 'chromium' | 'firefox' | 'webkit' | undefined;
  personaId?: string | undefined;
  settingsOverrides?: Record<string, unknown> | undefined;
  launchOptions?: Record<string, unknown> | undefined;
  contextOptions?: Record<string, unknown> | undefined;
  contextRegistry?: ContextRegistryConsumerEnvelope | null | undefined;
  capture?:
    | {
        screenshot?: boolean | undefined;
        html?: boolean | undefined;
        video?: boolean | undefined;
        trace?: boolean | undefined;
      }
    | undefined;
};

export type PlaywrightNodeRunSnapshot = {
  runId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string | null;
  artifacts?: Array<{
    name: string;
    path: string;
    mimeType?: string | null;
    kind?: string | null;
  }>;
  logs?: string[];
  startedAt?: string | null;
  completedAt?: string | null;
};

export async function enqueueAgentRun(
  payload: AgentEnqueuePayload
): Promise<ApiResponse<{ runId: string }>> {
  return apiPost<{ runId: string }>('/api/ai/agent-runtime/enqueue', payload);
}

export async function enqueuePlaywrightRun(
  payload: PlaywrightNodeEnqueuePayload
): Promise<ApiResponse<{ run: PlaywrightNodeRunSnapshot }>> {
  return apiPost<{ run: PlaywrightNodeRunSnapshot }>('/api/ai-paths/playwright', payload);
}

export async function fetchPlaywrightRun(
  runId: string
): Promise<ApiResponse<{ run: PlaywrightNodeRunSnapshot }>> {
  return apiFetch<{ run: PlaywrightNodeRunSnapshot }>(`/api/ai-paths/playwright/${runId}`);
}
