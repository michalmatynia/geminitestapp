import 'server-only';

import { randomUUID } from 'crypto';

import bcrypt from 'bcryptjs';

import {
  type KangurLearnerCreateInput,
  type KangurLearnerProfile,
  kangurLearnerProfilesSchema,
  type KangurLearnerStatus,
  type KangurLearnerUpdateInput,
} from '@/shared/contracts/kangur';
import { conflictError, notFoundError } from '@/shared/errors/app-error';
import { readStoredSettingValue, upsertStoredSettingValue } from '@/shared/lib/ai-brain/server';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

const KANGUR_LEARNERS_SETTINGS_KEY = 'kangur_learners.v1';

type StoredKangurLearnerProfile = KangurLearnerProfile & {
  passwordHash: string;
};

const normalizeLoginName = (value: string): string => value.trim().toLowerCase();

const normalizeLegacyUserKey = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
};

const toPublicLearnerProfile = (
  stored: StoredKangurLearnerProfile
): KangurLearnerProfile => ({
  id: stored.id,
  ownerUserId: stored.ownerUserId,
  displayName: stored.displayName,
  loginName: stored.loginName,
  status: stored.status,
  legacyUserKey: stored.legacyUserKey ?? null,
  createdAt: stored.createdAt,
  updatedAt: stored.updatedAt,
});

const parseStoredLearners = (raw: string | null): StoredKangurLearnerProfile[] => {
  const parsed = parseJsonSetting<unknown[]>(raw, []);
  if (!Array.isArray(parsed)) {
    return [];
  }

  const publicProfiles = kangurLearnerProfilesSchema.safeParse(
    parsed.map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return null;
      }
      const record = entry as Record<string, unknown>;
      return {
        id: typeof record['id'] === 'string' ? record['id'] : '',
        ownerUserId: typeof record['ownerUserId'] === 'string' ? record['ownerUserId'] : '',
        displayName: typeof record['displayName'] === 'string' ? record['displayName'] : '',
        loginName:
          typeof record['loginName'] === 'string'
            ? normalizeLoginName(record['loginName'])
            : '',
        status: record['status'] === 'disabled' ? 'disabled' : 'active',
        legacyUserKey: normalizeLegacyUserKey(
          typeof record['legacyUserKey'] === 'string' ? record['legacyUserKey'] : null
        ),
        createdAt: typeof record['createdAt'] === 'string' ? record['createdAt'] : '',
        updatedAt: typeof record['updatedAt'] === 'string' ? record['updatedAt'] : '',
      };
    })
  );

  if (!publicProfiles.success) {
    return [];
  }

  return publicProfiles.data
    .map((profile, index) => {
      const source = parsed[index];
      if (!source || typeof source !== 'object' || Array.isArray(source)) {
        return null;
      }
      const record = source as Record<string, unknown>;
      const passwordHash = typeof record['passwordHash'] === 'string' ? record['passwordHash'] : '';
      if (passwordHash.trim().length === 0) {
        return null;
      }
      return {
        ...profile,
        loginName: normalizeLoginName(profile.loginName),
        passwordHash,
      } satisfies StoredKangurLearnerProfile;
    })
    .filter((profile): profile is StoredKangurLearnerProfile => profile !== null);
};

const readStoredLearners = async (): Promise<StoredKangurLearnerProfile[]> =>
  parseStoredLearners(await readStoredSettingValue(KANGUR_LEARNERS_SETTINGS_KEY));

const writeStoredLearners = async (profiles: StoredKangurLearnerProfile[]): Promise<void> => {
  const ok = await upsertStoredSettingValue(KANGUR_LEARNERS_SETTINGS_KEY, serializeSetting(profiles));
  if (!ok) {
    throw new Error('Failed to persist Kangur learners.');
  }
};

const ensureUniqueLoginName = (
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

export const listKangurLearnersByOwner = async (
  ownerUserId: string
): Promise<KangurLearnerProfile[]> => {
  const profiles = await readStoredLearners();
  return profiles
    .filter((profile) => profile.ownerUserId === ownerUserId)
    .map(toPublicLearnerProfile)
    .sort((left, right) => left.displayName.localeCompare(right.displayName, 'pl'));
};

export const getKangurLearnerById = async (learnerId: string): Promise<KangurLearnerProfile | null> => {
  const profiles = await readStoredLearners();
  const match = profiles.find((profile) => profile.id === learnerId);
  return match ? toPublicLearnerProfile(match) : null;
};

export const getKangurStoredLearnerById = async (
  learnerId: string
): Promise<StoredKangurLearnerProfile | null> => {
  const profiles = await readStoredLearners();
  return profiles.find((profile) => profile.id === learnerId) ?? null;
};

export const getKangurStoredLearnerByLoginName = async (
  loginName: string
): Promise<StoredKangurLearnerProfile | null> => {
  const profiles = await readStoredLearners();
  const normalized = normalizeLoginName(loginName);
  return profiles.find((profile) => profile.loginName === normalized) ?? null;
};

export const createKangurLearner = async (input: {
  ownerUserId: string;
  learner: KangurLearnerCreateInput;
  legacyUserKey?: string | null;
  status?: KangurLearnerStatus;
}): Promise<KangurLearnerProfile> => {
  const profiles = await readStoredLearners();
  const loginName = normalizeLoginName(input.learner.loginName);
  ensureUniqueLoginName(profiles, loginName);

  const now = new Date().toISOString();
  const nextProfile: StoredKangurLearnerProfile = {
    id: randomUUID(),
    ownerUserId: input.ownerUserId,
    displayName: input.learner.displayName.trim(),
    loginName,
    status: input.status ?? 'active',
    legacyUserKey: normalizeLegacyUserKey(input.legacyUserKey),
    createdAt: now,
    updatedAt: now,
    passwordHash: await bcrypt.hash(input.learner.password, 12),
  };

  await writeStoredLearners([...profiles, nextProfile]);
  return toPublicLearnerProfile(nextProfile);
};

export const updateKangurLearner = async (
  learnerId: string,
  input: KangurLearnerUpdateInput
): Promise<KangurLearnerProfile> => {
  const profiles = await readStoredLearners();
  const index = profiles.findIndex((profile) => profile.id === learnerId);
  if (index < 0) {
    throw notFoundError('Learner not found.');
  }

  const current = profiles[index]!;
  const nextLoginName =
    typeof input.loginName === 'string' ? normalizeLoginName(input.loginName) : current.loginName;
  ensureUniqueLoginName(profiles, nextLoginName, learnerId);

  const nextProfile: StoredKangurLearnerProfile = {
    ...current,
    displayName:
      typeof input.displayName === 'string' ? input.displayName.trim() : current.displayName,
    loginName: nextLoginName,
    status: input.status ?? current.status,
    updatedAt: new Date().toISOString(),
    passwordHash:
      typeof input.password === 'string'
        ? await bcrypt.hash(input.password, 12)
        : current.passwordHash,
  };

  const nextProfiles = [...profiles];
  nextProfiles[index] = nextProfile;
  await writeStoredLearners(nextProfiles);
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

  const baseLoginName = normalizeLoginName(input.preferredLoginName) || `kangur-${randomUUID().slice(0, 8)}`;
  const profiles = await readStoredLearners();
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
