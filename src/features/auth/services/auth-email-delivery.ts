import 'server-only';

import { createTransport, type Transporter } from 'nodemailer';

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

const getSmtpConfig = (): {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
} | null => {
  const host = process.env['SMTP_HOST']?.trim();
  const user = process.env['SMTP_USER']?.trim();
  const pass = process.env['SMTP_PASS']?.trim();
  if (!host || !user || !pass) return null;
  return {
    host,
    port: parseInt(process.env['SMTP_PORT'] ?? '587', 10),
    user,
    pass,
    from: process.env['SMTP_FROM']?.trim() || user,
  };
};

let smtpTransport: Transporter | null = null;

const getSmtpTransport = (): Transporter | null => {
  if (smtpTransport) return smtpTransport;
  const config = getSmtpConfig();
  if (!config) return null;
  smtpTransport = createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });
  return smtpTransport;
};

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

  // Priority 1: Webhook delivery
  const webhookUrl = getAuthEmailWebhookUrl();
  if (webhookUrl) {
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
  }

  // Priority 2: SMTP delivery (e.g. Gmail)
  const transport = getSmtpTransport();
  if (transport) {
    const smtpConfig = getSmtpConfig()!;
    await transport.sendMail({
      from: smtpConfig.from,
      to: record.to,
      subject: record.subject,
      text: record.text,
      ...(record.html ? { html: record.html } : {}),
    });
    return;
  }

  // No delivery provider configured
  await logSystemEvent({
    level: 'warn',
    message: 'Auth email not sent — no delivery provider configured (set AUTH_EMAIL_WEBHOOK_URL or SMTP_HOST).',
    source: 'auth.email',
    service: 'auth',
    context: {
      to: record.to,
      subject: record.subject,
      purpose: record.purpose,
      metadata: record.metadata ?? null,
    },
  });
};

export const __resetDeliveredAuthEmails = (): void => {
  deliveredAuthEmails.length = 0;
};

export const __getDeliveredAuthEmails = (): AuthEmailDeliveryRecord[] =>
  deliveredAuthEmails.map((record) => ({ ...record }));
