import 'server-only';

import { createTransport, type Transporter } from 'nodemailer';

import { AUTH_SECRET_SETTINGS_KEYS } from '@/shared/lib/auth/auth-secret-settings';
import { readSecretSettingValues } from '@/shared/lib/settings/secret-settings';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

import { randomUUID } from 'crypto';

import type {
  FilemakerEmailCampaignDeliveryFailureCategory,
  FilemakerEmailCampaignDeliveryProvider,
  FilemakerMailAccount,
  FilemakerMailMessage,
  FilemakerMailThread,
} from '../types';
import { stripHtmlToPlainText } from '@/shared/lib/document-editor-format';
import {
  appendFilemakerMailToSentFolder,
  getFilemakerMailAccount,
} from './filemaker-mail-service';
import {
  buildFilemakerMailSnippet,
  normalizeFilemakerMailSubject,
} from '../mail-utils';
import { createSmtpTransport } from './mail/mail-smtp';
import * as mailStorage from './mail/mail-storage';
import {
  buildAccountSecretSettingKey,
  buildThreadId,
  pickAnchorAddress,
} from './mail/mail-utils';

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
  mailAccountId: string | null;
  replyToEmail: string | null;
  fromName: string | null;
  sentAt: string;
};

export type FilemakerCampaignEmailSendResult = {
  provider: FilemakerEmailCampaignDeliveryProvider;
  providerMessage: string;
  sentAt: string;
  mailFilingStatus?: 'not_applicable' | 'filed' | 'failed';
  mailThreadId?: string | null;
  mailMessageId?: string | null;
  mailFilingError?: string | null;
};

export class FilemakerCampaignEmailDeliveryError extends Error {
  readonly provider: FilemakerEmailCampaignDeliveryProvider | null;
  readonly failureCategory: FilemakerEmailCampaignDeliveryFailureCategory;

  constructor(input: {
    message: string;
    provider?: FilemakerEmailCampaignDeliveryProvider | null;
    failureCategory: FilemakerEmailCampaignDeliveryFailureCategory;
  }) {
    super(input.message);
    this.name = 'FilemakerCampaignEmailDeliveryError';
    this.provider = input.provider ?? null;
    this.failureCategory = input.failureCategory;
  }
}

const classifyFilemakerCampaignFailureFromMessage = (
  message: string
): FilemakerEmailCampaignDeliveryFailureCategory => {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return 'unknown';
  if (
    normalized.includes('mailbox full') ||
    normalized.includes('temporarily unavailable') ||
    normalized.includes('temporary failure') ||
    normalized.includes('soft bounce') ||
    normalized.includes('deferred') ||
    normalized.includes('greylist') ||
    normalized.includes('try again later')
  ) {
    return 'soft_bounce';
  }
  if (
    normalized.includes('user unknown') ||
    normalized.includes('no such user') ||
    normalized.includes('invalid recipient') ||
    normalized.includes('recipient address rejected') ||
    normalized.includes('hard bounce')
  ) {
    return 'invalid_recipient';
  }
  if (
    normalized.includes('mailbox unavailable') ||
    normalized.includes('domain not found') ||
    normalized.includes('550') ||
    normalized.includes('554') ||
    normalized.includes('bounce')
  ) {
    return 'hard_bounce';
  }
  if (
    normalized.includes('rate limit') ||
    normalized.includes('too many requests') ||
    normalized.includes('throttle')
  ) {
    return 'rate_limited';
  }
  if (
    normalized.includes('timeout') ||
    normalized.includes('timed out') ||
    normalized.includes('econnreset') ||
    normalized.includes('econnrefused') ||
    normalized.includes('etimedout')
  ) {
    return 'timeout';
  }
  if (normalized.includes('rejected') || normalized.includes('not accepted')) {
    return 'provider_rejected';
  }
  return 'unknown';
};

