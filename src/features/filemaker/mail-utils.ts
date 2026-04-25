import { deriveDocumentContentSync, stripHtmlToPlainText } from '@/shared/lib/document-editor-format';
import { sanitizeHtml } from '@/shared/utils/sanitization';

import type { FilemakerMailMessage, FilemakerMailParticipant } from './types';

const DEFAULT_REPLY_PREFIX = 'Re:';
const DEFAULT_FORWARD_PREFIX = 'Fwd:';

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

export const normalizeFilemakerMailSubject = (value: string | null | undefined): string => {
  const trimmed = normalizeWhitespace(value ?? '');
  if (!trimmed) return '(no subject)';
  return trimmed.replace(/^(?:\s*(?:re|fwd?)\s*:\s*)+/i, '').trim() || '(no subject)';
};

export const ensureFilemakerReplySubject = (value: string | null | undefined): string => {
  const subject = normalizeWhitespace(value ?? '');
  if (!subject) return `${DEFAULT_REPLY_PREFIX} (no subject)`;
  return /^re\s*:/i.test(subject) ? subject : `${DEFAULT_REPLY_PREFIX} ${subject}`;
};

export const ensureFilemakerForwardSubject = (value: string | null | undefined): string => {
  const subject = normalizeWhitespace(value ?? '');
  if (!subject) return `${DEFAULT_FORWARD_PREFIX} (no subject)`;
  return /^(?:fw|fwd)\s*:/i.test(subject) ? subject : `${DEFAULT_FORWARD_PREFIX} ${subject}`;
};

export const buildFilemakerMailPlainText = (html: string): string =>
  deriveDocumentContentSync({
    mode: 'wysiwyg',
    value: html,
  }).plainText;

export const FILEMAKER_MAIL_EMPTY_TEXT_FALLBACK =
  'This message is formatted in HTML. Please view it in an HTML-capable email client.';

export const ensureFilemakerMailPlainTextAlternative = (
  text: string | null | undefined,
  html: string | null | undefined
): string | undefined => {
  const normalizedText = (text ?? '').trim();
  if (normalizedText.length > 0) return text ?? undefined;
  const normalizedHtml = (html ?? '').trim();
  if (normalizedHtml.length === 0) return undefined;
  const derived = buildFilemakerMailPlainText(normalizedHtml).trim();
  return derived.length > 0 ? derived : FILEMAKER_MAIL_EMPTY_TEXT_FALLBACK;
};

export type FilemakerMailDmarcAlignmentInput = {
  emailAddress: string | null | undefined;
  replyToEmail?: string | null | undefined;
  dkimDomain?: string | null | undefined;
  dkimKeySelector?: string | null | undefined;
  hasDkimPrivateKey?: boolean;
};

export type FilemakerMailDmarcAlignmentWarning =
  | 'dkim_disabled'
  | 'dkim_partially_configured'
  | 'dkim_domain_misaligned'
  | 'reply_to_domain_misaligned';

export type FilemakerMailDmarcAlignmentResult = {
  isAligned: boolean;
  warnings: FilemakerMailDmarcAlignmentWarning[];
  fromDomain: string | null;
  replyToDomain: string | null;
  dkimDomain: string | null;
};

const extractEmailDomain = (value: string | null | undefined): string | null => {
  const normalized = (value ?? '').trim().toLowerCase();
  const at = normalized.indexOf('@');
  if (at < 0 || at === normalized.length - 1) return null;
  return normalized.slice(at + 1);
};

const isOrganizationalDomainAligned = (left: string, right: string): boolean => {
  if (left === right) return true;
  const leftLabels = left.split('.');
  const rightLabels = right.split('.');
  if (leftLabels.length < 2 || rightLabels.length < 2) return false;
  const leftRoot = leftLabels.slice(-2).join('.');
  const rightRoot = rightLabels.slice(-2).join('.');
  return leftRoot === rightRoot;
};

export const evaluateFilemakerMailAccountDmarcAlignment = (
  input: FilemakerMailDmarcAlignmentInput
): FilemakerMailDmarcAlignmentResult => {
  const warnings: FilemakerMailDmarcAlignmentWarning[] = [];
  const fromDomain = extractEmailDomain(input.emailAddress);
  const replyToDomain = extractEmailDomain(input.replyToEmail);
  const dkimDomain = (input.dkimDomain ?? '').trim().toLowerCase() || null;
  const dkimKeySelector = (input.dkimKeySelector ?? '').trim() || null;
  const hasDkimPrivateKey = Boolean(input.hasDkimPrivateKey);

  if (!dkimDomain && !dkimKeySelector && !hasDkimPrivateKey) {
    warnings.push('dkim_disabled');
  } else if (!dkimDomain || !dkimKeySelector || !hasDkimPrivateKey) {
    warnings.push('dkim_partially_configured');
  } else if (fromDomain && !isOrganizationalDomainAligned(fromDomain, dkimDomain)) {
    warnings.push('dkim_domain_misaligned');
  }

  if (
    fromDomain &&
    replyToDomain &&
    !isOrganizationalDomainAligned(fromDomain, replyToDomain)
  ) {
    warnings.push('reply_to_domain_misaligned');
  }

  return {
    isAligned: warnings.length === 0,
    warnings,
    fromDomain,
    replyToDomain,
    dkimDomain,
  };
};

