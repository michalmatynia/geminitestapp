import {
  buildPortablePathAuditSinkAutoRemediationPreparedNotificationRequest,
  postPortablePathAuditSinkAutoRemediationNotification,
  toPortablePathAuditSinkAutoRemediationNotificationStatusCode,
  toPortablePathAuditSinkAutoRemediationNotificationTimestamp,
  type PortablePathAuditSinkAutoRemediationNotificationChannel,
  type PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry,
} from './sinks-auto-remediation-notifications.server';
import type { SystemLogInput } from '@/shared/lib/observability/system-logger';

export type PortablePathAuditSinkAutoRemediationDeadLetterReplayAttempt = {
  replayedAt: string;
  queuedAt: string;
  channel: PortablePathAuditSinkAutoRemediationNotificationChannel;
  endpoint: string | null;
  attempted: boolean;
  delivered: boolean;
  statusCode: number | null;
  error: string | null;
  signatureApplied: boolean;
  attemptCountBefore: number;
  attemptCountAfter: number;
};

export type PortablePathAuditSinkAutoRemediationDeadLetterReplayResult = {
  dryRun: boolean;
  selectedCount: number;
  attemptedCount: number;
  deliveredCount: number;
  failedCount: number;
  skippedCount: number;
  removedCount: number;
  retainedCount: number;
  persisted: boolean;
  remainingCount: number;
  attempts: PortablePathAuditSinkAutoRemediationDeadLetterReplayAttempt[];
};

export type ReplayPortablePathAuditSinkAutoRemediationDeadLettersOptions = {
  dryRun?: boolean;
  limit?: number;
  channel?: PortablePathAuditSinkAutoRemediationNotificationChannel | 'all';
  endpoint?: string | null;
  replayWindowSeconds?: number | null;
  endpointAllowlist?: readonly string[] | null;
  timeoutMs?: number;
  now?: string | Date;
  maxEntries?: number;
  webhookSecret?: string | null;
  webhookSignatureKeyId?: string | null;
  emailWebhookSecret?: string | null;
  emailWebhookSignatureKeyId?: string | null;
  fetchImpl?: typeof fetch;
  writeLog?: (input: SystemLogInput) => Promise<void>;
  readRaw?: () => Promise<string | null>;
  writeRaw?: (raw: string) => Promise<boolean>;
};

export type ReplayPortablePathAuditSinkAutoRemediationDeadLettersDeps = {
  resolveReplayLimit: (value: number | null | undefined) => number;
  resolveReplayWindowSeconds: (value: number | null | undefined) => number;
  resolveTimeoutMs: (value: number | null | undefined) => number;
  resolveMaxEntries: (value: number | null | undefined) => number;
  normalizeEndpoint: (value: string | null | undefined) => string | null;
  normalizeEndpointAllowlist: (values: readonly string[] | null | undefined) => string[];
  loadDeadLetters: (options: {
    maxEntries: number;
    readRaw?: () => Promise<string | null>;
  }) => Promise<PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry[]>;
  saveDeadLetters: (
    entries: PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry[],
    options: {
      maxEntries: number;
      writeRaw?: (raw: string) => Promise<boolean>;
    }
  ) => Promise<boolean>;
  defaultWriteLog: (input: SystemLogInput) => Promise<void>;
  toErrorMessage: (error: unknown) => string;
  logSource: string;
  logService: string;
  logCategory: string;
  logKind: string;
};

