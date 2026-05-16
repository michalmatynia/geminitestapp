import { deriveDocumentContentSync, stripHtmlToPlainText } from '@/shared/lib/document-editor-format';
import { sanitizeHtml } from '@/shared/utils/sanitization';

import type { FilemakerMailMessage, FilemakerMailParticipant } from './types';

const DEFAULT_REPLY_PREFIX = 'Re:';
const DEFAULT_FORWARD_PREFIX = 'Fwd:';

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const normalizeNullableString = (value: string | null | undefined): string | null => {
  const normalized = normalizeWhitespace(value ?? '');
  return normalized.length > 0 ? normalized : null;
};

export const normalizeFilemakerMailSubject = (value: string | null | undefined): string => {
  const trimmed = normalizeWhitespace(value ?? '');
  if (trimmed.length === 0) return '(no subject)';
  const withoutPrefix = trimmed.replace(/^(?:\s*(?:re|fwd?)\s*:\s*)+/i, '').trim();
  return withoutPrefix.length > 0 ? withoutPrefix : '(no subject)';
};

export const ensureFilemakerReplySubject = (value: string | null | undefined): string => {
  const subject = normalizeWhitespace(value ?? '');
  if (subject.length === 0) return `${DEFAULT_REPLY_PREFIX} (no subject)`;
  return /^re\s*:/i.test(subject) ? subject : `${DEFAULT_REPLY_PREFIX} ${subject}`;
};

export const ensureFilemakerForwardSubject = (value: string | null | undefined): string => {
  const subject = normalizeWhitespace(value ?? '');
  if (subject.length === 0) return `${DEFAULT_FORWARD_PREFIX} (no subject)`;
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

const normalizeLowercaseNullableString = (value: string | null | undefined): string | null => {
  const normalized = normalizeNullableString(value);
  return normalized !== null ? normalized.toLowerCase() : null;
};

type DkimAlignmentContext = {
  warnings: FilemakerMailDmarcAlignmentWarning[],
  fromDomain: string | null;
  dkimDomain: string | null;
  dkimKeySelector: string | null;
  hasDkimPrivateKey: boolean;
};

const hasNoDkimConfig = (context: DkimAlignmentContext): boolean =>
  context.dkimDomain === null && context.dkimKeySelector === null && !context.hasDkimPrivateKey;

const hasPartialDkimConfig = (context: DkimAlignmentContext): boolean =>
  context.dkimDomain === null || context.dkimKeySelector === null || !context.hasDkimPrivateKey;

const addDkimAlignmentWarnings = (context: DkimAlignmentContext): void => {
  if (hasNoDkimConfig(context)) {
    context.warnings.push('dkim_disabled');
    return;
  }
  if (hasPartialDkimConfig(context)) {
    context.warnings.push('dkim_partially_configured');
    return;
  }
  const dkimDomain = context.dkimDomain;
  if (context.fromDomain !== null && dkimDomain !== null && !isOrganizationalDomainAligned(context.fromDomain, dkimDomain)) {
    context.warnings.push('dkim_domain_misaligned');
  }
};

const addReplyToAlignmentWarning = (
  warnings: FilemakerMailDmarcAlignmentWarning[],
  fromDomain: string | null,
  replyToDomain: string | null
): void => {
  if (fromDomain === null || replyToDomain === null) return;
  if (!isOrganizationalDomainAligned(fromDomain, replyToDomain)) {
    warnings.push('reply_to_domain_misaligned');
  }
};

export const evaluateFilemakerMailAccountDmarcAlignment = (
  input: FilemakerMailDmarcAlignmentInput
): FilemakerMailDmarcAlignmentResult => {
  const warnings: FilemakerMailDmarcAlignmentWarning[] = [];
  const fromDomain = extractEmailDomain(input.emailAddress);
  const replyToDomain = extractEmailDomain(input.replyToEmail);
  const dkimDomain = normalizeLowercaseNullableString(input.dkimDomain);
  const dkimKeySelector = normalizeNullableString(input.dkimKeySelector);
  const hasDkimPrivateKey = Boolean(input.hasDkimPrivateKey);
  addDkimAlignmentWarnings({ warnings, fromDomain, dkimDomain, dkimKeySelector, hasDkimPrivateKey });
  addReplyToAlignmentWarning(warnings, fromDomain, replyToDomain);

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
  const textSource = normalizeWhitespace(textBody ?? '');
  const source = textSource.length > 0
    ? textSource
    : normalizeWhitespace(stripHtmlToPlainText(htmlBody ?? ''));
  if (source.length === 0) return null;
  return source.length > 240 ? `${source.slice(0, 237)}...` : source;
};

export const dedupeFilemakerMailParticipants = (
  participants: FilemakerMailParticipant[]
): FilemakerMailParticipant[] => {
  const seen = new Set<string>();
  const unique: FilemakerMailParticipant[] = [];
  participants.forEach((participant) => {
    const address = normalizeWhitespace(participant.address).toLowerCase();
    if (address.length === 0 || seen.has(address)) return;
    seen.add(address);
    const name = normalizeNullableString(participant.name);
    unique.push({
      address,
      name,
    });
  });
  return unique;
};

export const formatFilemakerMailParticipants = (
  participants: FilemakerMailParticipant[]
): string => dedupeFilemakerMailParticipants(participants)
  .map((participant) =>
    participant.name !== null ? `${participant.name} <${participant.address}>` : participant.address
  )
  .join(', ');

export const parseFilemakerMailParticipantsInput = (
  value: string
): FilemakerMailParticipant[] =>
  dedupeFilemakerMailParticipants(
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry: string): boolean => entry.length > 0)
      .map((entry) => {
        const namedMatch = entry.match(/^(.*)<([^>]+)>$/);
        if (namedMatch === null) {
          return { address: entry.toLowerCase(), name: null };
        }
        const [, rawName = '', rawAddress = ''] = namedMatch;
        return {
          address: rawAddress.trim().toLowerCase(),
          name: normalizeNullableString(rawName),
        };
      })
  );