export const buildFilemakerMailSnippet = (
  textBody: string | null | undefined,
  htmlBody?: string | null | undefined
): string | null => {
  const source =
    normalizeWhitespace(textBody ?? '') ||
    normalizeWhitespace(stripHtmlToPlainText(htmlBody ?? ''));
  if (!source) return null;
  return source.length > 240 ? `${source.slice(0, 237)}...` : source;
};

export const dedupeFilemakerMailParticipants = (
  participants: FilemakerMailParticipant[]
): FilemakerMailParticipant[] => {
  const seen = new Set<string>();
  const unique: FilemakerMailParticipant[] = [];
  participants.forEach((participant) => {
    const address = normalizeWhitespace(participant.address).toLowerCase();
    if (!address || seen.has(address)) return;
    seen.add(address);
    unique.push({
      address,
      name: normalizeWhitespace(participant.name ?? '') || null,
    });
  });
  return unique;
};

export const formatFilemakerMailParticipants = (
  participants: FilemakerMailParticipant[]
): string => dedupeFilemakerMailParticipants(participants)
  .map((participant) =>
    participant.name ? `${participant.name} <${participant.address}>` : participant.address
  )
  .join(', ');

export const parseFilemakerMailParticipantsInput = (
  value: string
): FilemakerMailParticipant[] =>
  dedupeFilemakerMailParticipants(
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const namedMatch = entry.match(/^(.*)<([^>]+)>$/);
        if (!namedMatch) {
          return { address: entry.toLowerCase(), name: null };
        }
        const [, rawName = '', rawAddress = ''] = namedMatch;
        return {
          address: rawAddress.trim().toLowerCase(),
          name: normalizeWhitespace(rawName) || null,
        };
      })
  );

export const parseFilemakerMailboxAllowlistInput = (value: string): string[] =>
  [...new Set(value.split(',').map((entry) => normalizeWhitespace(entry)).filter(Boolean))];

export const formatFilemakerMailboxAllowlist = (value: string[]): string =>
  [...new Set(value.map((entry) => normalizeWhitespace(entry)).filter(Boolean))].join(', ');

export const resolveFilemakerReplyRecipients = (
  message: Pick<FilemakerMailMessage, 'replyTo' | 'from'>
): FilemakerMailParticipant[] => {
  const from = message.from ? [message.from] : [];
  return dedupeFilemakerMailParticipants(
    message.replyTo.length > 0 ? message.replyTo : from
  );
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;');

export const buildFilemakerMailReplyHtmlSeed = (
  message: Pick<FilemakerMailMessage, 'from' | 'sentAt' | 'htmlBody' | 'textBody'>
): string => {
  const sourceHtml = sanitizeHtml(message.htmlBody ?? '').trim();
  const sourcePlain = normalizeWhitespace(message.textBody ?? '');
  const sentAtLabel = message.sentAt ? new Date(message.sentAt).toLocaleString() : 'Unknown time';
  const fromLabel = message.from?.name
    ? `${message.from.name} <${message.from.address}>`
    : (message.from?.address ?? 'Unknown sender');

  if (sourceHtml) {
    return [
      '<p><br/></p>',
      `<blockquote data-filemaker-reply-quote="true"><p>On ${escapeHtml(sentAtLabel)}, ${escapeHtml(fromLabel)} wrote:</p>${sourceHtml}</blockquote>`,
    ].join('');
  }

  const fallbackText = sourcePlain || '(no quoted content)';
  return [
    '<p><br/></p>',
    `<blockquote data-filemaker-reply-quote="true"><p>On ${escapeHtml(sentAtLabel)}, ${escapeHtml(fromLabel)} wrote:</p><p>${escapeHtml(fallbackText)}</p></blockquote>`,
  ].join('');
};

export const buildFilemakerMailForwardHtmlSeed = (
  message: Pick<
    FilemakerMailMessage,
    'cc' | 'from' | 'htmlBody' | 'sentAt' | 'subject' | 'textBody' | 'to'
  >
): string => {
  const sourceHtml = sanitizeHtml(message.htmlBody ?? '').trim();
  const sourcePlain = normalizeWhitespace(message.textBody ?? '');
  const sentAtLabel = message.sentAt ? new Date(message.sentAt).toLocaleString() : 'Unknown time';
  const fromLabel = message.from
    ? formatFilemakerMailParticipants([message.from]) || 'Unknown sender'
    : 'Unknown sender';
  const toLabel = formatFilemakerMailParticipants(message.to);
  const ccLabel = formatFilemakerMailParticipants(message.cc);
  const subjectLabel = normalizeWhitespace(message.subject) || '(no subject)';
  const forwardedBody = sourceHtml
    ? sourceHtml
    : `<p>${escapeHtml(sourcePlain || '(no forwarded content)')}</p>`;

  return [
    '<p><br/></p>',
    '<p><br/></p>',
    '<div data-filemaker-forward-quote="true">',
    '<p>---------- Forwarded message ---------</p>',
    `<p><strong>From:</strong> ${escapeHtml(fromLabel)}</p>`,
    `<p><strong>Date:</strong> ${escapeHtml(sentAtLabel)}</p>`,
    ...(toLabel ? [`<p><strong>To:</strong> ${escapeHtml(toLabel)}</p>`] : []),
    ...(ccLabel ? [`<p><strong>Cc:</strong> ${escapeHtml(ccLabel)}</p>`] : []),
    `<p><strong>Subject:</strong> ${escapeHtml(subjectLabel)}</p>`,
    forwardedBody,
    '</div>',
  ].join('');
};
