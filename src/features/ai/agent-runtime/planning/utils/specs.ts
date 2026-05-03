import { randomUUID } from 'crypto';

import { MAX_PLAN_STEPS, MAX_STEP_ATTEMPTS } from '@/features/ai/agent-runtime/core/config';
import type {
  AgentDecision,
  PlanStep,
  PlannerAlternative,
  PlannerMeta,
} from '@/shared/contracts/agent-runtime';

const LOGIN_PROMPT_TERMS = ['login', 'log in', 'sign in', 'signin'] as const;
const BROWSE_PROMPT_TERMS = ['browse', 'website'] as const;
const LOGIN_PLAN_STEPS = [
  'Open the target website.',
  'Locate the sign-in form.',
  'Fill in the credentials.',
  'Submit the form and wait for the next page.',
  'Verify the expected page or account state.',
] as const;
const BROWSE_PLAN_STEPS = [
  'Open the target URL.',
  'Wait for the page to finish loading.',
  'Locate the requested content.',
  'Capture the relevant details.',
] as const;

export interface PlanStepSpecInput {
  title?: string;
  tool?: string;
  expectedObservation?: string | null;
  successCriteria?: string | null;
  phase?: string | null;
  priority?: number | null;
  dependsOn?: number[] | string[] | null;
  goalId?: string | null;
  subgoalId?: string | null;
}

const includesPromptTerm = (prompt: string, terms: readonly string[]): boolean =>
  terms.some((term) => prompt.includes(term));

const isLoginPrompt = (prompt: string): boolean => includesPromptTerm(prompt, LOGIN_PROMPT_TERMS);

const isBrowsePrompt = (prompt: string): boolean => includesPromptTerm(prompt, BROWSE_PROMPT_TERMS);

const splitPromptIntoSteps = (prompt: string): string[] =>
  prompt
    .split(/[.!?]\s+/)
    .map((sentence: string) => sentence.trim())
    .filter(Boolean);

const resolvePromptPlanTemplate = (prompt: string): readonly string[] | null => {
  if (isLoginPrompt(prompt)) {
    return LOGIN_PLAN_STEPS;
  }
  if (isBrowsePrompt(prompt)) {
    return BROWSE_PLAN_STEPS;
  }
  return null;
};

const createToolDecision = (
  reason: string,
  toolName: AgentDecision['toolName'] = 'playwright'
) =>
  ({
    action: 'tool',
    reason,
    toolName,
  }) satisfies AgentDecision;

const createRespondDecision = (reason: string): AgentDecision => ({
  action: 'respond',
  reason,
});

const createWaitHumanDecision = (reason: string): AgentDecision => ({
  action: 'wait_human',
  reason,
});

const normalizeExplicitDecision = (
  decision: Partial<AgentDecision> | undefined
): AgentDecision | null => {
  switch (decision?.action) {
    case 'tool':
      return createToolDecision(
        decision.reason ?? 'LLM planner selected tool execution.',
        decision.toolName ?? 'playwright'
      );
    case 'respond':
      return createRespondDecision(decision.reason ?? 'LLM planner selected response.');
    case 'wait_human':
      return createWaitHumanDecision(
        decision.reason ?? 'LLM planner requires human input.'
      );
    default:
      return null;
  }
};

export function buildSafetyCheckSteps(
  meta?: PlannerMeta,
  maxStepAttempts: number = MAX_STEP_ATTEMPTS
): PlanStep[] {
  const checks = [...(meta?.safetyChecks ?? []), ...(meta?.critique?.safetyChecks ?? [])]
    .map((check: string) => check.trim())
    .filter(Boolean);
  if (checks.length === 0) return [];
  const limited = checks.slice(0, 3);
  return limited.map((check: string) => ({
    id: randomUUID(),
    title: `Safety check: ${check}`,
    status: 'pending' as const,
    tool: 'none' as const,
    expectedObservation: null,
    successCriteria: null,
    phase: 'observe' as const,
    priority: null,
    dependsOn: null,
    attempts: 0,
    maxAttempts: maxStepAttempts,
  }));
}

export function buildVerificationSteps(
  meta?: PlannerMeta,
  maxStepAttempts: number = MAX_STEP_ATTEMPTS
): PlanStep[] {
  const signals = meta?.successSignals ?? [];
  if (signals.length === 0) return [];
  const limited = signals.slice(0, 3);
  return limited.map((signal: string) => ({
    id: randomUUID(),
    title: `Verify: ${signal}`,
    status: 'pending' as const,
    tool: 'none' as const,
    expectedObservation: null,
    successCriteria: null,
    phase: 'verify' as const,
    priority: null,
    dependsOn: null,
    attempts: 0,
    maxAttempts: maxStepAttempts,
  }));
}

