import 'server-only';

import { createHmac } from 'crypto';

import { withTransientRecovery } from '@/shared/lib/observability/transient-recovery/with-recovery';
import type { SystemLogInput } from '@/shared/lib/observability/system-logger';

import type {
  PortablePathAuditSinkAutoRemediationStrategy,
  PortablePathAuditSinkStartupHealthState,
  PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary,
} from './types';

const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_ALGORITHM = 'hmac_sha256' as const;
const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_VERSION = 'v1' as const;
const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_HEADER = 'x-ai-paths-signature';
const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_TIMESTAMP_HEADER =
  'x-ai-paths-signature-timestamp';
const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_ALGORITHM_HEADER =
  'x-ai-paths-signature-algorithm';
const PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_KEY_ID_HEADER =
  'x-ai-paths-signature-key-id';

export type PortablePathAuditSinkAutoRemediationNotificationChannel = 'webhook' | 'email';

export type PortablePathAuditSinkAutoRemediationAction =
  | 'none'
  | 'unregister_all'
  | 'degrade_to_log_only';

export type PortablePathAuditSinkAutoRemediationNotificationDeadLetterSignature = {
  algorithm: typeof PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_ALGORITHM;
  keyId: string | null;
  timestamp: string;
};

export type PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry = {
  queuedAt: string;
  channel: PortablePathAuditSinkAutoRemediationNotificationChannel;
  endpoint: string | null;
  payload: Record<string, unknown>;
  error: string;
  statusCode: number | null;
  attemptCount: number;
  signature: PortablePathAuditSinkAutoRemediationNotificationDeadLetterSignature | null;
};

export type PortablePathAuditSinkAutoRemediationNotificationChannelResult = {
  attempted: boolean;
  delivered: boolean;
  error: string | null;
  statusCode: number | null;
  endpoint: string | null;
  signatureApplied: boolean;
  deadLetterQueued: boolean;
  receiptAt: string | null;
};

export type PortablePathAuditSinkAutoRemediationNotificationReceipt = {
  channel: PortablePathAuditSinkAutoRemediationNotificationChannel;
  attempted: boolean;
  delivered: boolean;
  endpoint: string | null;
  statusCode: number | null;
  error: string | null;
  signatureApplied: boolean;
  deadLetterQueued: boolean;
  at: string;
};

export type PortablePathAuditSinkAutoRemediationNotificationResult = {
  enabled: boolean;
  receipts: PortablePathAuditSinkAutoRemediationNotificationReceipt[];
  webhook: PortablePathAuditSinkAutoRemediationNotificationChannelResult;
  email: PortablePathAuditSinkAutoRemediationNotificationChannelResult & {
    recipients: string[];
  };
};

export type PortablePathAuditSinkAutoRemediationNotificationInput = {
  summary: PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary;
  strategy: PortablePathAuditSinkAutoRemediationStrategy;
  action: PortablePathAuditSinkAutoRemediationAction;
  threshold: number;
  cooldownSeconds: number;
  rateLimitWindowSeconds: number;
  rateLimitMaxActions: number;
  state: PortablePathAuditSinkStartupHealthState;
};

export type LoadPortablePathAuditSinkAutoRemediationDeadLettersOptions = {
  maxEntries?: number;
  readRaw?: () => Promise<string | null>;
};

export type SavePortablePathAuditSinkAutoRemediationDeadLettersOptions = {
  maxEntries?: number;
  writeRaw?: (raw: string) => Promise<boolean>;
};

export type EnqueuePortablePathAuditSinkAutoRemediationDeadLetterOptions = {
  maxEntries?: number;
  readRaw?: () => Promise<string | null>;
  writeRaw?: (raw: string) => Promise<boolean>;
};

type PortablePathAuditSinkAutoRemediationDeadLetterEnvelope = {
  version: 1;
  updatedAt: string;
  entries: PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry[];
};

