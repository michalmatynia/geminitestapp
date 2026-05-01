import 'server-only';

import type { MailparserAttachment, MailparserParsedMail } from './mail-types';

const BOUNCE_FROM_LOCAL_PARTS = [
  'mailer-daemon',
  'postmaster',
  'bounce',
  'bounces',
  'mail-delivery',
  'no-reply-bounce',
];

const BOUNCE_SUBJECT_PATTERNS = [
  /undeliverable/i,
  /delivery\s+status\s+notification/i,
  /delivery\s+failure/i,
  /failure\s+notice/i,
  /mail\s+delivery\s+failed/i,
  /returned\s+mail/i,
  /undelivered\s+mail/i,
  /could\s+not\s+be\s+delivered/i,
];

const DIAGNOSTIC_LINE_PATTERNS = [
  /^final-recipient:\s*(?:rfc822;)?\s*(.+)$/im,
  /^original-recipient:\s*(?:rfc822;)?\s*(.+)$/im,
];

const DIAGNOSTIC_CODE_PATTERN = /^diagnostic-code:\s*(.+)$/im;
const STATUS_PATTERN = /^status:\s*([0-9.]+)/im;

const ARF_FEEDBACK_TYPE_PATTERN = /^feedback-type:\s*(.+)$/im;
const ARF_ORIGINAL_RCPT_PATTERN = /^original-rcpt-to:\s*(.+)$/im;
const ARF_USER_AGENT_PATTERN = /^user-agent:\s*(.+)$/im;

const COMPLAINT_SUBJECT_PATTERNS = [
  /spam\s+report/i,
  /abuse\s+report/i,
  /feedback\s+report/i,
  /complaint/i,
];

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

const normalizeAddress = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

export type FilemakerMailDsnReport = {
  bouncedAddresses: string[];
  diagnosticCode: string | null;
  status: string | null;
  isPermanent: boolean;
};

const extractEmailFromLine = (line: string): string | null => {
  const match = line.match(EMAIL_REGEX);
  return match !== null ? match[0].toLowerCase() : null;
};

const isReportAttachmentContentType = (contentType: string | null | undefined): boolean => {
  const normalized = (contentType ?? '').toLowerCase();
  if (normalized.startsWith('message/delivery-status')) return true;
  if (normalized.startsWith('message/feedback-report')) return true;
  if (normalized.startsWith('message/rfc822')) return true;
  return normalized.startsWith('text/');
};

const extractAttachmentReportText = (attachment: MailparserAttachment): string | null => {
  if (!isReportAttachmentContentType(attachment.contentType)) return null;
  const content = attachment.content;
  if (Buffer.isBuffer(content)) return content.toString('utf8');
  if (typeof content === 'string') return content;
  return null;
};

const collectReportText = (parsed: MailparserParsedMail): string => {
  const parts: string[] = [];
  if (typeof parsed.text === 'string') parts.push(parsed.text);
  const attachments = Array.isArray(parsed.attachments) ? parsed.attachments : [];
  for (const attachment of attachments) {
    const content = extractAttachmentReportText(attachment);
    if (content !== null) parts.push(content);
  }
  return parts.join('\n');
};

const hasFeedbackReportAttachment = (parsed: MailparserParsedMail): boolean => {
  const attachments = Array.isArray(parsed.attachments) ? parsed.attachments : [];
  return attachments.some((attachment) =>
    (attachment.contentType ?? '').toLowerCase().startsWith('message/feedback-report')
  );
};

const fromLocalPart = (address: string): string => {
  const trimmed = address.trim().toLowerCase();
  const at = trimmed.indexOf('@');
  return at > 0 ? trimmed.slice(0, at) : trimmed;
};

const addAddressesForPatterns = (
  addresses: Set<string>,
  report: string,
  patterns: RegExp[]
): void => {
  for (const pattern of patterns) {
    const matches = report.matchAll(new RegExp(pattern.source, 'gim'));
    for (const match of matches) {
      const candidate = extractEmailFromLine(match[1] ?? '');
      if (candidate !== null) addresses.add(candidate);
    }
  }
};

