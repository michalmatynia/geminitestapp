import 'server-only';

import { randomUUID } from 'crypto';

import bcrypt from 'bcryptjs';


import {
  type KangurLearnerCreateInput,
  type KangurLearnerProfile,
  kangurLearnerProfilesSchema,
  type KangurLearnerStatus,
  type KangurLearnerUpdateInput,
} from '@/features/kangur/shared/contracts/kangur';
import {
  createDefaultKangurAiTutorLearnerMood,
  type KangurAiTutorLearnerMood,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor-mood';
import { conflictError, notFoundError } from '@/features/kangur/shared/errors/app-error';
import { readStoredSettingValue, upsertStoredSettingValue } from '@/shared/lib/ai-brain/server';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { parseJsonSetting, serializeSetting } from '@/features/kangur/shared/utils/settings-json';

import type { Filter } from 'mongodb';

const KANGUR_LEARNERS_SETTINGS_KEY = 'kangur_learners.v1';
const KANGUR_LEARNERS_COLLECTION = 'kangur_learners';
const DEFAULT_DUEL_SEARCH_CONTAINS_CAP = 3;
const MAX_DUEL_SEARCH_CONTAINS_CAP = 20;

type StoredKangurLearnerProfile = KangurLearnerProfile & {
  passwordHash: string;
};

type MongoKangurLearnerDocument = {
  _id: string;
  id?: string;
  ownerUserId: string;
  displayName: string;
  age?: number | null;
  loginName: string;
  status: KangurLearnerStatus;
  legacyUserKey: string | null;
  aiTutor?: KangurAiTutorLearnerMood;
  createdAt: string;
  updatedAt: string;
  passwordHash: string;
};

const normalizeLoginName = (value: string): string => value.trim().toLowerCase();
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const resolveDuelSearchContainsCap = (): number => {
  const raw = process.env['KANGUR_DUEL_SEARCH_CONTAINS_CAP'];
  if (!raw) {
    return DEFAULT_DUEL_SEARCH_CONTAINS_CAP;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_DUEL_SEARCH_CONTAINS_CAP;
  }
  return Math.max(0, Math.min(MAX_DUEL_SEARCH_CONTAINS_CAP, parsed));
};
const DUEL_SEARCH_CONTAINS_CAP = resolveDuelSearchContainsCap();

const normalizeLegacyUserKey = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
};

const toPublicLearnerProfile = (stored: StoredKangurLearnerProfile): KangurLearnerProfile => {
  const baseProfile: KangurLearnerProfile = {
    id: stored.id,
    ownerUserId: stored.ownerUserId,
    displayName: stored.displayName,
    loginName: stored.loginName,
    status: stored.status,
    legacyUserKey: stored.legacyUserKey ?? null,
    aiTutor: stored.aiTutor,
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt,
  };

  if (stored.age === undefined) {
    return baseProfile;
  }

  return {
    ...baseProfile,
    age: stored.age,
  };
};

const toStoredLearnerFromMongo = (
  doc: MongoKangurLearnerDocument
): StoredKangurLearnerProfile => ({
  id: doc.id ?? doc._id,
  ownerUserId: doc.ownerUserId,
  displayName: doc.displayName,
  ...(doc.age !== undefined ? { age: doc.age } : {}),
  loginName: normalizeLoginName(doc.loginName),
  status: doc.status,
  legacyUserKey: normalizeLegacyUserKey(doc.legacyUserKey),
  aiTutor: doc.aiTutor ?? createDefaultKangurAiTutorLearnerMood(),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  passwordHash: doc.passwordHash,
});

const sortPublicLearners = (profiles: KangurLearnerProfile[]): KangurLearnerProfile[] =>
  [...profiles].sort((left, right) => left.displayName.localeCompare(right.displayName, 'pl'));