const normalizePortablePathAuditSinkAutoRemediationDeadLetterEntry = (
  value: unknown
): PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const payload = record['payload'];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const signatureRecord =
    record['signature'] && typeof record['signature'] === 'object' && !Array.isArray(record['signature'])
      ? (record['signature'] as Record<string, unknown>)
      : null;
  const signatureTimestamp =
    signatureRecord &&
    typeof signatureRecord['timestamp'] === 'string' &&
    signatureRecord['timestamp'].trim().length > 0
      ? signatureRecord['timestamp'].trim()
      : null;
  const signature: PortablePathAuditSinkAutoRemediationNotificationDeadLetterSignature | null =
    signatureTimestamp
      ? {
        algorithm: PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_ALGORITHM,
        keyId:
            signatureRecord &&
            typeof signatureRecord['keyId'] === 'string' &&
            signatureRecord['keyId'].trim().length > 0
              ? signatureRecord['keyId'].trim()
              : null,
        timestamp: signatureTimestamp,
      }
      : null;

  const rawStatusCode = record['statusCode'];
  const statusCodeNumeric =
    typeof rawStatusCode === 'number' ? rawStatusCode : Number(rawStatusCode);
  const statusCode =
    Number.isFinite(statusCodeNumeric) && statusCodeNumeric >= 100 && statusCodeNumeric <= 599
      ? Math.floor(statusCodeNumeric)
      : null;

  const rawAttemptCount = record['attemptCount'];
  const attemptCountNumeric =
    typeof rawAttemptCount === 'number' ? rawAttemptCount : Number(rawAttemptCount);
  const attemptCount =
    Number.isFinite(attemptCountNumeric) && attemptCountNumeric > 0
      ? Math.floor(attemptCountNumeric)
      : 1;

  return {
    queuedAt:
      typeof record['queuedAt'] === 'string' && record['queuedAt'].trim().length > 0
        ? record['queuedAt'].trim()
        : new Date().toISOString(),
    channel: record['channel'] === 'email' ? 'email' : 'webhook',
    endpoint:
      typeof record['endpoint'] === 'string' && record['endpoint'].trim().length > 0
        ? record['endpoint'].trim()
        : null,
    payload: payload as Record<string, unknown>,
    error:
      typeof record['error'] === 'string' && record['error'].trim().length > 0
        ? record['error'].trim()
        : 'notification_failed',
    statusCode,
    attemptCount,
    signature,
  };
};

const normalizePortablePathAuditSinkAutoRemediationDeadLetterEntries = (
  entries: unknown[],
  maxEntries: number
): PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry[] =>
  entries
    .map((entry) => normalizePortablePathAuditSinkAutoRemediationDeadLetterEntry(entry))
    .filter(
      (
        entry
      ): entry is PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry =>
        entry !== null
    )
    .slice(-maxEntries);

const parsePortablePathAuditSinkAutoRemediationDeadLetterEnvelope = (
  raw: string | null,
  maxEntries: number
): PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry[] => {
  if (!raw || raw.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return normalizePortablePathAuditSinkAutoRemediationDeadLetterEntries(parsed, maxEntries);
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
    const envelope = parsed as Partial<PortablePathAuditSinkAutoRemediationDeadLetterEnvelope> & {
      entries?: unknown;
    };
    if (!Array.isArray(envelope.entries)) return [];
    return normalizePortablePathAuditSinkAutoRemediationDeadLetterEntries(
      envelope.entries,
      maxEntries
    );
  } catch {
    return [];
  }
};

const stringifyPortablePathAuditSinkAutoRemediationDeadLetterEnvelope = (
  entries: PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry[],
  maxEntries: number
): string | null => {
  try {
    const envelope: PortablePathAuditSinkAutoRemediationDeadLetterEnvelope = {
      version: 1,
      updatedAt: new Date().toISOString(),
      entries: normalizePortablePathAuditSinkAutoRemediationDeadLetterEntries(entries, maxEntries),
    };
    return JSON.stringify(envelope);
  } catch {
    return null;
  }
};

export const loadPortablePathAuditSinkAutoRemediationDeadLettersCore = async (options: {
  maxEntries: number;
  readRaw: () => Promise<string | null>;
}): Promise<PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry[]> => {
  return parsePortablePathAuditSinkAutoRemediationDeadLetterEnvelope(
    await options.readRaw(),
    options.maxEntries
  );
};

export const savePortablePathAuditSinkAutoRemediationDeadLettersCore = async (
  entries: PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry[],
  options: {
    maxEntries: number;
    writeRaw: (raw: string) => Promise<boolean>;
  }
): Promise<boolean> => {
  const serialized = stringifyPortablePathAuditSinkAutoRemediationDeadLetterEnvelope(
    entries,
    options.maxEntries
  );
  if (!serialized) return false;
  return options.writeRaw(serialized);
};

export const enqueuePortablePathAuditSinkAutoRemediationDeadLetterCore = async (
  entry: PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry,
  options: {
    maxEntries: number;
    readRaw: () => Promise<string | null>;
    writeRaw: (raw: string) => Promise<boolean>;
  }
): Promise<boolean> => {
  const existing = parsePortablePathAuditSinkAutoRemediationDeadLetterEnvelope(
    await options.readRaw(),
    options.maxEntries
  );
  const serialized = stringifyPortablePathAuditSinkAutoRemediationDeadLetterEnvelope(
    [...existing, entry],
    options.maxEntries
  );
  if (!serialized) return false;
  return options.writeRaw(serialized);
};

