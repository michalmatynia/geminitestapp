export type PromptExploderTransferUiStatus =
  | 'idle'
  | 'pending'
  | 'blocked'
  | 'capture_review'
  | 'applied'
  | 'failed'
  | 'dismissed'
  | 'discarded'
  | 'expired';

type PromptExploderTransferLifecycleRecord = {
  status: PromptExploderTransferUiStatus;
  reason: string | null;
  updatedAt: string;
};

const PROMPT_EXPLODER_TRANSFER_ALLOWED_TRANSITIONS: Record<
  PromptExploderTransferUiStatus,
  ReadonlySet<PromptExploderTransferUiStatus>
> = {
  idle: new Set<PromptExploderTransferUiStatus>(['idle', 'pending']),
  pending: new Set<PromptExploderTransferUiStatus>([
    'pending',
    'blocked',
    'capture_review',
    'applied',
    'failed',
    'dismissed',
    'discarded',
    'expired',
  ]),
  blocked: new Set<PromptExploderTransferUiStatus>(['blocked', 'pending', 'discarded', 'expired']),
  capture_review: new Set<PromptExploderTransferUiStatus>([
    'capture_review',
    'applied',
    'dismissed',
    'failed',
    'discarded',
  ]),
  applied: new Set<PromptExploderTransferUiStatus>(['applied', 'pending']),
  failed: new Set<PromptExploderTransferUiStatus>(['failed', 'pending', 'discarded', 'expired']),
  dismissed: new Set<PromptExploderTransferUiStatus>(['dismissed', 'pending']),
  discarded: new Set<PromptExploderTransferUiStatus>(['discarded', 'pending']),
  expired: new Set<PromptExploderTransferUiStatus>(['expired', 'discarded', 'pending']),
};

export const CASE_RESOLVER_PROMPT_EXPLODER_TRANSFER_TTL_MS = 15 * 60 * 1000;

const toIsoMillis = (value: string | null | undefined): number | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const resolvePromptExploderTransferStatusLabel = (
  status: PromptExploderTransferUiStatus
): string => {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'blocked':
      return 'Blocked';
    case 'capture_review':
      return 'Capture Review';
    case 'applied':
      return 'Applied';
    case 'failed':
      return 'Failed';
    case 'dismissed':
      return 'Dismissed';
    case 'discarded':
      return 'Discarded';
    case 'expired':
      return 'Expired';
    default:
      return 'Idle';
  }
};

export const canTransitionPromptExploderTransferStatus = (
  from: PromptExploderTransferUiStatus,
  to: PromptExploderTransferUiStatus
): boolean => PROMPT_EXPLODER_TRANSFER_ALLOWED_TRANSITIONS[from].has(to);

export const applyPromptExploderTransferLifecycleUpdate = <
  T extends PromptExploderTransferLifecycleRecord,
>(
    current: T | null,
    input: {
    nextStatus: PromptExploderTransferUiStatus;
    reason?: string | null;
    at?: string;
    force?: boolean;
    patch?: Partial<T>;
  }
  ): T | null => {
  if (!current) return current;
  const nextStatus = input.nextStatus;
  const transitionAllowed =
    current.status === nextStatus ||
    canTransitionPromptExploderTransferStatus(current.status, nextStatus);
  if (!transitionAllowed && !input.force) {
    return current;
  }
  return {
    ...current,
    ...input.patch,
    status: nextStatus,
    reason: input.reason ?? null,
    updatedAt: input.at ?? new Date().toISOString(),
  };
};

export const resolvePromptExploderTransferExpiry = (input: {
  createdAt?: string | null;
  expiresAt?: string | null;
  nowMs?: number;
  ttlMs?: number;
}): {
  isExpired: boolean;
  expiresAt: string | null;
  expiresInMs: number | null;
  ageMs: number | null;
} => {
  const nowMs = input.nowMs ?? Date.now();
  const ttlMs = input.ttlMs ?? CASE_RESOLVER_PROMPT_EXPLODER_TRANSFER_TTL_MS;
  const createdAtMs = toIsoMillis(input.createdAt ?? null);
  const explicitExpiresAtMs = toIsoMillis(input.expiresAt ?? null);
  const fallbackExpiresAtMs =
    explicitExpiresAtMs ?? (createdAtMs !== null ? createdAtMs + ttlMs : null);
  const ageMs = createdAtMs !== null ? Math.max(0, nowMs - createdAtMs) : null;
  if (fallbackExpiresAtMs === null) {
    return {
      isExpired: false,
      expiresAt: null,
      expiresInMs: null,
      ageMs,
    };
  }
  return {
    isExpired: nowMs >= fallbackExpiresAtMs,
    expiresAt: new Date(fallbackExpiresAtMs).toISOString(),
    expiresInMs: fallbackExpiresAtMs - nowMs,
    ageMs,
  };
};
