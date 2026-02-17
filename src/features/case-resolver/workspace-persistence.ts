import {
  CASE_RESOLVER_WORKSPACE_KEY,
  normalizeCaseResolverWorkspace,
  parseCaseResolverWorkspace,
} from './settings';

import type { CaseResolverWorkspace } from './types';

const CASE_RESOLVER_WORKSPACE_DEBUG_EVENTS_KEY = '__caseResolverWorkspaceDebugEvents';
const CASE_RESOLVER_WORKSPACE_DEBUG_EVENT_NAME = 'case-resolver-workspace-debug';
const CASE_RESOLVER_WORKSPACE_DEBUG_LIMIT = 200;

type CaseResolverWorkspaceDebugEvent = {
  id: string;
  timestamp: string;
  source: string;
  action: string;
  message?: string;
  mutationId?: string | null;
  expectedRevision?: number | null;
  currentRevision?: number | null;
  workspaceRevision?: number | null;
};

type SettingsRecordLike = {
  key?: unknown;
  value?: unknown;
  conflict?: unknown;
  idempotent?: unknown;
  currentRevision?: unknown;
};

type PersistWorkspaceInput = {
  workspace: CaseResolverWorkspace;
  expectedRevision: number;
  mutationId: string;
  source: string;
};

type PersistWorkspaceSuccess = {
  ok: true;
  workspace: CaseResolverWorkspace;
  idempotent: boolean;
};

type PersistWorkspaceConflict = {
  ok: false;
  conflict: true;
  workspace: CaseResolverWorkspace;
  expectedRevision: number;
  currentRevision: number;
};

type PersistWorkspaceFailure = {
  ok: false;
  conflict: false;
  error: string;
};

export type PersistCaseResolverWorkspaceResult =
  | PersistWorkspaceSuccess
  | PersistWorkspaceConflict
  | PersistWorkspaceFailure;

const readDebugBuffer = (): CaseResolverWorkspaceDebugEvent[] => {
  const scope = globalThis as typeof globalThis & {
    [CASE_RESOLVER_WORKSPACE_DEBUG_EVENTS_KEY]?: CaseResolverWorkspaceDebugEvent[];
  };
  if (!Array.isArray(scope[CASE_RESOLVER_WORKSPACE_DEBUG_EVENTS_KEY])) {
    scope[CASE_RESOLVER_WORKSPACE_DEBUG_EVENTS_KEY] = [];
  }
  return scope[CASE_RESOLVER_WORKSPACE_DEBUG_EVENTS_KEY] ?? [];
};

const writeDebugBuffer = (events: CaseResolverWorkspaceDebugEvent[]): void => {
  const scope = globalThis as typeof globalThis & {
    [CASE_RESOLVER_WORKSPACE_DEBUG_EVENTS_KEY]?: CaseResolverWorkspaceDebugEvent[];
  };
  scope[CASE_RESOLVER_WORKSPACE_DEBUG_EVENTS_KEY] = events;
};

const safeParseJson = <T>(value: string): T | null => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const createCaseResolverWorkspaceMutationId = (prefix = 'case-resolver-workspace'): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
};

export const getCaseResolverWorkspaceRevision = (workspace: CaseResolverWorkspace): number => {
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
  }
): CaseResolverWorkspace => {
  const normalized = normalizeCaseResolverWorkspace(workspace);
  const baseRevision =
    typeof input.baseRevision === 'number' && Number.isFinite(input.baseRevision)
      ? Math.max(0, Math.floor(input.baseRevision))
      : 0;
  const nextRevision = Math.max(getCaseResolverWorkspaceRevision(normalized), baseRevision + 1);
  return {
    ...normalized,
    workspaceRevision: nextRevision,
    lastMutationId: input.mutationId.trim() || null,
    lastMutationAt: (input.timestamp ?? new Date().toISOString()).trim(),
  };
};

export const logCaseResolverWorkspaceEvent = (
  event: Omit<CaseResolverWorkspaceDebugEvent, 'id' | 'timestamp'>
): void => {
  const entry: CaseResolverWorkspaceDebugEvent = {
    id: createCaseResolverWorkspaceMutationId('workspace-debug'),
    timestamp: new Date().toISOString(),
    ...event,
  };
  const nextEvents = [...readDebugBuffer(), entry].slice(-CASE_RESOLVER_WORKSPACE_DEBUG_LIMIT);
  writeDebugBuffer(nextEvents);
  if (process.env['NODE_ENV'] !== 'production') {
    console.info('[case-resolver][workspace]', entry);
  }
  if (typeof window !== 'undefined') {
    // Defer notification so debug-panel state updates never run inside another component render.
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(CASE_RESOLVER_WORKSPACE_DEBUG_EVENT_NAME));
    }, 0);
  }
};

export const readCaseResolverWorkspaceDebugEvents = (): CaseResolverWorkspaceDebugEvent[] =>
  [...readDebugBuffer()];

