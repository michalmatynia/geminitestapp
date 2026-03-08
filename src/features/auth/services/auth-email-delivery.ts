import 'server-only';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';

export type AuthEmailDeliveryRecord = {
  to: string;
  subject: string;
  text: string;
  html: string | null;
  purpose: 'magic_login' | 'email_verification';
  metadata?: Record<string, unknown>;
  sentAt: string;
};

const deliveredAuthEmails: AuthEmailDeliveryRecord[] = [];

const getAuthEmailWebhookUrl = (): string | null =>
  process.env['AUTH_EMAIL_WEBHOOK_URL']?.trim() || null;

const getAuthEmailWebhookSecret = (): string | null =>
  process.env['AUTH_EMAIL_WEBHOOK_SECRET']?.trim() || null;

const shouldPersistOutboxRecord = (): boolean =>
  process.env['NODE_ENV'] === 'test' ||
  process.env['AUTH_MAGIC_LINK_DEBUG'] === 'true' ||
  Boolean(process.env['PLAYWRIGHT_RUNTIME_RUN_ID']);

export const shouldExposeAuthEmailDebug = (): boolean => shouldPersistOutboxRecord();

export const sendAuthEmail = async (input: {
  to: string;
  subject: string;
  text: string;
  html?: string | null;
  purpose: 'magic_login' | 'email_verification';
  metadata?: Record<string, unknown>;
}): Promise<void> => {
  const record: AuthEmailDeliveryRecord = {
    to: input.to.trim().toLowerCase(),
    subject: input.subject.trim(),
    text: input.text,
    html: input.html?.trim() || null,
    purpose: input.purpose,
    metadata: input.metadata,
    sentAt: new Date().toISOString(),
  };

  if (shouldPersistOutboxRecord()) {
    deliveredAuthEmails.push(record);
  }

  const webhookUrl = getAuthEmailWebhookUrl();
  if (!webhookUrl) {
    await logSystemEvent({
      level: 'info',
      message: 'Auth email queued without external delivery provider.',
      source: 'auth.email',
      service: 'auth',
      context: {
        to: record.to,
        subject: record.subject,
        purpose: record.purpose,
        metadata: record.metadata ?? null,
      },
    });
    return;
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(getAuthEmailWebhookSecret()
        ? {
          'x-auth-email-secret': getAuthEmailWebhookSecret() as string,
        }
        : {}),
    },
    body: JSON.stringify(record),
  });

  if (response.ok) {
    return;
  }

  throw new Error(`Auth email webhook failed with status ${response.status}.`);
};

export const __resetDeliveredAuthEmails = (): void => {
  deliveredAuthEmails.length = 0;
};

export const __getDeliveredAuthEmails = (): AuthEmailDeliveryRecord[] =>
  deliveredAuthEmails.map((record) => ({ ...record }));
