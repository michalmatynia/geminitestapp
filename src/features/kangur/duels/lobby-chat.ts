import 'server-only';

import { randomUUID } from 'crypto';

import type { KangurLearnerProfile } from '@/features/kangur/shared/contracts/kangur';
import {
  KANGUR_DUELS_LOBBY_CHAT_DEFAULT_LIMIT,
  KANGUR_DUELS_LOBBY_CHAT_LOBBY_ID,
  KANGUR_DUELS_LOBBY_CHAT_MAX_LIMIT,
  KANGUR_DUELS_LOBBY_CHAT_RETENTION_HOURS,
  type KangurDuelLobbyChatCreateInput,
  type KangurDuelLobbyChatListResponse,
  type KangurDuelLobbyChatMessage,
  type KangurDuelLobbyChatSendResponse,
} from '@/shared/contracts/kangur-duels-chat';
import { rateLimitedError, validationError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { publishRunEvent } from '@/shared/lib/redis-pubsub';
import { withKangurServerErrorSync } from '@/features/kangur/observability/server-error-reporting';

import type { Collection } from 'mongodb';

type MongoLobbyChatMessage = {
  _id: string;
  lobbyId: string;
  senderId: string;
  senderName: string;
  senderAvatarId?: string | null;
  message: string;
  createdAt: Date;
  expiresAt: Date;
};

const LOBBY_CHAT_COLLECTION = 'kangur_duels_lobby_chat';
const LOBBY_CHAT_CHANNEL = 'kangur:duels:lobby-chat';
const LOBBY_CHAT_RATE_LIMIT_WINDOW_MS = 20_000;
const LOBBY_CHAT_RATE_LIMIT_MAX_MESSAGES = 6;
const LOBBY_CHAT_DUPLICATE_WINDOW_MS = 20_000;

let indexesEnsured: Promise<void> | null = null;

const ensureLobbyChatIndexes = async (): Promise<void> => {
  if (indexesEnsured) {
    return indexesEnsured;
  }

  indexesEnsured = (async (): Promise<void> => {
    const db = await getMongoDb();
    const collection = db.collection<MongoLobbyChatMessage>(LOBBY_CHAT_COLLECTION);
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await collection.createIndex({ createdAt: -1 });
    await collection.createIndex({ lobbyId: 1, createdAt: -1 });
    await collection.createIndex({ lobbyId: 1, senderId: 1, createdAt: -1 });
  })();

  return indexesEnsured;
};

const toIsoString = (value: Date): string => value.toISOString();

const resolveLearnerDisplayName = (learner: KangurLearnerProfile): string =>
  learner.loginName?.trim() || learner.displayName?.trim() || 'Uczen';

const normalizeChatMessage = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, ' ');

const toPublicMessage = (doc: MongoLobbyChatMessage): KangurDuelLobbyChatMessage => ({
  id: doc._id,
  lobbyId: doc.lobbyId,
  senderId: doc.senderId,
  senderName: doc.senderName,
  senderAvatarId: doc.senderAvatarId ?? null,
  message: doc.message,
  createdAt: toIsoString(doc.createdAt),
});

const normalizeLimit = (limit?: number): number => {
  if (!Number.isFinite(limit)) {
    return KANGUR_DUELS_LOBBY_CHAT_DEFAULT_LIMIT;
  }
  const safe = Math.floor(limit ?? KANGUR_DUELS_LOBBY_CHAT_DEFAULT_LIMIT);
  return Math.max(1, Math.min(KANGUR_DUELS_LOBBY_CHAT_MAX_LIMIT, safe));
};

const getCollection = async (): Promise<Collection<MongoLobbyChatMessage>> => {
  const db = await getMongoDb();
  return db.collection<MongoLobbyChatMessage>(LOBBY_CHAT_COLLECTION);
};

