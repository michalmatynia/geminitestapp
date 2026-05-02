import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

import { upsertManualAppliedMongoFilemakerJobApplication } from './filemaker-job-application-manual';

type TestDocument = Record<string, unknown> & { _id: string };

const matchesFilter = (document: TestDocument, filter: Record<string, unknown>): boolean =>
  Object.entries(filter).every(([key, value]) => {
    if (key === '$or' && Array.isArray(value)) {
      return value.some((entry) => matchesFilter(document, entry as Record<string, unknown>));
    }
    if (typeof value === 'object' && value !== null && '$in' in value) {
      return (value as { $in: unknown[] }).$in.includes(document[key]);
    }
    return document[key] === value;
  });

const createCollectionMock = (documents: TestDocument[]) => ({
  find: vi.fn((filter: Record<string, unknown>) => ({
    sort: () => ({
      limit: () => ({
        toArray: async () => documents.filter((document) => matchesFilter(document, filter)),
      }),
    }),
  })),
  findOne: vi.fn(async (filter: Record<string, unknown>) =>
    documents.find((document) => matchesFilter(document, filter)) ?? null
  ),
  updateMany: vi.fn(async (filter: Record<string, unknown>, update: Record<string, unknown>) => {
    const set = (update['$set'] ?? {}) as Record<string, unknown>;
    const push = (update['$push'] ?? {}) as Record<string, unknown>;
    let matchedCount = 0;
    documents.forEach((document) => {
      if (!matchesFilter(document, filter)) return;
      Object.assign(document, set);
      for (const [key, value] of Object.entries(push)) {
        if (!Array.isArray(document[key])) document[key] = [];
        (document[key] as unknown[]).push(value);
      }
      matchedCount += 1;
    });
    return { matchedCount, modifiedCount: matchedCount };
  }),
  updateOne: vi.fn(
    async (
      filter: Record<string, unknown>,
      update: Record<string, Record<string, unknown>>,
      options?: { upsert?: boolean }
    ) => {
      const existing = documents.find((document) => matchesFilter(document, filter));
      if (existing !== undefined) {
        Object.assign(existing, update['$set'] ?? {});
        return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
      }
      if (options?.upsert !== true) return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
      const next = {
        ...(update['$setOnInsert'] ?? {}),
        ...(update['$set'] ?? {}),
      } as TestDocument;
      documents.push(next);
      return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
    }
  ),
});

describe('manual Filemaker job application markers', () => {
  beforeEach(() => {
    getMongoDbMock.mockReset();
  });

  it('creates an applied application for the selected default person', async () => {
    const documents: TestDocument[] = [];
    const collection = createCollectionMock(documents);
    getMongoDbMock.mockResolvedValue({ collection: () => collection });

    const application = await upsertManualAppliedMongoFilemakerJobApplication({
      jobListingId: 'job-1',
      jobTitle: 'FileMaker Consultant',
      organizationId: 'org-1',
      organizationName: 'Acme Hiring',
      personId: 'person-2',
      personName: 'Grace Hopper',
      sourceSite: 'pracuj.pl',
      sourceUrl: 'https://example.com/job',
    });

    expect(application).toMatchObject({
      jobListingId: 'job-1',
      organizationId: 'org-1',
      personId: 'person-2',
      personName: 'Grace Hopper',
      source: 'filemaker-manual-applied',
      status: 'applied',
    });
    expect(documents[0]).toMatchObject({
      applicationNotes: ['Marked applied manually.'],
      canonicalApplicationKey: 'person-2::org-1::job-1::default',
      sourceEntityId: 'org-1:job-1:person-2:manual_applied',
    });
    expect(application.applicationLog).toHaveLength(1);
    expect(application.applicationLog?.[0]).toMatchObject({
      method: 'manual',
      toStatus: 'applied',
      personId: 'person-2',
      personName: 'Grace Hopper',
    });
    expect(typeof application.applicationLog?.[0]?.id).toBe('string');
  });

  it('marks existing generated applications as applied for the same person and listing', async () => {
    const documents: TestDocument[] = [
      {
        _id: 'application-1',
        createdAt: '2026-04-29T10:00:00.000Z',
        id: 'application-1',
        jobListingId: 'job-1',
        organizationId: 'org-1',
        personId: 'person-2',
        status: 'draft',
        updatedAt: '2026-04-29T10:00:00.000Z',
      },
    ];
    const collection = createCollectionMock(documents);
    getMongoDbMock.mockResolvedValue({ collection: () => collection });

    const application = await upsertManualAppliedMongoFilemakerJobApplication({
      jobListingId: 'job-1',
      organizationId: 'org-1',
      personId: 'person-2',
    });

    expect(application).toMatchObject({
      id: 'application-1',
      jobListingId: 'job-1',
      organizationId: 'org-1',
      personId: 'person-2',
      status: 'applied',
    });
    expect(collection.updateMany).toHaveBeenCalledWith(
      { _id: { $in: ['application-1'] } },
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'applied' }),
        $push: {
          applicationLog: expect.objectContaining({
            method: 'manual',
            toStatus: 'applied',
            personId: 'person-2',
          }),
        },
      })
    );
    expect(application.applicationLog).toHaveLength(1);
    expect(application.applicationLog?.[0]).toMatchObject({
      method: 'manual',
      toStatus: 'applied',
      personId: 'person-2',
    });
  });
});
