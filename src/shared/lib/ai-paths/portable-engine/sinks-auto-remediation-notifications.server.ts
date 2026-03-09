import 'server-only';

import type { SystemLogInput } from '@/shared/lib/observability/system-logger';

import {
  buildPortablePathAuditSinkAutoRemediationPreparedNotificationRequest,
  postPortablePathAuditSinkAutoRemediationNotification,
  toPortablePathAuditSinkAutoRemediationNotificationStatusCode,
  toPortablePathAuditSinkAutoRemediationNotificationTimestamp,
} from './sinks-auto-remediation-delivery.server';
import type {
  PortablePathAuditSinkAutoRemediationStrategy,
  PortablePathAuditSinkStartupHealthState,
  PortablePathEnvelopeVerificationAuditSinkStartupHealthSummary,
} from './types';
import type {
  PortablePathAuditSinkAutoRemediationNotificationChannel,
  PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry,
} from './sinks-auto-remediation-dead-letters.server';

export {
  enqueuePortablePathAuditSinkAutoRemediationDeadLetterCore,
  loadPortablePathAuditSinkAutoRemediationDeadLettersCore,
  savePortablePathAuditSinkAutoRemediationDeadLettersCore,
} from './sinks-auto-remediation-dead-letters.server';
export {
  buildPortablePathAuditSinkAutoRemediationPreparedNotificationRequest,
  postPortablePathAuditSinkAutoRemediationNotification,
  toPortablePathAuditSinkAutoRemediationNotificationStatusCode,
  toPortablePathAuditSinkAutoRemediationNotificationTimestamp,
} from './sinks-auto-remediation-delivery.server';
export type {
  EnqueuePortablePathAuditSinkAutoRemediationDeadLetterOptions,
  LoadPortablePathAuditSinkAutoRemediationDeadLettersOptions,
  PortablePathAuditSinkAutoRemediationNotificationChannel,
  PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry,
  PortablePathAuditSinkAutoRemediationNotificationDeadLetterSignature,
  SavePortablePathAuditSinkAutoRemediationDeadLettersOptions,
} from './sinks-auto-remediation-dead-letters.server';
export type { PortablePathAuditSinkAutoRemediationPreparedNotificationRequest } from './sinks-auto-remediation-delivery.server';

export type PortablePathAuditSinkAutoRemediationAction =
  PortablePathAuditSinkAutoRemediationStrategy;

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
  const enqueueDeadLetter = options.enqueueDeadLetter ?? (async (): Promise<boolean> => false);
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
      result.webhook.statusCode =
        toPortablePathAuditSinkAutoRemediationNotificationStatusCode(error);
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