const normalizeStoredLearner = (value: unknown): StoredKangurLearnerProfile | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const rawAge = record['age'];
  const normalizedAge =
    typeof rawAge === 'number'
      ? rawAge
      : typeof rawAge === 'string' && rawAge.trim().length > 0 && !Number.isNaN(Number(rawAge))
        ? Number(rawAge)
        : undefined;
  const publicProfiles = kangurLearnerProfilesSchema.safeParse([
    {
      id:
        typeof record['_id'] === 'string'
          ? record['_id']
          : typeof record['id'] === 'string'
            ? record['id']
            : '',
      ownerUserId: typeof record['ownerUserId'] === 'string' ? record['ownerUserId'] : '',
      displayName: typeof record['displayName'] === 'string' ? record['displayName'] : '',
      ...(normalizedAge !== undefined ? { age: normalizedAge } : {}),
      loginName:
        typeof record['loginName'] === 'string' ? normalizeLoginName(record['loginName']) : '',
      status: record['status'] === 'disabled' ? 'disabled' : 'active',
      legacyUserKey: normalizeLegacyUserKey(
        typeof record['legacyUserKey'] === 'string' ? record['legacyUserKey'] : null
      ),
      aiTutor: record['aiTutor'],
      createdAt: typeof record['createdAt'] === 'string' ? record['createdAt'] : '',
      updatedAt: typeof record['updatedAt'] === 'string' ? record['updatedAt'] : '',
    },
  ]);

  if (!publicProfiles.success) {
    return null;
  }

  const passwordHash = typeof record['passwordHash'] === 'string' ? record['passwordHash'] : '';
  if (passwordHash.trim().length === 0) {
    return null;
  }

  return {
    ...publicProfiles.data[0]!,
    passwordHash,
  } satisfies StoredKangurLearnerProfile;
};

const parseLegacyStoredLearners = (raw: string | null): StoredKangurLearnerProfile[] => {
  const parsed = parseJsonSetting<unknown[]>(raw, []);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((entry) => normalizeStoredLearner(entry))
    .filter((profile): profile is StoredKangurLearnerProfile => profile !== null);
};

const readLegacyStoredLearners = async (): Promise<StoredKangurLearnerProfile[]> =>
  parseLegacyStoredLearners(await readStoredSettingValue(KANGUR_LEARNERS_SETTINGS_KEY));

const writeLegacyStoredLearners = async (profiles: StoredKangurLearnerProfile[]): Promise<void> => {
  const ok = await upsertStoredSettingValue(
    KANGUR_LEARNERS_SETTINGS_KEY,
    serializeSetting(profiles)
  );
  if (!ok) {
    throw new Error('Failed to persist Kangur learners.');
  }
};

const ensureUniqueLegacyLoginName = (
  profiles: StoredKangurLearnerProfile[],
  loginName: string,
  currentLearnerId?: string
): void => {
  const normalized = normalizeLoginName(loginName);
  const duplicate = profiles.find(
    (profile) => profile.loginName === normalized && profile.id !== currentLearnerId
  );
  if (duplicate) {
    throw conflictError('This learner login name is already in use.', {
      loginName: normalized,
    });
  }
};

const shouldUseMongoLearnerCollection = async (): Promise<boolean> => {
  if (!process.env['MONGODB_URI']) {
    return false;
  }

  return (await getAppDbProvider()) === 'mongodb';
};

const getMongoLearnerCollection = async () =>
  (await getMongoDb()).collection<MongoKangurLearnerDocument>(KANGUR_LEARNERS_COLLECTION);

const toMongoLearnerUpdate = (
  profile: StoredKangurLearnerProfile
): Omit<MongoKangurLearnerDocument, '_id'> => ({
  ownerUserId: profile.ownerUserId,
  displayName: profile.displayName,
  ...(profile.age !== undefined ? { age: profile.age } : {}),
  loginName: profile.loginName,
  status: profile.status,
  legacyUserKey: profile.legacyUserKey ?? null,
  aiTutor: profile.aiTutor,
  createdAt: profile.createdAt,
  updatedAt: profile.updatedAt,
  passwordHash: profile.passwordHash,
});

const mergeStoredLearners = (
  primary: StoredKangurLearnerProfile[],
  fallback: StoredKangurLearnerProfile[]
): StoredKangurLearnerProfile[] => {
  const merged = new Map<string, StoredKangurLearnerProfile>();
  fallback.forEach((profile) => {
    merged.set(profile.id, profile);
  });
  primary.forEach((profile) => {
    merged.set(profile.id, profile);
  });
  return [...merged.values()];
};

const upsertMongoStoredLearners = async (profiles: StoredKangurLearnerProfile[]): Promise<void> => {
  if (profiles.length === 0) {
    return;
  }

  const collection = await getMongoLearnerCollection();
  await collection.bulkWrite(
    profiles.map((profile) => ({
      updateOne: {
        filter: { _id: profile.id },
        update: {
          $set: toMongoLearnerUpdate(profile),
          $setOnInsert: {
            _id: profile.id,
          },
        },
        upsert: true,
      },
    }))
  );
};

