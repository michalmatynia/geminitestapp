import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

import { collapseLegacyMongoFilemakerJobApplicationsForListing } from './filemaker-job-application-repository';

type TestDocument = Record<string, unknown> & { _id: string };

const matchesFilter = (document: TestDocument, filter: Record<string, unknown>): boolean =>
  Object.entries(filter).every(([key, value]) => {
    if (key === '$or' && Array.isArray(value)) {
      return value.some((entry) => matchesFilter(document, entry as Record<string, unknown>));
    }
    if (key === 'artifactVersions' && typeof value === 'object' && value !== null) {
      const exists = (value as Record<string, unknown>)['$exists'];
      return exists === true
        ? document['artifactVersions'] !== undefined
        : document['artifactVersions'] === undefined;
    }
    return document[key] === value;
  });

describe('filemaker job application repository', () => {
  beforeEach(() => {
    getMongoDbMock.mockReset();
  });

  it('collapses a single legacy application email into a canonical package', async () => {
    const documents: TestDocument[] = [
      {
        _id: 'legacy-email-1',
        id: 'legacy-email-1',
        applicationEmail: {
          bodyMarkdown: 'Hello',
          bodyText: 'Hello',
          subject: 'Application',
        },
        canonicalApplicationKey: 'person-1::org-1::job-1::pracuj-pl',
        confidence: 0.8,
        createdAt: '2026-04-29T10:00:00.000Z',
        integrationSlug: 'pracuj-pl',
        jobListingId: 'job-1',
        jobTitle: 'FileMaker Consultant',
        organizationId: 'org-1',
        organizationName: 'Acme Hiring',
        personId: 'person-1',
        personName: 'Ada Lovelace',
        sourceEntityId: 'org-1:job-1:person-1:application_package',
        status: 'draft',
        updatedAt: '2026-04-29T10:00:00.000Z',
      },
    ];
    const updateOneMock = vi.fn(async () => ({ matchedCount: 0, modifiedCount: 0, upsertedCount: 1 }));
    const deleteManyMock = vi.fn(async () => ({ deletedCount: 1 }));
    const collection = {
      find: vi.fn((filter: Record<string, unknown>) => ({
        sort: () => ({
          limit: () => ({
            toArray: async () =>
              documents.filter((document) => matchesFilter(document, filter)),
          }),
        }),
      })),
      findOne: vi.fn(async (filter: Record<string, unknown>) =>
        documents.find((document) => matchesFilter(document, filter)) ?? null
      ),
      updateOne: updateOneMock,
      deleteMany: deleteManyMock,
    };
    getMongoDbMock.mockResolvedValue({
      collection: () => collection,
    });

    const result = await collapseLegacyMongoFilemakerJobApplicationsForListing({
      jobListingId: 'job-1',
      organizationId: 'org-1',
      personId: 'person-1',
    });

    expect(result).toEqual({
      canonicalApplicationsCreated: 1,
      canonicalApplicationsUpdated: 0,
      legacyApplicationsDeleted: 1,
      legacyGroupsSkipped: 0,
    });
    expect(updateOneMock).toHaveBeenCalledWith(
      { _id: 'ai-job-application-person-1-org-1-job-1-pracuj-pl' },
      expect.objectContaining({
        $set: expect.objectContaining({
          activeArtifacts: expect.objectContaining({
            applicationEmailVersionId: expect.stringContaining('legacy-application-email-'),
          }),
          applicationEmail: expect.objectContaining({
            subject: 'Application',
          }),
          artifactVersions: expect.objectContaining({
            applicationEmail: [
              expect.objectContaining({
                kind: 'application_email',
                payload: expect.objectContaining({ subject: 'Application' }),
              }),
            ],
          }),
        }),
      }),
      { upsert: true }
    );
    expect(deleteManyMock).toHaveBeenCalledWith({
      $or: [{ id: { $in: ['legacy-email-1'] } }, { _id: { $in: ['legacy-email-1'] } }],
    });
  });
});
