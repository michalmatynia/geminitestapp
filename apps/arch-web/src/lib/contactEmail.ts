import type { Db } from 'mongodb';
import nodemailer from 'nodemailer';

import { DEFAULT_ARCH_PAGE_SETTINGS, resolveArchPageData } from '@/lib/pageContent';

const PAGE_CONTENT_COLLECTION = 'page_content';
const PAGE_CONTENT_KEY = 'home';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailDeliveryResult =
  | { status: 'sent'; messageId: string | null }
  | { status: 'not_configured'; error: string }
  | { status: 'failed'; error: string };

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  from: string;
};

const firstEnvValue = (...keys: string[]): string | null => {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
};

export const normalizeEmailAddress = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return EMAIL_RE.test(trimmed) ? trimmed : null;
};

const parseBoolean = (value: string | null, fallback: boolean): boolean => {
  if (value === null) return fallback;
  const normalized = value.toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const parsePort = (value: string | null, fallback: number): number => {
  if (value === null) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const resolveSmtpConfig = (): SmtpConfig | null => {
  const host = firstEnvValue('ARCH_SMTP_HOST', 'MILKBAR_SMTP_HOST', 'SMTP_HOST');
  if (host === null) return null;

  const port = parsePort(firstEnvValue('ARCH_SMTP_PORT', 'MILKBAR_SMTP_PORT', 'SMTP_PORT'), 587);
  const user = firstEnvValue('ARCH_SMTP_USER', 'MILKBAR_SMTP_USER', 'SMTP_USER');
  const pass = firstEnvValue('ARCH_SMTP_PASS', 'MILKBAR_SMTP_PASS', 'SMTP_PASS');
  const secure = parseBoolean(
    firstEnvValue('ARCH_SMTP_SECURE', 'MILKBAR_SMTP_SECURE', 'SMTP_SECURE'),
    port === 465
  );
  const from =
    firstEnvValue('ARCH_SMTP_FROM', 'MILKBAR_SMTP_FROM', 'SMTP_FROM') ??
    user ??
    DEFAULT_ARCH_PAGE_SETTINGS.contactEmail;

  return {
    host,
    port,
    secure,
    ...(user !== null && pass !== null ? { auth: { user, pass } } : {}),
    from,
  };
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });

export async function resolveContactRecipient(db: Db): Promise<string> {
  const doc = await db
    .collection<{ pageSettings?: unknown }>(PAGE_CONTENT_COLLECTION)
    .findOne(
      { key: PAGE_CONTENT_KEY },
      { projection: { _id: 0, pageSettings: 1 } }
    );
  const pageData = resolveArchPageData(doc);
  return (
    normalizeEmailAddress(pageData.pageSettings.contactEmail) ??
    normalizeEmailAddress(
      firstEnvValue('ARCH_CONTACT_EMAIL', 'MILKBAR_CONTACT_EMAIL', 'CONTACT_EMAIL')
    ) ??
    DEFAULT_ARCH_PAGE_SETTINGS.contactEmail
  );
}

export async function sendContactInquiryEmail(input: {
  recipient: string;
  senderEmail: string;
  message: string;
  locale?: string;
  createdAt: Date;
}): Promise<EmailDeliveryResult> {
  const config = resolveSmtpConfig();
  if (config === null) {
    return { status: 'not_configured', error: 'SMTP delivery is not configured.' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      ...(config.auth !== undefined ? { auth: config.auth } : {}),
    });
    const locale = input.locale?.trim() || 'not provided';
    const submittedAt = input.createdAt.toISOString();
    const subject = `New Milkbar Designers inquiry from ${input.senderEmail}`;
    const text = [
      'New Milkbar Designers contact form inquiry',
      '',
      `From: ${input.senderEmail}`,
      `Locale: ${locale}`,
      `Submitted: ${submittedAt}`,
      '',
      input.message,
    ].join('\n');
    const html = [
      '<h2>New Milkbar Designers contact form inquiry</h2>',
      `<p><strong>From:</strong> ${escapeHtml(input.senderEmail)}</p>`,
      `<p><strong>Locale:</strong> ${escapeHtml(locale)}</p>`,
      `<p><strong>Submitted:</strong> ${escapeHtml(submittedAt)}</p>`,
      `<p>${escapeHtml(input.message).replace(/\n/g, '<br />')}</p>`,
    ].join('');

    const result = await transporter.sendMail({
      from: config.from,
      to: input.recipient,
      replyTo: input.senderEmail,
      subject,
      text,
      html,
    });

    return { status: 'sent', messageId: result.messageId ?? null };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown email delivery error.',
    };
  }
}