export const listKangurDuelLobbyChatMessages = async (options?: {
  limit?: number;
  before?: string | null;
}): Promise<KangurDuelLobbyChatListResponse> => {
  await ensureLobbyChatIndexes();
  const collection = await getCollection();
  const limit = normalizeLimit(options?.limit);
  const before =
    typeof options?.before === 'string' && options.before.trim().length > 0
      ? new Date(options.before)
      : null;
  const hasBefore = before instanceof Date && !Number.isNaN(before.getTime());
  const query: { lobbyId: string; createdAt?: { $lt: Date } } = {
    lobbyId: KANGUR_DUELS_LOBBY_CHAT_LOBBY_ID,
  };
  if (hasBefore && before) {
    query.createdAt = { $lt: before };
  }
  const docs = await collection
    .find(query)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .toArray();

  const hasMore = docs.length > limit;
  const sliced = hasMore ? docs.slice(0, limit) : docs;
  const nextCursor = hasMore
    ? toIsoString(sliced[sliced.length - 1]?.createdAt ?? new Date())
    : null;

  return {
    messages: sliced.reverse().map(toPublicMessage),
    serverTime: new Date().toISOString(),
    nextCursor,
  };
};

export const createKangurDuelLobbyChatMessage = async (
  learner: KangurLearnerProfile,
  input: KangurDuelLobbyChatCreateInput
): Promise<KangurDuelLobbyChatSendResponse> => {
  await ensureLobbyChatIndexes();
  const collection = await getCollection();
  const now = new Date();
  const normalizedMessage = input.message.trim();
  const recentWindowStart = new Date(now.getTime() - LOBBY_CHAT_RATE_LIMIT_WINDOW_MS);
  const recentMessages = await collection
    .find({
      lobbyId: KANGUR_DUELS_LOBBY_CHAT_LOBBY_ID,
      senderId: learner.id,
      createdAt: { $gte: recentWindowStart },
    })
    .sort({ createdAt: -1 })
    .limit(LOBBY_CHAT_RATE_LIMIT_MAX_MESSAGES)
    .toArray();

  if (recentMessages.length >= LOBBY_CHAT_RATE_LIMIT_MAX_MESSAGES) {
    const oldest = recentMessages[recentMessages.length - 1]!;
    const retryAfterMs = Math.max(
      1,
      oldest.createdAt.getTime() + LOBBY_CHAT_RATE_LIMIT_WINDOW_MS - now.getTime()
    );
    throw rateLimitedError(
      'Wysyłasz wiadomości zbyt szybko. Zwolnij i spróbuj ponownie za chwilę.',
      retryAfterMs
    );
  }

  const lastMessage = recentMessages[0];
  if (
    lastMessage &&
    now.getTime() - lastMessage.createdAt.getTime() <= LOBBY_CHAT_DUPLICATE_WINDOW_MS &&
    normalizeChatMessage(lastMessage.message) === normalizeChatMessage(normalizedMessage)
  ) {
    throw validationError('Nie wysyłaj tej samej wiadomości kilka razy.');
  }

  const doc: MongoLobbyChatMessage = {
    _id: randomUUID(),
    lobbyId: KANGUR_DUELS_LOBBY_CHAT_LOBBY_ID,
    senderId: learner.id,
    senderName: resolveLearnerDisplayName(learner),
    senderAvatarId: learner.avatarId ?? null,
    message: normalizedMessage,
    createdAt: now,
    expiresAt: new Date(now.getTime() + KANGUR_DUELS_LOBBY_CHAT_RETENTION_HOURS * 60 * 60_000),
  };

  await collection.insertOne(doc);

  const message = toPublicMessage(doc);
  withKangurServerErrorSync(
    {
      source: 'kangur.duels.lobbyChat',
      action: 'publishMessage',
      description: 'Publish a lobby chat message to the realtime channel.',
      context: {
        lobbyId: KANGUR_DUELS_LOBBY_CHAT_LOBBY_ID,
        messageId: message.id,
      },
    },
    () => {
      publishRunEvent(LOBBY_CHAT_CHANNEL, {
        type: 'message',
        data: message,
        ts: Date.now(),
      });
    },
    { fallback: undefined }
  );

  return {
    message,
    serverTime: toIsoString(now),
  };
};
