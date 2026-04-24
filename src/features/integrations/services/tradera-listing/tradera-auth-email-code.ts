import 'server-only';

import {
  getFilemakerMailThreadDetail,
  listFilemakerMailAccounts,
  searchFilemakerMailMessages,
} from '@/features/filemaker/server';
import type {
  FilemakerMailAccount,
  FilemakerMailMessage,
} from '@/features/filemaker/types';
import {
  enqueueFilemakerMailSyncJob,
  startFilemakerMailSyncQueue,
} from '@/server/queues/filemaker';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

type TraderaEmailVerificationCodeResolution = {
  code: string;
  accountId: string;
  messageId: string;
  receivedAt: string | null;
};

type ResolveTraderaEmailVerificationCodeInput = {
  emailAddress: string;
  requestedAfter: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
};

const LOG_SOURCE = 'tradera-auth-email-code';
const DEFAULT_TIMEOUT_MS = 4 * 60_000;
const DEFAULT_POLL_INTERVAL_MS = 5_000;
const SEARCH_QUERIES = ['verification code', 'verifieringskod', 'Tradera'] as const;

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeComparableEmail = (value: unknown): string =>
  toTrimmedString(value).toLowerCase();

const wait = async (timeoutMs: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, timeoutMs);
  });
};

export const extractTraderaVerificationCode = (input: {
  subject?: string | null;
  textBody?: string | null;
  htmlBody?: string | null;
}): string | null => {
  const content = [input.subject, input.textBody, input.htmlBody]
    .map((value) => toTrimmedString(value))
    .filter((value) => value.length > 0)
    .join('\n');

  const contextualMatch = content.match(
    /\b(?:verification\s+code(?:\s+is)?|verifieringskod(?:en)?(?:\s+är)?|kod(?:en)?(?:\s+är)?)\D{0,100}(\d{6})\b/i
  );
  const contextualCode = contextualMatch?.[1] ?? null;
  if (contextualCode !== null) {
    return contextualCode;
  }

  return content.match(/\b(\d{6})\b/)?.[1] ?? null;
};

const resolveMailAccountForEmail = async (
  emailAddress: string
): Promise<FilemakerMailAccount | null> => {
  const normalizedEmail = normalizeComparableEmail(emailAddress);
  if (normalizedEmail.length === 0) return null;

  const accounts = await listFilemakerMailAccounts();
  return (
    accounts.find((account) => {
      const candidates = [
        account.emailAddress,
        account.imapUser,
        account.smtpUser,
      ].map(normalizeComparableEmail);
      return candidates.includes(normalizedEmail);
    }) ?? null
  );
};

const readMessageTimestamp = (message: FilemakerMailMessage): number => {
  const raw = message.receivedAt ?? message.sentAt ?? message.createdAt ?? '';
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isLikelyTraderaCodeMessage = (message: FilemakerMailMessage): boolean => {
  const content = [
    message.subject,
    message.from?.name,
    message.from?.address,
    message.textBody,
    message.htmlBody,
  ]
    .map((value) => toTrimmedString(value).toLowerCase())
    .join('\n');

  return content.includes('tradera') && extractTraderaVerificationCode(message) !== null;
};

const listCandidateMessages = async (
  accountId: string
): Promise<FilemakerMailMessage[]> => {
  const messagesById = new Map<string, FilemakerMailMessage>();
  const searchResults = await Promise.all(
    SEARCH_QUERIES.map((query) => searchFilemakerMailMessages({ query, accountId }))
  );
  const threadIds = new Set(
    searchResults.flatMap((result) =>
      result.groups.flatMap((group) => group.hits.map((hit) => hit.threadId))
    )
  );
  const details = await Promise.all(
    Array.from(threadIds).map((threadId) => getFilemakerMailThreadDetail(threadId))
  );

  details.forEach((detail) => {
    detail?.messages.forEach((message) => {
      messagesById.set(message.id, message);
    });
  });

  return Array.from(messagesById.values());
};

const readLatestCodeFromMailbox = async ({
  accountId,
  requestedAfter,
}: {
  accountId: string;
  requestedAfter: string;
}): Promise<TraderaEmailVerificationCodeResolution | null> => {
  const requestedAfterMs = Date.parse(requestedAfter);
  const thresholdMs = Number.isFinite(requestedAfterMs)
    ? Math.max(0, requestedAfterMs - 60_000)
    : Date.now() - 5 * 60_000;
  const candidates = (await listCandidateMessages(accountId))
    .filter((message) => readMessageTimestamp(message) >= thresholdMs)
    .filter(isLikelyTraderaCodeMessage)
    .sort((left, right) => readMessageTimestamp(right) - readMessageTimestamp(left));

  for (const message of candidates) {
    const code = extractTraderaVerificationCode(message);
    if (code !== null) {
      return {
        code,
        accountId,
        messageId: message.id,
        receivedAt: message.receivedAt ?? message.sentAt ?? null,
      };
    }
  }

  return null;
};

const enqueueMailboxRefresh = async (accountId: string): Promise<void> => {
  startFilemakerMailSyncQueue();
  await enqueueFilemakerMailSyncJob({
    accountId,
    reason: 'manual',
  });
};

const pollForTraderaEmailVerificationCode = async ({
  accountId,
  emailAddress,
  requestedAfter,
  startedAt,
  timeoutMs,
  pollIntervalMs,
  lastRefreshAt,
}: {
  accountId: string;
  emailAddress: string;
  requestedAfter: string;
  startedAt: number;
  timeoutMs: number;
  pollIntervalMs: number;
  lastRefreshAt: number;
}): Promise<TraderaEmailVerificationCodeResolution | null> => {
  const now = Date.now();
  if (now - startedAt > timeoutMs) {
    return null;
  }

  let nextLastRefreshAt = lastRefreshAt;
  if (now - lastRefreshAt >= pollIntervalMs) {
    nextLastRefreshAt = now;
    await enqueueMailboxRefresh(accountId).catch((error) =>
      logSystemEvent({
        level: 'warn',
        source: LOG_SOURCE,
        message: `Failed to enqueue Filemaker mailbox refresh for Tradera auth email ${emailAddress}.`,
        error,
        context: { accountId },
      }).catch(() => {})
    );
  }

  const code = await readLatestCodeFromMailbox({
    accountId,
    requestedAfter,
  });
  if (code !== null) {
    return code;
  }

  await wait(pollIntervalMs);
  return pollForTraderaEmailVerificationCode({
    accountId,
    emailAddress,
    requestedAfter,
    startedAt,
    timeoutMs,
    pollIntervalMs,
    lastRefreshAt: nextLastRefreshAt,
  });
};

export const resolveTraderaEmailVerificationCode = async ({
  emailAddress,
  requestedAfter,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}: ResolveTraderaEmailVerificationCodeInput): Promise<TraderaEmailVerificationCodeResolution | null> => {
  const account = await resolveMailAccountForEmail(emailAddress);
  if (account === null) {
    await logSystemEvent({
      level: 'warn',
      source: LOG_SOURCE,
      message: `No Filemaker mail account is available for Tradera auth email ${emailAddress}.`,
    }).catch(() => {});
    return null;
  }

  return pollForTraderaEmailVerificationCode({
    accountId: account.id,
    emailAddress,
    requestedAfter,
    startedAt: Date.now(),
    timeoutMs,
    pollIntervalMs,
    lastRefreshAt: 0,
  });
};
