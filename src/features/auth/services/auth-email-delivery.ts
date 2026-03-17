import 'server-only';

import { createTransport, type Transporter } from 'nodemailer';

import { getAuthEmailSecrets } from '@/shared/lib/auth/auth-secret-settings';
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

type SmtpConfig = NonNullable<Awaited<ReturnType<typeof getAuthEmailSecrets>>['smtp']>;

let smtpTransport: Transporter | null = null;
let smtpTransportKey: string | null = null;

const getSmtpTransport = (config: SmtpConfig | null): Transporter | null => {
  if (!config) {
    smtpTransport = null;
    smtpTransportKey = null;
    return null;
  }
  const nextKey = `${config.host}:${config.port}:${config.user}:${config.pass}:${config.from}`;
  if (smtpTransport && smtpTransportKey === nextKey) return smtpTransport;
  smtpTransport = createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });
  smtpTransportKey = nextKey;
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
  const emailSecrets = await getAuthEmailSecrets();
  const webhookUrl = emailSecrets.webhookUrl;
  if (webhookUrl) {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(emailSecrets.webhookSecret
          ? {
            'x-auth-email-secret': emailSecrets.webhookSecret,
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
  const transport = getSmtpTransport(emailSecrets.smtp);
  if (transport) {
    const smtpConfig = emailSecrets.smtp!;
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
    message:
      'Auth email not sent — no delivery provider configured (set auth_email_webhook_url or auth_smtp_host in Mongo settings).',
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
