import 'server-only';

import { createTransport, type Transporter } from 'nodemailer';

import { AUTH_SECRET_SETTINGS_KEYS } from '@/shared/lib/auth/auth-secret-settings';
import { readSecretSettingValues } from '@/shared/lib/settings/secret-settings';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

export const FILEMAKER_CAMPAIGN_EMAIL_SECRET_SETTINGS_KEYS = {
  webhookUrl: 'filemaker_campaign_email_webhook_url',
  webhookSecret: 'filemaker_campaign_email_webhook_secret',
  smtpHost: 'filemaker_campaign_smtp_host',
  smtpPort: 'filemaker_campaign_smtp_port',
  smtpUser: 'filemaker_campaign_smtp_user',
  smtpPass: 'filemaker_campaign_smtp_pass',
  smtpFrom: 'filemaker_campaign_smtp_from',
} as const;

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

export type FilemakerCampaignEmailSecrets = {
  webhookUrl: string | null;
  webhookSecret: string | null;
  smtp: SmtpConfig | null;
  source: 'filemaker' | 'auth_fallback' | 'none';
};

export type FilemakerCampaignEmailDeliveryRecord = {
  to: string;
  subject: string;
  text: string;
  html: string | null;
  campaignId: string;
  runId: string;
  deliveryId: string;
  replyToEmail: string | null;
  fromName: string | null;
  sentAt: string;
};

export type FilemakerCampaignEmailSendResult = {
  provider: 'webhook' | 'smtp';
  providerMessage: string;
  sentAt: string;
};

const deliveredCampaignEmails: FilemakerCampaignEmailDeliveryRecord[] = [];

let smtpTransport: Transporter | null = null;
let smtpTransportKey: string | null = null;

const parsePort = (raw: string | null, fallback: number): number => {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildSmtpConfig = (input: {
  host: string | null;
  port: string | null;
  user: string | null;
  pass: string | null;
  from: string | null;
}): SmtpConfig | null => {
  if (!input.host || !input.user || !input.pass) return null;
  return {
    host: input.host,
    port: parsePort(input.port, 587),
    user: input.user,
    pass: input.pass,
    from: input.from ?? input.user,
  };
};

export const getFilemakerCampaignEmailSecrets = async (): Promise<FilemakerCampaignEmailSecrets> => {
  const values = await readSecretSettingValues([
    FILEMAKER_CAMPAIGN_EMAIL_SECRET_SETTINGS_KEYS.webhookUrl,
    FILEMAKER_CAMPAIGN_EMAIL_SECRET_SETTINGS_KEYS.webhookSecret,
    FILEMAKER_CAMPAIGN_EMAIL_SECRET_SETTINGS_KEYS.smtpHost,
    FILEMAKER_CAMPAIGN_EMAIL_SECRET_SETTINGS_KEYS.smtpPort,
    FILEMAKER_CAMPAIGN_EMAIL_SECRET_SETTINGS_KEYS.smtpUser,
    FILEMAKER_CAMPAIGN_EMAIL_SECRET_SETTINGS_KEYS.smtpPass,
    FILEMAKER_CAMPAIGN_EMAIL_SECRET_SETTINGS_KEYS.smtpFrom,
    AUTH_SECRET_SETTINGS_KEYS.emailWebhookUrl,
    AUTH_SECRET_SETTINGS_KEYS.emailWebhookSecret,
    AUTH_SECRET_SETTINGS_KEYS.smtpHost,
    AUTH_SECRET_SETTINGS_KEYS.smtpPort,
    AUTH_SECRET_SETTINGS_KEYS.smtpUser,
    AUTH_SECRET_SETTINGS_KEYS.smtpPass,
    AUTH_SECRET_SETTINGS_KEYS.smtpFrom,
  ]);

  const filemakerWebhookUrl =
    values[FILEMAKER_CAMPAIGN_EMAIL_SECRET_SETTINGS_KEYS.webhookUrl] ?? null;
  const filemakerSmtp = buildSmtpConfig({
    host: values[FILEMAKER_CAMPAIGN_EMAIL_SECRET_SETTINGS_KEYS.smtpHost] ?? null,
    port: values[FILEMAKER_CAMPAIGN_EMAIL_SECRET_SETTINGS_KEYS.smtpPort] ?? null,
    user: values[FILEMAKER_CAMPAIGN_EMAIL_SECRET_SETTINGS_KEYS.smtpUser] ?? null,
    pass: values[FILEMAKER_CAMPAIGN_EMAIL_SECRET_SETTINGS_KEYS.smtpPass] ?? null,
    from: values[FILEMAKER_CAMPAIGN_EMAIL_SECRET_SETTINGS_KEYS.smtpFrom] ?? null,
  });
  if (filemakerWebhookUrl || filemakerSmtp) {
    return {
      webhookUrl: filemakerWebhookUrl,
      webhookSecret:
        values[FILEMAKER_CAMPAIGN_EMAIL_SECRET_SETTINGS_KEYS.webhookSecret] ?? null,
      smtp: filemakerSmtp,
      source: 'filemaker',
    };
  }

  return {
    webhookUrl: values[AUTH_SECRET_SETTINGS_KEYS.emailWebhookUrl] ?? null,
    webhookSecret: values[AUTH_SECRET_SETTINGS_KEYS.emailWebhookSecret] ?? null,
    smtp: buildSmtpConfig({
      host: values[AUTH_SECRET_SETTINGS_KEYS.smtpHost] ?? null,
      port: values[AUTH_SECRET_SETTINGS_KEYS.smtpPort] ?? null,
      user: values[AUTH_SECRET_SETTINGS_KEYS.smtpUser] ?? null,
      pass: values[AUTH_SECRET_SETTINGS_KEYS.smtpPass] ?? null,
      from: values[AUTH_SECRET_SETTINGS_KEYS.smtpFrom] ?? null,
    }),
    source:
      values[AUTH_SECRET_SETTINGS_KEYS.emailWebhookUrl] ||
      values[AUTH_SECRET_SETTINGS_KEYS.smtpHost]
        ? 'auth_fallback'
        : 'none',
  };
};

const shouldPersistCampaignOutboxRecord = (): boolean =>
  process.env['NODE_ENV'] === 'test' ||
  process.env['FILEMAKER_CAMPAIGN_EMAIL_DEBUG'] === 'true' ||
  Boolean(process.env['PLAYWRIGHT_RUNTIME_RUN_ID']);

const getSmtpTransport = (config: SmtpConfig | null): Transporter | null => {
  if (!config) {
    smtpTransport = null;
    smtpTransportKey = null;
    return null;
  }
  const nextKey = `${config.host}:${config.port}:${config.user}:${config.pass}:${config.from}`;
  if (smtpTransport && smtpTransportKey === nextKey) {
    return smtpTransport;
  }
  smtpTransport = createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });
  smtpTransportKey = nextKey;
  return smtpTransport;
};

