import 'server-only';

import { createRequire } from 'module';
import { configurationError } from '@/shared/errors/app-error';
import type {
  FilemakerMailAccount,
  FilemakerMailThread,
} from '../../types';
import type {
  MailparserParsedMail,
  MailparserSimpleParser,
} from './mail-types';
import {
  buildThreadId,
} from './mail-utils';
import {
  findMailThreadByProviderId,
  findMailThreadBySubjectAndAnchor,
  upsertMailThread,
} from './mail-storage';

export const getMailparserSimpleParser = (): MailparserSimpleParser => {
  const requireFn = createRequire(import.meta.url);
  const moduleRef = requireFn('mailparser') as { simpleParser?: MailparserSimpleParser };
  if (typeof moduleRef.simpleParser !== 'function') {
    throw configurationError('mailparser simpleParser runtime is not available.');
  }
  return moduleRef.simpleParser;
};

export const parseMailSource = async (
  source: string | Buffer | Uint8Array | NodeJS.ReadableStream
): Promise<MailparserParsedMail> => {
  const parser = getMailparserSimpleParser();
  return await parser(source);
};

export const resolveOrCreateThread = async (input: {
  account: FilemakerMailAccount;
  providerThreadId?: string | null;
  normalizedSubject: string;
  anchorAddress: string;
  lastMessageAt: string;
  snippet?: string | null;
}): Promise<FilemakerMailThread> => {
  let thread: FilemakerMailThread | null = null;

  if (input.providerThreadId) {
    thread = await findMailThreadByProviderId(input.account.id, input.providerThreadId);
  }

  if (!thread) {
    thread = await findMailThreadBySubjectAndAnchor(
      input.account.id,
      input.normalizedSubject,
      input.anchorAddress
    );
  }

  if (thread) {
    const threadLastAt = Date.parse(thread.lastMessageAt);
    const incomingLastAt = Date.parse(input.lastMessageAt);
    if (!Number.isNaN(incomingLastAt) && (Number.isNaN(threadLastAt) || incomingLastAt > threadLastAt)) {
      const updatedThread: FilemakerMailThread = {
        ...thread,
        lastMessageAt: input.lastMessageAt,
        snippet: input.snippet ?? thread.snippet,
        updatedAt: new Date().toISOString(),
      };
      await upsertMailThread(updatedThread);
      return updatedThread;
    }
    return thread;
  }

  const newThread: FilemakerMailThread = {
    id: buildThreadId({
      accountId: input.account.id,
      providerThreadId: input.providerThreadId ?? null,
      normalizedSubject: input.normalizedSubject,
      anchorAddress: input.anchorAddress,
    }),
    accountId: input.account.id,
    mailboxPath: 'Inbox',
    mailboxRole: 'inbox',
    providerThreadId: input.providerThreadId ?? null,
    subject: input.normalizedSubject,
    normalizedSubject: input.normalizedSubject,
    lastMessageAt: input.lastMessageAt,
    snippet: input.snippet ?? null,
    participantSummary: [],
    relatedPersonIds: [],
    relatedOrganizationIds: [],
    unreadCount: 0,
    messageCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await upsertMailThread(newThread);
  return newThread;
};
