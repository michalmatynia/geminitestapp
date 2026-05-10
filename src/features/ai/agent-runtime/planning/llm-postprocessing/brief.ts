import 'server-only';

import {
  normalizeStringList,
  parsePlanJson,
} from '@/features/ai/agent-runtime/planning/utils';
import type { PlanStep } from '@/shared/contracts/agent-runtime';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { runPlanningPostprocessTask, recordPostprocessAudit } from './core';

export interface BuildCheckpointBriefArgs {
  prompt: string;
  model: string;
  memory: string[];
  steps: PlanStep[];
  activeStepId: string | null;
  lastError?: string | null;
  browserContext?: {
    url: string;
    title: string | null;
    domTextSample: string;
    logs: { level: string; message: string }[];
    uiInventory?: unknown;
  } | null;
  runId?: string;
}

export async function buildCheckpointBriefWithLLM(args: BuildCheckpointBriefArgs): Promise<{ summary: string; nextActions: string[]; risks: string[] } | null> {
  const { prompt, model, memory, steps, activeStepId, lastError, browserContext, runId } = args;
  try {
    const content = await runPlanningPostprocessTask({
      model,
      systemPrompt:
        'You generate checkpoint briefs. Return only JSON with keys: summary, nextActions[], risks[]. summary should be 1-2 sentences. nextActions are concrete next steps.',
      userContent: JSON.stringify({
        prompt,
        memory,
        activeStepId,
        lastError,
        steps: steps.map((step: PlanStep) => ({
          id: step.id,
          title: step.title,
          status: step.status,
          phase: step.phase,
        })),
        browserContext,
      }),
    });
    const parsed = parsePlanJson(content) as {
      summary?: string;
      nextActions?: string[];
      risks?: string[];
    } | null;
    if (!parsed?.summary?.trim()) return null;

    const { summary } = parsed;
    const nextActions = normalizeStringList(parsed.nextActions);
    const risks = normalizeStringList(parsed.risks);
    
    await recordPostprocessAudit(runId, 'Checkpoint brief created.', {
      summary,
      nextActions,
      risks,
    });
    
    return { summary, nextActions, risks };
  } catch (err) {
    void ErrorSystem.captureException(err);
    void ErrorSystem.logWarning('[chatbot][agent][engine] Checkpoint brief failed', {
      runId: runId ?? undefined,
      error: err,
    });
    return null;
  }
}
