/**
 * @vitest-environment node
 */

import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSelectorRegistryProbeTemplateFingerprint } from '@/shared/lib/browser-execution/selector-registry-probe-template';

const mocks = vi.hoisted(() => ({
  getMongoDb: vi.fn(),
  find: vi.fn(),
  sort: vi.fn(),
  sortedToArray: vi.fn(),
  createIndex: vi.fn(),
  insertOne: vi.fn(),
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  deleteOne: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

import {
  archiveSelectorRegistryProbeSession,
  deleteSelectorRegistryProbeSession,
  listSelectorRegistryProbeSessionClusters,
  listSelectorRegistryProbeSessions,
  restoreSelectorRegistryProbeSession,
  saveSelectorRegistryProbeSession,
} from './selector-registry-probe-sessions';

describe('selector-registry-probe-sessions service', () => {
  beforeEach(() => {
    const sortedCursor = {
      toArray: mocks.sortedToArray,
    };

    const cursor = {
      sort: mocks.sort,
      toArray: mocks.sortedToArray,
    };

    mocks.find.mockReset().mockReturnValue(cursor);
    mocks.sort.mockReset().mockReturnValue(sortedCursor);
    mocks.sortedToArray.mockReset();
    mocks.createIndex.mockReset().mockResolvedValue('ok');
    mocks.insertOne.mockReset();
    mocks.findOne.mockReset();
    mocks.findOneAndUpdate.mockReset();
    mocks.deleteOne.mockReset();
    mocks.getMongoDb.mockReset().mockResolvedValue({
      collection: (name: string) => {
        if (name !== 'integration_selector_registry_probe_sessions') {
          return {};
        }
        return {
          find: mocks.find,
          createIndex: mocks.createIndex,
          insertOne: mocks.insertOne,
          findOne: mocks.findOne,
          findOneAndUpdate: mocks.findOneAndUpdate,
          deleteOne: mocks.deleteOne,
        };
      },
    });
  });

  it('lists persisted probe sessions for a namespace/profile', async () => {
    const templateFingerprint = buildSelectorRegistryProbeTemplateFingerprint({
      sourceUrl: 'https://www.amazon.com/example-item',
      suggestions: [],
    });
    mocks.sortedToArray.mockResolvedValueOnce([
      {
        _id: new ObjectId('507f1f77bcf86cd799439011'),
        namespace: 'amazon',
        profile: 'amazon',
        sourceUrl: 'https://www.amazon.com/example-item',
        sourceTitle: 'Example item',
        scope: 'main_content',
        sameOriginOnly: true,
        linkDepth: 0,
        maxPages: 1,
        scannedPages: 1,
        visitedUrls: ['https://www.amazon.com/example-item'],
        pages: [],
        suggestionCount: 1,
        suggestions: [],
        templateFingerprint,
        archivedAt: null,
        createdAt: new Date('2026-04-18T08:00:00.000Z'),
        updatedAt: new Date('2026-04-18T08:00:00.000Z'),
      },
    ]);

    const sessions = await listSelectorRegistryProbeSessions({
      namespace: 'amazon',
      profile: 'amazon',
    });

    expect(mocks.find).toHaveBeenCalledWith({
      namespace: 'amazon',
      profile: 'amazon',
      archivedAt: null,
    });
    expect(mocks.createIndex).toHaveBeenCalledTimes(3);
    expect(sessions).toEqual([
      expect.objectContaining({
        id: '507f1f77bcf86cd799439011',
        namespace: 'amazon',
        profile: 'amazon',
        sourceTitle: 'Example item',
        templateFingerprint,
        archivedAt: null,
      }),
    ]);
  });

  it('includes archived probe sessions only when explicitly requested', async () => {
    const templateFingerprint = buildSelectorRegistryProbeTemplateFingerprint({
      sourceUrl: 'https://www.amazon.com/example-item-archived',
      suggestions: [],
    });
    mocks.sortedToArray.mockResolvedValueOnce([
      {
        _id: new ObjectId('507f1f77bcf86cd799439099'),
        namespace: 'amazon',
        profile: 'amazon',
        sourceUrl: 'https://www.amazon.com/example-item-archived',
        sourceTitle: 'Archived example item',
        scope: 'main_content',
        sameOriginOnly: true,
        linkDepth: 0,
        maxPages: 1,
        scannedPages: 1,
        visitedUrls: ['https://www.amazon.com/example-item-archived'],
        pages: [],
        suggestionCount: 0,
        suggestions: [],
        templateFingerprint,
        archivedAt: new Date('2026-04-18T10:00:00.000Z'),
        createdAt: new Date('2026-04-18T08:00:00.000Z'),
        updatedAt: new Date('2026-04-18T10:00:00.000Z'),
      },
    ]);

    const sessions = await listSelectorRegistryProbeSessions({
      namespace: 'amazon',
      profile: 'amazon',
      includeArchived: true,
    });

    expect(mocks.find).toHaveBeenCalledWith({
      namespace: 'amazon',
      profile: 'amazon',
    });
    expect(sessions).toEqual([
      expect.objectContaining({
        id: '507f1f77bcf86cd799439099',
        archivedAt: '2026-04-18T10:00:00.000Z',
      }),
    ]);
  });

  it('backfills a template fingerprint when reading a legacy stored probe session', async () => {
    mocks.sortedToArray.mockResolvedValueOnce([
      {
        _id: new ObjectId('507f1f77bcf86cd799439013'),
        namespace: 'amazon',
        profile: 'amazon',
        sourceUrl: 'https://www.amazon.com/example-item-7',
        sourceTitle: 'Legacy example item',
        scope: 'main_content',
        sameOriginOnly: true,
        linkDepth: 0,
        maxPages: 1,
        scannedPages: 1,
        visitedUrls: ['https://www.amazon.com/example-item-7'],
        pages: [],
        suggestionCount: 1,
        suggestions: [
          {
            suggestionId: 'price::legacy',
            pageUrl: 'https://www.amazon.com/example-item-7',
            pageTitle: 'Legacy example item',
            tag: 'span',
            id: null,
            classes: [],
            textPreview: '$29.99',
            role: null,
            attrs: {},
            boundingBox: { x: 0, y: 0, width: 10, height: 10 },
            candidates: {
              css: '.a-price',
              xpath: null,
              role: null,
              text: '$29.99',
              testId: null,
            },
            repeatedSiblingCount: 0,
            childLinkCount: 0,
            childImageCount: 0,
            classificationRole: 'content_price',
            draftTargetHints: ['price'],
            confidence: 0.9,
            evidence: ['signal'],
          },
        ],
        archivedAt: null,
        createdAt: new Date('2026-04-18T08:30:00.000Z'),
        updatedAt: new Date('2026-04-18T08:30:00.000Z'),
      },
    ]);

    const sessions = await listSelectorRegistryProbeSessions({
      namespace: 'amazon',
      profile: 'amazon',
    });

    expect(sessions).toEqual([
      expect.objectContaining({
        id: '507f1f77bcf86cd799439013',
        archivedAt: null,
        templateFingerprint: expect.objectContaining({
          host: 'www.amazon.com',
          normalizedPath: '/example-item-:n',
          roleSignature: ['content_price'],
        }),
      }),
    ]);
  });

  it('saves and reloads a probe session', async () => {
    const insertedId = new ObjectId('507f1f77bcf86cd799439012');
    const templateFingerprint = buildSelectorRegistryProbeTemplateFingerprint({
      sourceUrl: 'https://www.amazon.com/example-item',
      suggestions: [],
    });
    mocks.insertOne.mockResolvedValueOnce({ insertedId });
    mocks.findOne.mockResolvedValueOnce({
      _id: insertedId,
      namespace: 'amazon',
      profile: 'amazon',
      sourceUrl: 'https://www.amazon.com/example-item',
      sourceTitle: 'Example item',
      scope: 'main_content',
      sameOriginOnly: true,
      linkDepth: 0,
      maxPages: 1,
      scannedPages: 1,
      visitedUrls: ['https://www.amazon.com/example-item'],
      pages: [],
      suggestionCount: 1,
      suggestions: [],
      templateFingerprint,
      archivedAt: null,
      createdAt: new Date('2026-04-18T08:00:00.000Z'),
      updatedAt: new Date('2026-04-18T08:00:00.000Z'),
    });

    const response = await saveSelectorRegistryProbeSession({
      namespace: 'amazon',
      profile: 'amazon',
      probeResult: {
        url: 'https://www.amazon.com/example-item',
        title: 'Example item',
        scope: 'main_content',
        sameOriginOnly: true,
        linkDepth: 0,
        maxPages: 1,
        scannedPages: 1,
        visitedUrls: ['https://www.amazon.com/example-item'],
        pages: [],
        suggestionCount: 1,
        suggestions: [],
      },
    });

    expect(mocks.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        namespace: 'amazon',
        profile: 'amazon',
        sourceUrl: 'https://www.amazon.com/example-item',
        suggestionCount: 1,
        templateFingerprint,
        archivedAt: null,
      })
    );
    expect(response.session).toEqual(
      expect.objectContaining({
        id: '507f1f77bcf86cd799439012',
        namespace: 'amazon',
        profile: 'amazon',
        templateFingerprint,
        archivedAt: null,
      })
    );
  });

  it('lists persisted probe session clusters grouped by template fingerprint', async () => {
    const templateFingerprint = buildSelectorRegistryProbeTemplateFingerprint({
      sourceUrl: 'https://www.amazon.com/example-item-1',
      suggestions: [
        {
          suggestionId: 'price::signal',
          pageUrl: 'https://www.amazon.com/example-item-1',
          pageTitle: 'Example item 1',
          tag: 'span',
          id: null,
          classes: [],
          textPreview: '$19.99',
          role: null,
          attrs: {},
          boundingBox: { x: 0, y: 0, width: 10, height: 10 },
          candidates: {
            css: '.a-price',
            xpath: null,
            role: null,
            text: '$19.99',
            testId: null,
          },
          repeatedSiblingCount: 0,
          childLinkCount: 0,
          childImageCount: 0,
          classificationRole: 'content_price',
          draftTargetHints: ['price'],
          confidence: 0.9,
          evidence: ['signal'],
        },
      ],
    });
    mocks.sortedToArray.mockResolvedValueOnce([
      {
        _id: new ObjectId('507f1f77bcf86cd799439022'),
        namespace: 'amazon',
        profile: 'amazon',
        sourceUrl: 'https://www.amazon.com/example-item-2',
        sourceTitle: 'Example item 2',
        scope: 'main_content',
        sameOriginOnly: true,
        linkDepth: 0,
        maxPages: 1,
        scannedPages: 1,
        visitedUrls: ['https://www.amazon.com/example-item-2'],
        pages: [],
        suggestionCount: 1,
        suggestions: [
          {
            suggestionId: 'price::signal-2',
            pageUrl: 'https://www.amazon.com/example-item-2',
            pageTitle: 'Example item 2',
            tag: 'span',
            id: null,
            classes: [],
            textPreview: '$21.99',
            role: null,
            attrs: {},
            boundingBox: { x: 0, y: 0, width: 10, height: 10 },
            candidates: {
              css: '.a-price',
              xpath: null,
              role: null,
              text: '$21.99',
              testId: null,
            },
            repeatedSiblingCount: 0,
            childLinkCount: 0,
            childImageCount: 0,
            classificationRole: 'content_price',
            draftTargetHints: ['price'],
            confidence: 0.9,
            evidence: ['signal'],
          },
        ],
        templateFingerprint,
        archivedAt: null,
        createdAt: new Date('2026-04-18T09:00:00.000Z'),
        updatedAt: new Date('2026-04-18T09:00:00.000Z'),
      },
      {
        _id: new ObjectId('507f1f77bcf86cd799439021'),
        namespace: 'amazon',
        profile: 'amazon',
        sourceUrl: 'https://www.amazon.com/example-item-1',
        sourceTitle: 'Example item 1',
        scope: 'main_content',
        sameOriginOnly: true,
        linkDepth: 0,
        maxPages: 1,
        scannedPages: 1,
        visitedUrls: ['https://www.amazon.com/example-item-1'],
        pages: [],
        suggestionCount: 1,
        suggestions: [
          {
            suggestionId: 'price::signal',
            pageUrl: 'https://www.amazon.com/example-item-1',
            pageTitle: 'Example item 1',
            tag: 'span',
            id: null,
            classes: [],
            textPreview: '$19.99',
            role: null,
            attrs: {},
            boundingBox: { x: 0, y: 0, width: 10, height: 10 },
            candidates: {
              css: '.a-price',
              xpath: null,
              role: null,
              text: '$19.99',
              testId: null,
            },
            repeatedSiblingCount: 0,
            childLinkCount: 0,
            childImageCount: 0,
            classificationRole: 'content_price',
            draftTargetHints: ['price'],
            confidence: 0.9,
            evidence: ['signal'],
          },
        ],
        templateFingerprint,
        archivedAt: null,
        createdAt: new Date('2026-04-18T08:00:00.000Z'),
        updatedAt: new Date('2026-04-18T08:00:00.000Z'),
      },
    ]);

    const clusters = await listSelectorRegistryProbeSessionClusters({
      namespace: 'amazon',
      profile: 'amazon',
    });

    expect(mocks.sort).toHaveBeenCalledWith({
      'templateFingerprint.clusterKey': 1,
      updatedAt: -1,
      createdAt: -1,
    });
    expect(mocks.find).toHaveBeenCalledWith({
      namespace: 'amazon',
      profile: 'amazon',
      archivedAt: null,
    });
    expect(clusters).toEqual([
      expect.objectContaining({
        clusterKey: templateFingerprint.clusterKey,
        sessionCount: 2,
        suggestionCount: 2,
      }),
    ]);
    expect(clusters[0]?.sessions.map((session) => session.id)).toEqual([
      '507f1f77bcf86cd799439022',
      '507f1f77bcf86cd799439021',
    ]);
  });

  it('deletes a stored probe session', async () => {
    mocks.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });

    const response = await deleteSelectorRegistryProbeSession({
      id: '507f1f77bcf86cd799439011',
    });

    expect(mocks.deleteOne).toHaveBeenCalledWith({
      _id: expect.any(ObjectId),
    });
    expect(response).toEqual({
      id: '507f1f77bcf86cd799439011',
      deleted: true,
      message: 'Deleted probe session.',
    });
  });

  it('archives a stored probe session without deleting it', async () => {
    mocks.findOneAndUpdate.mockResolvedValueOnce({
      _id: new ObjectId('507f1f77bcf86cd799439031'),
      namespace: 'amazon',
      profile: 'amazon',
      sourceUrl: 'https://www.amazon.com/example-item-archive',
      sourceTitle: 'Archived example item',
      scope: 'main_content',
      sameOriginOnly: true,
      linkDepth: 0,
      maxPages: 1,
      scannedPages: 1,
      visitedUrls: ['https://www.amazon.com/example-item-archive'],
      pages: [],
      suggestionCount: 1,
      suggestions: [],
      archivedAt: new Date('2026-04-18T10:00:00.000Z'),
      createdAt: new Date('2026-04-18T08:00:00.000Z'),
      updatedAt: new Date('2026-04-18T10:00:00.000Z'),
    });

    const response = await archiveSelectorRegistryProbeSession({
      id: '507f1f77bcf86cd799439031',
    });

    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: expect.any(ObjectId), archivedAt: null },
      { $set: { archivedAt: expect.any(Date), updatedAt: expect.any(Date) } },
      { returnDocument: 'after' }
    );
    expect(response).toEqual({
      id: '507f1f77bcf86cd799439031',
      archived: true,
      archivedAt: '2026-04-18T10:00:00.000Z',
      message: 'Archived probe session.',
    });
  });

  it('restores an archived probe session back into active review', async () => {
    mocks.findOneAndUpdate.mockResolvedValueOnce({
      _id: new ObjectId('507f1f77bcf86cd799439032'),
      namespace: 'amazon',
      profile: 'amazon',
      sourceUrl: 'https://www.amazon.com/example-item-restored',
      sourceTitle: 'Restored example item',
      scope: 'main_content',
      sameOriginOnly: true,
      linkDepth: 0,
      maxPages: 1,
      scannedPages: 1,
      visitedUrls: ['https://www.amazon.com/example-item-restored'],
      pages: [],
      suggestionCount: 0,
      suggestions: [],
      archivedAt: null,
      createdAt: new Date('2026-04-18T08:00:00.000Z'),
      updatedAt: new Date('2026-04-18T10:05:00.000Z'),
    });

    const response = await restoreSelectorRegistryProbeSession({
      id: '507f1f77bcf86cd799439032',
    });

    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: expect.any(ObjectId), archivedAt: { $ne: null } },
      { $set: { archivedAt: null, updatedAt: expect.any(Date) } },
      { returnDocument: 'after' }
    );
    expect(response).toEqual({
      id: '507f1f77bcf86cd799439032',
      restored: true,
      message: 'Restored probe session to active review.',
    });
  });
});
