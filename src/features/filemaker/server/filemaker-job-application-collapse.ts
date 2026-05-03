import type { Collection } from 'mongodb';

import type { FilemakerJobApplication, FilemakerJobApplicationArtifactVersion, FilemakerJobApplicationArtifactVersionSet } from '../filemaker-job-application.types';
import {
  createArtifactVersionsFromApplication,
  mergeArtifactVersionArrays,
} from './filemaker-job-application-artifact-versions';
import { buildCanonicalSet, resolveActiveArtifacts } from './filemaker-job-application-collapse-builders';
import { getFilemakerJobApplicationsCollection } from './filemaker-job-application-collection';
import { toFilemakerJobApplication } from './filemaker-job-application-mapper';
import { normalizePersistedArtifactVersions } from './filemaker-job-application-normalize-artifacts';
import { normalizeRequiredString } from './filemaker-job-application-normalize-base';
import type { FilemakerJobApplicationMongoDocument } from './filemaker-job-application-repository.types';

export type CollapseLegacyMongoFilemakerJobApplicationsResult = {
  canonicalApplicationsCreated: number;
  canonicalApplicationsUpdated: number;
  legacyApplicationsDeleted: number;
  legacyGroupsSkipped: number;
};

type CollapseGroupResult = CollapseLegacyMongoFilemakerJobApplicationsResult;

type ArtifactVersionBuckets = {
  applicationEmail: FilemakerJobApplicationArtifactVersion[];
  coverLetter: FilemakerJobApplicationArtifactVersion[];
  tailoredCv: FilemakerJobApplicationArtifactVersion[];
};

const EMPTY_RESULT: CollapseLegacyMongoFilemakerJobApplicationsResult = {
  canonicalApplicationsCreated: 0, canonicalApplicationsUpdated: 0, legacyApplicationsDeleted: 0, legacyGroupsSkipped: 0,
};

const loadJobApplicationsForCollapse = async (input: {
  jobListingId: string;
  organizationId: string;
  personId?: string | null;
}): Promise<FilemakerJobApplication[]> => {
  const filter: Record<string, string> = {
    jobListingId: input.jobListingId,
    organizationId: input.organizationId,
  };
  const personId = input.personId?.trim() ?? '';
  if (personId.length > 0) filter['personId'] = personId;
  const collection = await getFilemakerJobApplicationsCollection();
  const documents = await collection
    .find(filter)
    .sort({ createdAt: -1, updatedAt: -1 })
    .limit(100)
    .toArray();
  return documents.map(toFilemakerJobApplication);
};

const groupLegacyApplications = (
  applications: FilemakerJobApplication[]
): Map<string, FilemakerJobApplication[]> => {
  const groups = new Map<string, FilemakerJobApplication[]>();
  applications
    .filter(
      (application) =>
        (application.artifactVersions === null || application.artifactVersions === undefined) &&
        application.source !== 'filemaker-manual-applied'
    )
    .forEach((application) => {
      const canonicalKey = application.canonicalApplicationKey;
      if (canonicalKey === null || canonicalKey.trim().length === 0) return;
      const group = groups.get(canonicalKey) ?? [];
      group.push(application);
      groups.set(canonicalKey, group);
    });
  return groups;
};

const findExistingContainer = (
  collection: Collection<FilemakerJobApplicationMongoDocument>,
  canonicalId: string,
  canonicalKey: string
): Promise<FilemakerJobApplicationMongoDocument | null> =>
  collection.findOne({
    $or: [
      { canonicalApplicationKey: canonicalKey, artifactVersions: { $exists: true } },
      { _id: canonicalId, artifactVersions: { $exists: true } },
      { id: canonicalId, artifactVersions: { $exists: true } },
    ],
  });

const sortApplicationsByFreshness = (
  applications: FilemakerJobApplication[]
): FilemakerJobApplication[] =>
  applications.slice().sort((left, right): number =>
    normalizeRequiredString(right.updatedAt).localeCompare(normalizeRequiredString(left.updatedAt))
  );

const createEmptyBuckets = (): ArtifactVersionBuckets => ({
  applicationEmail: [],
  coverLetter: [],
  tailoredCv: [],
});

const buildLegacyVersionBuckets = (
  applications: FilemakerJobApplication[]
): ArtifactVersionBuckets => {
  const buckets = createEmptyBuckets();
  applications.forEach((application) => {
    createArtifactVersionsFromApplication(application).forEach((version) => {
      if (version.kind === 'tailored_cv') buckets.tailoredCv.push(version);
      if (version.kind === 'cover_letter') buckets.coverLetter.push(version);
      if (version.kind === 'application_email') buckets.applicationEmail.push(version);
    });
  });
  return buckets;
};