const readMongoStoredLearnersByOwner = async (
  ownerUserId: string
): Promise<StoredKangurLearnerProfile[]> => {
  const collection = await getMongoLearnerCollection();
  const rows = await collection.find({ ownerUserId }).toArray();
  return rows
    .map((row) => normalizeStoredLearner(row))
    .filter((profile): profile is StoredKangurLearnerProfile => profile !== null);
};

const readMongoStoredLearnerById = async (
  learnerId: string
): Promise<StoredKangurLearnerProfile | null> => {
  const collection = await getMongoLearnerCollection();
  const row = await collection.findOne({
    $or: [{ _id: learnerId }, { id: learnerId }],
  } as Filter<MongoKangurLearnerDocument>);
  return normalizeStoredLearner(row);
};

const readMongoStoredLearnerByLoginName = async (
  loginName: string
): Promise<StoredKangurLearnerProfile | null> => {
  const collection = await getMongoLearnerCollection();
  const row = await collection.findOne({
    loginName: normalizeLoginName(loginName),
  });
  return normalizeStoredLearner(row);
};

const writeMongoStoredLearner = async (profile: StoredKangurLearnerProfile): Promise<void> => {
  const collection = await getMongoLearnerCollection();
  await collection.updateOne(
    {
      _id: profile.id,
    },
    {
      $set: toMongoLearnerUpdate(profile),
      $setOnInsert: {
        _id: profile.id,
      },
    },
    {
      upsert: true,
    }
  );
};

const ensureUniqueMongoLoginName = async (
  loginName: string,
  currentLearnerId?: string
): Promise<void> => {
  const normalized = normalizeLoginName(loginName);
  const collection = await getMongoLearnerCollection();
  const duplicate = await collection.findOne({
    loginName: normalized,
    ...(currentLearnerId ? { _id: { $ne: currentLearnerId } } : {}),
  } as Filter<MongoKangurLearnerDocument>);

  if (duplicate) {
    throw conflictError('This learner login name is already in use.', {
      loginName: normalized,
    });
  }

  const legacyProfiles = await readLegacyStoredLearners();
  const legacyDuplicate = legacyProfiles.find(
    (profile) => profile.loginName === normalized && profile.id !== currentLearnerId
  );
  if (legacyDuplicate) {
    throw conflictError('This learner login name is already in use.', {
      loginName: normalized,
    });
  }
};

const readAllKnownLearners = async (): Promise<StoredKangurLearnerProfile[]> => {
  if (!(await shouldUseMongoLearnerCollection())) {
    return readLegacyStoredLearners();
  }

  const [mongoProfiles, legacyProfiles] = await Promise.all([
    getMongoLearnerCollection()
      .then((collection) => collection.find({}).toArray())
      .then((rows) =>
        rows
          .map((row) => normalizeStoredLearner(row))
          .filter((profile): profile is StoredKangurLearnerProfile => profile !== null)
      ),
    readLegacyStoredLearners(),
  ]);

  return mergeStoredLearners(mongoProfiles, legacyProfiles);
};

export const listKangurLearnersByOwner = async (
  ownerUserId: string
): Promise<KangurLearnerProfile[]> => {
  if (!(await shouldUseMongoLearnerCollection())) {
    return sortPublicLearners(
      (await readLegacyStoredLearners())
        .filter((profile) => profile.ownerUserId === ownerUserId)
        .map(toPublicLearnerProfile)
    );
  }

  const [mongoProfiles, legacyProfiles] = await Promise.all([
    readMongoStoredLearnersByOwner(ownerUserId),
    readLegacyStoredLearners(),
  ]);
  const legacyOwnedProfiles = legacyProfiles.filter(
    (profile) => profile.ownerUserId === ownerUserId
  );
  const missingLegacyProfiles = legacyOwnedProfiles.filter(
    (legacyProfile) => !mongoProfiles.some((mongoProfile) => mongoProfile.id === legacyProfile.id)
  );

  if (missingLegacyProfiles.length > 0) {
    await upsertMongoStoredLearners(missingLegacyProfiles);
  }

  return sortPublicLearners(
    mergeStoredLearners(mongoProfiles, legacyOwnedProfiles).map(toPublicLearnerProfile)
  );
};

