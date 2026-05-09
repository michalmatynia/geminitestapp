
/**
 * listKangurLearnersByOwner returns all learner profiles owned by a parent
 * user. Uses React cache() so repeated calls within the same request are
 * deduplicated. Transparently merges MongoDB and legacy settings-store
 * profiles, migrating any missing legacy profiles to MongoDB on the fly.
 */
export const listKangurLearnersByOwner = cache(async (
  ownerUserId: string
): Promise<KangurLearnerProfile[]> => {
  // If MongoDB is not configured or enabled, query the legacy settings-store.
  if (!(await shouldUseMongoLearnerCollection())) {
    return sortPublicLearners(
      (await readLegacyStoredLearners())
        .filter((profile) => profile.ownerUserId === ownerUserId)
        .map(toPublicLearnerProfile)
    );
  }

  // Retrieve profiles from both sources and merge them.
  const [mongoProfiles, legacyProfiles] = await Promise.all([
    readMongoStoredLearnersByOwner(ownerUserId),
    readLegacyStoredLearners(),
  ]);
  const legacyOwnedProfiles = legacyProfiles.filter(
    (profile) => profile.ownerUserId === ownerUserId
  );

  // Migrate legacy profiles missing from MongoDB to the new collection.
  const missingLegacyProfiles = legacyOwnedProfiles.filter(
    (legacyProfile) => !mongoProfiles.some((mongoProfile) => mongoProfile.id === legacyProfile.id)
  );

  if (missingLegacyProfiles.length > 0) {
    void ErrorSystem.logInfo(`Migrating ${missingLegacyProfiles.length} legacy Kangur profiles to MongoDB`, {
      service: 'kangur.learner-repository',
      action: 'migration.legacy-to-mongo',
      ownerUserId,
      profileCount: missingLegacyProfiles.length,
      profileIds: missingLegacyProfiles.map(p => p.id),
    });
    await upsertMongoStoredLearners(missingLegacyProfiles);
  }

  return sortPublicLearners(
    mergeStoredLearners(mongoProfiles, legacyOwnedProfiles).map(toPublicLearnerProfile)
  );
});

/**
 * searchKangurLearners searches learner profiles by display name or login
 * name for the duel opponent search feature. Combines exact-prefix matches
 * with contains matches, capped by DUEL_SEARCH_CONTAINS_CAP to limit
 * exposure of the learner list.
 */
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

  // Ranks results to prioritize prefix matches over substring matches,
  // ensuring relevant search results appear first in the learner selection list.
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

  // Enforces a hard cap on the number of "contains" matches returned.
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

/**
 * getKangurLearnerById returns the public (no passwordHash) profile for a
 * learner ID, or null when not found.
 */
export const getKangurLearnerById = async (
  learnerId: string
): Promise<KangurLearnerProfile | null> => {
  const match = await getKangurStoredLearnerById(learnerId);
  return match ? toPublicLearnerProfile(match) : null;
};

/**
 * getKangurStoredLearnerById returns the full stored profile (including
 * passwordHash) for internal use (e.g. auth). Migrates legacy profiles to
 * MongoDB on first access.
 */
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

  // Fallback for legacy data access and implicit migration.
  const legacyProfiles = await readLegacyStoredLearners();
  const legacyProfile = legacyProfiles.find((profile) => profile.id === learnerId) ?? null;
  if (legacyProfile) {
    await writeMongoStoredLearner(legacyProfile);
  }
  return legacyProfile;
};

/**
 * getKangurStoredLearnerByLoginName looks up a stored profile by normalized
 * login name. Used during learner authentication to retrieve the passwordHash
 * for bcrypt comparison.
 */
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

  // Fallback for legacy lookup and implicit migration to MongoDB.
  const legacyProfiles = await readLegacyStoredLearners();
  const legacyProfile = legacyProfiles.find((profile) => profile.loginName === normalized) ?? null;
  if (legacyProfile) {
    await writeMongoStoredLearner(legacyProfile);
  }
  return legacyProfile;
};

/**
 * createKangurLearner persists a new learner profile. Performs duplicate
 * login name detection across both MongoDB and legacy storage before insertion.
 */
export const createKangurLearner = async (input: {
  ownerUserId: string;
  learner: KangurLearnerCreateInput;
  legacyUserKey?: string | null;
  status?: KangurLearnerStatus;
}): Promise<KangurLearnerProfile> => {
  const loginName = normalizeLoginName(input.learner.loginName);
  const useMongoLearnerCollection = await shouldUseMongoLearnerCollection();

  // Validate duplicate login names across the applicable storage layer(s).
  if (useMongoLearnerCollection) {
    await ensureUniqueMongoLoginName(loginName);
  } else {
    const profiles = await readLegacyStoredLearners();
    ensureUniqueLegacyLoginName(profiles, loginName);
  }