export const getCaseResolverWorkspaceDebugEventName = (): string =>
  CASE_RESOLVER_WORKSPACE_DEBUG_EVENT_NAME;

const readWorkspaceFromSettingRecord = (record: SettingsRecordLike | null, fallback: string): CaseResolverWorkspace => {
  const rawValue = typeof record?.value === 'string' ? record.value : fallback;
  return parseCaseResolverWorkspace(rawValue);
};

export const fetchCaseResolverWorkspaceSnapshot = async (
  source: string
): Promise<CaseResolverWorkspace | null> => {
  try {
    const response = await fetch('/api/settings?scope=light', {
      method: 'GET',
      cache: 'no-store',
    });
    if (!response.ok) {
      logCaseResolverWorkspaceEvent({
        source,
        action: 'refresh_failed',
        message: `Failed to fetch settings (${response.status}).`,
      });
      return null;
    }
    const payload = (await response.json()) as SettingsRecordLike[] | null;
    const workspaceRecord = Array.isArray(payload)
      ? payload.find((entry: SettingsRecordLike): boolean => entry?.key === CASE_RESOLVER_WORKSPACE_KEY) ?? null
      : null;
    const workspace = parseCaseResolverWorkspace(
      typeof workspaceRecord?.value === 'string' ? workspaceRecord.value : null
    );
    logCaseResolverWorkspaceEvent({
      source,
      action: 'refresh_success',
      workspaceRevision: getCaseResolverWorkspaceRevision(workspace),
    });
    return workspace;
  } catch (error: unknown) {
    logCaseResolverWorkspaceEvent({
      source,
      action: 'refresh_failed',
      message: error instanceof Error ? error.message : 'Unknown refresh error.',
    });
    return null;
  }
};

export const persistCaseResolverWorkspaceSnapshot = async (
  input: PersistWorkspaceInput
): Promise<PersistCaseResolverWorkspaceResult> => {
  const normalizedWorkspace = normalizeCaseResolverWorkspace(input.workspace);
  const serializedWorkspace = JSON.stringify(normalizedWorkspace);
  logCaseResolverWorkspaceEvent({
    source: input.source,
    action: 'persist_attempt',
    mutationId: input.mutationId,
    expectedRevision: input.expectedRevision,
    workspaceRevision: getCaseResolverWorkspaceRevision(normalizedWorkspace),
  });

  let response: Response;
  try {
    response = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: CASE_RESOLVER_WORKSPACE_KEY,
        value: serializedWorkspace,
        expectedRevision: input.expectedRevision,
        mutationId: input.mutationId,
      }),
    });
  } catch (error: unknown) {
    return {
      ok: false,
      conflict: false,
      error: error instanceof Error ? error.message : 'Failed to persist workspace.',
    };
  }

  const rawText = await response.text();
  const payload = rawText.trim().length > 0 ? safeParseJson<SettingsRecordLike>(rawText) : null;

  if (response.ok) {
    const nextWorkspace = readWorkspaceFromSettingRecord(payload, serializedWorkspace);
    logCaseResolverWorkspaceEvent({
      source: input.source,
      action: 'persist_success',
      mutationId: input.mutationId,
      expectedRevision: input.expectedRevision,
      workspaceRevision: getCaseResolverWorkspaceRevision(nextWorkspace),
      currentRevision: getCaseResolverWorkspaceRevision(nextWorkspace),
      ...(payload?.idempotent === true ? { message: 'idempotent' } : {}),
    });
    return {
      ok: true,
      workspace: nextWorkspace,
      idempotent: payload?.idempotent === true,
    };
  }

  if (response.status === 409) {
    const currentWorkspace = readWorkspaceFromSettingRecord(payload, serializedWorkspace);
    const currentRevision = getCaseResolverWorkspaceRevision(currentWorkspace);
    logCaseResolverWorkspaceEvent({
      source: input.source,
      action: 'persist_conflict',
      mutationId: input.mutationId,
      expectedRevision: input.expectedRevision,
      currentRevision,
      workspaceRevision: getCaseResolverWorkspaceRevision(normalizedWorkspace),
    });
    return {
      ok: false,
      conflict: true,
      workspace: currentWorkspace,
      expectedRevision: input.expectedRevision,
      currentRevision,
    };
  }

  const message =
    (payload && typeof payload.value === 'string' && payload.value.trim().length > 0
      ? payload.value
      : null) ??
    `Failed to persist Case Resolver workspace (${response.status}).`;
  logCaseResolverWorkspaceEvent({
    source: input.source,
    action: 'persist_failed',
    mutationId: input.mutationId,
    expectedRevision: input.expectedRevision,
    workspaceRevision: getCaseResolverWorkspaceRevision(normalizedWorkspace),
    message,
  });
  return {
    ok: false,
    conflict: false,
    error: message,
  };
};