export const parseFilemakerMailboxAllowlistInput = (value: string): string[] =>
  [...new Set(value.split(',').map((entry) => normalizeWhitespace(entry)).filter((entry) => entry.length > 0))];

export const formatFilemakerMailboxAllowlist = (value: string[]): string =>
  [...new Set(value.map((entry) => normalizeWhitespace(entry)).filter((entry) => entry.length > 0))].join(', ');

export const resolveFilemakerReplyRecipients = (
  message: Pick<FilemakerMailMessage, 'replyTo' | 'from'>
): FilemakerMailParticipant[] => {
  const replyTo = message.replyTo.filter(
    (participant): participant is FilemakerMailParticipant => participant !== undefined
  );
  const from = message.from !== null && message.from !== undefined ? [message.from] : [];
  return dedupeFilemakerMailParticipants(
    replyTo.length > 0 ? replyTo : from
  );
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;');

const formatMailTimestamp = (sentAt: string | null | undefined): string =>
  sentAt !== null && sentAt !== undefined ? new Date(sentAt).toLocaleString() : 'Unknown time';

const formatMailSenderLabel = (from: FilemakerMailParticipant | null | undefined): string => {
  if (from === null || from === undefined) return 'Unknown sender';
  if (from.name !== null) return `${from.name} <${from.address}>`;
  return from.address;
};

const buildQuotedBodyHtml = (sourceHtml: string, sourcePlain: string, fallback: string): string =>
  sourceHtml.length > 0 ? sourceHtml : `<p>${escapeHtml(sourcePlain.length > 0 ? sourcePlain : fallback)}</p>`;

export const buildFilemakerMailReplyHtmlSeed = (
  message: Pick<FilemakerMailMessage, 'from' | 'sentAt' | 'htmlBody' | 'textBody'>
): string => {
  const sourceHtml = sanitizeHtml(message.htmlBody ?? '').trim();
  const sourcePlain = normalizeWhitespace(message.textBody ?? '');
  const sentAtLabel = formatMailTimestamp(message.sentAt);
  const fromLabel = formatMailSenderLabel(message.from);

  if (sourceHtml.length > 0) {
    return [
      '<p><br/></p>',
      `<blockquote data-filemaker-reply-quote="true"><p>On ${escapeHtml(sentAtLabel)}, ${escapeHtml(fromLabel)} wrote:</p>${sourceHtml}</blockquote>`,
    ].join('');
  }

  const fallbackText = sourcePlain.length > 0 ? sourcePlain : '(no quoted content)';
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
  const sentAtLabel = formatMailTimestamp(message.sentAt);
  const fromLabel = formatMailSenderLabel(message.from);
  const toLabel = formatFilemakerMailParticipants(message.to);
  const ccLabel = formatFilemakerMailParticipants(message.cc);
  const subjectLabel = normalizeNullableString(message.subject) ?? '(no subject)';
  const forwardedBody = buildQuotedBodyHtml(sourceHtml, sourcePlain, '(no forwarded content)');

  return [
    '<p><br/></p>',
    '<p><br/></p>',
    '<div data-filemaker-forward-quote="true">',
    '<p>---------- Forwarded message ---------</p>',
    `<p><strong>From:</strong> ${escapeHtml(fromLabel)}</p>`,
    `<p><strong>Date:</strong> ${escapeHtml(sentAtLabel)}</p>`,
    ...(toLabel.length > 0 ? [`<p><strong>To:</strong> ${escapeHtml(toLabel)}</p>`] : []),
    ...(ccLabel.length > 0 ? [`<p><strong>Cc:</strong> ${escapeHtml(ccLabel)}</p>`] : []),
    `<p><strong>Subject:</strong> ${escapeHtml(subjectLabel)}</p>`,
    forwardedBody,
    '</div>',
  ].join('');
};