export type NotifyPortablePathAuditSinkAutoRemediationOptions = {
  enabled?: boolean;
  webhookUrl?: string | null;
  webhookSecret?: string | null;
  webhookSignatureKeyId?: string | null;
  emailWebhookUrl?: string | null;
  emailWebhookSecret?: string | null;
  emailWebhookSignatureKeyId?: string | null;
  emailRecipients?: string[] | null;
  timeoutMs?: number;
  deadLetterMaxEntries?: number;
  enqueueDeadLetter?: (
    entry: PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry
  ) => Promise<boolean>;
  deadLetterReadRaw?: () => Promise<string | null>;
  deadLetterWriteRaw?: (raw: string) => Promise<boolean>;
  now?: string | Date;
  fetchImpl?: typeof fetch;
  writeLog?: (input: SystemLogInput) => Promise<void>;
};

export type NotifyPortablePathAuditSinkAutoRemediationDeps = {
  resolveTimeoutMs: (value: number | undefined) => number;
  defaultFetch: typeof fetch;
  defaultWriteLog: (input: SystemLogInput) => Promise<void>;
  toErrorMessage: (error: unknown) => string;
  logSource: string;
  logService: string;
  logCategory: string;
  logKind: string;
};

const toPortablePathAuditSinkAutoRemediationNotificationMessage = (
  input: PortablePathAuditSinkAutoRemediationNotificationInput
): string => {
  const summary = input.summary;
  const failedSinkIds = summary.failedSinkIds.join(',') || 'none';
  return [
    'Portable audit sink auto-remediation triggered.',
    `action=${input.action}`,
    `strategy=${input.strategy}`,
    `status=${summary.status}`,
    `consecutiveFailures=${input.state.consecutiveFailureCount}`,
    `failedSinkIds=${failedSinkIds}`,
  ].join(' ');
};

const toPortablePathAuditSinkAutoRemediationNotificationPayload = (
  input: PortablePathAuditSinkAutoRemediationNotificationInput
): Record<string, unknown> => ({
  event: 'portable_audit_sink_auto_remediation',
  action: input.action,
  strategy: input.strategy,
  threshold: input.threshold,
  cooldownSeconds: input.cooldownSeconds,
  rateLimitWindowSeconds: input.rateLimitWindowSeconds,
  rateLimitMaxActions: input.rateLimitMaxActions,
  startupHealthSummary: input.summary,
  state: input.state,
  environment: process.env['NODE_ENV'] ?? 'development',
  appUrl: process.env['NEXT_PUBLIC_APP_URL'] ?? null,
});

export type PortablePathAuditSinkAutoRemediationPreparedNotificationRequest = {
  body: string;
  headers: Record<string, string>;
  signature: PortablePathAuditSinkAutoRemediationNotificationDeadLetterSignature | null;
};

class PortablePathAuditSinkAutoRemediationNotificationHttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number) {
    super(`notification_http_${statusCode}`);
    this.name = 'PortablePathAuditSinkAutoRemediationNotificationHttpError';
    this.statusCode = statusCode;
  }
}

export const toPortablePathAuditSinkAutoRemediationNotificationTimestamp = (
  value: string | Date | undefined
): string => {
  const nowDate =
    value instanceof Date
      ? value
      : typeof value === 'string'
        ? new Date(value)
        : new Date();
  return Number.isNaN(nowDate.getTime()) ? new Date().toISOString() : nowDate.toISOString();
};

export const buildPortablePathAuditSinkAutoRemediationPreparedNotificationRequest = (
  payload: Record<string, unknown>,
  options: {
    signatureSecret?: string | null;
    signatureKeyId?: string | null;
    now?: string | Date;
  }
): PortablePathAuditSinkAutoRemediationPreparedNotificationRequest => {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  const secret = options.signatureSecret?.trim() ?? '';
  if (secret.length === 0) {
    return {
      body,
      headers,
      signature: null,
    };
  }

  const timestamp = toPortablePathAuditSinkAutoRemediationNotificationTimestamp(options.now);
  const signatureDigest = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  const signatureValue = `${PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_VERSION}=${signatureDigest}`;
  headers[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_HEADER] = signatureValue;
  headers[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_TIMESTAMP_HEADER] = timestamp;
  headers[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_ALGORITHM_HEADER] =
    PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_ALGORITHM;

  const normalizedKeyId = options.signatureKeyId?.trim() ?? '';
  if (normalizedKeyId.length > 0) {
    headers[PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_KEY_ID_HEADER] = normalizedKeyId;
  }

  return {
    body,
    headers,
    signature: {
      algorithm: PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_SIGNATURE_ALGORITHM,
      keyId: normalizedKeyId.length > 0 ? normalizedKeyId : null,
      timestamp,
    },
  };
};

