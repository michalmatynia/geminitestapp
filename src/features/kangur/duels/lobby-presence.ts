import 'server-only';

import type { KangurLearnerProfile } from '@/features/kangur/shared/contracts/kangur';
import {
  KANGUR_DUELS_LOBBY_PRESENCE_DEFAULT_LIMIT,
  KANGUR_DUELS_LOBBY_PRESENCE_MAX_LIMIT,
  type KangurDuelLobbyPresenceEntry,
  type KangurDuelLobbyPresenceResponse,
} from '@/shared/contracts/kangur-duels';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { Collection } from 'mongodb';

type MongoLobbyPresence = {
  _id: string;
  learnerId: string;
  displayName: string;
  lastSeenAt: Date;
  expiresAt: Date;
};

const LOBBY_PRESENCE_COLLECTION = 'kangur_duels_lobby_presence';
const LOBBY_PRESENCE_TTL_MS = 90_000;

let lobbyPresenceIndexes: Promise<void> | null = null;

const ensureLobbyPresenceIndexes = async (): Promise<void> => {
  if (lobbyPresenceIndexes) {
    return lobbyPresenceIndexes;
  }

  lobbyPresenceIndexes = (async (): Promise<void> => {
    const db = await getMongoDb();
    const collection = db.collection<MongoLobbyPresence>(LOBBY_PRESENCE_COLLECTION);
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await collection.createIndex({ lastSeenAt: -1 });
    await collection.createIndex({ displayName: 1 });
  })();

  return lobbyPresenceIndexes;
};

const resolveLearnerDisplayName = (learner: KangurLearnerProfile): string =>
  learner.displayName?.trim() || learner.loginName?.trim() || 'Uczen';

const normalizeLimit = (value?: number): number => {
  if (!Number.isFinite(value)) {
    return KANGUR_DUELS_LOBBY_PRESENCE_DEFAULT_LIMIT;
  }
  const limit = Math.floor(value ?? KANGUR_DUELS_LOBBY_PRESENCE_DEFAULT_LIMIT);
  return Math.max(1, Math.min(KANGUR_DUELS_LOBBY_PRESENCE_MAX_LIMIT, limit));
};

const toPublicPresence = (doc: MongoLobbyPresence): KangurDuelLobbyPresenceEntry => ({
  learnerId: doc.learnerId,
  displayName: doc.displayName,
  lastSeenAt: doc.lastSeenAt.toISOString(),
});

const getCollection = async (): Promise<Collection<MongoLobbyPresence>> => {
  const db = await getMongoDb();
  return db.collection<MongoLobbyPresence>(LOBBY_PRESENCE_COLLECTION);
};

export const listKangurDuelLobbyPresence = async (options?: {
  limit?: number;
  now?: Date;
}): Promise<KangurDuelLobbyPresenceResponse> => {
  await ensureLobbyPresenceIndexes();
  const collection = await getCollection();
  const now = options?.now ?? new Date();
  const limit = normalizeLimit(options?.limit);

  const docs = await collection
    .find({ expiresAt: { $gte: now } })
    .sort({ lastSeenAt: -1 })
    .limit(limit)
    .toArray();

  return {
    entries: docs.map(toPublicPresence),
    serverTime: now.toISOString(),
  };
};

export const recordKangurDuelLobbyPresence = async (
  learner: KangurLearnerProfile,
  options?: { limit?: number }
): Promise<KangurDuelLobbyPresenceResponse> => {
  await ensureLobbyPresenceIndexes();
  const collection = await getCollection();
  const now = new Date();

  const doc: MongoLobbyPresence = {
    _id: learner.id,
    learnerId: learner.id,
    displayName: resolveLearnerDisplayName(learner),
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + LOBBY_PRESENCE_TTL_MS),
  };

  await collection.updateOne({ _id: learner.id }, { $set: doc }, { upsert: true });

  return listKangurDuelLobbyPresence({ limit: options?.limit, now });
};
