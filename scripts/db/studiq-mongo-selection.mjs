import { ObjectId } from 'mongodb';

export const settingsFilter = {
  $or: [{ key: /^kangur_/ }, { _id: /^kangur_/ }],
};

export const analyticsFilter = {
  path: /^\/(kangur|[a-z]{2}\/kangur)(\/|$)/,
};

export const parseDbNameFromUri = (uri, fallback) => {
  try {
    const parsed = new URL(uri);
    const dbName = parsed.pathname.replace(/^\//, '').trim();
    return dbName || fallback;
  } catch {
    return fallback;
  }
};

export const buildMongoOptions = (uri) => ({
  ...(uri.startsWith('mongodb+srv://') ? {} : { directConnection: true }),
  serverSelectionTimeoutMS: 3000,
});

export const isFullStudiqCollection = (name) =>
  name.startsWith('kangur_') ||
  name === 'auth_login_challenges' ||
  name === 'auth_security_attempts';

export const uniq = (values) => [
  ...new Set(values.filter((value) => value !== null && value !== undefined)),
];

export const buildIdCandidates = (ids) => {
  const stringIds = uniq(ids.map((id) => String(id)));
  const objectIds = stringIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  return {
    stringIds,
    idValues: [...stringIds, ...objectIds],
  };
};

export const buildRelatedAuthFilters = async (sourceDb, sourceCollectionNames) => {
  if (!sourceCollectionNames.has('kangur_learners')) {
    return {};
  }

  const learners = await sourceDb
    .collection('kangur_learners')
    .find({}, { projection: { ownerUserId: 1, legacyUserKey: 1 } })
    .toArray();
  const ownerUserIds = uniq(learners.map((learner) => learner.ownerUserId));
  const legacyEmails = uniq(learners.map((learner) => learner.legacyUserKey));
  const ownerCandidates = buildIdCandidates(ownerUserIds);

  const usersFilter = {
    $or: [
      { id: { $in: ownerCandidates.stringIds } },
      { _id: { $in: ownerCandidates.idValues } },
      { email: { $in: legacyEmails } },
    ],
  };
  const users = sourceCollectionNames.has('users')
    ? await sourceDb
        .collection('users')
        .find(usersFilter, { projection: { _id: 1, id: 1 } })
        .toArray()
    : [];
  const relatedUserIds = uniq([
    ...ownerUserIds,
    ...users.map((user) => user.id),
    ...users.map((user) => user._id),
  ]);
  const relatedCandidates = buildIdCandidates(relatedUserIds);
  const userLinkedFilter = {
    userId: { $in: relatedCandidates.idValues },
  };

  return {
    users: {
      $or: [
        { id: { $in: relatedCandidates.stringIds } },
        { _id: { $in: relatedCandidates.idValues } },
        { email: { $in: legacyEmails } },
      ],
    },
    accounts: userLinkedFilter,
    sessions: userLinkedFilter,
    auth_security_profiles: userLinkedFilter,
    user_preferences: {
      $or: [
        { userId: { $in: relatedCandidates.stringIds } },
        { _id: { $in: relatedCandidates.idValues } },
      ],
    },
  };
};

export const collectStudiqMongoSelections = async (sourceDb) => {
  const sourceCollections = await sourceDb.listCollections({}, { nameOnly: true }).toArray();
  const sourceCollectionNames = new Set(sourceCollections.map((item) => item.name));
  const selections = [...sourceCollectionNames]
    .filter(isFullStudiqCollection)
    .sort()
    .map((name) => ({ name, filter: {}, scope: 'full-collection' }));
  const relatedAuthFilters = await buildRelatedAuthFilters(sourceDb, sourceCollectionNames);

  for (const [name, filter] of Object.entries(relatedAuthFilters)) {
    if (!sourceCollectionNames.has(name)) continue;
    selections.push({ name, filter, scope: 'related-auth' });
  }

  if (sourceCollectionNames.has('settings')) {
    selections.push({ name: 'settings', filter: settingsFilter, scope: 'studiq-settings' });
  }

  if (sourceCollectionNames.has('analytics_events')) {
    selections.push({
      name: 'analytics_events',
      filter: analyticsFilter,
      scope: 'studiq-analytics',
    });
  }

  return { sourceCollectionNames, selections };
};