export const postPortablePathAuditSinkAutoRemediationNotification = async (
  url: string,
  request: PortablePathAuditSinkAutoRemediationPreparedNotificationRequest,
  timeoutMs: number,
  fetchImpl: typeof fetch,
  source: string,
  circuitId: string
): Promise<number> => {
  const response = await withTransientRecovery(
    async () =>
      fetchImpl(url, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
      }),
    {
      source,
      circuitId,
      retry: {
        maxAttempts: 3,
        initialDelayMs: 500,
        maxDelayMs: 5000,
        timeoutMs,
      },
    }
  );
  if (!response.ok) {
    throw new PortablePathAuditSinkAutoRemediationNotificationHttpError(response.status);
  }
  return response.status;
};

export const toPortablePathAuditSinkAutoRemediationNotificationStatusCode = (
  error: unknown
): number | null => {
  if (error instanceof PortablePathAuditSinkAutoRemediationNotificationHttpError) {
    return error.statusCode;
  }
  if (error instanceof Error) {
    const match = error.message.match(/^notification_http_(\d{3})$/);
    if (match && typeof match[1] === 'string') {
      const status = Number(match[1]);
      if (Number.isFinite(status)) return Math.floor(status);
    }
  }
  return null;
};

export const notifyPortablePathAuditSinkAutoRemediationCore = async (
  input: PortablePathAuditSinkAutoRemediationNotificationInput,
  options: NotifyPortablePathAuditSinkAutoRemediationOptions = {},
  deps: NotifyPortablePathAuditSinkAutoRemediationDeps
): Promise<PortablePathAuditSinkAutoRemediationNotificationResult> => {
  const at = toPortablePathAuditSinkAutoRemediationNotificationTimestamp(options.now);
  const enabled = options.enabled ?? true;
  const timeoutMs = deps.resolveTimeoutMs(options.timeoutMs);
  const fetchImpl = options.fetchImpl ?? deps.defaultFetch;
  const writeLog = options.writeLog ?? deps.defaultWriteLog;
  const webhookUrl = options.webhookUrl ?? null;
  const webhookSecret = options.webhookSecret ?? null;
  const webhookSignatureKeyId = options.webhookSignatureKeyId ?? null;
  const emailWebhookUrl = options.emailWebhookUrl ?? null;
  const emailWebhookSecret = options.emailWebhookSecret ?? null;
  const emailWebhookSignatureKeyId = options.emailWebhookSignatureKeyId ?? null;
  const enqueueDeadLetter =
    options.enqueueDeadLetter ?? (async (): Promise<boolean> => false);
  const emailRecipients = (options.emailRecipients ?? []).filter(
    (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
  );
  const result: PortablePathAuditSinkAutoRemediationNotificationResult = {
    enabled,
    receipts: [],
    webhook: {
      attempted: false,
      delivered: false,
      error: null,
      statusCode: null,
      endpoint: webhookUrl,
      signatureApplied: false,
      deadLetterQueued: false,
      receiptAt: null,
    },
    email: {
      attempted: false,
      delivered: false,
      error: null,
      statusCode: null,
      endpoint: emailWebhookUrl,
      signatureApplied: false,
      deadLetterQueued: false,
      receiptAt: null,
      recipients: emailRecipients,
    },
  };
  if (!enabled) return result;

  const pushReceipt = (
    channel: PortablePathAuditSinkAutoRemediationNotificationChannel,
    channelResult: PortablePathAuditSinkAutoRemediationNotificationChannelResult
  ): void => {
    result.receipts.push({
      channel,
      attempted: channelResult.attempted,
      delivered: channelResult.delivered,
      endpoint: channelResult.endpoint,
      statusCode: channelResult.statusCode,
      error: channelResult.error,
      signatureApplied: channelResult.signatureApplied,
      deadLetterQueued: channelResult.deadLetterQueued,
      at: channelResult.receiptAt ?? at,
    });
  };

  const payload = toPortablePathAuditSinkAutoRemediationNotificationPayload(input);
  if (webhookUrl) {
    result.webhook.attempted = true;
    result.webhook.receiptAt = at;
    const request = buildPortablePathAuditSinkAutoRemediationPreparedNotificationRequest(payload, {
      signatureSecret: webhookSecret,
      signatureKeyId: webhookSignatureKeyId,
      now: at,
    });
    result.webhook.signatureApplied = request.signature !== null;
    try {
      result.webhook.statusCode = await postPortablePathAuditSinkAutoRemediationNotification(
        webhookUrl,
        request,
        timeoutMs,
        fetchImpl,
        'portable-audit-sink-auto-remediation-webhook',
        'portable-audit-sink-auto-remediation-webhook'
      );
      result.webhook.delivered = true;
    } catch (error) {
      result.webhook.error = deps.toErrorMessage(error);
      result.webhook.statusCode = toPortablePathAuditSinkAutoRemediationNotificationStatusCode(error);
      try {
        result.webhook.deadLetterQueued = await enqueueDeadLetter({
          queuedAt: at,
          channel: 'webhook',
          endpoint: webhookUrl,
          payload,
          error: result.webhook.error,
          statusCode: result.webhook.statusCode,
          attemptCount: 1,
          signature: request.signature,
        });
      } catch (deadLetterError) {
        result.webhook.deadLetterQueued = false;
        await writeLog({
          level: 'warn',
          source: deps.logSource,
          service: deps.logService,
          message: 'Portable audit sink auto-remediation dead-letter queue write failed.',
          context: {
            category: deps.logCategory,
            kind: deps.logKind,
            notificationChannel: 'webhook',
            error: deps.toErrorMessage(deadLetterError),
          },
        });
      }
      await writeLog({
        level: 'warn',
        source: deps.logSource,
        service: deps.logService,
        message: 'Portable audit sink auto-remediation webhook notification failed.',
        context: {
          category: deps.logCategory,
          kind: deps.logKind,
          notificationChannel: 'webhook',
          error: result.webhook.error,
          statusCode: result.webhook.statusCode,
          deadLetterQueued: result.webhook.deadLetterQueued,
        },
      });
    }
    pushReceipt('webhook', result.webhook);
  }

  if (emailWebhookUrl && emailRecipients.length > 0) {
    result.email.attempted = true;
    result.email.receiptAt = at;
    const emailPayload = {
      event: 'portable_audit_sink_auto_remediation_email',
      to: emailRecipients,
      subject: '[AI-Paths] Portable audit sink auto-remediation triggered',
      text: toPortablePathAuditSinkAutoRemediationNotificationMessage(input),
      metadata: payload,
    };
    const request = buildPortablePathAuditSinkAutoRemediationPreparedNotificationRequest(
      emailPayload,
      {
        signatureSecret: emailWebhookSecret,
        signatureKeyId: emailWebhookSignatureKeyId,
        now: at,
      }
    );
    result.email.signatureApplied = request.signature !== null;
    try {
      result.email.statusCode = await postPortablePathAuditSinkAutoRemediationNotification(
        emailWebhookUrl,
        request,
        timeoutMs,
        fetchImpl,
        'portable-audit-sink-auto-remediation-email-webhook',
        'portable-audit-sink-auto-remediation-email-webhook'
      );
      result.email.delivered = true;
    } catch (error) {
      result.email.error = deps.toErrorMessage(error);
      result.email.statusCode = toPortablePathAuditSinkAutoRemediationNotificationStatusCode(error);
      try {
        result.email.deadLetterQueued = await enqueueDeadLetter({
          queuedAt: at,
          channel: 'email',
          endpoint: emailWebhookUrl,
          payload: emailPayload,
          error: result.email.error,
          statusCode: result.email.statusCode,
          attemptCount: 1,
          signature: request.signature,
        });
      } catch (deadLetterError) {
        result.email.deadLetterQueued = false;
        await writeLog({
          level: 'warn',
          source: deps.logSource,
          service: deps.logService,
          message: 'Portable audit sink auto-remediation dead-letter queue write failed.',
          context: {
            category: deps.logCategory,
            kind: deps.logKind,
            notificationChannel: 'email',
            error: deps.toErrorMessage(deadLetterError),
          },
        });
      }
      await writeLog({
        level: 'warn',
        source: deps.logSource,
        service: deps.logService,
        message: 'Portable audit sink auto-remediation email notification failed.',
        context: {
          category: deps.logCategory,
          kind: deps.logKind,
          notificationChannel: 'email',
          error: result.email.error,
          recipients: emailRecipients,
          statusCode: result.email.statusCode,
          deadLetterQueued: result.email.deadLetterQueued,
        },
      });
    }
    pushReceipt('email', result.email);
  }

  return result;
};