export const searchKangurLearners = async (
  query: string,
  options?: { limit?: number; excludeLearnerId?: string }
): Promise<KangurLearnerProfile[]> => {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const limit =
    typeof options?.limit === 'number' && Number.isFinite(options.limit)
      ? Math.max(1, Math.min(20, Math.floor(options.limit)))
      : 8;
  const excludeLearnerId = options?.excludeLearnerId ?? null;
  const normalizedLogin = normalizeLoginName(trimmed);
  const normalizedDisplay = trimmed.toLowerCase();
  const maxContainsMatches = DUEL_SEARCH_CONTAINS_CAP;
  const rankMatch = (profile: KangurLearnerProfile): number => {
    const loginName = normalizeLoginName(profile.loginName);
    const displayName = profile.displayName.toLowerCase();
    if (loginName === normalizedLogin) return 0;
    if (loginName.startsWith(normalizedLogin)) return 1;
    if (displayName.startsWith(normalizedDisplay)) return 2;
    if (loginName.includes(normalizedLogin)) return 3;
    if (displayName.includes(normalizedDisplay)) return 4;
    return 5;
  };
  const applyContainsCap = (profiles: KangurLearnerProfile[]): KangurLearnerProfile[] => {
    const capped: KangurLearnerProfile[] = [];
    let containsCount = 0;
    for (const profile of profiles) {
      const rank = rankMatch(profile);
      const isContains = rank === 3 || rank === 4;
      if (isContains) {
        if (containsCount >= maxContainsMatches) {
          continue;
        }
        containsCount += 1;
      }
      capped.push(profile);
      if (capped.length >= limit) {
        break;
      }
    }
    return capped;
  };
  const matchesQuery = (profile: KangurLearnerProfile): boolean => {
    if (excludeLearnerId && profile.id === excludeLearnerId) {
      return false;
    }
    if (profile.status !== 'active') {
      return false;
    }
    const loginMatch =
      profile.loginName.startsWith(normalizedLogin) ||
      profile.loginName.includes(normalizedLogin);
    const displayName = profile.displayName.toLowerCase();
    const displayMatch =
      displayName.startsWith(normalizedDisplay) || displayName.includes(normalizedDisplay);
    return loginMatch || displayMatch;
  };

  const sortMatches = (profiles: KangurLearnerProfile[]): KangurLearnerProfile[] =>
    [...profiles].sort((left, right) => {
      const rankDiff = rankMatch(left) - rankMatch(right);
      if (rankDiff !== 0) {
        return rankDiff;
      }
      return left.displayName.localeCompare(right.displayName, 'pl');
    });

  if (!(await shouldUseMongoLearnerCollection())) {
    const profiles = (await readLegacyStoredLearners())
      .map(toPublicLearnerProfile)
      .filter(matchesQuery);
    return applyContainsCap(sortMatches(profiles));
  }

  const collection = await getMongoLearnerCollection();
  const loginRegex = new RegExp(`${escapeRegex(normalizedLogin)}`, 'i');
  const displayRegex = new RegExp(`${escapeRegex(trimmed)}`, 'i');
  const rows = await collection
    .find({
      status: 'active',
      $or: [{ loginName: loginRegex }, { displayName: displayRegex }],
    })
    .limit(limit * 6)
    .toArray();

  const byId = new Map<string, KangurLearnerProfile>();
  rows
    .map(toStoredLearnerFromMongo)
    .map(toPublicLearnerProfile)
    .filter(matchesQuery)
    .forEach((profile) => {
      if (!byId.has(profile.id)) {
        byId.set(profile.id, profile);
      }
    });

  return applyContainsCap(sortMatches([...byId.values()]));
};

export const getKangurLearnerById = async (
  learnerId: string
): Promise<KangurLearnerProfile | null> => {
  const match = await getKangurStoredLearnerById(learnerId);
  return match ? toPublicLearnerProfile(match) : null;
};

export const getKangurStoredLearnerById = async (
  learnerId: string
): Promise<StoredKangurLearnerProfile | null> => {
  if (!(await shouldUseMongoLearnerCollection())) {
    return (await readLegacyStoredLearners()).find((profile) => profile.id === learnerId) ?? null;
  }

  const mongoProfile = await readMongoStoredLearnerById(learnerId);
  if (mongoProfile) {
    return mongoProfile;
  }

  const legacyProfiles = await readLegacyStoredLearners();
  const legacyProfile = legacyProfiles.find((profile) => profile.id === learnerId) ?? null;
  if (legacyProfile) {
    await writeMongoStoredLearner(legacyProfile);
  }
  return legacyProfile;
};

