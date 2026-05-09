import type {
  AgentPlanPreferences,
  AgentPlanSettings,
  AgentRuntimeExecutionPreferences,
} from '@/shared/contracts/agent-runtime';

/** Enable debug logging for chatbot operations */
export const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

/** Maximum number of steps an agent can execute in a single plan */
export const MAX_PLAN_STEPS = 12;

/** Maximum retry attempts for a failed step before giving up */
export const MAX_STEP_ATTEMPTS = 2;

/** Maximum number of times an agent can replan during execution */
export const MAX_REPLAN_CALLS = 2;

/** Trigger replanning after this many steps to adapt to new information */
export const REPLAN_EVERY_STEPS = 2;

/** Maximum number of self-validation checks an agent can perform */
export const MAX_SELF_CHECKS = 4;

/** Number of similar actions before triggering loop detection */
export const LOOP_GUARD_THRESHOLD = 2;

/** Base delay in milliseconds when backing off from detected loops */
export const LOOP_BACKOFF_BASE_MS = 2000;

/** Maximum delay in milliseconds for loop backoff (exponential cap) */
export const LOOP_BACKOFF_MAX_MS = 12000;

/** Default configuration for agent planning and execution */
export const DEFAULT_AGENT_SETTINGS: AgentPlanSettings = {
  maxSteps: MAX_PLAN_STEPS,
  maxStepAttempts: MAX_STEP_ATTEMPTS,
  maxReplanCalls: MAX_REPLAN_CALLS,
  replanEverySteps: REPLAN_EVERY_STEPS,
  maxSelfChecks: MAX_SELF_CHECKS,
  loopGuardThreshold: LOOP_GUARD_THRESHOLD,
  loopBackoffBaseMs: LOOP_BACKOFF_BASE_MS,
  loopBackoffMaxMs: LOOP_BACKOFF_MAX_MS,
};

function getNumericValue(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return NaN;
}

export const clampInt = (value: unknown, min: number, max: number, fallback: number): number => {
  const numeric = getNumericValue(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(Math.max(Math.round(numeric), min), max);
};

export function resolveAgentPlanSettings(planState: unknown): AgentPlanSettings {
  const isObject = planState !== null && typeof planState === 'object';
  const raw = isObject
    ? (planState as { settings?: Partial<AgentPlanSettings> }).settings
    : null;
  const settings = raw ?? {};
  const s = DEFAULT_AGENT_SETTINGS;

  return {
    maxSteps: clampInt(settings.maxSteps, 1, 20, s.maxSteps),
    maxStepAttempts: clampInt(settings.maxStepAttempts, 1, 5, s.maxStepAttempts),
    maxReplanCalls: clampInt(settings.maxReplanCalls, 0, 6, s.maxReplanCalls),
    replanEverySteps: clampInt(settings.replanEverySteps, 1, 10, s.replanEverySteps),
    maxSelfChecks: clampInt(settings.maxSelfChecks, 0, 8, s.maxSelfChecks),
    loopGuardThreshold: clampInt(settings.loopGuardThreshold, 1, 5, s.loopGuardThreshold),
    loopBackoffBaseMs: clampInt(settings.loopBackoffBaseMs, 250, 20000, s.loopBackoffBaseMs),
    loopBackoffMaxMs: clampInt(settings.loopBackoffMaxMs, 1000, 60000, s.loopBackoffMaxMs),
  };
}

export function resolveAgentPreferences(planState: unknown): AgentRuntimeExecutionPreferences {
  const isObject = planState !== null && typeof planState === 'object';
  const raw = isObject
    ? (planState as { preferences?: AgentPlanPreferences }).preferences
    : null;
  const prefs = raw ?? {};

  return {
    ignoreRobotsTxt: Boolean(prefs.ignoreRobotsTxt),
    requireHumanApproval: Boolean(prefs.requireHumanApproval),
  };
}
