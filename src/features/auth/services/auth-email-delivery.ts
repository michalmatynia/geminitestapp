/* eslint-disable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions */
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
  if (config === null) {
    smtpTransport = null;
    smtpTransportKey = null;
    return null;
  }
  const nextKey = `${config.host}:${config.port}:${config.user}:${config.pass}:${config.from}`;
  if (smtpTransport !== null && smtpTransportKey === nextKey) return smtpTransport;
  smtpTransport = createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });
  smtpTransportKey = nextKey;
  return smtpTransport;
};

const shouldPersist = (): boolean =>
  process.env['NODE_ENV'] === 'test' ||
  process.env['AUTH_MAGIC_LINK_DEBUG'] === 'true' ||
  process.env['PLAYWRIGHT_RUNTIME_RUN_ID'] !== undefined;

export const shouldExposeAuthEmailDebug = (): boolean => shouldPersist();

async function sendViaWebhook(url: string, secret: string | undefined, record: AuthEmailDeliveryRecord): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret !== undefined ? { 'x-auth-email-secret': secret } : {}),
    },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error(`Auth email webhook failed with status ${res.status}.`);
}

async function sendViaSmtp(config: SmtpConfig, record: AuthEmailDeliveryRecord): Promise<void> {
  const transport = getSmtpTransport(config);
  if (transport !== null) {
    await transport.sendMail({
      from: config.from,
      to: record.to,
      subject: record.subject,
      text: record.text,
      ...(record.html !== null ? { html: record.html } : {}),
    });
  }
}

async function handleEmailDelivery(record: AuthEmailDeliveryRecord): Promise<void> {
  const secrets = await getAuthEmailSecrets();
  const wh = secrets.webhookUrl;
  const st = secrets.smtp;

  if (wh !== undefined && wh !== '') {
    await sendViaWebhook(wh, secrets.webhookSecret, record);
    return;
  }

  if (st !== undefined) {
    await sendViaSmtp(st, record);
    return;
  }

  await logSystemEvent({
    level: 'warn',
    message: 'Auth email not sent — no delivery provider configured.',
    source: 'auth.email',
    service: 'auth',
    context: { to: record.to, subject: record.subject, purpose: record.purpose, metadata: record.metadata ?? null },
  });
}

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
    html: (input.html ?? null)?.trim() || null,
    purpose: input.purpose,
    metadata: input.metadata,
    sentAt: new Date().toISOString(),
  };

  if (shouldPersist()) deliveredAuthEmails.push(record);
  await handleEmailDelivery(record);
};

export const resetDeliveredAuthEmails = (): void => { deliveredAuthEmails.length = 0; };
export const getDeliveredAuthEmails = (): AuthEmailDeliveryRecord[] => deliveredAuthEmails.map((r) => ({ ...r }));