const resolveExistingVersions = (
  existingContainer: FilemakerJobApplicationMongoDocument | null
): FilemakerJobApplicationArtifactVersionSet =>
  normalizePersistedArtifactVersions(
    existingContainer?.artifactVersions ?? existingContainer?.persistedArtifactVersions
  ) ?? createEmptyBuckets();

const mergeVersionBuckets = (
  existingVersions: FilemakerJobApplicationArtifactVersionSet,
  legacyVersions: ArtifactVersionBuckets
): FilemakerJobApplicationArtifactVersionSet => ({
  applicationEmail: mergeArtifactVersionArrays(
    existingVersions.applicationEmail,
    legacyVersions.applicationEmail
  ),
  coverLetter: mergeArtifactVersionArrays(existingVersions.coverLetter, legacyVersions.coverLetter),
  tailoredCv: mergeArtifactVersionArrays(existingVersions.tailoredCv, legacyVersions.tailoredCv),
});

const toCanonicalId = (canonicalKey: string): string =>
  `ai-job-application-${canonicalKey.replace(/::/g, '-')}`;

const processLegacyGroup = async (input: {
  canonicalKey: string;
  collection: Collection<FilemakerJobApplicationMongoDocument>;
  group: FilemakerJobApplication[];
}): Promise<CollapseGroupResult> => {
  const canonicalId = toCanonicalId(input.canonicalKey);
  const existingContainer = await findExistingContainer(
    input.collection,
    canonicalId,
    input.canonicalKey
  );
  const sorted = sortApplicationsByFreshness(input.group);
  const base = sorted[0];
  if (base === undefined) return { ...EMPTY_RESULT, legacyGroupsSkipped: 1 };
  const artifactVersions = mergeVersionBuckets(
    resolveExistingVersions(existingContainer),
    buildLegacyVersionBuckets(sorted)
  );
  const activeArtifacts = resolveActiveArtifacts(existingContainer, artifactVersions);
  await input.collection.updateOne(
    existingContainer === null ? { _id: canonicalId } : { _id: existingContainer._id },
    {
      $setOnInsert: { _id: canonicalId, id: canonicalId, createdAt: base.createdAt },
      $set: buildCanonicalSet({ activeArtifacts, artifactVersions, base, canonicalKey: input.canonicalKey }),
    },
    { upsert: true }
  );
  const legacyIds = sorted
    .map((application: FilemakerJobApplication): string => application.id)
    .filter((applicationId: string): boolean => applicationId !== canonicalId);
  const deleteResult = await input.collection.deleteMany({
    $or: [{ id: { $in: legacyIds } }, { _id: { $in: legacyIds } }],
  });
  return {
    ...EMPTY_RESULT,
    canonicalApplicationsCreated: existingContainer === null ? 1 : 0,
    canonicalApplicationsUpdated: existingContainer === null ? 0 : 1,
    legacyApplicationsDeleted: deleteResult.deletedCount,
  };
};

const sumCollapseResults = (
  results: CollapseGroupResult[]
): CollapseLegacyMongoFilemakerJobApplicationsResult =>
  results.reduce(
    (total, result) => ({
      canonicalApplicationsCreated:
        total.canonicalApplicationsCreated + result.canonicalApplicationsCreated,
      canonicalApplicationsUpdated:
        total.canonicalApplicationsUpdated + result.canonicalApplicationsUpdated,
      legacyApplicationsDeleted: total.legacyApplicationsDeleted + result.legacyApplicationsDeleted,
      legacyGroupsSkipped: total.legacyGroupsSkipped + result.legacyGroupsSkipped,
    }),
    EMPTY_RESULT
  );

export const collapseLegacyMongoFilemakerJobApplicationsForListing = async (input: {
  jobListingId: string;
  organizationId: string;
  personId?: string | null;
}): Promise<CollapseLegacyMongoFilemakerJobApplicationsResult> => {
  const applications = await loadJobApplicationsForCollapse(input);
  const groups = groupLegacyApplications(applications);
  const collection = await getFilemakerJobApplicationsCollection();
  const results = await Promise.all(
    Array.from(groups.entries()).map(([canonicalKey, group]) =>
      processLegacyGroup({ canonicalKey, collection, group })
    )
  );
  return sumCollapseResults(results);
};
