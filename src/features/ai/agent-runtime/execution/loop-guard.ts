import { DEBUG_CHATBOT, OLLAMA_BASE_URL } from '@/features/ai/agent-runtime/core/config';
import {
  buildBranchStepsFromAlternatives,
  buildPlanStepsFromSpecs,
  flattenPlanHierarchy,
  normalizePlanHierarchy,
  normalizePlannerMeta,
  normalizeStringList,
  parsePlanJson,
} from '@/features/ai/agent-runtime/planning/utils';
import { ErrorSystem } from '@/features/observability/server';
import type {
  LoopSignal,
  PlanStep,
  PlannerMeta,
} from '@/shared/contracts/agent-runtime';
import prisma from '@/shared/lib/db/prisma';

type PlanStepSpecInput = {
  title?: string;
  tool?: string;
  expectedObservation?: string | null;
  successCriteria?: string | null;
  phase?: string | null;
  priority?: number | null;
  dependsOn?: number[] | string[] | null;
  goalId?: string | null;
  subgoalId?: string | null;
};

const normalizePlanStepSpecs = (steps: PlanStepSpecInput[]): PlanStepSpecInput[] =>
  steps.map((step: PlanStepSpecInput) => {
    const {
      expectedObservation,
      successCriteria,
      phase,
      priority,
      dependsOn,
      ...rest
    } = step;
    return {
      ...rest,
      ...(expectedObservation != null && { expectedObservation }),
      ...(successCriteria != null && { successCriteria }),
      ...(phase != null && { phase }),
      ...(priority != null && { priority }),
      ...(dependsOn != null && { dependsOn }),
    };
  });

export const detectLoopPattern = (
  recent: Array<{
    title: string;
    status: PlanStep['status'];
    tool?: string | null;
    url: string | null;
  }>
): LoopSignal | null => {
  if (recent.length < 3) return null;
  const lastThree = recent.slice(-3);
  const lastFour = recent.slice(-4);
  const titlesThree = lastThree.map((item: { title: string }) => item.title);
  const titlesFour = lastFour.map((item: { title: string }) => item.title);
  const urlsThree = lastThree.map((item: { url: string | null }) => item.url);
  const statusesThree = lastThree.map((item: { status: PlanStep['status'] }) => item.status);
  const sameTitle =
    new Set(titlesThree.map((title: string) => title.toLowerCase())).size === 1;
  if (sameTitle) {
    return {
      reason: 'Repeated the same step multiple times.',
      pattern: 'repeat-same-step',
      titles: titlesThree,
      urls: urlsThree,
      statuses: statusesThree,
    };
  }
  if (lastFour.length === 4) {
    const [a, b, c, d] = titlesFour.map((title: string) => title.toLowerCase());
    if (a === c && b === d && a !== b) {
      return {
        reason: 'Alternating between the same two steps.',
        pattern: 'alternate-two-steps',
        titles: titlesFour,
        urls: lastFour.map((item: { url: string | null }) => item.url),
        statuses: lastFour.map((item: { status: PlanStep['status'] }) => item.status),
      };
    }
  }
  const stableUrl =
    urlsThree[0] &&
    urlsThree.every((url: string | null) => url && url === urlsThree[0]) &&
    statusesThree.filter((status: PlanStep['status']) => status === 'failed').length >= 2;
  if (stableUrl) {
    return {
      reason: 'Repeated failures on the same URL.',
      pattern: 'same-url-failures',
      titles: titlesThree,
      urls: urlsThree,
      statuses: statusesThree,
    };
  }
  return null;
};