export const getKangurStoredLearnerByLoginName = async (
  loginName: string
): Promise<StoredKangurLearnerProfile | null> => {
  const normalized = normalizeLoginName(loginName);

  if (!(await shouldUseMongoLearnerCollection())) {
    return (
      (await readLegacyStoredLearners()).find((profile) => profile.loginName === normalized) ?? null
    );
  }

  const mongoProfile = await readMongoStoredLearnerByLoginName(normalized);
  if (mongoProfile) {
    return mongoProfile;
  }

  const legacyProfiles = await readLegacyStoredLearners();
  const legacyProfile = legacyProfiles.find((profile) => profile.loginName === normalized) ?? null;
  if (legacyProfile) {
    await writeMongoStoredLearner(legacyProfile);
  }
  return legacyProfile;
};

export const createKangurLearner = async (input: {
  ownerUserId: string;
  learner: KangurLearnerCreateInput;
  legacyUserKey?: string | null;
  status?: KangurLearnerStatus;
}): Promise<KangurLearnerProfile> => {
  const loginName = normalizeLoginName(input.learner.loginName);
  const useMongoLearnerCollection = await shouldUseMongoLearnerCollection();

  if (useMongoLearnerCollection) {
    await ensureUniqueMongoLoginName(loginName);
  } else {
    const profiles = await readLegacyStoredLearners();
    ensureUniqueLegacyLoginName(profiles, loginName);
  }

  const now = new Date().toISOString();
  const nextProfile: StoredKangurLearnerProfile = {
    id: randomUUID(),
    ownerUserId: input.ownerUserId,
    displayName: input.learner.displayName.trim(),
    ...(input.learner.age !== undefined ? { age: input.learner.age } : {}),
    loginName,
    status: input.status ?? 'active',
    legacyUserKey: normalizeLegacyUserKey(input.legacyUserKey),
    aiTutor: createDefaultKangurAiTutorLearnerMood(),
    createdAt: now,
    updatedAt: now,
    passwordHash: await bcrypt.hash(input.learner.password, 12),
  };

  if (useMongoLearnerCollection) {
    await writeMongoStoredLearner(nextProfile);
  } else {
    const profiles = await readLegacyStoredLearners();
    await writeLegacyStoredLearners([...profiles, nextProfile]);
  }

  return toPublicLearnerProfile(nextProfile);
};

export const updateKangurLearner = async (
  learnerId: string,
  input: KangurLearnerUpdateInput
): Promise<KangurLearnerProfile> => {
  const current = await getKangurStoredLearnerById(learnerId);
  if (!current) {
    throw notFoundError('Learner not found.');
  }

  const useMongoLearnerCollection = await shouldUseMongoLearnerCollection();
  const nextLoginName =
    typeof input.loginName === 'string' ? normalizeLoginName(input.loginName) : current.loginName;

  if (useMongoLearnerCollection) {
    await ensureUniqueMongoLoginName(nextLoginName, learnerId);
  } else {
    const profiles = await readLegacyStoredLearners();
    ensureUniqueLegacyLoginName(profiles, nextLoginName, learnerId);
  }

  const nextProfile: StoredKangurLearnerProfile = {
    ...current,
    displayName:
      typeof input.displayName === 'string' ? input.displayName.trim() : current.displayName,
    ...(typeof input.age === 'number' ? { age: input.age } : {}),
    loginName: nextLoginName,
    status: input.status ?? current.status,
    updatedAt: new Date().toISOString(),
    passwordHash:
      typeof input.password === 'string'
        ? await bcrypt.hash(input.password, 12)
        : current.passwordHash,
  };

  if (useMongoLearnerCollection) {
    await writeMongoStoredLearner(nextProfile);
  } else {
    const profiles = await readLegacyStoredLearners();
    const index = profiles.findIndex((profile) => profile.id === learnerId);
    if (index < 0) {
      throw notFoundError('Learner not found.');
    }
    const nextProfiles = [...profiles];
    nextProfiles[index] = nextProfile;
    await writeLegacyStoredLearners(nextProfiles);
  }

  return toPublicLearnerProfile(nextProfile);
};