export function buildPlanStepsFromSpecs(
  stepSpecs: PlanStepSpecInput[],
  meta?: PlannerMeta | null,
  includeSafety: boolean = false,
  maxStepAttempts: number = MAX_STEP_ATTEMPTS
): PlanStep[] {
  const preflightSteps = includeSafety
    ? buildSafetyCheckSteps(meta ?? undefined, maxStepAttempts)
    : [];
  const plannedSteps: PlanStep[] = stepSpecs.map((step: PlanStepSpecInput) => ({
    id: randomUUID(),
    title: step.title?.trim() || 'Review the page state.',
    status: 'pending' as const,
    tool: step.tool === 'none' ? ('none' as const) : ('playwright' as const),
    expectedObservation: step.expectedObservation?.trim() || null,
    successCriteria: step.successCriteria?.trim() || null,
    goalId: step.goalId ?? null,
    subgoalId: step.subgoalId ?? null,
    phase: normalizePhase(step.phase),
    priority: typeof step.priority === 'number' ? step.priority : null,
    dependsOn: normalizeDependencies(step.dependsOn ?? undefined, stepSpecs),
    attempts: 0,
    maxAttempts: maxStepAttempts,
  }));
  const verificationSteps = includeSafety
    ? buildVerificationSteps(meta ?? undefined, maxStepAttempts)
    : [];
  return [...preflightSteps, ...plannedSteps, ...verificationSteps];
}

export function buildBranchStepsFromAlternatives(
  alternatives: PlannerAlternative[] | undefined,
  maxStepAttempts: number,
  maxSteps: number
): PlanStep[] {
  if (!alternatives?.length) return [];
  const specs = alternatives.flatMap((alternative: PlannerAlternative) => {
    if (alternative.steps?.length) {
      return alternative.steps.map((step) => ({
        title: step.title?.trim() ?? '',
        tool: step.tool ?? 'playwright',
        expectedObservation: step.expectedObservation ?? null,
        successCriteria: step.successCriteria ?? null,
        phase: step.phase ?? 'recover',
        priority: typeof step.priority === 'number' ? step.priority : null,
        dependsOn: step.dependsOn ?? null,
      }));
    }
    if (alternative.title?.trim()) {
      return [
        {
          title: alternative.title.trim(),
          tool: 'playwright',
          phase: 'recover',
        },
      ];
    }
    return [];
  });
  if (specs.length === 0) return [];
  return buildPlanStepsFromSpecs(specs, null, true, maxStepAttempts).slice(0, maxSteps);
}

export function normalizePhase(
  value?: string | null
): 'observe' | 'act' | 'verify' | 'recover' | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === 'observe') return 'observe';
  if (normalized === 'act') return 'act';
  if (normalized === 'verify') return 'verify';
  if (normalized === 'recover') return 'recover';
  return null;
}

export function normalizeDependencies(
  value: number[] | string[] | undefined,
  stepSpecs: Array<{ title?: string }>
): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (typeof value[0] === 'number') {
    return (value as number[])
      .filter((idx: number) => Number.isInteger(idx) && idx >= 0 && idx < stepSpecs.length)
      .map((idx: number) => `step-${idx}`);
  }
  if (typeof value[0] === 'string') {
    const names = value as string[];
    return names
      .map((name: string) => name.trim())
      .filter(Boolean)
      .map((name: string) => {
        const found = stepSpecs.findIndex(
          (spec: { title?: string }) => spec.title?.trim().toLowerCase() === name.toLowerCase()
        );
        return found >= 0 ? `step-${found}` : null;
      })
      .filter((idx: string | null): idx is string => idx !== null);
  }
  return null;
}

export function decideNextAction(prompt: string, memory: string[]): AgentDecision {
  const lower = prompt.toLowerCase();
  if (isBrowsePrompt(lower)) {
    return createToolDecision('Prompt implies browser automation.');
  }
  if (isLoginPrompt(lower)) {
    return createToolDecision('Prompt includes a login flow.');
  }

  if (memory.length > 0) {
    return createRespondDecision('Sufficient context to respond in scaffold.');
  }

  return createWaitHumanDecision('Not enough context; human input required.');
}

export function buildPlan(prompt: string, maxSteps: number = MAX_PLAN_STEPS): string[] {
  const normalized = prompt.trim();
  if (!normalized) return [];
  const lower = normalized.toLowerCase();
  const template = resolvePromptPlanTemplate(lower);
  return (template ?? splitPromptIntoSteps(normalized)).slice(0, maxSteps);
}

export function normalizeDecision(
  decision: Partial<AgentDecision> | undefined,
  steps: PlanStep[],
  prompt: string,
  memory: string[]
): AgentDecision {
  const explicitDecision = normalizeExplicitDecision(decision);
  if (explicitDecision) {
    return explicitDecision;
  }
  if (steps.length > 0) {
    return createToolDecision('Plan generated; execute tool steps.');
  }
  return decideNextAction(prompt, memory);
}

export function shouldEvaluateReplan(
  stepIndex: number,
  steps: PlanStep[],
  replanEverySteps: number
): boolean {
  if (steps.length < 3) return false;
  const nextIndex = stepIndex + 1;
  if (nextIndex >= steps.length) return false;
  return nextIndex % replanEverySteps === 0;
}

export function appendTaskTypeToPrompt(
  prompt: string,
  taskType: PlannerMeta['taskType'] | null
): string {
  if (!taskType) return prompt;
  return `${prompt}\n\nTask type: ${taskType}`;
}

export function isExtractionStep(
  step: PlanStep,
  prompt: string,
  taskType: PlannerMeta['taskType'] | null
): boolean {
  if (taskType === 'extract_info') return true;
  const combined = `${step.title} ${step.expectedObservation ?? ''} ${prompt}`.toLowerCase();
  const mentionsExtract = /(extract|collect|find|list|get)\b/.test(combined);
  const mentionsTarget = /(product|email)/.test(combined);
  return mentionsExtract && mentionsTarget;
}
