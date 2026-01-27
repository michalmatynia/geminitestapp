import type { AgentPlanPreferences, AgentPlanSettings } from "@/types/agent";

export const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";
export const MAX_PLAN_STEPS = 12;
export const MAX_STEP_ATTEMPTS = 2;
export const MAX_REPLAN_CALLS = 2;
export const REPLAN_EVERY_STEPS = 2;
export const MAX_SELF_CHECKS = 4;
export const LOOP_GUARD_THRESHOLD = 2;
export const LOOP_BACKOFF_BASE_MS = 2000;
export const LOOP_BACKOFF_MAX_MS = 12000;
export const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
export const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3-vl:30b";
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

export const clampInt = (
  value: unknown,
  min: number,
  max: number,
  fallback: number
) => {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(Math.max(Math.round(numeric), min), max);
};

export function resolveAgentPlanSettings(
  planState: unknown
): AgentPlanSettings {
  const rawSettings =
    planState && typeof planState === "object"
      ? (planState as { settings?: Partial<AgentPlanSettings> }).settings
      : null;
  return {
    maxSteps: clampInt(
      rawSettings?.maxSteps,
      1,
      20,
      DEFAULT_AGENT_SETTINGS.maxSteps
    ),
    maxStepAttempts: clampInt(
      rawSettings?.maxStepAttempts,
      1,
      5,
      DEFAULT_AGENT_SETTINGS.maxStepAttempts
    ),
    maxReplanCalls: clampInt(
      rawSettings?.maxReplanCalls,
      0,
      6,
      DEFAULT_AGENT_SETTINGS.maxReplanCalls
    ),
    replanEverySteps: clampInt(
      rawSettings?.replanEverySteps,
      1,
      10,
      DEFAULT_AGENT_SETTINGS.replanEverySteps
    ),
    maxSelfChecks: clampInt(
      rawSettings?.maxSelfChecks,
      0,
      8,
      DEFAULT_AGENT_SETTINGS.maxSelfChecks
    ),
    loopGuardThreshold: clampInt(
      rawSettings?.loopGuardThreshold,
      1,
      5,
      DEFAULT_AGENT_SETTINGS.loopGuardThreshold
    ),
    loopBackoffBaseMs: clampInt(
      rawSettings?.loopBackoffBaseMs,
      250,
      20000,
      DEFAULT_AGENT_SETTINGS.loopBackoffBaseMs
    ),
    loopBackoffMaxMs: clampInt(
      rawSettings?.loopBackoffMaxMs,
      1000,
      60000,
      DEFAULT_AGENT_SETTINGS.loopBackoffMaxMs
    ),
  };
}

export function resolveAgentPreferences(
  planState: unknown
): AgentPlanPreferences {
  const rawPreferences =
    planState && typeof planState === "object"
      ? (planState as { preferences?: AgentPlanPreferences }).preferences
      : null;
  return {
    ignoreRobotsTxt: Boolean(rawPreferences?.ignoreRobotsTxt),
    requireHumanApproval: Boolean(rawPreferences?.requireHumanApproval),
    memoryValidationModel:
      typeof rawPreferences?.memoryValidationModel === "string"
        ? rawPreferences.memoryValidationModel
        : undefined,
    plannerModel:
      typeof rawPreferences?.plannerModel === "string"
        ? rawPreferences.plannerModel
        : undefined,
    selfCheckModel:
      typeof rawPreferences?.selfCheckModel === "string"
        ? rawPreferences.selfCheckModel
        : undefined,
    loopGuardModel:
      typeof rawPreferences?.loopGuardModel === "string"
        ? rawPreferences.loopGuardModel
        : undefined,
    approvalGateModel:
      typeof rawPreferences?.approvalGateModel === "string"
        ? rawPreferences.approvalGateModel
        : undefined,
    memorySummarizationModel:
      typeof rawPreferences?.memorySummarizationModel === "string"
        ? rawPreferences.memorySummarizationModel
        : undefined,
  };
}