export const resolveFilemakerCampaignEmailFailureMetadata = (
  error: unknown
): {
  provider: FilemakerEmailCampaignDeliveryProvider | null;
  failureCategory: FilemakerEmailCampaignDeliveryFailureCategory;
  message: string;
} => {
  if (error instanceof FilemakerCampaignEmailDeliveryError) {
    return {
      provider: error.provider,
      failureCategory: error.failureCategory,
      message: error.message,
    };
  }
  const message =
    error instanceof Error ? error.message : 'Campaign email delivery failed.';
  return {
    provider: null,
    failureCategory: classifyFilemakerCampaignFailureFromMessage(message),
    message,
  };
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

const toCampaignDeliveryError = (
  error: unknown,
  input?: {
    provider?: FilemakerEmailCampaignDeliveryProvider | null;
    failureCategory?: FilemakerEmailCampaignDeliveryFailureCategory;
  }
): FilemakerCampaignEmailDeliveryError => {
  if (error instanceof FilemakerCampaignEmailDeliveryError) {
    return error;
  }
  const message =
    error instanceof Error ? error.message : 'Filemaker campaign email delivery failed.';
  return new FilemakerCampaignEmailDeliveryError({
    message,
    provider: input?.provider ?? null,
    failureCategory:
      input?.failureCategory ??
      (input?.provider === 'smtp'
        ? classifyFilemakerCampaignFailureFromMessage(message)
        : 'unknown'),
  });
};

const resolveAccountDeliveryConfig = async (input: {
  mailAccountId: string;
  fromName: string | null;
  replyToEmail: string | null;
}): Promise<{
  account: FilemakerMailAccount;
  password: string;
  fromName: string | null;
  replyToEmail: string | null;
}> => {
  let account: FilemakerMailAccount;
  try {
    account = await getFilemakerMailAccount(input.mailAccountId);
  } catch (error) {
    throw toCampaignDeliveryError(error);
  }

  if (account.status !== 'active') {
    throw new FilemakerCampaignEmailDeliveryError({
      message: `Mail account ${account.name || account.id} is paused and cannot send campaigns.`,
      provider: null,
      failureCategory: 'unknown',
    });
  }

  const secretKey = buildAccountSecretSettingKey(account.id, 'smtp_password');
  const values = await readSecretSettingValues([secretKey]);
  const password = values[secretKey] ?? null;
  if (!password) {
    throw new FilemakerCampaignEmailDeliveryError({
      message: `SMTP password missing for mail account ${account.name || account.id}.`,
      provider: null,
      failureCategory: 'unknown',
    });
  }

  return {
    account,
    password,
    fromName: input.fromName?.trim() || account.fromName?.trim() || null,
    replyToEmail: input.replyToEmail?.trim() || account.replyToEmail?.trim() || null,
  };
};

export const fileFilemakerCampaignEmailRecordAsMailMessage = async (input: {
  account: FilemakerMailAccount;
  record: FilemakerCampaignEmailDeliveryRecord;
  providerMessageId: string | null;
}): Promise<{ threadId: string; messageId: string }> => {
  const { account, record, providerMessageId } = input;
  const now = new Date().toISOString();
  const normalizedSubject = normalizeFilemakerMailSubject(record.subject);
  const anchorAddress = pickAnchorAddress([{ address: record.to, name: null }]);

  const thread = await mailStorage.findMailThreadBySubjectAndAnchor(
    account.id,
    normalizedSubject,
    anchorAddress
  );
  const threadId =
    thread?.id ??
    buildThreadId({
      accountId: account.id,
      providerThreadId: null,
      normalizedSubject,
      anchorAddress,
    });

  const textBody = record.text;
  const htmlBody = record.html;
  const snippet = buildFilemakerMailSnippet(textBody, htmlBody);
  const recipientSummary = [{ address: record.to, name: null as string | null }];
  const campaignContext = {
    campaignId: record.campaignId,
    runId: record.runId,
    deliveryId: record.deliveryId,
  };
  const messageId = `filemaker-mail-message-${randomUUID()}`;

  const message: FilemakerMailMessage = {
    id: messageId,
    createdAt: now,
    updatedAt: now,
    accountId: account.id,
    threadId,
    mailboxPath: thread?.mailboxPath ?? 'Sent',
    mailboxRole: thread?.mailboxRole ?? 'sent',
    providerMessageId,
    providerThreadId: thread?.providerThreadId ?? null,
    providerUid: null,
    direction: 'outbound',
    subject: record.subject,
    snippet,
    from: {
      address: account.emailAddress,
      name: record.fromName ?? account.fromName ?? null,
    },
    to: recipientSummary,
    cc: [],
    bcc: [],
    replyTo: record.replyToEmail !== null && record.replyToEmail.length > 0
      ? [{ address: record.replyToEmail, name: null }]
      : [],
    sentAt: record.sentAt,
    receivedAt: record.sentAt,
    flags: { seen: true, answered: false, flagged: false, draft: false, deleted: false },
    textBody,
    htmlBody,
    inReplyTo: null,
    references: [],
    attachments: [],
    relatedPersonIds: [],
    relatedOrganizationIds: [],
    campaignContext,
  };
  await mailStorage.upsertMailMessage(message);

  const nextThread: FilemakerMailThread = {
    id: threadId,
    createdAt: thread?.createdAt ?? now,
    updatedAt: now,
    accountId: account.id,
    mailboxPath: thread?.mailboxPath ?? 'Sent',
    mailboxRole: thread?.mailboxRole ?? 'sent',
    providerThreadId: thread?.providerThreadId ?? null,
    subject: record.subject,
    normalizedSubject,
    anchorAddress,
    snippet,
    participantSummary: recipientSummary,
    relatedPersonIds: thread?.relatedPersonIds ?? [],
    relatedOrganizationIds: thread?.relatedOrganizationIds ?? [],
    unreadCount: thread?.unreadCount ?? 0,
    messageCount: (thread?.messageCount ?? 0) + 1,
    lastMessageAt: record.sentAt,
    campaignContext,
  };
  await mailStorage.upsertMailThread(nextThread);

  return { threadId, messageId };
};

export const sendFilemakerCampaignEmail = async (input: {
  to: string;
  subject: string;
  text: string;
  html?: string | null;
  campaignId: string;
  runId: string;
  deliveryId: string;
  mailAccountId?: string | null;
  replyToEmail?: string | null;
  fromName?: string | null;
}): Promise<FilemakerCampaignEmailSendResult> => {
  const baseRecord: FilemakerCampaignEmailDeliveryRecord = {
    to: input.to.trim().toLowerCase(),
    subject: input.subject.trim(),
    text: input.text,
    html: input.html?.trim() || null,
    campaignId: input.campaignId,
    runId: input.runId,
    deliveryId: input.deliveryId,
    mailAccountId: input.mailAccountId?.trim() || null,
    replyToEmail: input.replyToEmail?.trim() || null,
    fromName: input.fromName?.trim() || null,
    sentAt: new Date().toISOString(),
  };

  if (baseRecord.mailAccountId) {
    const accountConfig = await resolveAccountDeliveryConfig({
      mailAccountId: baseRecord.mailAccountId,
      fromName: baseRecord.fromName,
      replyToEmail: baseRecord.replyToEmail,
    });
    const record: FilemakerCampaignEmailDeliveryRecord = {
      ...baseRecord,
      fromName: accountConfig.fromName,
      replyToEmail: accountConfig.replyToEmail,
    };

    if (shouldPersistCampaignOutboxRecord()) {
      deliveredCampaignEmails.push(record);
    }

    const transport = createSmtpTransport(accountConfig.account, accountConfig.password);
    let providerMessageId: string | null = null;
    try {
      const result = await transport.sendMail({
        from: formatFromHeader(record.fromName, accountConfig.account.emailAddress),
        to: record.to,
        subject: record.subject,
        text: record.text,
        ...(record.html !== null && record.html.length > 0 ? { html: record.html } : {}),
        ...(record.replyToEmail !== null && record.replyToEmail.length > 0
          ? { replyTo: record.replyToEmail }
          : {}),
      });
      providerMessageId = typeof result.messageId === 'string' ? result.messageId : null;
      const rawMessage = (result as unknown as { message?: Buffer | string }).message;
      if (rawMessage !== null && rawMessage !== undefined) {
        void appendFilemakerMailToSentFolder({
          account: accountConfig.account,
          rawMessage,
        }).catch(() => {});
      }
    } catch (error) {
      throw toCampaignDeliveryError(error, { provider: 'smtp' });
    }

    let mailFilingStatus: FilemakerCampaignEmailSendResult['mailFilingStatus'] = 'filed';
    let mailThreadId: string | null = null;
    let mailMessageId: string | null = null;
    let mailFilingError: string | null = null;
    try {
      const filingResult = await fileFilemakerCampaignEmailRecordAsMailMessage({
        account: accountConfig.account,
        record,
        providerMessageId,
      });
      mailThreadId = filingResult.threadId;
      mailMessageId = filingResult.messageId;
    } catch (error) {
      mailFilingStatus = 'failed';
      mailFilingError =
        error instanceof Error ? error.message : 'Could not file campaign send into mail thread.';
      logSystemEvent({
        level: 'warn',
        source: 'filemaker-campaign-mail-filing',
        message: `Could not file campaign send ${record.deliveryId} into mail thread`,
        error,
      }).catch(() => {});
    }

    return {
      provider: 'smtp',
      providerMessage: `Sent through the Filemaker mail account "${accountConfig.account.name}".`,
      sentAt: record.sentAt,
      mailFilingStatus,
      mailThreadId,
      mailMessageId,
      mailFilingError,
    };
  }

  const record = baseRecord;
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
      throw new FilemakerCampaignEmailDeliveryError({
        message: `Filemaker campaign webhook failed with status ${response.status}.`,
        provider: 'webhook',
        failureCategory:
          response.status === 429
            ? 'rate_limited'
            : response.status >= 500
              ? 'provider_rejected'
              : 'provider_rejected',
      });
    }
    return {
      provider: 'webhook',
      providerMessage:
        secrets.source === 'filemaker'
          ? 'Accepted by the Filemaker campaign webhook.'
          : 'Accepted by the shared auth email webhook fallback.',
      sentAt: record.sentAt,
      mailFilingStatus: 'not_applicable',
    };
  }

  const transport = getSmtpTransport(secrets.smtp);
  if (transport && secrets.smtp) {
    try {
      await transport.sendMail({
        from: formatFromHeader(record.fromName, secrets.smtp.from),
        to: record.to,
        subject: record.subject,
        text: record.text,
        ...(record.html ? { html: record.html } : {}),
        ...(record.replyToEmail ? { replyTo: record.replyToEmail } : {}),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Filemaker campaign SMTP delivery failed.';
      throw new FilemakerCampaignEmailDeliveryError({
        message,
        provider: 'smtp',
        failureCategory: classifyFilemakerCampaignFailureFromMessage(message),
      });
    }
    return {
      provider: 'smtp',
      providerMessage:
        secrets.source === 'filemaker'
          ? 'Sent through the Filemaker campaign SMTP provider.'
          : 'Sent through the shared auth SMTP fallback.',
      sentAt: record.sentAt,
      mailFilingStatus: 'not_applicable',
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
  throw new FilemakerCampaignEmailDeliveryError({
    message:
      'No campaign email delivery provider is configured. Set filemaker_campaign_email_webhook_url or filemaker_campaign_smtp_host.',
    provider: null,
    failureCategory: 'unknown',
  });
};

export const __resetDeliveredFilemakerCampaignEmails = (): void => {
  deliveredCampaignEmails.length = 0;
};

export const __getDeliveredFilemakerCampaignEmails =
  (): FilemakerCampaignEmailDeliveryRecord[] =>
    deliveredCampaignEmails.map((record) => ({ ...record }));
