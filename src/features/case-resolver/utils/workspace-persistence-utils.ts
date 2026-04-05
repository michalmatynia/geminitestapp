import { type CaseResolverWorkspace } from '@/shared/contracts/case-resolver';

import { normalizeCaseResolverWorkspace } from '../settings.workspace';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export const readPositiveIntegerEnv = (key: string, fallback: number): number => {
  const value = process.env[key];
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.floor(parsed);
  if (normalized <= 0) return fallback;
  return normalized;
};

export const formatByteCount = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let normalized = value;
  let unitIndex = 0;
  while (normalized >= 1024 && unitIndex < units.length - 1) {
    normalized /= 1024;
    unitIndex += 1;
  }
  const rounded =
    normalized >= 10 || unitIndex === 0 ? normalized.toFixed(0) : normalized.toFixed(1);
  return `${rounded} ${units[unitIndex]}`;
};

const normalizePositiveInteger = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : fallback;
};

const normalizeNonNegativeInteger = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  const normalized = Math.floor(value);
  return normalized >= 0 ? normalized : fallback;
};

const resolveCaseResolverConflictRetryConfig = (
  attempt: number,
  options?: {
    baseDelayMs?: number;
    maxDelayMs?: number;
    jitterMs?: number;
  },
  defaults?: {
    baseDelayMs: number;
    maxDelayMs: number;
    jitterMs: number;
  }
): {
  attempt: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterMs: number;
} => {
  const normalizedAttempt = normalizePositiveInteger(attempt, 1);
  const baseDelayMs = normalizePositiveInteger(options?.baseDelayMs, defaults?.baseDelayMs ?? 150);
  const maxDelayMs = Math.max(
    baseDelayMs,
    normalizePositiveInteger(options?.maxDelayMs, defaults?.maxDelayMs ?? 1500)
  );
  const jitterMs = normalizeNonNegativeInteger(options?.jitterMs, defaults?.jitterMs ?? 120);
  return {
    attempt: normalizedAttempt,
    baseDelayMs,
    maxDelayMs,
    jitterMs,
  };
};

const computeExponentialRetryDelayMs = (input: {
  attempt: number;
  baseDelayMs: number;
  maxDelayMs: number;
}): number =>
  Math.min(input.maxDelayMs, input.baseDelayMs * Math.pow(2, input.attempt - 1));

const computeRetryJitterMs = (jitterMs: number): number =>
  jitterMs > 0 ? Math.floor(Math.random() * (jitterMs + 1)) : 0;

export const computeCaseResolverConflictRetryDelayMs = (
  attempt: number,
  options?: {
    baseDelayMs?: number;
    maxDelayMs?: number;
    jitterMs?: number;
  },
  defaults?: {
    baseDelayMs: number;
    maxDelayMs: number;
    jitterMs: number;
  }
): number => {
  const config = resolveCaseResolverConflictRetryConfig(attempt, options, defaults);
  return (
    computeExponentialRetryDelayMs(config) +
    computeRetryJitterMs(config.jitterMs)
  );
};

export const createCaseResolverWorkspaceMutationId = (
  prefix = 'case-resolver-workspace'
): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
};

export const getCaseResolverWorkspaceRevision = (workspace: {
  workspaceRevision?: unknown;
}): number => {
  const candidate = workspace.workspaceRevision;
  if (typeof candidate !== 'number' || !Number.isFinite(candidate)) return 0;
  if (candidate <= 0) return 0;
  return Math.floor(candidate);
};

export const stampCaseResolverWorkspaceMutation = (
  workspace: CaseResolverWorkspace,
  input: {
    baseRevision: number;
    mutationId: string;
    timestamp?: string;
    normalizeWorkspace?: boolean;
  }
): CaseResolverWorkspace => {
  const baseWorkspace =
    input.normalizeWorkspace === false ? workspace : normalizeCaseResolverWorkspace(workspace);
  const baseRevision =
    typeof input.baseRevision === 'number' && Number.isFinite(input.baseRevision)
      ? Math.max(0, Math.floor(input.baseRevision))
      : 0;
  const nextRevision = Math.max(getCaseResolverWorkspaceRevision(baseWorkspace), baseRevision + 1);
  return {
    ...baseWorkspace,
    workspaceRevision: nextRevision,
    lastMutationId: input.mutationId.trim() || null,
    lastMutationAt: (input.timestamp ?? new Date().toISOString()).trim(),
  };
};

export const safeParseJson = <T>(value: string): T | null => {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    logClientError(error);
    return null;
  }
};
