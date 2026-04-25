import 'server-only';

import type { MailparserParsedMail } from './mail-types';

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
  return match ? match[0].toLowerCase() : null;
};

const collectReportText = (parsed: MailparserParsedMail): string => {
  const parts: string[] = [];
  if (typeof parsed.text === 'string') parts.push(parsed.text);
  const attachments = Array.isArray(parsed.attachments) ? parsed.attachments : [];
  for (const attachment of attachments) {
    const contentType = (attachment.contentType ?? '').toLowerCase();
    if (
      contentType.startsWith('message/delivery-status') ||
      contentType.startsWith('message/feedback-report') ||
      contentType.startsWith('message/rfc822') ||
      contentType.startsWith('text/')
    ) {
      const content = attachment.content;
      if (Buffer.isBuffer(content)) {
        parts.push(content.toString('utf8'));
      } else if (typeof content === 'string') {
        parts.push(content);
      }
    }
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

export const isLikelyFilemakerMailBounceMessage = (
  parsed: MailparserParsedMail
): boolean => {
  const fromAddresses = Array.isArray(parsed.from?.value)
    ? parsed.from?.value.map((entry) => normalizeAddress(entry.address))
    : [];
  if (fromAddresses.some((address) => BOUNCE_FROM_LOCAL_PARTS.includes(fromLocalPart(address)))) {
    return true;
  }

  const subject = (parsed.subject ?? '').trim();
  if (subject && BOUNCE_SUBJECT_PATTERNS.some((pattern) => pattern.test(subject))) {
    return true;
  }

  const attachments = Array.isArray(parsed.attachments) ? parsed.attachments : [];
  if (
    attachments.some((attachment) =>
      (attachment.contentType ?? '').toLowerCase().startsWith('message/delivery-status')
    )
  ) {
    return true;
  }

  return false;
};

export const parseFilemakerMailDsnReport = (
  parsed: MailparserParsedMail
): FilemakerMailDsnReport => {
  const report = collectReportText(parsed);
  const bouncedAddresses = new Set<string>();

  for (const pattern of DIAGNOSTIC_LINE_PATTERNS) {
    const matches = report.matchAll(new RegExp(pattern.source, 'gim'));
    for (const match of matches) {
      const candidate = extractEmailFromLine(match[1] ?? '');
      if (candidate) bouncedAddresses.add(candidate);
    }
  }

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
  const diagnosticCode = diagnosticMatch ? diagnosticMatch[1]!.trim() : null;
  const statusMatch = report.match(STATUS_PATTERN);
  const status = statusMatch ? statusMatch[1]!.trim() : null;
  const isPermanent = status ? status.startsWith('5.') : /^5\d{2}\b/.test(diagnosticCode ?? '');

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
  if (subject && COMPLAINT_SUBJECT_PATTERNS.some((pattern) => pattern.test(subject))) {
    const report = collectReportText(parsed);
    if (ARF_FEEDBACK_TYPE_PATTERN.test(report)) return true;
  }
  return false;
};

export const parseFilemakerMailComplaintReport = (
  parsed: MailparserParsedMail
): FilemakerMailComplaintReport => {
  const report = collectReportText(parsed);
  const complained = new Set<string>();

  const rcptMatches = report.matchAll(
    new RegExp(ARF_ORIGINAL_RCPT_PATTERN.source, 'gim')
  );
  for (const match of rcptMatches) {
    const candidate = extractEmailFromLine(match[1] ?? '');
    if (candidate) complained.add(candidate);
  }

  if (complained.size === 0) {
    for (const pattern of DIAGNOSTIC_LINE_PATTERNS) {
      const matches = report.matchAll(new RegExp(pattern.source, 'gim'));
      for (const match of matches) {
        const candidate = extractEmailFromLine(match[1] ?? '');
        if (candidate) complained.add(candidate);
      }
    }
  }

  const feedbackTypeMatch = report.match(ARF_FEEDBACK_TYPE_PATTERN);
  const userAgentMatch = report.match(ARF_USER_AGENT_PATTERN);

  return {
    complainedAddresses: Array.from(complained),
    feedbackType: feedbackTypeMatch ? feedbackTypeMatch[1]!.trim() : null,
    userAgent: userAgentMatch ? userAgentMatch[1]!.trim() : null,
  };
};