const formatFromHeader = (fromName: string | null, from: string): string => {
  const trimmedName = fromName?.trim();
  if (!trimmedName) return from;
  const escaped = trimmedName.replace(/"/g, '\\"');
  return `"${escaped}" <${from}>`;
};

export const sendFilemakerCampaignEmail = async (input: {
  to: string;
  subject: string;
  text: string;
  html?: string | null;
  campaignId: string;
  runId: string;
  deliveryId: string;
  replyToEmail?: string | null;
  fromName?: string | null;
}): Promise<FilemakerCampaignEmailSendResult> => {
  const record: FilemakerCampaignEmailDeliveryRecord = {
    to: input.to.trim().toLowerCase(),
    subject: input.subject.trim(),
    text: input.text,
    html: input.html?.trim() || null,
    campaignId: input.campaignId,
    runId: input.runId,
    deliveryId: input.deliveryId,
    replyToEmail: input.replyToEmail?.trim() || null,
    fromName: input.fromName?.trim() || null,
    sentAt: new Date().toISOString(),
  };

  if (shouldPersistCampaignOutboxRecord()) {
    deliveredCampaignEmails.push(record);
  }

  const secrets = await getFilemakerCampaignEmailSecrets();
  if (secrets.webhookUrl) {
    const response = await fetch(secrets.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secrets.webhookSecret
          ? { 'x-filemaker-campaign-secret': secrets.webhookSecret }
          : {}),
      },
      body: JSON.stringify(record),
    });
    if (!response.ok) {
      throw new Error(`Filemaker campaign webhook failed with status ${response.status}.`);
    }
    return {
      provider: 'webhook',
      providerMessage:
        secrets.source === 'filemaker'
          ? 'Accepted by the Filemaker campaign webhook.'
          : 'Accepted by the shared auth email webhook fallback.',
      sentAt: record.sentAt,
    };
  }

  const transport = getSmtpTransport(secrets.smtp);
  if (transport && secrets.smtp) {
    await transport.sendMail({
      from: formatFromHeader(record.fromName, secrets.smtp.from),
      to: record.to,
      subject: record.subject,
      text: record.text,
      ...(record.html ? { html: record.html } : {}),
      ...(record.replyToEmail ? { replyTo: record.replyToEmail } : {}),
    });
    return {
      provider: 'smtp',
      providerMessage:
        secrets.source === 'filemaker'
          ? 'Sent through the Filemaker campaign SMTP provider.'
          : 'Sent through the shared auth SMTP fallback.',
      sentAt: record.sentAt,
    };
  }

  await logSystemEvent({
    level: 'warn',
    source: 'filemaker.campaign.email',
    service: 'filemaker.campaign',
    message:
      'Campaign email not sent because no Filemaker or shared auth delivery provider is configured.',
    context: {
      campaignId: record.campaignId,
      runId: record.runId,
      deliveryId: record.deliveryId,
      to: record.to,
    },
  });
  throw new Error(
    'No campaign email delivery provider is configured. Set filemaker_campaign_email_webhook_url or filemaker_campaign_smtp_host.'
  );
};

export const __resetDeliveredFilemakerCampaignEmails = (): void => {
  deliveredCampaignEmails.length = 0;
};

export const __getDeliveredFilemakerCampaignEmails =
  (): FilemakerCampaignEmailDeliveryRecord[] =>
    deliveredCampaignEmails.map((record) => ({ ...record }));