export async function buildLoopGuardReview({
  prompt,
  memory,
  model,
  browserContext,
  currentPlan,
  completedIndex,
  loopSignal,
  lastError,
  runId,
  maxSteps,
  maxStepAttempts,
}: {
  prompt: string;
  memory: string[];
  model: string;
  browserContext?: {
    url: string;
    title: string | null;
    domTextSample: string;
    logs: { level: string; message: string }[];
    uiInventory?: unknown;
  } | null;
  currentPlan: PlanStep[];
  completedIndex: number;
  loopSignal: LoopSignal;
  lastError?: string | null;
  runId?: string;
  maxSteps: number;
  maxStepAttempts: number;
}): Promise<{
  action: 'continue' | 'replan' | 'wait_human';
  reason?: string;
  questions?: string[];
  evidence?: string[];
  steps: PlanStep[];
  hierarchy?: ReturnType<typeof normalizePlanHierarchy> | null;
  meta?: PlannerMeta | null;
}> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: 'system',
            content:
              'You are a loop-guard. Output only JSON with keys: action, reason, questions, evidence, goals, critique, alternatives, taskType, summary, constraints, successSignals. action is \'continue\', \'replan\', or \'wait_human\'. Provide 2-4 questions that test whether the agent is looping. If action is \'replan\', include goals (planner schema) or steps: array of {title, tool, expectedObservation, successCriteria, phase, priority, dependsOn}.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              prompt,
              memory,
              browserContext,
              lastError,
              loopSignal,
              completedStepIndex: completedIndex,
              currentPlan: currentPlan.map((step: PlanStep) => ({
                title: step.title,
                status: step.status,
                tool: step.tool,
                expectedObservation: step.expectedObservation,
                successCriteria: step.successCriteria,
              })),
              maxSteps,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Loop guard failed (${response.status}).`);
    }
    const payload = (await response.json()) as {
      message?: { content?: string };
    };
    const content = payload.message?.content?.trim() ?? '';
    const parsed = parsePlanJson(content) as {
      action?: string;
      reason?: string;
      questions?: string[];
      evidence?: string[];
      steps?: Array<{
        title?: string;
        tool?: string;
        expectedObservation?: string;
        successCriteria?: string;
        phase?: string;
        priority?: number;
        dependsOn?: number[] | string[];
      }>;
      goals?: Array<{
        title?: string;
        successCriteria?: string;
        subgoals?: Array<{
          title?: string;
          successCriteria?: string;
          steps?: Array<{
            title?: string;
            tool?: string;
            expectedObservation?: string;
            successCriteria?: string;
            phase?: string;
            priority?: number;
            dependsOn?: number[] | string[];
          }>;
        }>;
      }>;
      taskType?: string;
    } | null;
    if (!parsed) return { action: 'continue', steps: [] };
    const action =
      parsed.action === 'replan' || parsed.action === 'wait_human'
        ? parsed.action
        : 'continue';
    const meta = normalizePlannerMeta(parsed);
    const hierarchy = normalizePlanHierarchy(parsed);
    const hierarchySteps = hierarchy ? flattenPlanHierarchy(hierarchy) : [];
    const stepSpecs =
      hierarchySteps.length > 0 ? hierarchySteps : (parsed.steps ?? []);
    let steps =
      action === 'replan'
        ? buildPlanStepsFromSpecs(
          normalizePlanStepSpecs(stepSpecs),
          meta,
          true,
          maxStepAttempts
        ).slice(0, maxSteps)
        : [];
    if (action === 'replan' && steps.length === 0) {
      const fallbackBranch = buildBranchStepsFromAlternatives(
        meta?.alternatives ?? undefined,
        maxStepAttempts,
        maxSteps
      );
      if (fallbackBranch.length > 0) {
        steps = fallbackBranch;
      }
    }
    if ('agentAuditLog' in prisma && runId) {
      await prisma.agentAuditLog.create({
        data: {
          runId,
          level: 'info',
          message: 'Loop guard completed.',
          metadata: {
            action,
            reason: parsed.reason ?? null,
            loop: loopSignal,
          },
        },
      });
    }
    return {
      action,
      ...(parsed.reason && { reason: parsed.reason }),
      questions: normalizeStringList(parsed.questions),
      evidence: normalizeStringList(parsed.evidence),
      steps,
      hierarchy,
      meta,
    };
  } catch (error) {
    if (DEBUG_CHATBOT) {
      void ErrorSystem.logWarning('Loop guard failed', {
        service: 'agent-engine',
        action: 'loop-guard',
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return { action: 'continue', steps: [] };
  }
}