export const deleteKangurLearner = async (
  learnerId: string
): Promise<KangurLearnerProfile> => {
  const current = await getKangurStoredLearnerById(learnerId);
  if (!current) {
    throw notFoundError('Learner not found.');
  }

  if (await shouldUseMongoLearnerCollection()) {
    const collection = await getMongoLearnerCollection();
    await collection.deleteMany({
      $or: [{ _id: learnerId }, { id: learnerId }],
    } as Filter<MongoKangurLearnerDocument>);
  }

  const profiles = await readLegacyStoredLearners();
  const nextProfiles = profiles.filter((profile) => profile.id !== learnerId);
  if (nextProfiles.length !== profiles.length) {
    await writeLegacyStoredLearners(nextProfiles);
  }

  return toPublicLearnerProfile(current);
};

export const setKangurLearnerLegacyUserKey = async (
  learnerId: string,
  legacyUserKey: string | null
): Promise<KangurLearnerProfile> => {
  const current = await getKangurStoredLearnerById(learnerId);
  if (!current) {
    throw notFoundError('Learner not found.');
  }

  const normalizedLegacyUserKey = normalizeLegacyUserKey(legacyUserKey);
  if (current.legacyUserKey === normalizedLegacyUserKey) {
    return toPublicLearnerProfile(current);
  }

  const nextProfile: StoredKangurLearnerProfile = {
    ...current,
    legacyUserKey: normalizedLegacyUserKey,
    updatedAt: new Date().toISOString(),
  };

  if (await shouldUseMongoLearnerCollection()) {
    await writeMongoStoredLearner(nextProfile);
  } else {
    const profiles = await readLegacyStoredLearners();
    const index = profiles.findIndex((profile) => profile.id === learnerId);
    if (index < 0) {
      throw notFoundError('Learner not found.');
    }
    const nextProfiles = [...profiles];
    nextProfiles[index] = nextProfile;
    await writeLegacyStoredLearners(nextProfiles);
  }

  return toPublicLearnerProfile(nextProfile);
};

export const setKangurLearnerAiTutorState = async (
  learnerId: string,
  aiTutor: KangurAiTutorLearnerMood
): Promise<KangurLearnerProfile> => {
  const current = await getKangurStoredLearnerById(learnerId);
  if (!current) {
    throw notFoundError('Learner not found.');
  }

  const nextProfile: StoredKangurLearnerProfile = {
    ...current,
    aiTutor,
    updatedAt: new Date().toISOString(),
  };

  if (await shouldUseMongoLearnerCollection()) {
    await writeMongoStoredLearner(nextProfile);
  } else {
    const profiles = await readLegacyStoredLearners();
    const index = profiles.findIndex((profile) => profile.id === learnerId);
    if (index < 0) {
      throw notFoundError('Learner not found.');
    }
    const nextProfiles = [...profiles];
    nextProfiles[index] = nextProfile;
    await writeLegacyStoredLearners(nextProfiles);
  }

  return toPublicLearnerProfile(nextProfile);
};

export const verifyKangurLearnerPassword = async (
  loginName: string,
  password: string
): Promise<KangurLearnerProfile | null> => {
  const profile = await getKangurStoredLearnerByLoginName(loginName);
  if (!profile || profile.status !== 'active') {
    return null;
  }

  const ok = await bcrypt.compare(password, profile.passwordHash);
  if (!ok) {
    return null;
  }

  return toPublicLearnerProfile(profile);
};

export const ensureDefaultKangurLearnerForOwner = async (input: {
  ownerUserId: string;
  displayName: string;
  preferredLoginName: string;
  legacyUserKey?: string | null;
}): Promise<KangurLearnerProfile> => {
  const existing = await listKangurLearnersByOwner(input.ownerUserId);
  if (existing.length > 0) {
    return existing[0]!;
  }

  const baseLoginName =
    normalizeLoginName(input.preferredLoginName) || `kangur-${randomUUID().slice(0, 8)}`;
  const profiles = await readAllKnownLearners();
  let candidate = baseLoginName;
  let suffix = 1;
  while (profiles.some((profile) => profile.loginName === candidate)) {
    suffix += 1;
    candidate = `${baseLoginName}-${suffix}`;
  }

  return createKangurLearner({
    ownerUserId: input.ownerUserId,
    learner: {
      displayName: input.displayName.trim() || 'Uczen',
      loginName: candidate,
      password: randomUUID(),
    },
    legacyUserKey: input.legacyUserKey,
  });
};

export const normalizeKangurLearnerLoginName = normalizeLoginName;