export const replayPortablePathAuditSinkAutoRemediationDeadLettersCore = async (
  options: ReplayPortablePathAuditSinkAutoRemediationDeadLettersOptions = {},
  deps: ReplayPortablePathAuditSinkAutoRemediationDeadLettersDeps
): Promise<PortablePathAuditSinkAutoRemediationDeadLetterReplayResult> => {
  const dryRun = options.dryRun ?? false;
  const replayLimit = deps.resolveReplayLimit(options.limit);
  const replayWindowSeconds =
    options.replayWindowSeconds === null
      ? 0
      : deps.resolveReplayWindowSeconds(options.replayWindowSeconds);
  const timeoutMs = deps.resolveTimeoutMs(options.timeoutMs);
  const maxEntries = deps.resolveMaxEntries(options.maxEntries);
  const fetchImpl = options.fetchImpl ?? fetch;
  const writeLog = options.writeLog ?? deps.defaultWriteLog;
  const replayedAt = toPortablePathAuditSinkAutoRemediationNotificationTimestamp(options.now);
  const replayedAtMs = Date.parse(replayedAt);
  const minimumQueuedAtMs =
    replayWindowSeconds > 0 && Number.isFinite(replayedAtMs)
      ? replayedAtMs - replayWindowSeconds * 1000
      : null;
  const normalizedChannel =
    options.channel === 'webhook' || options.channel === 'email' ? options.channel : null;
  const normalizedEndpoint = deps.normalizeEndpoint(options.endpoint ?? null);
  const fallbackEndpointFilter = options.endpoint?.trim() ?? '';
  const endpointFilter =
    normalizedEndpoint ?? (fallbackEndpointFilter.length > 0 ? fallbackEndpointFilter : null);
  const endpointAllowlist = deps.normalizeEndpointAllowlist(options.endpointAllowlist);
  const endpointAllowlistSet = new Set(endpointAllowlist);
  const allowlistEnabled = endpointAllowlistSet.size > 0;
  const webhookSecret = options.webhookSecret ?? null;
  const webhookSignatureKeyId = options.webhookSignatureKeyId ?? null;
  const emailWebhookSecret = options.emailWebhookSecret ?? null;
  const emailWebhookSignatureKeyId = options.emailWebhookSignatureKeyId ?? null;

  const entries = await deps.loadDeadLetters({
    maxEntries,
    readRaw: options.readRaw,
  });
  const selected = entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => {
      if (normalizedChannel && entry.channel !== normalizedChannel) return false;
      if (endpointFilter) {
        const comparableEndpoint = deps.normalizeEndpoint(entry.endpoint) ?? entry.endpoint;
        if (comparableEndpoint !== endpointFilter) return false;
      }
      return true;
    })
    .slice(0, replayLimit);

  const attempts: PortablePathAuditSinkAutoRemediationDeadLetterReplayAttempt[] = [];
  if (selected.length === 0) {
    return {
      dryRun,
      selectedCount: 0,
      attemptedCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      skippedCount: 0,
      removedCount: 0,
      retainedCount: entries.length,
      persisted: true,
      remainingCount: entries.length,
      attempts,
    };
  }

  const remainingEntries = entries.map((entry) => ({ ...entry }));
  const indicesToRemove = new Set<number>();
  let attemptedCount = 0;
  let deliveredCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const { entry, index } of selected) {
    const attemptBase: PortablePathAuditSinkAutoRemediationDeadLetterReplayAttempt = {
      replayedAt,
      queuedAt: entry.queuedAt,
      channel: entry.channel,
      endpoint: entry.endpoint,
      attempted: false,
      delivered: false,
      statusCode: null,
      error: null,
      signatureApplied: false,
      attemptCountBefore: entry.attemptCount,
      attemptCountAfter: entry.attemptCount,
    };
    if (dryRun) {
      skippedCount += 1;
      attempts.push(attemptBase);
      continue;
    }
    if (!entry.endpoint) {
      skippedCount += 1;
      failedCount += 1;
      const attemptCountAfter = entry.attemptCount + 1;
      remainingEntries[index] = {
        ...entry,
        error: 'dead_letter_endpoint_missing',
        statusCode: null,
        attemptCount: attemptCountAfter,
      };
      attempts.push({
        ...attemptBase,
        error: 'dead_letter_endpoint_missing',
        attemptCountAfter,
      });
      continue;
    }
    const normalizedEntryEndpoint = deps.normalizeEndpoint(entry.endpoint);
    if (!normalizedEntryEndpoint) {
      skippedCount += 1;
      failedCount += 1;
      const attemptCountAfter = entry.attemptCount + 1;
      remainingEntries[index] = {
        ...entry,
        error: 'dead_letter_endpoint_invalid',
        statusCode: null,
        attemptCount: attemptCountAfter,
      };
      attempts.push({
        ...attemptBase,
        error: 'dead_letter_endpoint_invalid',
        attemptCountAfter,
      });
      continue;
    }
    if (allowlistEnabled && !endpointAllowlistSet.has(normalizedEntryEndpoint)) {
      skippedCount += 1;
      failedCount += 1;
      const attemptCountAfter = entry.attemptCount + 1;
      remainingEntries[index] = {
        ...entry,
        error: 'dead_letter_endpoint_disallowed',
        statusCode: null,
        attemptCount: attemptCountAfter,
      };
      attempts.push({
        ...attemptBase,
        error: 'dead_letter_endpoint_disallowed',
        attemptCountAfter,
      });
      continue;
    }
    if (minimumQueuedAtMs !== null) {
      const queuedAtMs = Date.parse(entry.queuedAt);
      if (!Number.isFinite(queuedAtMs) || queuedAtMs < minimumQueuedAtMs) {
        skippedCount += 1;
        failedCount += 1;
        const attemptCountAfter = entry.attemptCount + 1;
        remainingEntries[index] = {
          ...entry,
          error: 'dead_letter_outside_replay_window',
          statusCode: null,
          attemptCount: attemptCountAfter,
        };
        attempts.push({
          ...attemptBase,
          error: 'dead_letter_outside_replay_window',
          attemptCountAfter,
        });
        continue;
      }
    }

    const request = buildPortablePathAuditSinkAutoRemediationPreparedNotificationRequest(
      entry.payload,
      entry.channel === 'email'
        ? {
          signatureSecret: emailWebhookSecret,
          signatureKeyId: emailWebhookSignatureKeyId,
          now: replayedAt,
        }
        : {
          signatureSecret: webhookSecret,
          signatureKeyId: webhookSignatureKeyId,
          now: replayedAt,
        }
    );
    attemptBase.signatureApplied = request.signature !== null;

    try {
      attemptedCount += 1;
      attemptBase.attempted = true;
      attemptBase.statusCode = await postPortablePathAuditSinkAutoRemediationNotification(
        normalizedEntryEndpoint,
        request,
        timeoutMs,
        fetchImpl,
        entry.channel === 'email'
          ? 'portable-audit-sink-auto-remediation-email-webhook-replay'
          : 'portable-audit-sink-auto-remediation-webhook-replay',
        entry.channel === 'email'
          ? 'portable-audit-sink-auto-remediation-email-webhook-replay'
          : 'portable-audit-sink-auto-remediation-webhook-replay'
      );
      attemptBase.delivered = true;
      deliveredCount += 1;
      indicesToRemove.add(index);
      attempts.push(attemptBase);
    } catch (error) {
      failedCount += 1;
      attemptBase.attempted = true;
      attemptBase.error = deps.toErrorMessage(error);
      attemptBase.statusCode =
        toPortablePathAuditSinkAutoRemediationNotificationStatusCode(error);
      const attemptCountAfter = entry.attemptCount + 1;
      attemptBase.attemptCountAfter = attemptCountAfter;
      remainingEntries[index] = {
        ...entry,
        error: attemptBase.error,
        statusCode: attemptBase.statusCode,
        attemptCount: attemptCountAfter,
        signature: request.signature,
      };
      attempts.push(attemptBase);
    }
  }

  const persistedEntries = dryRun
    ? remainingEntries
    : remainingEntries.filter((_entry, index) => !indicesToRemove.has(index));
  const persisted = dryRun
    ? true
    : await deps.saveDeadLetters(persistedEntries, {
      maxEntries,
      writeRaw: options.writeRaw,
    });
  const removedCount = dryRun ? 0 : indicesToRemove.size;
  const retainedCount = persistedEntries.length;

  await writeLog({
    level: failedCount > 0 || !persisted ? 'warn' : 'info',
    source: deps.logSource,
    service: deps.logService,
    message: 'Portable audit sink auto-remediation dead-letter replay completed.',
    context: {
      category: deps.logCategory,
      kind: deps.logKind,
      alertType: 'portable_audit_sink_auto_remediation_dead_letter_replay',
      dryRun,
      selectedCount: selected.length,
      attemptedCount,
      deliveredCount,
      failedCount,
      skippedCount,
      removedCount,
      retainedCount,
      persisted,
      filters: {
        channel: normalizedChannel,
        endpoint: endpointFilter,
        limit: replayLimit,
      },
      replayPolicy: {
        replayWindowSeconds,
        minimumQueuedAt:
          minimumQueuedAtMs === null ? null : new Date(minimumQueuedAtMs).toISOString(),
        endpointAllowlistCount: endpointAllowlist.length,
      },
      attempts: attempts.slice(-50),
    },
  });

  return {
    dryRun,
    selectedCount: selected.length,
    attemptedCount,
    deliveredCount,
    failedCount,
    skippedCount,
    removedCount,
    retainedCount,
    persisted,
    remainingCount: retainedCount,
    attempts,
  };
};
