import { type CaseResolverWorkspace } from '@/shared/contracts/case-resolver';
import { normalizeCaseResolverWorkspace } from '../settings.workspace';

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
  const normalizedAttempt = Number.isFinite(attempt) && attempt > 0 ? Math.floor(attempt) : 1;
  const baseDelayMs =
    Number.isFinite(options?.baseDelayMs) && (options?.baseDelayMs ?? 0) > 0
      ? Math.floor(options?.baseDelayMs ?? 0)
      : (defaults?.baseDelayMs ?? 150);
  const maxDelayMs =
    Number.isFinite(options?.maxDelayMs) && (options?.maxDelayMs ?? 0) > 0
      ? Math.max(baseDelayMs, Math.floor(options?.maxDelayMs ?? baseDelayMs))
      : (defaults?.maxDelayMs ?? 1500);
  const jitterMs =
    Number.isFinite(options?.jitterMs) && (options?.jitterMs ?? 0) >= 0
      ? Math.floor(options?.jitterMs ?? 0)
      : (defaults?.jitterMs ?? 120);

  const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, normalizedAttempt - 1));
  const jitter = jitterMs > 0 ? Math.floor(Math.random() * (jitterMs + 1)) : 0;
  return exponentialDelay + jitter;
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
  } catch {
    return null;
  }
};