const extractFirstMatchedGroup = (match: RegExpMatchArray | null): string | null => {
  const value = match?.[1];
  if (value === undefined) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const hasBounceSender = (parsed: MailparserParsedMail): boolean => {
  const fromEntries = parsed.from?.value;
  const fromAddresses = Array.isArray(fromEntries)
    ? fromEntries.map((entry) => normalizeAddress(entry.address))
    : [];
  return fromAddresses.some((address) => BOUNCE_FROM_LOCAL_PARTS.includes(fromLocalPart(address)));
};

const hasBounceSubject = (parsed: MailparserParsedMail): boolean => {
  const subject = (parsed.subject ?? '').trim();
  return subject.length > 0 && BOUNCE_SUBJECT_PATTERNS.some((pattern) => pattern.test(subject));
};

const hasDeliveryStatusAttachment = (parsed: MailparserParsedMail): boolean => {
  const attachments = Array.isArray(parsed.attachments) ? parsed.attachments : [];
  return attachments.some((attachment) =>
    (attachment.contentType ?? '').toLowerCase().startsWith('message/delivery-status')
  );
};

export const isLikelyFilemakerMailBounceMessage = (
  parsed: MailparserParsedMail
): boolean => {
  if (hasBounceSender(parsed)) return true;
  if (hasBounceSubject(parsed)) return true;
  return hasDeliveryStatusAttachment(parsed);
};

export const parseFilemakerMailDsnReport = (
  parsed: MailparserParsedMail
): FilemakerMailDsnReport => {
  const report = collectReportText(parsed);
  const bouncedAddresses = new Set<string>();
  addAddressesForPatterns(bouncedAddresses, report, DIAGNOSTIC_LINE_PATTERNS);

  if (bouncedAddresses.size === 0) {
    const matches = report.match(new RegExp(EMAIL_REGEX.source, 'gi')) ?? [];
    matches.forEach((address) => {
      const normalized = address.toLowerCase();
      if (!BOUNCE_FROM_LOCAL_PARTS.includes(fromLocalPart(normalized))) {
        bouncedAddresses.add(normalized);
      }
    });
  }

  const diagnosticMatch = report.match(DIAGNOSTIC_CODE_PATTERN);
  const diagnosticCode = extractFirstMatchedGroup(diagnosticMatch);
  const statusMatch = report.match(STATUS_PATTERN);
  const status = extractFirstMatchedGroup(statusMatch);
  const isPermanent = status !== null ? status.startsWith('5.') : /^5\d{2}\b/.test(diagnosticCode ?? '');

  return {
    bouncedAddresses: Array.from(bouncedAddresses),
    diagnosticCode,
    status,
    isPermanent,
  };
};

export type FilemakerMailComplaintReport = {
  complainedAddresses: string[];
  feedbackType: string | null;
  userAgent: string | null;
};

export const isLikelyFilemakerMailComplaintMessage = (
  parsed: MailparserParsedMail
): boolean => {
  if (hasFeedbackReportAttachment(parsed)) return true;
  const subject = (parsed.subject ?? '').trim();
  if (subject.length === 0) return false;
  if (!COMPLAINT_SUBJECT_PATTERNS.some((pattern) => pattern.test(subject))) return false;
  return ARF_FEEDBACK_TYPE_PATTERN.test(collectReportText(parsed));
};

export const parseFilemakerMailComplaintReport = (
  parsed: MailparserParsedMail
): FilemakerMailComplaintReport => {
  const report = collectReportText(parsed);
  const complained = new Set<string>();

  addAddressesForPatterns(complained, report, [ARF_ORIGINAL_RCPT_PATTERN]);

  if (complained.size === 0) {
    addAddressesForPatterns(complained, report, DIAGNOSTIC_LINE_PATTERNS);
  }

  const feedbackTypeMatch = report.match(ARF_FEEDBACK_TYPE_PATTERN);
  const userAgentMatch = report.match(ARF_USER_AGENT_PATTERN);

  return {
    complainedAddresses: Array.from(complained),
    feedbackType: extractFirstMatchedGroup(feedbackTypeMatch),
    userAgent: extractFirstMatchedGroup(userAgentMatch),
  };
};
