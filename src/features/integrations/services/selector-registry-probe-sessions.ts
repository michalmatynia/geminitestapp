import { ObjectId, type Collection, type Document, type WithId } from 'mongodb';

import type {
  SelectorRegistryNamespace,
  SelectorRegistryProbeSession,
  SelectorRegistryProbeSessionCluster,
  SelectorRegistryProbeSessionArchiveResponse,
  SelectorRegistryProbeSessionDeleteResponse,
  SelectorRegistryProbeSessionRestoreResponse,
  SelectorRegistryProbeSessionSaveRequest,
  SelectorRegistryProbeSessionSaveResponse,
} from '@/shared/contracts/integrations/selector-registry';
import { buildSelectorRegistryProbeSessionClusters } from '@/shared/lib/browser-execution/selector-registry-probe-session-clustering';
import { buildSelectorRegistryProbeTemplateFingerprint } from '@/shared/lib/browser-execution/selector-registry-probe-template';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

const COLLECTION_NAME = 'integration_selector_registry_probe_sessions';

type SelectorRegistryProbeSessionRecord = Document & {
  namespace: SelectorRegistryNamespace;
  profile: string;
  sourceUrl: string;
  sourceTitle: string | null;
  scope: 'main_content' | 'whole_page';
  sameOriginOnly: boolean;
  linkDepth: number;
  maxPages: number;
  scannedPages: number;
  visitedUrls: string[];
  pages: SelectorRegistryProbeSession['pages'];
  suggestionCount: number;
  suggestions: SelectorRegistryProbeSession['suggestions'];
  templateFingerprint?: SelectorRegistryProbeSession['templateFingerprint'] | null;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type SelectorRegistryProbeSessionDoc = WithId<SelectorRegistryProbeSessionRecord>;

const getCollection = async (): Promise<Collection<SelectorRegistryProbeSessionRecord>> => {
  const db = await getMongoDb();
  return db.collection<SelectorRegistryProbeSessionRecord>(COLLECTION_NAME);
};

const ensureIndexes = (() => {
  let pending: Promise<void> | null = null;

  return async (): Promise<void> => {
    if (pending !== null) {
      await pending;
      return;
    }

    pending = (async () => {
      const collection = await getCollection();
      await Promise.all([
        collection.createIndex(
          { namespace: 1, profile: 1, updatedAt: -1 },
          { name: 'selector_probe_sessions_namespace_profile_updatedAt_desc' }
        ),
        collection.createIndex(
          { namespace: 1, profile: 1, archivedAt: 1, updatedAt: -1 },
          { name: 'selector_probe_sessions_namespace_profile_archivedAt_updatedAt_desc' }
        ),
        collection.createIndex(
          {
            namespace: 1,
            profile: 1,
            archivedAt: 1,
            'templateFingerprint.clusterKey': 1,
            updatedAt: -1,
          },
          { name: 'selector_probe_sessions_namespace_profile_archivedAt_clusterKey_updatedAt_desc' }
        ),
      ]);
    })().catch((error) => {
      pending = null;
      throw error;
    });

    await pending;
  };
})();

const toDomain = (
  doc: SelectorRegistryProbeSessionDoc
): SelectorRegistryProbeSession => ({
  id: doc._id.toString(),
  namespace: doc.namespace,
  profile: doc.profile,
  sourceUrl: doc.sourceUrl,
  sourceTitle: doc.sourceTitle,
  scope: doc.scope,
  sameOriginOnly: doc.sameOriginOnly,
  linkDepth: doc.linkDepth,
  maxPages: doc.maxPages,
  scannedPages: doc.scannedPages,
  visitedUrls: doc.visitedUrls,
  pages: doc.pages,
  suggestionCount: doc.suggestionCount,
  suggestions: doc.suggestions,
  templateFingerprint:
    doc.templateFingerprint ??
    buildSelectorRegistryProbeTemplateFingerprint({
      sourceUrl: doc.sourceUrl,
      suggestions: doc.suggestions,
    }),
  archivedAt: doc.archivedAt instanceof Date ? doc.archivedAt.toISOString() : null,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

const buildArchivedFilter = (includeArchived?: boolean): Record<string, null> =>
  includeArchived === true ? {} : { archivedAt: null };

export async function listSelectorRegistryProbeSessions(input: {
  namespace: SelectorRegistryNamespace;
  profile?: string | null;
  includeArchived?: boolean;
}): Promise<SelectorRegistryProbeSession[]> {
  await ensureIndexes();
  const collection = await getCollection();
  const profile = input.profile?.trim() ?? '';
  const docs = await collection
    .find({
      namespace: input.namespace,
      ...(profile.length > 0 ? { profile } : {}),
      ...buildArchivedFilter(input.includeArchived),
    })
    .sort({ updatedAt: -1, createdAt: -1 })
    .toArray();
  return docs.map(toDomain);
}

export async function listSelectorRegistryProbeSessionClusters(input: {
  namespace: SelectorRegistryNamespace;
  profile?: string | null;
  includeArchived?: boolean;
}): Promise<SelectorRegistryProbeSessionCluster[]> {
  await ensureIndexes();
  const collection = await getCollection();
  const profile = input.profile?.trim() ?? '';
  const docs = await collection
    .find({
      namespace: input.namespace,
      ...(profile.length > 0 ? { profile } : {}),
      ...buildArchivedFilter(input.includeArchived),
    })
    .sort({
      'templateFingerprint.clusterKey': 1,
      updatedAt: -1,
      createdAt: -1,
    })
    .toArray();

  return buildSelectorRegistryProbeSessionClusters(docs.map(toDomain));
}

export async function saveSelectorRegistryProbeSession(
  input: SelectorRegistryProbeSessionSaveRequest
): Promise<SelectorRegistryProbeSessionSaveResponse> {
  await ensureIndexes();
  const collection = await getCollection();
  const now = new Date();
  const normalizedProfile = input.profile.trim();
  const templateFingerprint = buildSelectorRegistryProbeTemplateFingerprint({
    sourceUrl: input.probeResult.url,
    suggestions: input.probeResult.suggestions,
  });
  const doc = {
    namespace: input.namespace,
    profile: normalizedProfile,
    sourceUrl: input.probeResult.url,
    sourceTitle: input.probeResult.title,
    scope: input.probeResult.scope,
    sameOriginOnly: input.probeResult.sameOriginOnly,
    linkDepth: input.probeResult.linkDepth,
    maxPages: input.probeResult.maxPages,
    scannedPages: input.probeResult.scannedPages,
    visitedUrls: input.probeResult.visitedUrls,
    pages: input.probeResult.pages,
    suggestionCount: input.probeResult.suggestionCount,
    suggestions: input.probeResult.suggestions,
    templateFingerprint,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  const result = await collection.insertOne(doc);
  const persisted = await collection.findOne({ _id: result.insertedId });
  if (persisted === null) {
    throw new Error('Probe session was saved but could not be reloaded.');
  }

  return {
    session: toDomain(persisted),
    message: `Saved probe session for ${input.namespace} profile "${normalizedProfile}".`,
  };
}

export async function deleteSelectorRegistryProbeSession(input: {
  id: string;
}): Promise<SelectorRegistryProbeSessionDeleteResponse> {
  await ensureIndexes();
  const collection = await getCollection();
  const result = await collection.deleteOne({ _id: new ObjectId(input.id) });

  return {
    id: input.id,
    deleted: result.deletedCount > 0,
    message:
      result.deletedCount > 0
        ? 'Deleted probe session.'
        : 'Probe session was already missing.',
  };
}

export async function archiveSelectorRegistryProbeSession(input: {
  id: string;
}): Promise<SelectorRegistryProbeSessionArchiveResponse> {
  await ensureIndexes();
  const collection = await getCollection();
  const now = new Date();
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(input.id), archivedAt: null },
    { $set: { archivedAt: now, updatedAt: now } },
    { returnDocument: 'after' }
  );

  return {
    id: input.id,
    archived: result !== null,
    archivedAt: result?.archivedAt instanceof Date ? result.archivedAt.toISOString() : null,
    message:
      result !== null
        ? 'Archived probe session.'
        : 'Probe session was already archived or missing.',
  };
}

export async function restoreSelectorRegistryProbeSession(input: {
  id: string;
}): Promise<SelectorRegistryProbeSessionRestoreResponse> {
  await ensureIndexes();
  const collection = await getCollection();
  const now = new Date();
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(input.id), archivedAt: { $ne: null } },
    { $set: { archivedAt: null, updatedAt: now } },
    { returnDocument: 'after' }
  );

  return {
    id: input.id,
    restored: result !== null,
    message:
      result !== null
        ? 'Restored probe session to active review.'
        : 'Probe session was already active or missing.',
  };
}
