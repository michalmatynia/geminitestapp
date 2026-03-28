import 'server-only';

import { createHash, randomUUID } from 'crypto';
import { createRequire } from 'module';
import { sanitizeHtml } from '@/shared/utils';
import { configurationError } from '@/shared/errors/app-error';
import {
  buildFilemakerMailSnippet,
  normalizeFilemakerMailSubject,
} from '../../mail-utils';
import type {
  FilemakerMailAccount,
  FilemakerMailMessage,
  FilemakerMailParticipant,
  FilemakerMailThread,
} from '../../types';
import type {
  MailparserParsedMail,
  MailparserSimpleParser,
} from './mail-types';
import {
  buildThreadId,
  normalizeEmailAddress,
  parseMailParserAddressList,
  pickAnchorAddress,
  resolveDirection,
} from './mail-utils';
import {
  findMailThreadByProviderId,
  findMailThreadBySubjectAndAnchor,
  upsertMailMessage,
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
    id: buildThreadId(input),
    accountId: input.account.id,
    providerThreadId: input.providerThreadId ?? null,
    subject: input.normalizedSubject,
    normalizedSubject: input.normalizedSubject,
    anchorAddress: input.anchorAddress,
    lastMessageAt: input.lastMessageAt,
    snippet: input.snippet ?? null,
    isArchived: false,
    isFlagged: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await upsertMailThread(newThread);
  return newThread;
};
